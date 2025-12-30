# Timetable Generation System - Technical Overview

## Overview
This application generates clash-free weekly timetables for university classes using a **greedy algorithm with constraint validation**.

## Core Concept: Each Class Has a Unique Timetable

**Key Point**: Every class (BCS-3A, BCS-3B, BSE-4B, BAI-2A) gets its own **completely separate timetable**.

- **BCS-3A** has its own schedule with its own courses, faculty, and rooms
- **BCS-3B** has a different schedule (can overlap in time/faculty with BCS-3A)
- **BSE-4B** and **BAI-2A** also have independent schedules

Classes **do not share** courses or time slots. Each class is treated as an isolated scheduling unit.

---

## Data Model

### 1. **Courses**
Each course defines:
- `code` (e.g., CS-301)
- `name` (e.g., Database Systems)
- `credits` (2-4 credit hours)
- `type` (Core, Major, Elective)
- `requiresLab` (boolean - needs lab sessions)
- `estimatedStudents` (for room capacity matching)
- `semester` (Fall 2025, Spring 2025, etc.)

### 2. **Faculty**
Each faculty member has:
- `name` and `initials`
- `maxWeeklyHours` (teaching hour limit, typically 9-15 hours)
- `department` (CS, SE, AI)

### 3. **Rooms**
Each room has:
- `name` (e.g., CS-101, Lab-1)
- `capacity` (number of students)
- `type` (lecture, lab, or both)
- `building`

### 4. **Course Allotments**
Defines **which faculty teaches which course to which classes**:
```javascript
{
  courseId: 'cs-301',           // Database Systems
  facultyId: 'dr-ali-hassan',   // Taught by Dr. Ali Hassan
  classIds: ['BCS-3A']          // Only to BCS-3A section
}
```

### 5. **Time Slots**
Available weekly time slots (20 total):
- Monday through Friday
- 4 slots per day:
  - 09:00-10:30
  - 10:30-12:00
  - 13:00-14:30
  - 14:30-16:00

---

## How Timetable Generation Works

### Step 1: Filter Relevant Allotments
- Only considers courses for the selected **semester** (e.g., Fall 2025)
- Example: If generating for Fall 2025, only Fall courses are scheduled

### Step 2: Prioritize Courses
Courses are scheduled in priority order:
1. **Core courses first** (highest priority)
2. **Major courses** (medium priority)
3. **Elective courses** (lowest priority)
4. **Within same type**: Higher credit courses scheduled first

This ensures important courses get preferred time slots.

### Step 3: Calculate Sessions Needed
For each course-class combination:
- **Theory sessions**: 
  - 2 sessions for ≤3 credit courses
  - 3 sessions for >3 credit courses
- **Lab sessions**: 1 additional session if `requiresLab = true`

Example: Database Systems (3 credits, has lab) needs **3 sessions** (2 theory + 1 lab)

### Step 4: Schedule Sessions (Greedy Algorithm)

For each course assigned to each class:

**Phase 1: Theory Sessions**
1. Shuffle time slots randomly (ensures fair distribution)
2. Try to spread sessions across **different days** (better for students)
3. For each time slot:
   - Find suitable lecture room (capacity ≥ estimated students)
   - Check for conflicts:
     - ❌ Faculty already teaching at this time
     - ❌ Room already occupied
     - ❌ Class already has another course at this time
   - If no conflicts → **schedule the session**
   - Move to next slot

**Phase 2: Lab Sessions**
1. Use same process but only check **lab rooms**
2. Course name becomes "Course Name Lab"
3. Course code becomes "COURSE-L"

### Step 5: Conflict Detection
The algorithm validates each entry against:
- **Faculty clash**: Faculty can't teach two classes at the same time
- **Room clash**: Room can't be used by two classes simultaneously  
- **Student clash**: Same class can't have two courses at the same time
- **Faculty max hours**: Faculty can't exceed weekly teaching limit

### Step 6: Handle Unscheduled Courses
If a course can't find enough free slots:
- Mark as unscheduled
- Record conflict with severity level (error/warning)
- Continue to next course (doesn't halt entire generation)

---

## Why Classes Have Different Timetables

1. **Course Allotments Define Class Assignment**
   - Each course is explicitly assigned to specific classes
   - BCS-3A has Course A, Faculty X
   - BCS-3B might have Course B, Faculty Y
   - Different courses = different schedules

2. **Independent Scheduling**
   - Each class is scheduled separately
   - No coordination between classes
   - A class's schedule depends only on its assigned courses

3. **Resource Sharing Is Allowed**
   - Faculty can teach BCS-3A at 9:00 and BCS-3B at 10:30
   - Room CS-101 can be used by BCS-3A Monday 9:00, BSE-4B Tuesday 9:00
   - **Only constraint**: No conflicts within the same time slot

---

## Example: How BCS-3A Gets Its Timetable

**Input Data**:
- **6 courses** assigned to BCS-3A (Database Systems, Operating Systems, Software Engineering, Computer Networks, Theory of Automata, Technical Report Writing)
- **6 faculty members** teaching these courses
- **10 rooms available** (6 lecture rooms, 4 labs)
- **20 time slots** (Mon-Fri, 4 slots/day)

**Generation Process**:
1. Database Systems (3 credits, has lab) → needs 3 sessions
   - Session 1: Tuesday 09:00, Dr. Ali Hassan, CS-101 ✓
   - Session 2: Wednesday 09:00, Dr. Ali Hassan, CS-101 ✓
   - Lab: Friday 09:00, Dr. Ali Hassan, Lab-1 ✓

2. Operating Systems (3 credits, has lab) → needs 3 sessions
   - Session 1: Monday 10:30, Dr. Sara Ahmed, CS-102 ✓
   - Session 2: Friday 10:30, Dr. Sara Ahmed, CS-102 ✓
   - Lab: Friday 13:00, Dr. Sara Ahmed, Lab-2 ✓

3. ... continues for all 6 courses

**Result**: BCS-3A has approximately 16-18 scheduled sessions across the week

---

## Algorithm Type

**Greedy Algorithm with Backtracking**:
- **Greedy**: Takes first available valid slot (doesn't optimize globally)
- **Two-pass approach**: If can't spread across days, allows same-day scheduling
- **Not optimal**: Doesn't guarantee best possible schedule
- **Fast**: Generates in milliseconds
- **Practical**: Works well for typical university constraints

---

## Key Features

✅ **Clash-free**: No faculty, room, or student conflicts  
✅ **Priority-based**: Core courses get best slots  
✅ **Lab support**: Automatically schedules lab sessions  
✅ **Flexible**: Configurable by semester, department, class  
✅ **Conflict reporting**: Detailed feedback on scheduling issues  
✅ **Fair distribution**: Randomized slot selection prevents bias

---

## Limitations

- **No global optimization**: Doesn't find "best" schedule, just "valid" one
- **No preferences**: Can't specify preferred days/times
- **Greedy failures**: May fail to schedule if unlucky with early choices
- **No manual adjustments**: Can't move individual sessions after generation

---

## Summary

**Each class gets a unique timetable** because:
1. Each class has different course assignments
2. Scheduling is done independently per class
3. The system doesn't coordinate schedules across classes

The algorithm **prioritizes important courses**, **avoids all conflicts**, and **generates clash-free schedules** quickly using a greedy approach with constraint validation.
