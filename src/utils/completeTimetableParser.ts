/**
 * Complete Timetable CSV Parser
 * Extracts courses, faculty, rooms, and allotments from a comprehensive timetable CSV
 */

import { Course, Faculty, Room, CourseAllotment } from '../types/timetable.types';

export interface CompleteTimetableData {
    courses: Course[];
    faculty: Faculty[];
    rooms: Room[];
    allotments: CourseAllotment[];
}

export interface ParseResult {
    success: boolean;
    data?: CompleteTimetableData;
    errors: string[];
    summary: {
        coursesCount: number;
        facultyCount: number;
        roomsCount: number;
        allotmentsCount: number;
    };
}

/**
 * Generate course code from subject name if not provided
 */
function generateCourseCode(subject: string, semester: string): string {
    // Extract first letters of words
    const words = subject.split(' ').filter(w => w.length > 0);
    const prefix = words.slice(0, 2).map(w => w[0].toUpperCase()).join('');
    return `${prefix}${semester}${Math.floor(Math.random() * 100)}`;
}

/**
 * Generate initials from faculty name
 */
function generateInitials(name: string): string {
    const words = name.trim().split(' ').filter(w => w.length > 0);
    return words.map(w => w[0].toUpperCase()).join('');
}

/**
 * Detect if a course is a lab course
 */
function isLabCourse(subject: string): boolean {
    return subject.toLowerCase().includes('lab');
}

/**
 * Detect room type from room name
 */
function detectRoomType(roomName: string): 'lecture' | 'lab' | 'both' {
    const name = roomName.toLowerCase();
    if (name.includes('lab') || name.includes('-c') || name.includes('c-')) {
        return 'lab';
    }
    return 'lecture';
}

/**
 * Parse time string to 24-hour format
 */
function parseTimeSlot(timeStr: string): { day: string; startTime: string; endTime: string } | null {
    try {
        // Example: "08:30 - 10:00 AM"
        const parts = timeStr.split('-').map(p => p.trim());
        if (parts.length !== 2) return null;

        const startPart = parts[0];
        const endPart = parts[1];

        // Extract AM/PM from end part
        const isPM = endPart.toLowerCase().includes('pm');
        const isAM = endPart.toLowerCase().includes('am');

        // Parse start time
        let [startHour, startMin] = startPart.split(':').map(s => parseInt(s.replace(/[^\d]/g, '')));
        if (isPM && startHour !== 12) startHour += 12;
        if (isAM && startHour === 12) startHour = 0;

        // Parse end time
        let [endHour, endMin] = endPart.split(':').map(s => parseInt(s.replace(/[^\d]/g, '')));
        if (isPM && endHour !== 12) endHour += 12;
        if (isAM && endHour === 12) endHour = 0;

        return {
            day: '',
            startTime: `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`,
            endTime: `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`
        };
    } catch {
        return null;
    }
}

/**
 * Parse complete timetable CSV
 */
