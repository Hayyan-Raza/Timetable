"""
Greedy timetable solver - Fast and lightweight.
Completes in 1-3 seconds for typical schedules.
"""

import logging
import uuid
import re
from collections import defaultdict

logger = logging.getLogger(__name__)


def generate_timetable_greedy(data, session_id=None, progress_dict=None, existing_timetables=None):
    """
    Fast greedy scheduler that assigns classes one-by-one to best available slots.
    """
    
    def update_progress(status, progress, message):
        if progress_dict and session_id:
            progress_dict[session_id].update({
                "status": status,
                "progress": progress,
                "message": message
            })
    
    update_progress("processing", 5, "Parsing input data...")
    
    # Parse input
    courses = data.get("courses", [])
    faculty = data.get("faculty", [])
    rooms = data.get("rooms", [])
    allotments = data.get("allotments", [])
    
    course_map = {c["id"]: c for c in courses}
    faculty_map = {f["id"]: f for f in faculty}
    room_map = {r["id"]: r for r in rooms}
    
    # Define time slots
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
    
    # Build conflict avoidance maps from existing timetables
    if existing_timetables is None:
        existing_timetables = []
    
    faculty_busy = defaultdict(set)  # {faculty_id: {(day, time_slot_id)}}
    room_busy = defaultdict(set)      # {room_id: {(day, time_slot_id)}}
    
    logger.info(f"Processing {len(existing_timetables)} existing timetables for conflict avoidance")
    
    for existing_tt in existing_timetables:
        entries = existing_tt.get('entries', [])
        for entry in entries:
            # Get timeSlot info
            time_slot = entry.get('timeSlot', {})
            day = time_slot.get('day')
            start_time = time_slot.get('startTime')
            
            if day and start_time:
                slot_id = f"{day}-{start_time}"
                
                # Mark faculty as busy
                faculty_id = entry.get('facultyId')
                if faculty_id:
                    faculty_busy[faculty_id].add(slot_id)
                
                # Mark room as busy
                room_id = entry.get('roomId')
                if room_id:
                    room_busy[room_id].add(slot_id)
    
    logger.info(f"Conflict avoidance: {len(faculty_busy)} faculty with occupied slots, {len(room_busy)} rooms with occupied slots")
    
    # Create sessions
    update_progress("processing", 15, "Creating course sessions...")
    sessions = []
    
    for allot_idx, allotment in enumerate(allotments):
        c_id = allotment["courseId"]
        f_id = allotment["facultyId"]
        class_ids = allotment["classIds"]
        
        course = course_map.get(c_id)
        if not course:
            continue
        
        # Get department from course
        department = course.get("department", "Unknown")
        
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
        
        if is_lab:
            logger.info(f"Lab course detected: {code} - {name}")
        
        credits = course.get("credits", 3)
        
        if is_lab:
            num_sessions = 1
            duration = 2  # 2 consecutive slots
        else:
            num_sessions = 3 if credits > 3 else 2
            duration = 1
        
        for class_id in class_ids:
            for s_idx in range(num_sessions):
                # Ensure numeric values for sorting
                semester = course.get("semester", 1)
                if isinstance(semester, str):
                    # Try to extract number from string like "Semester 3"
                    match = re.search(r'\d+', semester)
                    semester = int(match.group()) if match else 1
                elif not isinstance(semester, int):
                    semester = 1
                
                students = course.get("estimatedStudents", 30)
                if not isinstance(students, (int, float)):
                    students = 30
                
                sessions.append({
                    "id": f"{c_id}-{class_id}-{s_idx}-{uuid.uuid4().hex[:8]}",
                    "courseId": c_id,
                    "facultyId": f_id,
                    "classId": class_id,
                    "department": department,  # Track department
                    "duration": duration,
                    "isLab": is_lab,
                    "priority": get_priority(course),
                    "semester": int(semester),
                    "students": int(students)
                })
    
    # Group sessions by department
    update_progress("processing", 25, "Grouping sessions by department...")
    from collections import defaultdict
    sessions_by_dept = defaultdict(list)
    for session in sessions:
        sessions_by_dept[session["department"]].append(session)
    
    # Log department distribution
    logger.info(f"Sessions grouped into {len(sessions_by_dept)} departments:")
    for dept, dept_sessions in sessions_by_dept.items():
        logger.info(f"  {dept}: {len(dept_sessions)} sessions")
    
    # Initialize global tracking structures (shared across departments)
    schedule = {}  # (room_id, day, time_idx) -> session_id (shared resource)
    faculty_schedule = defaultdict(set)  # faculty_id -> set of (day, time_idx) (shared resource)
    
    # Department-specific tracking
    class_schedule_by_dept = {}  # dept -> {class_id -> set of (day, time_idx)}
    
    assigned = []
    conflicts = []
    
    update_progress("solving", 30, "Assigning classes to time slots with backtracking...")
    
    # Process each department separately
    dept_list = sorted(sessions_by_dept.keys())  # Alphabetical order
    total_sessions = sum(len(sessions) for sessions in sessions_by_dept.values())
    processed_sessions = 0
    
    import time
    overall_start_time = time.time()
    
    for dept_idx, department in enumerate(dept_list):
        dept_sessions = sessions_by_dept[department]
        
        # Sort sessions within department by priority
        dept_sessions.sort(key=lambda s: (-s["priority"], -s["semester"], -s["students"]))
        
        # Initialize class schedule for this department
        class_schedule_by_dept[department] = defaultdict(set)
        class_schedule = class_schedule_by_dept[department]
        
        update_progress("solving", 30 + int((dept_idx / len(dept_list)) * 50), 
                       f"Scheduling {department} ({len(dept_sessions)} sessions)...")
        logger.info(f"Processing department: {department} with {len(dept_sessions)} sessions")
        
        dept_start_time = time.time()
        
        # Try backtracking for this department
        dept_assigned_count_before = len(assigned)
        backtrack_success = backtrack_schedule(
            dept_sessions, 0, rooms, all_time_slots, schedule,
            faculty_schedule, class_schedule_by_dept, assigned,
            conflicts, course_map, depth=0, max_depth=4, start_time=overall_start_time,
            faculty_busy=faculty_busy, room_busy=room_busy
        )
        
        dept_assigned_count = len(assigned) - dept_assigned_count_before
        dept_time = time.time() - dept_start_time
        
        logger.info(f"Completed {department}: Scheduled {dept_assigned_count}/{len(dept_sessions)} sessions in {dept_time:.2f}s (backtrack: {backtrack_success})")
        
        processed_sessions += len(dept_sessions)
    
    update_progress("processing", 95, "Converting to output format...")
    
    # Convert to output format
    entries = []
    for session, room, slot_idx in assigned:
        course = course_map[session["courseId"]]
        fac = faculty_map[session["facultyId"]]
        
        for dt in range(session["duration"]):
            slot = all_time_slots[slot_idx + dt]
            entries.append({
                "id": f"{session['id']}-{dt}",
                "courseCode": course["code"],
                "courseName": course.get("name", course["code"]),
                "facultyName": fac["name"],
                "roomName": room["name"],
                "classId": session["classId"],
                "timeSlot": {
                    "day": slot["day"],
                    "startTime": slot["startTime"],
                    "endTime": slot["endTime"]
                }
            })
    
    logger.info(f"Greedy solver: Scheduled {len(assigned)}/{len(sessions)} sessions")
    
    # Calculate statistics for frontend display
    total_slots_used = sum(session[\"duration\"] for session, _, _ in assigned)
    
    return {
        "success": len(assigned) > 0,
        "timetable": entries,
        "conflicts": conflicts,
        "message": f"Scheduled {len(assigned)}/{len(sessions)} sessions. {len(conflicts)} conflicts found.",
        "statistics": {
            "scheduledCourses": len(assigned),
            "usedSlots": total_slots_used,
            "conflictsFound": len(conflicts)
        }
    }


def get_priority(course):
    """Determine course priority (0-10, higher is more important)"""
    course_type = course.get("type", "elective").lower()
    if course_type == "core":
        return 10
    elif course_type == "major":
        return 7
    else:
        return 5


def is_valid_slot(session, room, slot_idx, all_time_slots, schedule, faculty_schedule, class_schedule, faculty_busy=None, room_busy=None):
    """Check if a session can be assigned to this room and time slot"""
    
    if faculty_busy is None:
        faculty_busy = {}
    if room_busy is None:
        room_busy = {}
    
    # Check if duration fits (labs need consecutive slots on same day)
    if session["duration"] > 1:
        if slot_idx + session["duration"] - 1 >= len(all_time_slots):
            return False
        
        first_day = all_time_slots[slot_idx]["day"]
        last_day = all_time_slots[slot_idx + session["duration"] - 1]["day"]
        if first_day != last_day:
            return False
    
    # Check all slots needed for this session
    for dt in range(session["duration"]):
        current_slot = slot_idx + dt
        slot = all_time_slots[current_slot]
        day = slot["day"]
        slot_id = slot["id"]  # Format: "Monday-08:30"
        
        # Check room conflict
        room_key = (room["id"], day, current_slot)
        if room_key in schedule:
            return False
        
        # **NEW: Check room busy from existing timetables**
        if room["id"] in room_busy and slot_id in room_busy[room["id"]]:
            return False
        
        # Check faculty conflict
        faculty_key = (day, current_slot)
        if faculty_key in faculty_schedule[session["facultyId"]]:
            return False
        
        # **NEW: Check faculty busy from existing timetables**
        if session["facultyId"] in faculty_busy and slot_id in faculty_busy[session["facultyId"]]:
            return False
        
        # Check student clash (same class can't have multiple courses at same time)
        if faculty_key in class_schedule[session["classId"]]:
            return False
    
    return True


def assign_session(session, room, slot_idx, all_time_slots, schedule, faculty_schedule, class_schedule):
    """Assign a session to a room and time slot"""
    for dt in range(session["duration"]):
        current_slot = slot_idx + dt
        slot = all_time_slots[current_slot]
        day = slot["day"]
        
        # Mark room as occupied
        schedule[(room["id"], day, current_slot)] = session["id"]
        
        # Mark faculty as busy
        faculty_schedule[session["facultyId"]].add((day, current_slot))
        
        # Mark class as busy
        class_schedule[session["classId"]].add((day, current_slot))


def unassign_session(session, room, slot_idx, all_time_slots, schedule, faculty_schedule, class_schedule):
    """Undo a session assignment to enable backtracking"""
    for dt in range(session["duration"]):
        current_slot = slot_idx + dt
        slot = all_time_slots[current_slot]
        day = slot["day"]
        
        # Remove room occupation
        room_key = (room["id"], day, current_slot)
        if room_key in schedule:
            del schedule[room_key]
        
        # Remove faculty time
        faculty_key = (day, current_slot)
        if faculty_key in faculty_schedule[session["facultyId"]]:
            faculty_schedule[session["facultyId"]].remove(faculty_key)
        
        # Remove class time
        if faculty_key in class_schedule[session["classId"]]:
            class_schedule[session["classId"]].remove(faculty_key)


def check_daily_limit(session, slot_idx, all_time_slots, class_schedule):
    """
    Constraint: Max 3 classes per day per section
    Also enforces 1.5-hour break after 2 consecutive classes
    """
    slot = all_time_slots[slot_idx]
    day = slot["day"]
    class_id = session["classId"]
    
    # Get all time indices for this class on this day
    day_slots = [idx for (d, idx) in class_schedule[class_id] if d == day]
    
    # Check if adding this would exceed 3 classes per day
    if len(day_slots) >= 3:
        return False
    
    # If this would be the 3rd class, ensure there's a 1.5-hour break
    # (which means at least 1 slot gap after 2 consecutive classes)
    if len(day_slots) == 2:
        sorted_slots = sorted(day_slots + [slot_idx])
        # Check for proper spacing: should not have 3 consecutive slots
        if (sorted_slots[1] == sorted_slots[0] + 1 and 
            sorted_slots[2] == sorted_slots[1] + 1):
            return False  # Three consecutive classes without break
    
    return True


def backtrack_schedule(sessions, index, rooms, all_time_slots, schedule, 
                      faculty_schedule, class_schedule_by_dept, assigned, 
                      conflicts, course_map, depth=0, max_depth=4, start_time=None):
    """
    Recursive backtracking function to schedule sessions
    Returns True if all sessions from index onwards can be scheduled
    """
    import time
    
    # Time limit: 60 seconds
    if start_time and (time.time() - start_time) > 60:
        return False
    
    # Depth limit to prevent excessive recursion
    if depth > max_depth:
        return False
    
    # Base case: all sessions scheduled
    if index >= len(sessions):
        return True
    
    session = sessions[index]
    course = course_map[session["courseId"]]
    department = session["department"]
    class_schedule = class_schedule_by_dept[department]
    
    required_type = "lab" if session["isLab"] else "lecture"
    
    # Find compatible rooms
    compatible_rooms = []
    for room in rooms:
        if required_type == "lab" and room["type"] == "lecture":
            continue
        if room["capacity"] < course.get("estimatedStudents", 0):
            continue
        compatible_rooms.append(room)
    
    if not compatible_rooms:
        conflicts.append({
            "type": "no-room",
            "message": f"[{department}] No suitable room for {course['code']} (needs {required_type} room)",
            "severity": "error"
        })
        # Try next session without this one
        return backtrack_schedule(sessions, index + 1, rooms, all_time_slots,
                                schedule, faculty_schedule, class_schedule_by_dept,
                                assigned, conflicts, course_map, depth, max_depth, start_time)
    
    # Try each compatible room
    for room in compatible_rooms:
        # Try each time slot
        for slot_idx in range(len(all_time_slots)):
            # Check if this slot is valid
            if not is_valid_slot(session, room, slot_idx, all_time_slots,
                               schedule, faculty_schedule, class_schedule,
                               faculty_busy, room_busy):
                continue
            
            # Check daily limit constraint
            if not check_daily_limit(session, slot_idx, all_time_slots, class_schedule):
                continue
            
            # Make assignment
            assign_session(session, room, slot_idx, all_time_slots,
                         schedule, faculty_schedule, class_schedule)
            assigned.append((session, room, slot_idx))
            
            # Recursively try to schedule remaining sessions
            if backtrack_schedule(sessions, index + 1, rooms, all_time_slots,
                                schedule, faculty_schedule, class_schedule_by_dept,
                                assigned, conflicts, course_map, depth + 1, max_depth, start_time):
                return True
            
            # Backtrack: undo this assignment
            unassign_session(session, room, slot_idx, all_time_slots,
                           schedule, faculty_schedule, class_schedule)
            assigned.pop()
    
    # No valid slot found for this session, mark as conflict and continue
    conflicts.append({
        "type": "no-slot",
        "message": f"[{department}] Could not schedule {course['code']} for {session['classId']} - no valid time slots",
        "severity": "warning"
    })
    
    # Try to schedule remaining sessions
    return backtrack_schedule(sessions, index + 1, rooms, all_time_slots,
                            schedule, faculty_schedule, class_schedule_by_dept,
                            assigned, conflicts, course_map, depth, max_depth, start_time)
