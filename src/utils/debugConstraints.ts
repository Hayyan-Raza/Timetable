import { TimetableEntry, TimeSlot, Conflict, Room, Course } from '../types/timetable.types';

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

/**
 * Check if two time slots overlap
 */
function _timeSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
    if (slot1.day !== slot2.day) return false;

    const start1 = timeToMinutes(slot1.startTime);
    const end1 = timeToMinutes(slot1.endTime);
    const start2 = timeToMinutes(slot2.startTime);
    const end2 = timeToMinutes(slot2.endTime);

    return start1 < end2 && start2 < end1;
}

/**
 * Get duration of a time slot in minutes
 */
function _getSlotDuration(slot: TimeSlot): number {
    return timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime);
}

/**
 * Check if a class has more than 3 courses in a single day (soft constraint)
 */
export function checkDailyClassLimit(entries: TimetableEntry[]): Conflict[] {
    const conflicts: Conflict[] = [];
    const classDayMap = new Map<string, Map<string, TimetableEntry[]>>();

    // Group entries by class and day
    entries.forEach(entry => {
        const classKey = entry.classId;
        if (!classDayMap.has(classKey)) {
            classDayMap.set(classKey, new Map());
        }
        const dayMap = classDayMap.get(classKey)!;
        const day = entry.timeSlot.day;
        if (!dayMap.has(day)) {
            dayMap.set(day, []);
        }
        dayMap.get(day)!.push(entry);
    });

    // Check for violations
    classDayMap.forEach((dayMap, classId) => {
        dayMap.forEach((dayEntries, day) => {
            // Count unique courses (avoid counting multi-slot labs multiple times)
            const uniqueCourses = new Set(dayEntries.map(e => e.courseCode));

            if (uniqueCourses.size > 3) {
                conflicts.push({
                    type: 'daily-limit',
                    message: `${classId} has ${uniqueCourses.size} courses on ${day} (max: 3)`,
                    affectedEntries: dayEntries.map(e => e.id),
                    severity: 'warning'
                });
            }
        });
    });

    return conflicts;
}

/**
 * Check for missing breaks after consecutive classes (soft constraint)
 */
export function checkBreakRequirement(entries: TimetableEntry[]): Conflict[] {
    const conflicts: Conflict[] = [];
    const classDayMap = new Map<string, Map<string, TimetableEntry[]>>();

    // Group entries by class and day
    entries.forEach(entry => {
        const classKey = entry.classId;
        if (!classDayMap.has(classKey)) {
            classDayMap.set(classKey, new Map());
        }
        const dayMap = classDayMap.get(classKey)!;
        const day = entry.timeSlot.day;
        if (!dayMap.has(day)) {
            dayMap.set(day, []);
        }
        dayMap.get(day)!.push(entry);
    });

    // Check for violations
    classDayMap.forEach((dayMap, classId) => {
        dayMap.forEach((dayEntries, day) => {
            // Sort by start time
            const sorted = [...dayEntries].sort((a, b) =>
                timeToMinutes(a.timeSlot.startTime) - timeToMinutes(b.timeSlot.startTime)
            );

            // Check for 3+ consecutive classes without proper break
            for (let i = 0; i < sorted.length - 2; i++) {
                const first = sorted[i];
                const second = sorted[i + 1];
                const third = sorted[i + 2];

                // Check if they're consecutive (end time of one = start time of next)
                const firstEnd = timeToMinutes(first.timeSlot.endTime);
                const secondStart = timeToMinutes(second.timeSlot.startTime);
                const secondEnd = timeToMinutes(second.timeSlot.endTime);
                const thirdStart = timeToMinutes(third.timeSlot.startTime);

                const isConsecutive12 = firstEnd === secondStart;
                const isConsecutive23 = secondEnd === thirdStart;

                if (isConsecutive12 && isConsecutive23) {
                    conflicts.push({
                        type: 'break-requirement',
                        message: `${classId} has 3 consecutive classes on ${day} without a 1.5-hour break`,
                        affectedEntries: [first.id, second.id, third.id],
                        severity: 'warning'
                    });
                }
            }
        });
    });

    return conflicts;
}

/**
 * Check if lab sessions occupy consecutive time slots on the same day
 */
