from ortools.sat.python import cp_model
import logging
import collections
import uuid
import re

logger = logging.getLogger(__name__)


def generate_timetable_cpsat(data, session_id=None, progress_dict=None, existing_timetables=None):
    """
    Solves the timetable scheduling problem using Google OR-Tools CP-SAT solver.
    WARNING: This is slow (30-45 minutes) but finds optimal solutions.
    """

    # -----------------------------
    # Progress Helper
    # -----------------------------
    def update_progress(status, progress, message, solutions=0, objective=None):
        if progress_dict and session_id:
            progress_dict[session_id].update({
                "status": status,
                "progress": progress,
                "message": message,
                "solutions_found": solutions,
                "best_objective": objective
            })

    update_progress("processing", 5, "Parsing input data...")

    # -----------------------------
    # Input Data
    # -----------------------------
    courses = data.get("courses", [])
    faculty = data.get("faculty", [])
    rooms = data.get("rooms", [])
    allotments = data.get("allotments", [])

    course_map = {c["id"]: c for c in courses}
    faculty_map = {f["id"]: f for f in faculty}
    room_map = {r["id"]: r for r in rooms}

    # Build conflict avoidance maps from existing timetables
    if existing_timetables is None:
        existing_timetables = []
    
    faculty_busy = collections.defaultdict(set)  # {faculty_id: {slot_index}}
    room_busy = collections.defaultdict(set)      # {room_id: {slot_index}}
    
    logger.info(f"CP-SAT: Processing {len(existing_timetables)} existing timetables for conflict avoidance")
    
    # Time slot mapping for conversion
    days_list = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    times_list = ["08:30", "10:00", "11:30", "13:00", "14:30", "16:00"]
    
    for existing_tt in existing_timetables:
        entries = existing_tt.get('entries', [])
        for entry in entries:
            time_slot = entry.get('timeSlot', {})
            day = time_slot.get('day')
            start_time = time_slot.get('startTime')
            
            if day and start_time:
                try:
                    day_idx = days_list.index(day)
                    time_idx = times_list.index(start_time)
                    slot_idx = day_idx * 6 + time_idx  # 6 slots per day
                    
                    faculty_id = entry.get('facultyId')
                    if faculty_id:
                        faculty_busy[faculty_id].add(slot_idx)
                    
                    room_id = entry.get('roomId')
                    if room_id:
                        room_busy[room_id].add(slot_idx)
                except (ValueError, IndexError):
                    pass
    
    logger.info(f"CP-SAT: {len(faculty_busy)} faculty with occupied slots, {len(room_busy)} rooms with occupied slots")

    # -----------------------------
    # Time Slots
    # -----------------------------
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    time_intervals = [
        ("08:30", "10:00"),
        ("10:00", "11:30"),
        ("11:30", "13:00"),
        ("13:00", "14:30"),
        ("14:30", "16:00"),
        ("16:00", "17:30"),
    ]

    all_time_slots = []
    for day in days:
        for start, end in time_intervals:
            all_time_slots.append({
                "day": day,
                "startTime": start,
                "endTime": end,
                "id": f"{day}-{start}"
            })

    num_slots = len(all_time_slots)
    slots_per_day = len(time_intervals)

    # -----------------------------
    # Create Sessions
    # -----------------------------
    update_progress("processing", 10, "Creating course sessions...")
    sessions = []

    for allot_idx, allotment in enumerate(allotments):
        c_id = allotment["courseId"]
        f_id = allotment["facultyId"]
        class_ids = allotment["classIds"]

        course = course_map.get(c_id)
        if not course:
            continue

        # Enhanced lab detection - checks multiple patterns
        # Pattern 1: requiresLab flag is true
        # Pattern 2: Code contains L after digits (e.g., CS101L, CS101L-SE)
        # Pattern 3: Course name contains "lab"
        code = course.get("code", "")
        name = course.get("name", "").lower()
        
        # Check if code has pattern like CS101L or CS101L-SE
        has_lab_pattern = False
        for i in range(len(code) - 1):
            if code[i].isdigit() and code[i + 1] == 'L':
                # Found digit followed by L
                if i + 2 >= len(code) or code[i + 2] in ['-', '_']:
                    # L is at end or followed by separator
                    has_lab_pattern = True
                    break
        
        is_lab = (
            course.get("requiresLab", False) or 
            has_lab_pattern or
            "lab" in name
        )
        credits = course.get("credits", 3)

        # HARD CONSTRAINT: Lab classes MUST occupy 2 consecutive time slots
        # This is enforced by setting duration=2, which is validated in lines 145-149
        if is_lab:
            num_sessions = 1  # Labs scheduled once per week
            duration = 2      # CRITICAL: 2 consecutive slots (e.g., 10:00-13:00)
        else:
            num_sessions = 3 if credits > 3 else 2
            duration = 1

        for class_id in class_ids:
            for s_idx in range(num_sessions):
                sessions.append({
                    "id": f"{c_id}-{class_id}-{s_idx}-{allot_idx}-{uuid.uuid4().hex[:8]}",
                    "courseId": c_id,
                    "facultyId": f_id,
                    "classId": class_id,
                    "duration": duration,
                    "isLab": is_lab
                })

    # -----------------------------
    # Build Model
    # -----------------------------
    update_progress("processing", 15, "Building constraint model...")
    model = cp_model.CpModel()

    x = {}
    is_assigned = {}
    objective_terms = []
    diagnostics_conflicts = []

    # -----------------------------
    # Variables
    # -----------------------------
    for s_idx, session in enumerate(sessions):
        course = course_map[session["courseId"]]
        required_type = "lab" if session["isLab"] else "lecture"

        compatible_rooms = []
        for r_idx, room in enumerate(rooms):
            if required_type == "lab" and room["type"] == "lecture":
                continue
            if room["capacity"] < course.get("estimatedStudents", 0):
                continue
            compatible_rooms.append(r_idx)

        if not compatible_rooms:
            diagnostics_conflicts.append({
                "type": "student-clash",
                "message": f"Course {course['code']} needs {required_type} room but none available.",
                "severity": "error"
            })
            is_assigned[s_idx] = model.NewBoolVar(f"is_assigned_{s_idx}_none")
            model.Add(is_assigned[s_idx] == 0)
            objective_terms.append(1_000_000)
            continue

        vars_for_session = []

        for r_idx in compatible_rooms:
            for t_idx in range(num_slots):
                # For multi-slot sessions (labs with duration=2):
                # HARD CONSTRAINT ENFORCEMENT - Ensure consecutive slots on same day
                if session["duration"] > 1:
                    # Check if we have enough remaining slots
                    if t_idx + session["duration"] - 1 >= num_slots:
                        continue
                    # CRITICAL: Verify both slots are on the same day (consecutive requirement)
                    if all_time_slots[t_idx]["day"] != all_time_slots[t_idx + session["duration"] - 1]["day"]:
                        continue

                v = model.NewBoolVar(f"x_s{s_idx}_r{r_idx}_t{t_idx}")
                x[(s_idx, r_idx, t_idx)] = v
                vars_for_session.append(v)

        is_assigned[s_idx] = model.NewBoolVar(f"is_assigned_{s_idx}")
        model.Add(sum(vars_for_session) <= 1)
        model.Add(is_assigned[s_idx] == sum(vars_for_session))

        objective_terms.append((1 - is_assigned[s_idx]) * 100_000)

    # -----------------------------
    # Hard Constraints
    # -----------------------------
    # Room conflict
    for r_idx in range(len(rooms)):
        for t_idx in range(num_slots):
            active = []
            for s_idx, s in enumerate(sessions):
                for dt in range(s["duration"]):
                    if (s_idx, r_idx, t_idx - dt) in x:
                        active.append(x[(s_idx, r_idx, t_idx - dt)])
            if active:
                model.Add(sum(active) <= 1)

    # Faculty conflict
    for f_id in faculty_map:
        f_sessions = [i for i, s in enumerate(sessions) if s["facultyId"] == f_id]
        for t_idx in range(num_slots):
            active = []
            for s_idx in f_sessions:
                for dt in range(sessions[s_idx]["duration"]):
                    for r_idx in range(len(rooms)):
                        if (s_idx, r_idx, t_idx - dt) in x:
                            active.append(x[(s_idx, r_idx, t_idx - dt)])
            if active:
                model.Add(sum(active) <= 1)

    # Student clash - same class can't be in two places at same time
    class_ids_unique = list(set(s["classId"] for s in sessions))
    for class_id in class_ids_unique:
        class_sessions = [i for i, s in enumerate(sessions) if s["classId"] == class_id]
        for t_idx in range(num_slots):
            active = []
            for s_idx in class_sessions:
                for dt in range(sessions[s_idx]["duration"]):
                    for r_idx in range(len(rooms)):
                        if (s_idx, r_idx, t_idx - dt) in x:
                            active.append(x[(s_idx, r_idx, t_idx - dt)])
            if active:
                model.Add(sum(active) <= 1)
    
    # Max 3 classes per day per class
    for class_id in class_ids_unique:
        class_sessions = [i for i, s in enumerate(sessions) if s["classId"] == class_id]
        for day_idx in range(len(days)):
            day_vars = []
            for s_idx in class_sessions:
                for r_idx in range(len(rooms)):
                    for slot_in_day in range(slots_per_day):
                        t_idx = day_idx * slots_per_day + slot_in_day
                        if (s_idx, r_idx, t_idx) in x:
                            day_vars.append(x[(s_idx, r_idx, t_idx)])
            if day_vars:
                model.Add(sum(day_vars) <= 3)
    
    # Break constraint: After 2 consecutive classes, need a gap
    # Prevent 3 consecutive slot assignments for same class
    for class_id in class_ids_unique:
        class_sessions = [i for i, s in enumerate(sessions) if s["classId"] == class_id]
        for day_idx in range(len(days)):
            for slot_in_day in range(slots_per_day - 2):  # Check 3 consecutive slots
                t_idx1 = day_idx * slots_per_day + slot_in_day
                t_idx2 = t_idx1 + 1
                t_idx3 = t_idx2 + 1
                
                vars_slot1 = []
                vars_slot2 = []
                vars_slot3 = []
                
                for s_idx in class_sessions:
                    for r_idx in range(len(rooms)):
                        if (s_idx, r_idx, t_idx1) in x:
                            vars_slot1.append(x[(s_idx, r_idx, t_idx1)])
                        if (s_idx, r_idx, t_idx2) in x:
                            vars_slot2.append(x[(s_idx, r_idx, t_idx2)])
                        if (s_idx, r_idx, t_idx3) in x:
                            vars_slot3.append(x[(s_idx, r_idx, t_idx3)])
                
                # Cannot have 3 consecutive occupied slots
                if vars_slot1 and vars_slot2 and vars_slot3:
                    model.Add(sum(vars_slot1) + sum(vars_slot2) + sum(vars_slot3) <= 2)
    
    # Lab constraint: Max 2 lab sessions per class per week
    for class_id in class_ids_unique:
        lab_sessions_for_class = [i for i, s in enumerate(sessions) 
                                  if s["classId"] == class_id and s["isLab"]]
        if lab_sessions_for_class:
            lab_vars = []
            for s_idx in lab_sessions_for_class:
                for r_idx in range(len(rooms)):
                    for t_idx in range(num_slots):
                        if (s_idx, r_idx, t_idx) in x:
                            lab_vars.append(x[(s_idx, r_idx, t_idx)])
            if lab_vars:
                model.Add(sum(lab_vars) <= 2)  # Max 2 lab sessions per week


    # -----------------------------
    # Objective
    # -----------------------------
    slot_costs = []
    for t_idx in range(num_slots):
        local = t_idx % slots_per_day
        if local < 4:
            slot_costs.append(local)
        elif local == 4:
            slot_costs.append(100)
        else:
            slot_costs.append(10_000)

    for (s_idx, r_idx, t_idx), var in x.items():
        objective_terms.append(var * slot_costs[t_idx])

    model.Minimize(sum(objective_terms))

    # -----------------------------
    # Solve
    # -----------------------------
    update_progress("solving", 20, "Starting solver...")

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 3600
    solver.parameters.num_search_workers = 8
    solver.parameters.log_search_progress = True
    solver.parameters.cp_model_presolve = True

    status = solver.Solve(model)

    logger.info(f"Solver finished: {solver.StatusName(status)}")
    logger.info(f"Wall time: {solver.WallTime()}s")

    update_progress("processing", 95, "Processing results...")

    # -----------------------------
    # Output
    # -----------------------------
    entries = []
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for (s_idx, r_idx, t_idx), var in x.items():
            if solver.Value(var) == 1:
                s = sessions[s_idx]
                r = rooms[r_idx]
                c = course_map[s["courseId"]]
                f = faculty_map[s["facultyId"]]

                for dt in range(s["duration"]):
                    slot = all_time_slots[t_idx + dt]
                    
                    # Extract department and semester from course
                    department_code = c.get("department", "Unknown")
                    semester = c.get("semester", 1)
                    if isinstance(semester, str):
                        import re
                        match = re.search(r'\d+', semester)
                        semester = int(match.group()) if match else 1
                    
                    entries.append({
                        "id": s["id"],
                        "courseCode": c["code"],
                        "courseName": c.get("name", c["code"]),
                        "facultyName": f["name"],
                        "roomName": r["name"],
                        "classId": s["classId"],
                        "courseId": s["courseId"],
                        "facultyId": s["facultyId"],
                        "roomId": r["id"],
                        "timeSlot": {
                            "day": slot["day"],
                            "startTime": slot["startTime"],
                            "endTime": slot["endTime"]
                        },
                        "metadata": {
                            "departmentCode": department_code,
                            "semesterLevel": semester
                        }
                    })


    # Count unique sessions (not individual slot entries)
    unique_sessions = set()
    total_slots_used = 0
    for (s_idx, r_idx, t_idx), var in x.items():
        if solver.Value(var) == 1:
            unique_sessions.add(s_idx)
            total_slots_used += sessions[s_idx]["duration"]
    
    return {
        "success": bool(entries),
        "timetable": entries,
        "conflicts": diagnostics_conflicts,
        "message": "Schedule generated." if entries else "No feasible solution found.",
        "statistics": {
            "scheduledCourses": len(unique_sessions),
            "usedSlots": total_slots_used,
            "conflictsFound": len(diagnostics_conflicts)
        }
    }

