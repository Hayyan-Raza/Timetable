import { TimeSlot, Room, Faculty, Course, CourseAllotment, Department, Semester, SemesterSchema } from '../types/timetable.types';

// Standard time slots (8:30 AM - 3:30 PM) - PRIORITY: Use these first
export const STANDARD_WEEKDAY_SLOTS: TimeSlot[] = [
    // Monday-Friday: 8:30 AM - 4:00 PM (4 slots of 1.5 hours each)
    { day: 'Monday', startTime: '08:30', endTime: '10:00' },
    { day: 'Monday', startTime: '10:00', endTime: '11:30' },
    { day: 'Monday', startTime: '11:30', endTime: '13:00' },
    { day: 'Monday', startTime: '14:00', endTime: '15:30' }, // 1-hour lunch break
    // Tuesday
    { day: 'Tuesday', startTime: '08:30', endTime: '10:00' },
    { day: 'Tuesday', startTime: '10:00', endTime: '11:30' },
    { day: 'Tuesday', startTime: '11:30', endTime: '13:00' },
    { day: 'Tuesday', startTime: '14:00', endTime: '15:30' },
    // Wednesday
    { day: 'Wednesday', startTime: '08:30', endTime: '10:00' },
    { day: 'Wednesday', startTime: '10:00', endTime: '11:30' },
    { day: 'Wednesday', startTime: '11:30', endTime: '13:00' },
    { day: 'Wednesday', startTime: '14:00', endTime: '15:30' },
    // Thursday
    { day: 'Thursday', startTime: '08:30', endTime: '10:00' },
    { day: 'Thursday', startTime: '10:00', endTime: '11:30' },
    { day: 'Thursday', startTime: '11:30', endTime: '13:00' },
    { day: 'Thursday', startTime: '14:00', endTime: '15:30' },
    // Friday
    { day: 'Friday', startTime: '08:30', endTime: '10:00' },
    { day: 'Friday', startTime: '10:00', endTime: '11:30' },
    { day: 'Friday', startTime: '11:30', endTime: '13:00' },
    { day: 'Friday', startTime: '14:00', endTime: '15:30' },
];

// Extended time slots (3:30 PM - 5:00 PM) - FALLBACK: Use only if standard hours are full
export const EXTENDED_WEEKDAY_SLOTS: TimeSlot[] = [
    { day: 'Monday', startTime: '15:30', endTime: '17:00' },
    { day: 'Tuesday', startTime: '15:30', endTime: '17:00' },
    { day: 'Wednesday', startTime: '15:30', endTime: '17:00' },
    { day: 'Thursday', startTime: '15:30', endTime: '17:00' },
    { day: 'Friday', startTime: '15:30', endTime: '17:00' },
];

// All weekday slots (standard + extended)
export const WEEKDAY_SLOTS: TimeSlot[] = [...STANDARD_WEEKDAY_SLOTS, ...EXTENDED_WEEKDAY_SLOTS];

// Define time slots for weekends (Semesters 7-8)
export const WEEKEND_SLOTS: TimeSlot[] = [
    // Saturday
    { day: 'Saturday', startTime: '09:00', endTime: '10:30' },
    { day: 'Saturday', startTime: '10:30', endTime: '12:00' },
    { day: 'Saturday', startTime: '12:00', endTime: '13:30' },
    { day: 'Saturday', startTime: '13:30', endTime: '15:00' },
    { day: 'Saturday', startTime: '15:00', endTime: '16:30' },
    { day: 'Saturday', startTime: '16:30', endTime: '18:00' },
    // Sunday
    { day: 'Sunday', startTime: '09:00', endTime: '10:30' },
    { day: 'Sunday', startTime: '10:30', endTime: '12:00' },
    { day: 'Sunday', startTime: '12:00', endTime: '13:30' },
    { day: 'Sunday', startTime: '13:30', endTime: '15:00' },
    { day: 'Sunday', startTime: '15:00', endTime: '16:30' },
    { day: 'Sunday', startTime: '16:30', endTime: '18:00' },
];

