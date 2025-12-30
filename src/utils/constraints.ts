import { TimetableEntry, TimeSlot, Conflict } from '../types/timetable.types';

/**
 * Check if two time slots overlap
 */
export function timeSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
    if (slot1.day !== slot2.day) return false;

    const start1 = timeToMinutes(slot1.startTime);
    const end1 = timeToMinutes(slot1.endTime);
    const start2 = timeToMinutes(slot2.startTime);
    const end2 = timeToMinutes(slot2.endTime);

    return start1 < end2 && start2 < end1;
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

/**
 * Check if adding this entry would cause a faculty clash
 */
export function checkFacultyClash(
    newEntry: Omit<TimetableEntry, 'id'>,
    existingEntries: TimetableEntry[]
): Conflict | null {
    const clashes = existingEntries.filter(entry =>
        entry.facultyId === newEntry.facultyId &&
        timeSlotsOverlap(entry.timeSlot, newEntry.timeSlot)
    );

    if (clashes.length > 0) {
        return {
            type: 'faculty-clash',
            message: `${newEntry.facultyName} is already teaching ${clashes[0].courseName} at this time`,
            affectedEntries: clashes.map(e => e.id),
            severity: 'error'
        };
    }

    return null;
}

/**
 * Check if adding this entry would cause a room clash
 */
export function checkRoomClash(
    newEntry: Omit<TimetableEntry, 'id'>,
    existingEntries: TimetableEntry[]
): Conflict | null {
    const clashes = existingEntries.filter(entry =>
        entry.roomId === newEntry.roomId &&
        timeSlotsOverlap(entry.timeSlot, newEntry.timeSlot)
    );

    if (clashes.length > 0) {
        return {
            type: 'room-clash',
            message: `Room ${newEntry.roomName} is already occupied by ${clashes[0].courseName} at this time`,
            affectedEntries: clashes.map(e => e.id),
            severity: 'error'
        };
    }

    return null;
}

/**
 * Check if adding this entry would cause a student clash
 * (same class having two courses at the same time)
 */
export function checkStudentClash(
    newEntry: Omit<TimetableEntry, 'id'>,
    existingEntries: TimetableEntry[]
): Conflict | null {
    const clashes = existingEntries.filter(entry =>
        entry.classId === newEntry.classId &&
        timeSlotsOverlap(entry.timeSlot, newEntry.timeSlot)
    );

    if (clashes.length > 0) {
        return {
            type: 'student-clash',
            message: `Class ${newEntry.classId} already has ${clashes[0].courseName} scheduled at this time`,
            affectedEntries: clashes.map(e => e.id),
            severity: 'error'
        };
    }

    return null;
}

/**
 * Check if room has sufficient capacity
 */
/**
 * Check if room has sufficient capacity
 * Note: This check is currently disabled per user request.
 */
export function checkRoomCapacity(
    _estimatedStudents: number,
    _roomCapacity: number
): Conflict | null {
    return null;
}

/**
 * Check all constraints for a new timetable entry
 */
export function validateEntry(
    newEntry: Omit<TimetableEntry, 'id'>,
    existingEntries: TimetableEntry[],
    roomCapacity: number,
    estimatedStudents: number
): Conflict[] {
    const conflicts: Conflict[] = [];

    const facultyClash = checkFacultyClash(newEntry, existingEntries);
    if (facultyClash) conflicts.push(facultyClash);

    const roomClash = checkRoomClash(newEntry, existingEntries);
    if (roomClash) conflicts.push(roomClash);

    const studentClash = checkStudentClash(newEntry, existingEntries);
    if (studentClash) conflicts.push(studentClash);

    const capacityIssue = checkRoomCapacity(estimatedStudents, roomCapacity);
    if (capacityIssue) conflicts.push(capacityIssue);

    const courseLimitIssue = checkFacultyCourseLimit(
        newEntry.facultyId,
        newEntry.courseCode,
        existingEntries
    );
    if (courseLimitIssue) conflicts.push(courseLimitIssue);

    return conflicts;
}

/**
 * Check if faculty has exceeded maximum weekly hours
 */
/**
 * Check if faculty has exceeded maximum weekly hours
 * Note: This check is currently disabled per user request.
 */
export function checkFacultyMaxHours(
    _facultyId: string,
    _entries: TimetableEntry[],
    _maxHours: number
): Conflict | null {
    return null;
}

/**
 * Check if faculty has exceeded maximum number of courses (4)
 */
export function checkFacultyCourseLimit(
    facultyId: string,
    newCourseCode: string,
    entries: TimetableEntry[],
    maxCourses: number = 4
): Conflict | null {
    const facultyEntries = entries.filter(e => e.facultyId === facultyId);
    const uniqueCourses = new Set(facultyEntries.map(e => e.courseCode));

    // If this course is already being taught by them, it doesn't add to the count
    if (uniqueCourses.has(newCourseCode)) {
        return null;
    }

    if (uniqueCourses.size >= maxCourses) {
        return {
            type: 'faculty-clash',
            message: `Faculty limit reached: Already teaching ${uniqueCourses.size} courses (Max ${maxCourses})`,
            affectedEntries: facultyEntries.map(e => e.id),
            severity: 'warning' // Changed from error to warning as per user request
        };
    }

    return null;
}

/**
 * Check all entries in a timetable for any kind of conflict
 */
export function checkAllConflicts(entries: TimetableEntry[]): Conflict[] {
    const conflicts: Conflict[] = [];

    for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
            const entry1 = entries[i];
            const entry2 = entries[j];

            if (timeSlotsOverlap(entry1.timeSlot, entry2.timeSlot)) {
                // 1. Faculty Clash
                if (entry1.facultyId === entry2.facultyId) {
                    conflicts.push({
                        type: 'faculty-clash',
                        message: `Teacher ${entry1.facultyName} has overlapping sessions: ${entry1.courseName} and ${entry2.courseName}`,
                        affectedEntries: [entry1.id, entry2.id],
                        severity: 'error'
                    });
                }

                // 2. Room Clash
                if (entry1.roomId === entry2.roomId) {
                    conflicts.push({
                        type: 'room-clash',
                        message: `Room ${entry1.roomName} is double-booked: ${entry1.courseName} and ${entry2.courseName}`,
                        affectedEntries: [entry1.id, entry2.id],
                        severity: 'error'
                    });
                }

                // 3. Student / Class Clash
                if (entry1.classId === entry2.classId) {
                    conflicts.push({
                        type: 'student-clash',
                        message: `Class ${entry1.classId} has overlapping sessions: ${entry1.courseName} and ${entry2.courseName}`,
                        affectedEntries: [entry1.id, entry2.id],
                        severity: 'error'
                    });
                }
            }
        }
    }

    return conflicts;
}
