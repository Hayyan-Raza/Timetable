/**
 * CSV Parser Utility
 * Provides functions to parse and validate CSV files for bulk import
 */

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    data: any[];
}

/**
 * Parse CSV file to JSON array
 */
export async function parseCSV(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const lines = text.split('\n').filter(line => line.trim());

                if (lines.length < 2) {
                    reject(new Error('CSV file must have at least a header row and one data row'));
                    return;
                }

                // Parse header
                const headers = lines[0].split(',').map(h => h.trim());

                // Parse data rows
                const data = lines.slice(1).map((line, index) => {
                    const values = line.split(',').map(v => v.trim());
                    const row: any = {};

                    headers.forEach((header, i) => {
                        row[header] = values[i] || '';
                    });

                    return row;
                });

                resolve(data);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

/**
 * Validate Course CSV data
 */
export function validateCourseCSV(data: any[]): ValidationResult {
    const errors: string[] = [];
    const requiredFields = ['code', 'name', 'credits', 'type', 'semester', 'estimatedStudents'];

    // Check if data is empty
    if (data.length === 0) {
        errors.push('CSV file is empty');
        return { valid: false, errors, data: [] };
    }

    // Validate each row
    const validData = data.map((row, index) => {
        const rowNum = index + 2; // +2 because index is 0-based and we skip header

        // Check required fields
        requiredFields.forEach(field => {
            if (!row[field] || row[field] === '') {
                errors.push(`Row ${rowNum}: Missing required field '${field}'`);
            }
        });

        // Validate credits (should be a number)
        if (row.credits && isNaN(Number(row.credits))) {
            errors.push(`Row ${rowNum}: 'credits' must be a number`);
        }

        // Validate type (should be Core, Major, or Elective)
        if (row.type && !['Core', 'Major', 'Elective'].includes(row.type)) {
            errors.push(`Row ${rowNum}: 'type' must be Core, Major, or Elective`);
        }

        // Validate estimatedStudents (should be a number)
        if (row.estimatedStudents && isNaN(Number(row.estimatedStudents))) {
            errors.push(`Row ${rowNum}: 'estimatedStudents' must be a number`);
        }

        // Convert requiresLab to boolean
        const requiresLab = row.requiresLab?.toLowerCase() === 'true' || row.requiresLab === '1';

        return {
            id: `course-${Date.now()}-${index}`,
            code: row.code,
            name: row.name,
            credits: Number(row.credits),
            type: row.type as 'Core' | 'Major' | 'Elective',
            semester: row.semester,
            estimatedStudents: Number(row.estimatedStudents),
            requiresLab
        };
    });

    return {
        valid: errors.length === 0,
        errors,
        data: validData
    };
}

/**
 * Validate Faculty CSV data
 */
export function validateFacultyCSV(data: any[]): ValidationResult {
    const errors: string[] = [];
    const requiredFields = ['name', 'email', 'department'];

    if (data.length === 0) {
        errors.push('CSV file is empty');
        return { valid: false, errors, data: [] };
    }

    const validData = data.map((row, index) => {
        const rowNum = index + 2;

        // Check required fields
        requiredFields.forEach(field => {
            if (!row[field] || row[field] === '') {
                errors.push(`Row ${rowNum}: Missing required field '${field}'`);
            }
        });

        // Validate email format
        if (row.email && !row.email.includes('@')) {
            errors.push(`Row ${rowNum}: Invalid email format`);
        }

        // Validate maxWeeklyHours (should be a number if provided)
        const maxWeeklyHours = row.maxWeeklyHours || '20';
        if (isNaN(Number(maxWeeklyHours))) {
            errors.push(`Row ${rowNum}: 'maxWeeklyHours' must be a number`);
        }

        return {
            id: `faculty-${Date.now()}-${index}`,
            name: row.name,
            email: row.email,
            department: row.department,
            maxWeeklyHours: Number(maxWeeklyHours)
        };
    });

    return {
        valid: errors.length === 0,
        errors,
        data: validData
    };
}

/**
 * Validate Room CSV data
 */
export function validateRoomCSV(data: any[]): ValidationResult {
    const errors: string[] = [];
    const requiredFields = ['name', 'capacity', 'type'];

    if (data.length === 0) {
        errors.push('CSV file is empty');
        return { valid: false, errors, data: [] };
    }

    const validData = data.map((row, index) => {
        const rowNum = index + 2;

        // Check required fields
        requiredFields.forEach(field => {
            if (!row[field] || row[field] === '') {
                errors.push(`Row ${rowNum}: Missing required field '${field}'`);
            }
        });

        // Validate capacity (should be a number)
        if (row.capacity && isNaN(Number(row.capacity))) {
            errors.push(`Row ${rowNum}: 'capacity' must be a number`);
        }

        // Validate type (should be lecture, lab, or both)
        if (row.type && !['lecture', 'lab', 'both'].includes(row.type.toLowerCase())) {
            errors.push(`Row ${rowNum}: 'type' must be lecture, lab, or both`);
        }

        return {
            id: `room-${Date.now()}-${index}`,
            name: row.name,
            capacity: Number(row.capacity),
            type: row.type.toLowerCase() as 'lecture' | 'lab' | 'both',
            building: row.building || '',
            floor: row.floor || ''
        };
    });

    return {
        valid: errors.length === 0,
        errors,
        data: validData
    };
}

/**
 * Generate sample CSV content for download
 */
export function generateSampleCSV(type: 'course' | 'faculty' | 'room'): string {
    switch (type) {
        case 'course':
            return `code,name,credits,type,semester,estimatedStudents,requiresLab
CS-101,Introduction to Programming,3,Core,1,50,true
MATH-201,Calculus II,4,Core,2,45,false
ENG-301,Technical Writing,3,Elective,3,30,false`;

        case 'faculty':
            return `name,initials,department,maxWeeklyHours
Dr. John Smith,JS,Computer Science,20
Dr. Jane Doe,JD,Mathematics,18
Prof. Alice Johnson,AJ,Engineering,22`;

        case 'room':
            return `name,capacity,type,building,floor
Room 101,50,lecture,Main Building,1
Lab A,30,lab,Science Building,2
Room 205,60,both,Main Building,2`;

        default:
            return '';
    }
}

/**
 * Download sample CSV file
 */
export function downloadSampleCSV(type: 'course' | 'faculty' | 'room') {
    const content = generateSampleCSV(type);
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sample_${type}s.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
