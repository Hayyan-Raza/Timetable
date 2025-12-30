import * as fs from 'fs';
import * as path from 'path';
import { csvAnalyzer } from '../utils/csvAnalyzer';

// Mock crypto for Node environment if needed (though modern Node has it)
if (!global.crypto) {
    global.crypto = {
        randomUUID: () => Math.random().toString(36).substring(2)
    } as any;
}

async function runTest() {
    try {
        const csvPath = path.join(process.cwd(), 'Plan of Study FOC All Programs - Cleaned Data.csv');
        console.log(`Reading CSV from: ${csvPath}`);

        if (!fs.existsSync(csvPath)) {
            console.error("CSV file not found!");
            return;
        }

        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        console.log(`CSV Content Length: ${csvContent.length} bytes`);

        const result = csvAnalyzer.analyze(csvContent);

        console.log("\n--- Analysis Result ---");
        console.log(`Total Allotments: ${result.allotments.length}`);
        console.log(`Total Courses: ${result.courses.size}`);
        console.log(`Total Faculty: ${result.faculty.size}`);

        // Verify if allotments are merged
        // We look for allotments with multiple classIds
        const mergedAllotments = result.allotments.filter(a => a.classIds.length > 1);

        if (mergedAllotments.length > 0) {
            console.log("\n[FAIL] Found merged allotments! The fix is NOT working.");
            console.log(`Found ${mergedAllotments.length} merged allotments.`);
            console.log("Example merged allotment:", JSON.stringify(mergedAllotments[0], null, 2));
        } else {
            console.log("\n[PASS] No merged allotments found. Every class/section is treated separately.");
        }

        // Check specifically for BS-AI vs BS-SE if possible
        // Let's print a few allotments to see the classIds
        console.log("\nSample Allotments:");
        result.allotments.slice(0, 5).forEach((a, i) => {
            const course = result.courses.get(Array.from(result.courses.entries()).find(([k, v]) => v.id === a.courseId)?.[0] || '');
            console.log(`[${i}] Course: ${course?.name} (${course?.code}), Faculty: ${a.facultyId}, ClassIds: ${JSON.stringify(a.classIds)}`);
        });

    } catch (error) {
        console.error("Test failed:", error);
    }
}

runTest();