export async function parseCompleteTimetable(file: File): Promise<ParseResult> {

    try {
        // Read file
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
            return {
                success: false,
                errors: ['CSV file must have at least a header row and one data row'],
                summary: { coursesCount: 0, facultyCount: 0, roomsCount: 0, allotmentsCount: 0 }
            };
        }

        // Parse CSV
        const headers = lines[0].split(/,|\t/).map(h => h.trim());
        const rows = lines.slice(1).map((line, index) => {
            const values = line.split(/,|\t/).map(v => v.trim());
            const row: any = {};
            headers.forEach((header, i) => {
                row[header] = values[i] || '';
            });
            row._rowNum = index + 2;
            return row;
        });

        // Extract unique courses
        const coursesMap = new Map<string, Course>();
        rows.forEach(row => {
            let courseCode = row['Course Code'] || generateCourseCode(row['Subject'], row['Semester']);
            const subject = row['Subject'];
            const creditHours = parseInt(row['Credit Hours']) || 3;
            const semester = row['Semester'];
            const isLab = isLabCourse(subject);

            // Append -L for lab courses if not already present
            if (isLab && !courseCode.endsWith('-L')) {
                courseCode = `${courseCode}-L`;
            }

            if (!coursesMap.has(courseCode)) {
                coursesMap.set(courseCode, {
                    id: `course-${Date.now()}-${coursesMap.size}`,
                    code: courseCode,
                    name: subject,
                    credits: creditHours,
                    type: 'Core', // Default type
                    semester: semester,
                    department: row['Department'] || '', // Import department from CSV
                    requiresLab: isLab,
                    estimatedStudents: 50 // Default
                });
            }
        });

        // Extract unique faculty
        const facultyMap = new Map<string, Faculty>();
        rows.forEach(row => {
            const teacherName = row['Teachers'];
            const department = row['Department'];

            if (teacherName && !facultyMap.has(teacherName)) {
                facultyMap.set(teacherName, {
                    id: `faculty-${Date.now()}-${facultyMap.size}`,
                    name: teacherName,
                    initials: generateInitials(teacherName),
                    department: department,
                    maxWeeklyHours: 20
                });
            }
        });

        // Extract unique rooms
        const roomsMap = new Map<string, Room>();
        rows.forEach(row => {
            const roomName = row['Room'];

            if (roomName && !roomsMap.has(roomName)) {
                roomsMap.set(roomName, {
                    id: `room-${Date.now()}-${roomsMap.size}`,
                    name: roomName,
                    capacity: 50, // Default
                    type: detectRoomType(roomName),
                    building: ''
                });
            }
        });

        // Create allotments
        const allotmentsMap = new Map<string, CourseAllotment>();
        rows.forEach(row => {
            const courseCode = row['Course Code'] || generateCourseCode(row['Subject'], row['Semester']);
            const teacherName = row['Teachers'];
            const section = row['Section'];
            const day = row['Day'];
            const hour = row['Hour'];
            const roomName = row['Room'];

            // Find course, faculty, and room IDs
            const course = Array.from(coursesMap.values()).find(c => c.code === courseCode || c.code === `${courseCode}-L`);
            const faculty = facultyMap.get(teacherName);
            const room = roomsMap.get(roomName);

            if (course && faculty) {
                const allotmentKey = `${course.id}-${faculty.id}`;

                if (!allotmentsMap.has(allotmentKey)) {
                    allotmentsMap.set(allotmentKey, {
                        courseId: course.id,
                        facultyId: faculty.id,
                        classIds: [section],
                        preferredRoomId: room?.id // Store room assignment from CSV
                    });
                } else {
                    // Add section if not already present
                    const allotment = allotmentsMap.get(allotmentKey)!;
                    if (!allotment.classIds.includes(section)) {
                        allotment.classIds.push(section);
                    }
                    // Update preferred room if not set
                    if (!allotment.preferredRoomId && room) {
                        allotment.preferredRoomId = room.id;
                    }
                }

                // Add manual schedule if day and hour are provided
                const timeSlot = parseTimeSlot(hour);
                if (day && timeSlot) {
                    const allotment = allotmentsMap.get(allotmentKey)!;
                    if (!allotment.manualSchedule) {
                        allotment.manualSchedule = {
                            day: day,
                            time: hour
                        };
                    }
                }
            }
        });

        const courses = Array.from(coursesMap.values());
        const faculty = Array.from(facultyMap.values());
        const rooms = Array.from(roomsMap.values());
        const allotments = Array.from(allotmentsMap.values());

        return {
            success: true,
            data: { courses, faculty, rooms, allotments },
            errors: [],
            summary: {
                coursesCount: courses.length,
                facultyCount: faculty.length,
                roomsCount: rooms.length,
                allotmentsCount: allotments.length
            }
        };

    } catch (error) {
        return {
            success: false,
            errors: [`Failed to parse CSV: ${(error as Error).message}`],
            summary: { coursesCount: 0, facultyCount: 0, roomsCount: 0, allotmentsCount: 0 }
        };
    }
}

/**
 * Generate sample complete timetable CSV
 */
export function generateSampleCompleteTimetable(): string {
    return `Department,Day,Hour,Semester,Section,Subject,Course Code,Credit Hours,Teachers,Room
BS-AI,Monday,08:30 - 10:00 AM,1,HM,Computer Programming,CS1410,3,Dr. John Smith,R6
BS-AI,Monday,10:00 - 11:30 AM,1,HM,Computer Programming Lab,CS1411,1,Dr. John Smith,CS-C1
BS-AI,Tuesday,1:00 - 2:30 PM,1,HM,Calculus and Analytical Geometry,MT1140,3,Dr. Jane Doe,R12
BS-CS,Wednesday,08:30 - 10:00 AM,2,EM,Data Structures,CS2210,3,Prof. Alice Johnson,R8`;
}

/**
 * Download sample complete timetable CSV
 */
export function downloadSampleCompleteTimetable() {
    const content = generateSampleCompleteTimetable();
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_complete_timetable.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
