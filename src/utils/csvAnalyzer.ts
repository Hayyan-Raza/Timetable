import { Department, Semester, Course, Faculty, Room, CourseAllotment } from '../types/timetable.types';

export interface AnalysisResult {
    departments: Map<string, Department>;
    semesters: Map<string, Semester>;
    courses: Map<string, Course>;
    faculty: Map<string, Faculty>;
    rooms: Map<string, Room>;
    allotments: CourseAllotment[];
    stats: {
        totalRows: number;
        uniqueDepartments: number;
        uniqueCourses: number;
        uniqueFaculty: number;
        uniqueRooms: number;
        uniqueSemesters: number;
    };
}

export const csvAnalyzer = {
    analyze(csvContent: string): AnalysisResult {
        const lines = csvContent.split('\n');
        const headers = this.parseCSVLine(lines[0]);

        const departmentsMap = new Map<string, Department>();
        const semestersMap = new Map<string, Semester>();
        const facultyMap = new Map<string, Faculty>();
        const roomsMap = new Map<string, Room>();
        const coursesMap = new Map<string, Course>();
        const allotments: CourseAllotment[] = [];

        // Indices based on "Plan of Study FOC All Programs - Cleaned Data.csv"
        // Headers: Department,Semester,Section,Subject,Course Code,Credit Hours,Teachers,Room
        const deptIdx = headers.findIndex(h => h.trim().toLowerCase() === 'department');
        const semIdx = headers.findIndex(h => h.trim().toLowerCase() === 'semester');
        const sectionIdx = headers.findIndex(h => h.trim().toLowerCase() === 'section');
        const subjectIdx = headers.findIndex(h => h.trim().toLowerCase() === 'subject');
        const codeIdx = headers.findIndex(h => h.trim().toLowerCase() === 'course code');
        const creditIdx = headers.findIndex(h => h.trim().toLowerCase() === 'credit hours');
        const teacherIdx = headers.findIndex(h => h.trim().toLowerCase() === 'teachers');
        const roomIdx = headers.findIndex(h => h.trim().toLowerCase() === 'room');

        let processedRows = 0;

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            processedRows++;

            const row = this.parseCSVLine(lines[i]);
            const deptName = row[deptIdx]?.trim();
            const semVal = row[semIdx]?.trim();
            const section = row[sectionIdx]?.trim();
            const subject = row[subjectIdx]?.trim();
            const code = row[codeIdx]?.trim();
            const creditsStr = row[creditIdx]?.trim();
            const teacherName = row[teacherIdx]?.trim();
            const roomName = row[roomIdx]?.trim();

            if (!deptName || !subject) continue;

            // 1. Department
            if (!departmentsMap.has(deptName)) {
                departmentsMap.set(deptName, {
                    id: crypto.randomUUID(),
                    name: deptName,
                    code: deptName
                });
            }
            const dept = departmentsMap.get(deptName)!;

            // 2. Semester
            const semesterName = `Semester ${semVal}`;
            if (!semestersMap.has(semesterName)) {
                semestersMap.set(semesterName, {
                    id: crypto.randomUUID(),
                    name: semesterName,
                    type: parseInt(semVal) % 2 === 1 ? 'Fall' : 'Spring',
                    year: 2025,
                    active: true
                });
            }
            // const semester = semestersMap.get(semesterName)!;

            // 3. Faculty
            let facultyId = '';
            if (teacherName && teacherName.length > 1) {
                const normalizedTeacher = this.cleanTeacherName(teacherName);
                if (!facultyMap.has(normalizedTeacher)) {
                    facultyMap.set(normalizedTeacher, {
                        id: crypto.randomUUID(),
                        name: normalizedTeacher,
                        initials: this.getInitials(normalizedTeacher),
                        maxWeeklyHours: 12,
                        department: dept.id
                    });
                }
                facultyId = facultyMap.get(normalizedTeacher)!.id;
            }

            // 4. Room
            if (roomName && roomName.length > 1) {
                if (!roomsMap.has(roomName)) {
                    roomsMap.set(roomName, {
                        id: crypto.randomUUID(),
                        name: roomName,
                        capacity: 50,
                        type: (roomName.toLowerCase().includes('lab') || subject.toLowerCase().includes('lab')) ? 'lab' : 'lecture'
                    });
                }
            }

            // 5. Course
            const courseKey = code ? code : `${subject}-${deptName}`;

            if (!coursesMap.has(courseKey)) {
                let generatedCode = code;
                if (!generatedCode) {
                    // Generate code from subject name
                    // Strategy: 
                    // 1. If multiple words, use first letter of each word (e.g. "Computer Programming" -> "CP")
                    // 2. If single word, use first 3 chars (e.g. "Calculus" -> "CAL")
                    const words = subject.split(' ').filter(w => w.length > 0 && !['and', 'of', 'the', 'in'].includes(w.toLowerCase()));
                    let subjectAbbr = '';

                    if (words.length > 1) {
                        subjectAbbr = words.map(w => w[0]).join('').substring(0, 4).toUpperCase();
                    } else {
                        subjectAbbr = subject.substring(0, 3).toUpperCase();
                    }

                    // Ensure uniqueness by appending a number if needed (though this is local to this loop, 
                    // the map check above handles global uniqueness for the exact same subject+dept)
                    // But if different subjects map to same abbr, we need to handle it.
                    // Actually, the key is `courseKey` which uses `code` OR `subject-dept`.
                    // If we generate a code, we should make sure it's unique? 
                    // The `courseKey` logic at line 113 uses `code` if available. 
                    // If we generate `generatedCode`, we store it in `course.code`.
                    // But `coursesMap` is keyed by `courseKey`.

                    // Simplified Code Generation: Just the subject abbreviation
                    // e.g. "Computer Programming" -> "CP"
                    // "Calculus" -> "CAL"
                    // No Dept/Sem prefix.

                    const isLab = subject.toLowerCase().includes('lab');
                    generatedCode = `${subjectAbbr}${isLab ? '-L' : ''}`;
                }

                coursesMap.set(courseKey, {
                    id: crypto.randomUUID(),
                    code: generatedCode,
                    name: subject,
                    credits: parseInt(creditsStr) || (subject.toLowerCase().includes('lab') ? 1 : 3),
                    type: 'Core',
                    semester: `Semester ${semVal || '1'}`,
                    requiresLab: subject.toLowerCase().includes('lab'),
                    estimatedStudents: 40
                });
            }
            const course = coursesMap.get(courseKey)!;

            // 6. Allotment
            const classId = `${deptName}-${semVal}-${section}`;

            // Parse manual schedule if present
            const dayCol = row[headers.findIndex(h => h.trim().toLowerCase() === 'day')]?.trim();
            const hourCol = row[headers.findIndex(h => h.trim().toLowerCase() === 'hour')]?.trim();

            let manualSchedule: { day: string; time: string } | undefined;
            if (dayCol && hourCol) {
                manualSchedule = { day: dayCol, time: hourCol };
            }

            if (facultyId) {
                // User Request: "every departments has different students our code currently assumes them same group"
                // Fix: Do NOT merge allotments. Treat every row (Class/Section) as a separate allotment.
                // This ensures BS-AI and BS-SE are scheduled separately even if they share the same teacher/course.

                const allotment: CourseAllotment = {
                    courseId: course.id,
                    facultyId: facultyId,
                    classIds: [classId],
                    manualSchedule
                };
                allotments.push(allotment);
            }
        }

        return {
            departments: departmentsMap,
            semesters: semestersMap,
            courses: coursesMap,
            faculty: facultyMap,
            rooms: roomsMap,
            allotments,
            stats: {
                totalRows: processedRows,
                uniqueDepartments: departmentsMap.size,
                uniqueCourses: coursesMap.size,
                uniqueFaculty: facultyMap.size,
                uniqueRooms: roomsMap.size,
                uniqueSemesters: semestersMap.size
            }
        };
    },

    parseCSVLine(line: string): string[] {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    },

    cleanTeacherName(name: string): string {
        let cleaned = name.replace(/\bSS\d+\s*/g, '');
        cleaned = cleaned.replace(/\s*\([^)]*(?:VF|NF|New)[^)]*\)/gi, '');
        return cleaned.trim();
    },

    getInitials(name: string): string {
        return name
            .split(' ')
            .filter(n => n.length > 0)
            .map(n => n[0])
            .join('')
            .substring(0, 3)
            .toUpperCase();
    }
};