export const TIME_SLOTS: TimeSlot[] = [...WEEKDAY_SLOTS, ...WEEKEND_SLOTS];

export const DEPARTMENTS: Department[] = [
    { id: 'dept-bscs', name: 'Computer Science', code: 'BSCS', sections: [] }
];

export const SEMESTERS: Semester[] = [
    { id: 'sem-1', name: 'Semester 1', type: 'Fall', year: 1, active: true },
    { id: 'sem-2', name: 'Semester 2', type: 'Spring', year: 1, active: true },
    { id: 'sem-3', name: 'Semester 3', type: 'Fall', year: 2, active: true },
    { id: 'sem-4', name: 'Semester 4', type: 'Spring', year: 2, active: true },
    { id: 'sem-5', name: 'Semester 5', type: 'Fall', year: 3, active: true },
    { id: 'sem-6', name: 'Semester 6', type: 'Spring', year: 3, active: true },
    { id: 'sem-7', name: 'Semester 7', type: 'Fall', year: 4, active: true },
    { id: 'sem-8', name: 'Semester 8', type: 'Spring', year: 4, active: true },
];

export const COURSES: Course[] = [
    // Semester 1
    { id: 'MT1150', code: 'MT1150', name: 'Basic Maths - I', credits: 3, type: 'Core', semester: 'Semester 1', requiresLab: false, estimatedStudents: 50 },
    { id: 'CS1410', code: 'CS1410', name: 'Computer Programming', credits: 3, type: 'Core', semester: 'Semester 1', requiresLab: false, estimatedStudents: 50 },
    { id: 'CS1411', code: 'CS1411', name: 'Computer Programming Lab', credits: 1, type: 'Core', semester: 'Semester 1', requiresLab: true, estimatedStudents: 50 },
    { id: 'SS1410', code: 'SS1410', name: 'Ethics', credits: 2, type: 'Core', semester: 'Semester 1', requiresLab: false, estimatedStudents: 50 },
    { id: 'SS1100', code: 'SS1100', name: 'Freshman English', credits: 3, type: 'Core', semester: 'Semester 1', requiresLab: false, estimatedStudents: 50 },
    { id: 'CS1210', code: 'CS1210', name: 'Introduction to Computing', credits: 3, type: 'Core', semester: 'Semester 1', requiresLab: false, estimatedStudents: 50 },
    { id: 'CS1211', code: 'CS1211', name: 'Introduction to Computing Lab', credits: 1, type: 'Core', semester: 'Semester 1', requiresLab: true, estimatedStudents: 50 },
    { id: 'SS1400', code: 'SS1400', name: 'Islamic Studies', credits: 2, type: 'Core', semester: 'Semester 1', requiresLab: false, estimatedStudents: 50 },
    { id: 'MG1100', code: 'MG1100', name: 'Principles of Management', credits: 3, type: 'Elective', semester: 'Semester 1', requiresLab: false, estimatedStudents: 50 },

    // Semester 2
    { id: 'NS1240', code: 'NS1240', name: 'Applied Physics', credits: 3, type: 'Core', semester: 'Semester 2', requiresLab: false, estimatedStudents: 50 },
    { id: 'MT1160', code: 'MT1160', name: 'Basic Maths - II', credits: 3, type: 'Core', semester: 'Semester 2', requiresLab: false, estimatedStudents: 50 },
    { id: 'MT1140', code: 'MT1140', name: 'Calculus and Analytical Geometry', credits: 3, type: 'Core', semester: 'Semester 2', requiresLab: false, estimatedStudents: 50 },
    { id: 'CS2620', code: 'CS2620', name: 'Discrete Structures', credits: 3, type: 'Core', semester: 'Semester 2', requiresLab: false, estimatedStudents: 50 },
    { id: 'CS1420', code: 'CS1420', name: 'Object Oriented Programming', credits: 3, type: 'Core', semester: 'Semester 2', requiresLab: false, estimatedStudents: 50 },
    { id: 'CS1421', code: 'CS1421', name: 'Object Oriented Programming Lab', credits: 1, type: 'Core', semester: 'Semester 2', requiresLab: true, estimatedStudents: 50 },
    { id: 'SS2120', code: 'SS2120', name: 'Oral Communications', credits: 3, type: 'Core', semester: 'Semester 2', requiresLab: false, estimatedStudents: 50 },

    // Semester 3
    { id: 'CS2510', code: 'CS2510', name: 'Data Structure & Algorithms', credits: 3, type: 'Core', semester: 'Semester 3', requiresLab: false, estimatedStudents: 50 },
    { id: 'CS2511', code: 'CS2511', name: 'Data Structure & Algorithms Lab', credits: 1, type: 'Core', semester: 'Semester 3', requiresLab: true, estimatedStudents: 50 },
    { id: 'SS2300', code: 'SS2300', name: 'Principles Of Psychology', credits: 3, type: 'Elective', semester: 'Semester 3', requiresLab: false, estimatedStudents: 50 },
    { id: 'MT2210', code: 'MT2210', name: 'Linear Algebra', credits: 3, type: 'Core', semester: 'Semester 3', requiresLab: false, estimatedStudents: 50 },
    { id: 'MT2300', code: 'MT2300', name: 'Probability and Statistics', credits: 3, type: 'Core', semester: 'Semester 3', requiresLab: false, estimatedStudents: 50 },
    { id: 'CS3110', code: 'CS3110', name: 'Software Engineering', credits: 3, type: 'Core', semester: 'Semester 3', requiresLab: false, estimatedStudents: 50 },
    { id: 'CS3111', code: 'CS3111', name: 'Software Engineering Lab', credits: 1, type: 'Core', semester: 'Semester 3', requiresLab: true, estimatedStudents: 50 },

    // Semester 4
    { id: 'CS2230', code: 'CS2230', name: 'Database Management Systems', credits: 3, type: 'Core', semester: 'Semester 4', requiresLab: false, estimatedStudents: 50 },
    { id: 'CS2231', code: 'CS2231', name: 'Database Management Systems Lab', credits: 1, type: 'Core', semester: 'Semester 4', requiresLab: true, estimatedStudents: 50 },
    { id: 'MT2200', code: 'MT2200', name: 'Differential Equations', credits: 3, type: 'Core', semester: 'Semester 4', requiresLab: false, estimatedStudents: 50 },
    { id: 'CS1230', code: 'CS1230', name: 'Digital Logic Design', credits: 3, type: 'Core', semester: 'Semester 4', requiresLab: false, estimatedStudents: 50 },
    { id: 'CS1231', code: 'CS1231', name: 'Digital Logic Design Lab', credits: 1, type: 'Core', semester: 'Semester 4', requiresLab: true, estimatedStudents: 50 },
    { id: 'MG4340', code: 'MG4340', name: 'Organizational Behavior', credits: 3, type: 'Elective', semester: 'Semester 4', requiresLab: false, estimatedStudents: 50 },
    { id: 'CS2520', code: 'CS2520', name: 'Theory of Automata', credits: 3, type: 'Core', semester: 'Semester 4', requiresLab: false, estimatedStudents: 50 },

    // Semester 5
    { id: 'CS2210', code: 'CS2210', name: 'Computer Organization and Assembly Language', credits: 3, type: 'Core', semester: 'Semester 5', requiresLab: false, estimatedStudents: 50 },
    { id: 'CS2211', code: 'CS2211', name: 'Computer Organization and Assembly Language Lab', credits: 1, type: 'Core', semester: 'Semester 5', requiresLab: true, estimatedStudents: 50 },
    { id: 'CS3210', code: 'CS3210', name: 'Data Communications & Networking', credits: 3, type: 'Core', semester: 'Semester 5', requiresLab: false, estimatedStudents: 50 },
    { id: 'CS3211', code: 'CS3211', name: 'Data Communications & Networking Lab', credits: 1, type: 'Core', semester: 'Semester 5', requiresLab: true, estimatedStudents: 50 },
    { id: 'CS3520', code: 'CS3520', name: 'Design and Analysis of Algorithms', credits: 3, type: 'Core', semester: 'Semester 5', requiresLab: false, estimatedStudents: 50 },
    { id: 'CS3220', code: 'CS3220', name: 'Operating Systems', credits: 3, type: 'Core', semester: 'Semester 5', requiresLab: false, estimatedStudents: 50 },
    { id: 'CS3221', code: 'CS3221', name: 'Operating Systems Lab', credits: 1, type: 'Core', semester: 'Semester 5', requiresLab: true, estimatedStudents: 50 },
    { id: 'SS3130', code: 'SS3130', name: 'Technical Report Writing', credits: 3, type: 'Core', semester: 'Semester 5', requiresLab: false, estimatedStudents: 50 },

    // Semester 6
    { id: 'CS3310', code: 'CS3310', name: 'Artificial Intelligence', credits: 3, type: 'Core', semester: 'Semester 6', requiresLab: false, estimatedStudents: 50 },
    { id: 'CS3311', code: 'CS3311', name: 'Artificial Intelligence Lab', credits: 1, type: 'Core', semester: 'Semester 6', requiresLab: true, estimatedStudents: 50 },
    { id: 'CS3XX0-1', code: 'CS3XX0-1', name: 'CS Elective - II', credits: 3, type: 'Elective', semester: 'Semester 6', requiresLab: false, estimatedStudents: 50 },
    { id: 'CS3XX0-2', code: 'CS3XX0-2', name: 'CS Elective-I', credits: 3, type: 'Elective', semester: 'Semester 6', requiresLab: false, estimatedStudents: 50 },
    { id: 'MT3XX0', code: 'MT3XX0', name: 'Math Elective', credits: 3, type: 'Elective', semester: 'Semester 6', requiresLab: false, estimatedStudents: 50 },
    { id: 'CS3230', code: 'CS3230', name: 'Parallel and Distributed Computing', credits: 3, type: 'Core', semester: 'Semester 6', requiresLab: false, estimatedStudents: 50 },

    // Semester 7
    { id: 'CS4XX0-1', code: 'CS4XX0-1', name: 'CS Elective-III', credits: 3, type: 'Elective', semester: 'Semester 7', requiresLab: false, estimatedStudents: 50 },
    { id: 'CS4150', code: 'CS4150', name: 'Final Year Project-I', credits: 3, type: 'Core', semester: 'Semester 7', requiresLab: false, estimatedStudents: 50 },
    { id: 'CS4110', code: 'CS4110', name: 'Human Computer Interaction', credits: 3, type: 'Core', semester: 'Semester 7', requiresLab: false, estimatedStudents: 50 },
    { id: 'CS4310', code: 'CS4310', name: 'Information & Network Security', credits: 3, type: 'Core', semester: 'Semester 7', requiresLab: false, estimatedStudents: 50 },
    { id: 'MT3410', code: 'MT3410', name: 'Numerical Computing', credits: 3, type: 'Core', semester: 'Semester 7', requiresLab: false, estimatedStudents: 50 },
    { id: 'SS1420', code: 'SS1420', name: 'Pakistan Studies', credits: 2, type: 'Core', semester: 'Semester 7', requiresLab: false, estimatedStudents: 50 },

    // Semester 8
    { id: 'CS3510', code: 'CS3510', name: 'Compiler Construction', credits: 3, type: 'Core', semester: 'Semester 8', requiresLab: false, estimatedStudents: 50 },
    { id: 'CS4XX0-2', code: 'CS4XX0-2', name: 'CS Elective-IV', credits: 3, type: 'Elective', semester: 'Semester 8', requiresLab: false, estimatedStudents: 50 },
    { id: 'CS4160', code: 'CS4160', name: 'Final Year Project-II', credits: 3, type: 'Core', semester: 'Semester 8', requiresLab: false, estimatedStudents: 50 },
    { id: 'SS2310', code: 'SS2310', name: 'Principles Of Sociology', credits: 3, type: 'Elective', semester: 'Semester 8', requiresLab: false, estimatedStudents: 50 },
    { id: 'CS4220', code: 'CS4220', name: 'Professional Issues in Computing', credits: 3, type: 'Core', semester: 'Semester 8', requiresLab: false, estimatedStudents: 50 },
];

