import { dataService } from './dataService';
import { Department, Semester, Course, Faculty, Room, CourseAllotment } from '../types/timetable.types';

export const importService = {
    async parseAndImportData(csvContent: string) {
        const lines = csvContent.split('\n');
        const headers = this.parseCSVLine(lines[0]);

        const departmentsMap = new Map<string, Department>();
        const facultyMap = new Map<string, Faculty>();
        const roomsMap = new Map<string, Room>();
        const coursesMap = new Map<string, Course>();
        const allotments: CourseAllotment[] = [];

        // Create default Fall 2025 semester
        const fall2025: Semester = {
            id: crypto.randomUUID(),
            name: 'Fall 2025',
            type: 'Fall',
            year: 2025,
            active: true
        };
        const semesters = [fall2025];

        // Indices
        const deptIdx = headers.findIndex(h => h.trim() === 'Department');
        const semIdx = headers.findIndex(h => h.trim() === 'Semester');
        const subjectIdx = headers.findIndex(h => h.trim() === 'Subject');
        const teacherIdx = headers.findIndex(h => h.trim() === 'Teachers');
        const roomIdx = headers.findIndex(h => h.trim() === 'Room');
        const sectionIdx = headers.findIndex(h => h.trim() === 'Section'); // Use Section as Course Code suffix?

        console.log('CSV Headers:', headers);
        console.log('Department column index:', deptIdx);

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            const row = this.parseCSVLine(lines[i]);
            const deptName = row[deptIdx]?.trim();
            const semLevel = row[semIdx]?.trim();
            const subject = row[subjectIdx]?.trim();
            const teacherName = row[teacherIdx]?.trim();
            const roomName = row[roomIdx]?.trim();
            const section = row[sectionIdx]?.trim();

            // Debug first few rows
            if (i <= 3) {
                console.log(`Row ${i}:`, { deptName, subject, semLevel });
            }

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

            // 2. Faculty
            let facultyId = '';
            if (teacherName && teacherName.toLowerCase() !== 'nf' && teacherName.toLowerCase() !== 'new faculty') {
                if (!facultyMap.has(teacherName)) {
                    facultyMap.set(teacherName, {
                        id: crypto.randomUUID(),
                        name: teacherName,
                        initials: teacherName.split(' ').map(n => n[0]).join('').substring(0, 3).toUpperCase(),
                        maxWeeklyHours: 12, // Default
                        department: dept.id
                    });
                }
                facultyId = facultyMap.get(teacherName)!.id;
            }

            // 3. Room
            if (roomName) {
                if (!roomsMap.has(roomName)) {
                    roomsMap.set(roomName, {
                        id: crypto.randomUUID(),
                        name: roomName,
                        capacity: 50, // Default
                        type: roomName.includes('Lab') ? 'lab' : 'lecture'
                    });
                }
            }

            // 4. Course
            // Generate a unique key for the course (Subject + Dept + Semester)
            // We treat different sections as the same course for the Course definition, 
            // but allotments will link to specific sections if we had a Section entity.
            // For now, we'll create one Course entity per Subject.
            const courseKey = `${subject}-${deptName}`;
            if (!coursesMap.has(courseKey)) {
                const newCourse = {
                    id: crypto.randomUUID(),
                    code: `${deptName}-${semLevel}-${subject.substring(0, 3).toUpperCase()}`, // Fake code
                    name: subject,
                    credits: subject.toLowerCase().includes('lab') ? 1 : 3,
                    type: 'Core',
                    semester: semLevel || '1',
                    department: deptName, // Import department from CSV
                    requiresLab: subject.toLowerCase().includes('lab'),
                    estimatedStudents: 40
                };
                console.log(`Creating course: ${subject} with department: ${deptName}`, newCourse);
                coursesMap.set(courseKey, newCourse);
            }
            const course = coursesMap.get(courseKey)!;

            // 5. Allotment
            // If there is a teacher, create an allotment
            if (facultyId) {
                // Check if allotment already exists for this course/faculty to avoid duplicates
                // (Though in reality, multiple rows might mean multiple slots, but Allotment entity is just "Who teaches What")
                const existingAllotment = allotments.find(a => a.courseId === course.id && a.facultyId === facultyId);
                if (!existingAllotment) {
                    allotments.push({
                        courseId: course.id,
                        facultyId: facultyId,
                        classIds: [section || 'A'] // Use section as class ID
                    });
                } else {
                    // Add section to existing allotment if not present
                    if (section && !existingAllotment.classIds.includes(section)) {
                        existingAllotment.classIds.push(section);
                    }
                }
            }
        }

        // Save to Supabase
        console.log('Importing data...');
        await dataService.saveDepartments(Array.from(departmentsMap.values()));
        await dataService.saveSemesters(semesters);
        await dataService.saveRooms(Array.from(roomsMap.values()));
        await dataService.saveFaculty(Array.from(facultyMap.values()));
        await dataService.saveCourses(Array.from(coursesMap.values()));
        await dataService.saveAllotments(allotments);

        console.log('Import complete.');
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
    }
};