export function checkLabContinuity(entries: TimetableEntry[]): Conflict[] {
    const conflicts: Conflict[] = [];

    // Group entries by course and class (to find lab sessions)
    const sessionMap = new Map<string, TimetableEntry[]>();

    entries.forEach(entry => {
        const key = `${entry.courseCode}-${entry.classId}`;
        if (!sessionMap.has(key)) {
            sessionMap.set(key, []);
        }
        sessionMap.get(key)!.push(entry);
    });

    sessionMap.forEach((sessionEntries) => {
        // Check if this is a lab (multiple entries for same course-class on same day)
        const dayMap = new Map<string, TimetableEntry[]>();
        sessionEntries.forEach(entry => {
            const day = entry.timeSlot.day;
            if (!dayMap.has(day)) {
                dayMap.set(day, []);
            }
            dayMap.get(day)!.push(entry);
        });

        dayMap.forEach((dayEntries, day) => {
            if (dayEntries.length > 1) {
                // This is likely a lab session - check continuity
                const sorted = [...dayEntries].sort((a, b) =>
                    timeToMinutes(a.timeSlot.startTime) - timeToMinutes(b.timeSlot.startTime)
                );

                // Check if all slots are consecutive
                for (let i = 0; i < sorted.length - 1; i++) {
                    const current = sorted[i];
                    const next = sorted[i + 1];
                    const currentEnd = timeToMinutes(current.timeSlot.endTime);
                    const nextStart = timeToMinutes(next.timeSlot.startTime);

                    if (currentEnd !== nextStart) {
                        conflicts.push({
                            type: 'lab-continuity',
                            message: `Lab ${current.courseCode} for ${current.classId} has non-consecutive slots on ${day}`,
                            affectedEntries: dayEntries.map(e => e.id),
                            severity: 'warning'
                        });
                        break; // Report only once per lab session
                    }
                }
            }
        });
    });

    return conflicts;
}

/**
 * Check for room type mismatches (labs in lecture-only rooms)
 */
export function checkRoomTypeMismatch(entries: TimetableEntry[], rooms: Room[], courses: Course[]): Conflict[] {
    const conflicts: Conflict[] = [];
    const roomMap = new Map(rooms.map(r => [r.id, r]));
    const courseMap = new Map(courses.map(c => [c.id, c]));

    entries.forEach(entry => {
        const room = roomMap.get(entry.roomId);
        const course = courseMap.get(entry.courseId);

        if (room && course) {
            // Check if lab course is in lecture-only room
            if (course.requiresLab && room.type === 'lecture') {
                conflicts.push({
                    type: 'room-type-mismatch',
                    message: `Lab course ${entry.courseCode} scheduled in lecture-only room ${entry.roomName}`,
                    affectedEntries: [entry.id],
                    severity: 'error'
                });
            }
        }
    });

    return conflicts;
}

/**
 * Check for capacity violations (students exceeding room capacity)
 */
export function checkCapacityViolations(entries: TimetableEntry[], rooms: Room[], courses: Course[]): Conflict[] {
    const conflicts: Conflict[] = [];
    const roomMap = new Map(rooms.map(r => [r.id, r]));
    const courseMap = new Map(courses.map(c => [c.id, c]));

    entries.forEach(entry => {
        const room = roomMap.get(entry.roomId);
        const course = courseMap.get(entry.courseId);

        if (room && course) {
            const estimatedStudents = course.estimatedStudents || 0;
            if (estimatedStudents > room.capacity) {
                conflicts.push({
                    type: 'capacity-overflow',
                    message: `Room ${entry.roomName} (capacity: ${room.capacity}) has ${estimatedStudents} students for ${entry.courseCode}`,
                    affectedEntries: [entry.id],
                    severity: 'warning'
                });
            }
        }
    });

    return conflicts;
}

/**
 * Run all debug constraint checks and return comprehensive list of issues
 */
export function checkAllDebugIssues(
    entries: TimetableEntry[],
    rooms: Room[],
    courses: Course[],
    generationConflicts: Conflict[]
): Conflict[] {
    const allIssues: Conflict[] = [];

    // Hard conflicts (existing from regular conflict checking)
    // These would typically come from checkAllConflicts in constraints.ts

    // Soft constraints
    allIssues.push(...checkDailyClassLimit(entries));
    allIssues.push(...checkBreakRequirement(entries));

    // Scheduling issues
    allIssues.push(...checkLabContinuity(entries));
    allIssues.push(...checkRoomTypeMismatch(entries, rooms, courses));
    allIssues.push(...checkCapacityViolations(entries, rooms, courses));

    // Include backend generation conflicts (unscheduled sessions, no-room, no-slot)
    allIssues.push(...generationConflicts);

    return allIssues;
}