export const SCHEMAS: SemesterSchema[] = [
    { id: 'schema-sem-1', departmentId: 'dept-bscs', semesterId: 'Semester 1', courseIds: ['MT1150', 'CS1410', 'CS1411', 'SS1410', 'SS1100', 'CS1210', 'CS1211', 'SS1400', 'MG1100'] },
    { id: 'schema-sem-2', departmentId: 'dept-bscs', semesterId: 'Semester 2', courseIds: ['NS1240', 'MT1160', 'MT1140', 'CS2620', 'CS1420', 'CS1421', 'SS2120'] },
    { id: 'schema-sem-3', departmentId: 'dept-bscs', semesterId: 'Semester 3', courseIds: ['CS2510', 'CS2511', 'SS2300', 'MT2210', 'MT2300', 'CS3110', 'CS3111'] },
    { id: 'schema-sem-4', departmentId: 'dept-bscs', semesterId: 'Semester 4', courseIds: ['CS2230', 'CS2231', 'MT2200', 'CS1230', 'CS1231', 'MG4340', 'CS2520'] },
    { id: 'schema-sem-5', departmentId: 'dept-bscs', semesterId: 'Semester 5', courseIds: ['CS2210', 'CS2211', 'CS3210', 'CS3211', 'CS3520', 'CS3220', 'CS3221', 'SS3130'] },
    { id: 'schema-sem-6', departmentId: 'dept-bscs', semesterId: 'Semester 6', courseIds: ['CS3310', 'CS3311', 'CS3XX0-1', 'CS3XX0-2', 'MT3XX0', 'CS3230'] },
    { id: 'schema-sem-7', departmentId: 'dept-bscs', semesterId: 'Semester 7', courseIds: ['CS4XX0-1', 'CS4150', 'CS4110', 'CS4310', 'MT3410', 'SS1420'] },
    { id: 'schema-sem-8', departmentId: 'dept-bscs', semesterId: 'Semester 8', courseIds: ['CS3510', 'CS4XX0-2', 'CS4160', 'SS2310', 'CS4220'] },
];

