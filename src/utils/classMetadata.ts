import { Course, CourseAllotment, Department, Semester, SemesterSchema } from '../types/timetable.types';

export interface ClassMetadata {
    classId: string;
    departmentCode?: string;
    departmentName?: string;
    semester?: string;
    semesterNum?: number;
    displayName: string;
}

/**
 * Resolves metadata (Department, Semester) for a given class ID
 * based on the courses assigned to it.
 */
export function resolveClassInfo(
    classId: string,
    allotments: CourseAllotment[],
    courses: Course[],
    departments: Department[],
    semesters: Semester[],
    schemas: SemesterSchema[]
): ClassMetadata {
    // 1. Find all courses assigned to this class
    const classAllotments = allotments.filter(a => a.classIds.includes(classId));
    const courseIds = [...new Set(classAllotments.map(a => a.courseId))];

    if (courseIds.length === 0) {
        return {
            classId,
            displayName: classId
        };
    }

    // 2. Find which Department/Semester Schema contains these courses
    const schemaMatchScores = new Map<string, number>(); // SchemaID -> Count

    courseIds.forEach(cId => {
        const matchingSchemas = schemas.filter(s => s.courseIds.includes(cId));
        matchingSchemas.forEach(schema => {
            const current = schemaMatchScores.get(schema.id) || 0;
            schemaMatchScores.set(schema.id, current + 1);
        });
    });

    // 3. Pick the best matching schema
    let bestSchemaId: string | undefined;
    let maxScore = 0;

    for (const [id, score] of schemaMatchScores.entries()) {
        if (score > maxScore) {
            maxScore = score;
            bestSchemaId = id;
        }
    }

    let department: Department | undefined;
    let semester: Semester | undefined;

    if (bestSchemaId) {
        const schema = schemas.find(s => s.id === bestSchemaId);
        if (schema) {
            department = departments.find(d => d.id === schema.departmentId);
            const sem = semesters.find(s => s.id === schema.semesterId);
            semester = sem;
        }
    }

    // Fallback: If no schema match (data issue?), try to infer from Course and Faculty properties
    if (!department || !semester) {
        const relevantCourses = courses.filter(c => courseIds.includes(c.id));

        // 1. Infer Semester from Course "semester" field (Most Frequent)
        if (!semester && relevantCourses.length > 0) {
            const counts: Record<string, number> = {};
            relevantCourses.forEach(c => {
                counts[c.semester] = (counts[c.semester] || 0) + 1;
            });
            const bestSemName = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];

            if (bestSemName) {
                semester = semesters.find(s => s.name === bestSemName || s.id === bestSemName);

                if (!semester) {
                    const num = parseInt(bestSemName.replace(/\D/g, '')) || 0;
                    semester = {
                        id: `inferred-${bestSemName}`,
                        name: bestSemName,
                        type: 'Fall',
                        year: Math.ceil(num / 2),
                        active: true
                    };
                }
            }
        }

        // 2. Infer Department from Course Codes
        if (!department && departments.length > 0) {
            const deptScores = new Map<string, number>();
            relevantCourses.forEach(course => {
                const code = course.code.toUpperCase();
                departments.forEach(dept => {
                    const deptCode = dept.code.toUpperCase();
                    if (code.includes(deptCode)) {
                        deptScores.set(dept.id, (deptScores.get(dept.id) || 0) + 2);
                    }
                });
            });

            const bestDeptId = [...deptScores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
            if (bestDeptId) {
                department = departments.find(d => d.id === bestDeptId);
            }
        }

        // 3. Fallback: Infer Department based on Class ID
        if (!department) {
            const upperClassId = classId.toUpperCase();
            const matchedDept = departments.find(d =>
                upperClassId.startsWith(d.code.toUpperCase()) ||
                upperClassId.includes(d.code.toUpperCase())
            );
            if (matchedDept) {
                department = matchedDept;
            }
        }
    }

    // Construct Result
    const deptCode = department?.code || 'Unknown';
    const deptName = department?.name || 'Unknown Dept';
    const semName = semester?.name || 'Unknown';
    const semNum = parseInt(semName.replace(/\D/g, '')) || 0;

    const displayName = (deptCode !== 'Unknown' && semName !== 'Unknown')
        ? `${classId} (${deptCode} - ${semName})`
        : (semName !== 'Unknown' ? `${classId} (${semName})` : classId);

    return {
        classId,
        departmentCode: deptCode,
        departmentName: deptName,
        semester: semName,
        semesterNum: semNum,
        displayName: displayName
    };
}
