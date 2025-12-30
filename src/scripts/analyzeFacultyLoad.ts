
import fs from 'fs';
import path from 'path';
import { csvAnalyzer } from '../utils/csvAnalyzer';

const csvPath = 'c:\\Users\\Hayyan\\Desktop\\Projects\\University Timetable Dashboard UI\\Plan of Study FOC All Programs - Cleaned Data.csv';

try {
    console.log(`Reading CSV from: ${csvPath}`);
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    console.log('Analyzing CSV...');
    const result = csvAnalyzer.analyze(csvContent);

    console.log(`Found ${result.faculty.size} faculty members.`);
    console.log(`Found ${result.allotments.length} course allotments.`);

    // Calculate load per faculty
    const facultyLoad = new Map<string, { name: string, courses: number, classes: number, subjects: Set<string> }>();

    // Initialize map
    result.faculty.forEach(f => {
        facultyLoad.set(f.id, {
            name: f.name,
            courses: 0,
            classes: 0,
            subjects: new Set()
        });
    });

    // Count loads
    result.allotments.forEach(allotment => {
        const faculty = facultyLoad.get(allotment.facultyId);

        if (faculty) {
            faculty.courses += 1; // Distinct course (subject)
            faculty.classes += allotment.classIds.length; // Total sections taught

            // Try to find course name if possible
            for (const c of result.courses.values()) {
                if (c.id === allotment.courseId) {
                    faculty.subjects.add(c.code || c.name);
                    break;
                }
            }
        }
    });

    // Convert to array and sort
    const sortedFaculty = Array.from(facultyLoad.values())
        .sort((a, b) => b.classes - a.classes);

    const output = {
        totalFaculty: result.faculty.size,
        totalAllotments: result.allotments.length,
        overloadedFaculty: sortedFaculty.slice(0, 20).map(f => ({
            name: f.name,
            totalClasses: f.classes,
            distinctSubjects: f.subjects.size,
            subjects: Array.from(f.subjects)
        }))
    };

    fs.writeFileSync('faculty_load.json', JSON.stringify(output, null, 2));
    console.log('Analysis written to faculty_load.json');

} catch (error) {
    console.error('Error reading or analyzing CSV:', error);
}