export const FACULTY: Faculty[] = [
    // Computer Science Faculty
    { id: 'fac-001', name: 'Dr. Ali Hassan', initials: 'AH', department: 'CS', maxWeeklyHours: 12 },
    { id: 'fac-002', name: 'Dr. Sara Ahmed', initials: 'SA', department: 'CS', maxWeeklyHours: 12 },
    { id: 'fac-003', name: 'Dr. Muhammad Khan', initials: 'MK', department: 'CS', maxWeeklyHours: 12 },
    { id: 'fac-004', name: 'Dr. Fatima Malik', initials: 'FM', department: 'CS', maxWeeklyHours: 12 },
    { id: 'fac-005', name: 'Dr. Ahmed Raza', initials: 'AR', department: 'CS', maxWeeklyHours: 12 },
    { id: 'fac-006', name: 'Dr. Ayesha Siddiqui', initials: 'AS', department: 'CS', maxWeeklyHours: 12 },
    { id: 'fac-007', name: 'Dr. Hassan Mehmood', initials: 'HM', department: 'CS', maxWeeklyHours: 12 },
    { id: 'fac-008', name: 'Dr. Zainab Tariq', initials: 'ZT', department: 'CS', maxWeeklyHours: 12 },

    // Mathematics Faculty
    { id: 'fac-009', name: 'Dr. Imran Shah', initials: 'IS', department: 'Math', maxWeeklyHours: 12 },
    { id: 'fac-010', name: 'Dr. Nadia Qureshi', initials: 'NQ', department: 'Math', maxWeeklyHours: 12 },

    // Humanities Faculty
    { id: 'fac-011', name: 'Dr. Kamran Javed', initials: 'KJ', department: 'Humanities', maxWeeklyHours: 12 },
    { id: 'fac-012', name: 'Dr. Sana Malik', initials: 'SM', department: 'Humanities', maxWeeklyHours: 12 },

    // Management Faculty
    { id: 'fac-013', name: 'Dr. Bilal Aziz', initials: 'BA', department: 'Management', maxWeeklyHours: 12 },

    // Science Faculty
    { id: 'fac-014', name: 'Dr. Usman Farooq', initials: 'UF', department: 'Science', maxWeeklyHours: 12 },

    // Additional CS Faculty
    { id: 'fac-015', name: 'Dr. Rabia Khalid', initials: 'RK', department: 'CS', maxWeeklyHours: 12 },
];

