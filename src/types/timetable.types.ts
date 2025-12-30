// Core type definitions for timetable system

export interface TimeSlot {
    day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
    startTime: string; // Format: "HH:MM"
    endTime: string;   // Format: "HH:MM"
}

export interface Room {
    id: string;
    name: string;
    capacity: number;
    type: 'lecture' | 'lab' | 'both';
    building?: string;
}

export interface Faculty {
    id: string;
    name: string;
    initials: string;
    maxWeeklyHours: number;
    department?: string;
}

export interface Course {
    id: string;
    code: string;
    name: string;
    credits: number;
    type: 'Core' | 'Major' | 'Elective';
    semester: string;
    department: string; // e.g., "BSCS", "BSSE", "BSAI"
    requiresLab: boolean;
    estimatedStudents: number;
}

export interface CourseAllotment {
    courseId: string;
    facultyId: string;
    classIds: string[]; // e.g., ["BCS-3A", "BCS-3B"]
    preferredRoomId?: string; // Room assignment from CSV import
    department?: string; // Allow department override from course default
    manualSchedule?: {
        day: string;
        time: string; // "08:30 - 10:00 AM"
    };
}

export interface TimetableEntry {
    id: string;
    courseId: string;
    courseName: string;
    courseCode: string;
    facultyId: string;
    facultyName: string;
    roomId: string;
    roomName: string;
    classId: string; // e.g., "BCS-3A"
    timeSlot: TimeSlot;
    semester: string;
    // Explicit metadata for filtering
    metadata?: {
        departmentCode: string; // e.g., "BSCS" or "BS-AI"
        semesterName: string;   // e.g., "Semester 1"
        semesterLevel: number;  // e.g., 1
    };
}

export interface Conflict {
    type: 'faculty-clash' | 'room-clash' | 'student-clash' | 'capacity-overflow' |
    'daily-limit' | 'break-requirement' | 'lab-continuity' |
    'room-type-mismatch' | 'unscheduled' | 'no-room' | 'no-slot';
    message: string;
    affectedEntries: string[]; // Entry IDs
    severity: 'error' | 'warning';
}

export interface GenerationConfig {
    semester: string;
    department: string;
    classes: string[];
    allowConflicts?: boolean;
    prioritizeCore?: boolean;
}

export interface GenerationResult {
    success: boolean;
    timetable: TimetableEntry[];
    conflicts: Conflict[];
    statistics: {
        totalCourses: number;
        scheduledCourses: number;
        unscheduledCourses: number;
        totalSlots: number;
        usedSlots: number;
        conflictsFound: number;
    };
    message: string;
}


export interface Section {
    id: string;
    code: string;          // AM, BM, CM, DM, EM, FM, GM, AW
    name: string;          // e.g., "Section A Morning"
    semester: string;      // "1", "2", "3", etc.
}

export interface Department {
    id: string;
    name: string;
    code: string;
    sections: Section[];   // All sections for this department across all semesters
}

export interface Semester {
    id: string;
    name: string;
    type: 'Fall' | 'Spring' | 'Summer';
    year: number;
    active: boolean;
}

export interface SemesterSchema {
    id: string;
    departmentId: string;
    semesterId: string; // e.g., link to "Semester 1"
    courseIds: string[]; // List of courses in this semester for this dept
}

export interface TimetableState {
    entries: TimetableEntry[];
    courses: Course[];
    faculty: Faculty[];
    rooms: Room[];
    allotments: CourseAllotment[];
    departments: Department[];
    semesters: Semester[];
    schemas: SemesterSchema[];
    generationConflicts: Conflict[];
    lastGenerated: string | null;
    navigationFilter: {
        department?: string;
        semesterLevel?: string;
        classId?: string;
    } | null;
    debugMode: boolean;
}
