import { readFileSync } from 'fs';
import { join } from 'path';
import { csvAnalyzer } from '../utils/csvAnalyzer';

// Path to the CSV file
const csvPath = join(process.cwd(), 'Plan of Study FOC All Programs - Cleaned Data.csv');

try {
    console.log(`Reading CSV from: ${csvPath}`);
    const content = readFileSync(csvPath, 'utf-8');

    console.log('Analyzing data...');
    const result = csvAnalyzer.analyze(content);

    const output = [];
    output.push('=== Analysis Results ===');
    output.push(`Total Rows Processed: ${result.stats.totalRows}`);
    output.push(`Unique Departments: ${result.stats.uniqueDepartments}`);
    output.push(`Unique Semesters: ${result.stats.uniqueSemesters}`);
    output.push(`Unique Courses: ${result.stats.uniqueCourses}`);
    output.push(`Unique Faculty: ${result.stats.uniqueFaculty}`);
    output.push(`Unique Rooms: ${result.stats.uniqueRooms}`);
    output.push(`Total Allotments Created: ${result.allotments.length}`);

    output.push('\n=== Departments ===');
    output.push(Array.from(result.departments.keys()).join(', '));

    output.push('\n=== Semesters ===');
    output.push(Array.from(result.semesters.keys()).join(', '));

    output.push('\n=== Sample Courses (First 5) ===');
    Array.from(result.courses.values()).slice(0, 5).forEach(c => {
        output.push(`${c.code}: ${c.name} (${c.credits} Cr)`);
    });

    output.push('\n=== Sample Faculty (First 5) ===');
    Array.from(result.faculty.values()).slice(0, 5).forEach(f => {
        output.push(`${f.name} (${f.initials})`);
    });

    output.push('\n=== Sample Rooms (First 5) ===');
    Array.from(result.rooms.values()).slice(0, 5).forEach(r => {
        output.push(`${r.name} (${r.type})`);
    });

    const fs = require('fs');
    fs.writeFileSync(join(process.cwd(), 'analysis_results.txt'), output.join('\n'));
    console.log('Analysis complete. Results written to analysis_results.txt');

} catch (error) {
    console.error('Error running analysis:', error);
}