export const ROOMS: Room[] = [
    // Lecture Rooms - Main Building
    { id: 'room-001', name: 'CS-101', capacity: 60, type: 'lecture', building: 'Main' },
    { id: 'room-002', name: 'CS-102', capacity: 60, type: 'lecture', building: 'Main' },
    { id: 'room-003', name: 'CS-103', capacity: 60, type: 'lecture', building: 'Main' },
    { id: 'room-004', name: 'CS-104', capacity: 60, type: 'lecture', building: 'Main' },
    { id: 'room-005', name: 'CS-201', capacity: 80, type: 'lecture', building: 'Main' },
    { id: 'room-006', name: 'CS-202', capacity: 80, type: 'lecture', building: 'Main' },
    { id: 'room-007', name: 'CS-203', capacity: 80, type: 'lecture', building: 'Main' },
    { id: 'room-008', name: 'LH-1', capacity: 100, type: 'lecture', building: 'Main' },
    { id: 'room-009', name: 'LH-2', capacity: 100, type: 'lecture', building: 'Main' },
    { id: 'room-010', name: 'LH-3', capacity: 120, type: 'lecture', building: 'Main' },

    // Computer Labs
    { id: 'room-011', name: 'Lab-1', capacity: 40, type: 'lab', building: 'Lab Block' },
    { id: 'room-012', name: 'Lab-2', capacity: 40, type: 'lab', building: 'Lab Block' },
    { id: 'room-013', name: 'Lab-3', capacity: 40, type: 'lab', building: 'Lab Block' },
    { id: 'room-014', name: 'Lab-4', capacity: 40, type: 'lab', building: 'Lab Block' },
    { id: 'room-015', name: 'Lab-5', capacity: 50, type: 'lab', building: 'Lab Block' },
    { id: 'room-016', name: 'Lab-6', capacity: 50, type: 'lab', building: 'Lab Block' },

    // Multi-purpose Rooms
    { id: 'room-017', name: 'MP-1', capacity: 60, type: 'both', building: 'Main' },
    { id: 'room-018', name: 'MP-2', capacity: 60, type: 'both', building: 'Main' },
    { id: 'room-019', name: 'MP-3', capacity: 70, type: 'both', building: 'Main' },
    { id: 'room-020', name: 'MP-4', capacity: 70, type: 'both', building: 'Main' },
];

export const COURSE_ALLOTMENTS: CourseAllotment[] = [];
