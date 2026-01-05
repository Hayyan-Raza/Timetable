import {
    Course,
    Faculty,
    Room,
    CourseAllotment,
    Department,
    Semester,
    SemesterSchema,
    TimetableEntry,
} from '../types/timetable.types';
import {
    COURSES as DEFAULT_COURSES,
    FACULTY as DEFAULT_FACULTY,
    ROOMS as DEFAULT_ROOMS,
    COURSE_ALLOTMENTS as DEFAULT_ALLOTMENTS,
    SEMESTERS as DEFAULT_SEMESTERS,
    DEPARTMENTS as DEFAULT_DEPARTMENTS,
    SCHEMAS as DEFAULT_SCHEMAS,
} from '../data/sampleData';
import { findOrCreateSpreadsheet, fetchSheetData, replaceSheetData } from './googleSheetsService';

class DataService {
    private spreadsheetId: string | null = null;
    private accessToken: string | null = null;

    private getAccessToken(): string | null {
        // Direct read from storage as this service isn't a React component
        return localStorage.getItem("google_access_token");
    }

    async initialize(): Promise<void> {
        const token = this.getAccessToken();
        if (!token) return; // Wait for login
        this.accessToken = token;

        try {
            this.spreadsheetId = await findOrCreateSpreadsheet(token);
        } catch (error) {
            console.error("Failed to init Sheets:", error);
        }
    }

    getSpreadsheetUrl(): string | null {
        if (!this.spreadsheetId) return null;
        return `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}`;
    }

    // --- Helpers ---
    private async ensureInit() {
        if (!this.spreadsheetId) await this.initialize();
        if (!this.spreadsheetId || !this.accessToken) throw new Error("Google Sheets not initialized or user not logged in");
    }

    // --- COURSES ---
    async loadCourses(): Promise<Course[]> {
        await this.ensureInit();
        const rows = await fetchSheetData(this.accessToken!, this.spreadsheetId!, "Courses!A2:I");
        return rows.map((r: string[]) => ({
            id: r[0],
            code: r[1],
            name: r[2],
            credits: Number(r[3]),
            type: r[4] as any,
            semester: r[5] === 'undefined' ? undefined : (isNaN(Number(r[5])) ? r[5] : Number(r[5])), // Handle complex semester types
            department: r[6],
            requiresLab: r[7] === "TRUE",
            estimatedStudents: Number(r[8] || 0)
        }));
    }

    async saveCourses(courses: Course[]): Promise<void> {
        await this.ensureInit();
        const values = courses.map(c => [
            c.id, c.code, c.name, c.credits, c.type, c.semester, c.department || '', c.requiresLab ? "TRUE" : "FALSE", c.estimatedStudents
        ]);
        // Write headers + data
        const payload = [
            ["ID", "Code", "Name", "Credits", "Type", "Semester", "Department", "RequiresLab", "EstimatedStudents"],
            ...values
        ];
        await replaceSheetData(this.accessToken!, this.spreadsheetId!, "Courses", payload);
    }

    // --- FACULTY ---
    async loadFaculty(): Promise<Faculty[]> {
        await this.ensureInit();
        const rows = await fetchSheetData(this.accessToken!, this.spreadsheetId!, "Faculty!A2:E");
        return rows.map((r: string[]) => ({
            id: r[0],
            name: r[1],
            initials: r[2],
            maxWeeklyHours: Number(r[3]),
            department: r[4]
        }));
    }

    async saveFaculty(faculty: Faculty[]): Promise<void> {
        await this.ensureInit();
        const values = faculty.map(f => [
            f.id, f.name, f.initials, f.maxWeeklyHours, f.department
        ]);
        const payload = [
            ["ID", "Name", "Initials", "MaxWeeklyHours", "Department"],
            ...values
        ];
        await replaceSheetData(this.accessToken!, this.spreadsheetId!, "Faculty", payload);
    }

    // --- ROOMS ---
    async loadRooms(): Promise<Room[]> {
        await this.ensureInit();
        const rows = await fetchSheetData(this.accessToken!, this.spreadsheetId!, "Rooms!A2:E");
        return rows.map((r: string[]) => ({
            id: r[0],
            name: r[1],
            capacity: Number(r[2]),
            type: r[3] as any,
            building: r[4]
        }));
    }

    async saveRooms(rooms: Room[]): Promise<void> {
        await this.ensureInit();
        const values = rooms.map(r => [
            r.id, r.name, r.capacity, r.type, r.building
        ]);
        const payload = [
            ["ID", "Name", "Capacity", "Type", "Building"],
            ...values
        ];
        await replaceSheetData(this.accessToken!, this.spreadsheetId!, "Rooms", payload);
    }

    // --- ALLOTMENTS ---
    async loadAllotments(): Promise<CourseAllotment[]> {
        await this.ensureInit();
        const rows = await fetchSheetData(this.accessToken!, this.spreadsheetId!, "Allotments!A2:E");
        return rows.map((r: string[]) => {
            let classIds: string[] = [];
            try { classIds = JSON.parse(r[2]); } catch { classIds = [r[2]]; } // Fallback for old format

            let manualSchedule = undefined;
            if (r[4]) {
                try { manualSchedule = JSON.parse(r[4]); } catch { }
            }

            return {
                courseId: r[0],
                facultyId: r[1],
                classIds,
                preferredRoomId: r[3],
                manualSchedule
            };
        });
    }

    async saveAllotments(allotments: CourseAllotment[]): Promise<void> {
        await this.ensureInit();
        const values = allotments.map(a => [
            a.courseId,
            a.facultyId,
            JSON.stringify(a.classIds),
            a.preferredRoomId || "",
            a.manualSchedule ? JSON.stringify(a.manualSchedule) : ""
        ]);
        const payload = [
            ["CourseID", "FacultyID", "ClassIDs", "PreferredRoomID", "ManualSchedule"],
            ...values
        ];
        await replaceSheetData(this.accessToken!, this.spreadsheetId!, "Allotments", payload);
    }

    // --- DEPARTMENTS ---
    async loadDepartments(): Promise<Department[]> {
        await this.ensureInit();
        const rows = await fetchSheetData(this.accessToken!, this.spreadsheetId!, "Departments!A2:C");
        return rows.map((r: string[]) => ({ id: r[0], name: r[1], code: r[2] }));
    }

    async saveDepartments(departments: Department[]): Promise<void> {
        await this.ensureInit();
        const values = departments.map(d => [d.id, d.name, d.code]);
        const payload = [["ID", "Name", "Code"], ...values];
        await replaceSheetData(this.accessToken!, this.spreadsheetId!, "Departments", payload);
    }

    // --- SCHEMAS ---
    async loadSchemas(): Promise<SemesterSchema[]> {
        await this.ensureInit();
        const rows = await fetchSheetData(this.accessToken!, this.spreadsheetId!, "Schemas!A2:D");
        return rows.map((r: string[]) => ({
            id: r[0],
            departmentId: r[1],
            semesterId: r[2],
            courseIds: JSON.parse(r[3] || "[]")
        }));
    }

    async saveSchemas(schemas: SemesterSchema[]): Promise<void> {
        await this.ensureInit();
        const values = schemas.map(s => [
            s.id, s.departmentId, s.semesterId, JSON.stringify(s.courseIds)
        ]);
        const payload = [["ID", "DepartmentID", "SemesterID", "CourseIDs"], ...values];
        await replaceSheetData(this.accessToken!, this.spreadsheetId!, "Schemas", payload);
    }

    // --- SEMESTERS (STATIC for now) ---
    async loadSemesters(): Promise<Semester[]> {
        return DEFAULT_SEMESTERS;
    }
    async saveSemesters(_semesters: Semester[]): Promise<void> { } // No-op

    // --- TIMETABLE ENTRIES ---
    async loadTimetableEntries(): Promise<TimetableEntry[]> {
        await this.ensureInit();
        try {
            const rows = await fetchSheetData(this.accessToken!, this.spreadsheetId!, "Timetables!A2:P");
            return rows.map((r: string[]) => ({
                id: r[0],
                courseId: r[1],
                courseName: r[2],
                courseCode: r[3],
                facultyId: r[4],
                facultyName: r[5],
                roomId: r[6],
                roomName: r[7],
                classId: r[8],
                timeSlot: JSON.parse(r[9]), // {day, startTime, endTime}
                semester: r[10],
                metadata: r[11] ? JSON.parse(r[11]) : undefined,
                // Metadata for identification (columns 12-15)
                // metadataSemester: r[12],
                // metadataDepartment: r[13],
                // metadataSection: r[14],
                // generatedAt: r[15]
            } as TimetableEntry));
        } catch (error) {
            console.log("No timetable entries found or error loading:", error);
            return [];
        }
    }

    async saveTimetableEntries(entries: TimetableEntry[], metadata: { semester: string, department: string, section: string }): Promise<void> {
        await this.ensureInit();
        const generatedAt = new Date().toISOString();

        // Load existing timetables
        let existingRows: string[][] = [];
        try {
            existingRows = await fetchSheetData(this.accessToken!, this.spreadsheetId!, "Timetables!A2:P");
        } catch (error) {
            console.log("No existing timetables found, creating new sheet data");
        }

        // Filter out entries with the same metadata (to replace them)
        const filteredRows = existingRows.filter((r: string[]) => {
            return !(r[12] === metadata.semester && r[13] === metadata.department && r[14] === metadata.section);
        });

        // Add new entries
        const newValues = entries.map(e => [
            e.id,
            e.courseId,
            e.courseName,
            e.courseCode,
            e.facultyId,
            e.facultyName,
            e.roomId,
            e.roomName,
            e.classId,
            JSON.stringify(e.timeSlot), // {day, startTime, endTime}
            e.semester,
            e.metadata ? JSON.stringify(e.metadata) : "",
            // Identification metadata
            metadata.semester,
            metadata.department,
            metadata.section,
            generatedAt
        ]);

        const payload = [
            ["ID", "CourseID", "CourseName", "CourseCode", "FacultyID", "FacultyName", "RoomID", "RoomName", "ClassID", "TimeSlot", "Semester", "Metadata", "MetaSemester", "MetaDepartment", "MetaSection", "GeneratedAt"],
            ...filteredRows,
            ...newValues
        ];
        await replaceSheetData(this.accessToken!, this.spreadsheetId!, "Timetables", payload);
    }

    async checkTimetableExists(semester: string, department: string, section: string): Promise<boolean> {
        await this.ensureInit();
        try {
            const rows = await fetchSheetData(this.accessToken!, this.spreadsheetId!, "Timetables!A2:P");
            return rows.some((r: string[]) =>
                r[12] === semester &&
                r[13] === department &&
                r[14] === section
            );
        } catch (error) {
            return false;
        }
    }

    async loadTimetableForMetadata(semester: string, department: string, section: string): Promise<TimetableEntry[]> {
        await this.ensureInit();
        try {
            const rows = await fetchSheetData(this.accessToken!, this.spreadsheetId!, "Timetables!A2:P");
            const filteredRows = rows.filter((r: string[]) =>
                r[12] === semester &&
                r[13] === department &&
                r[14] === section
            );
            return filteredRows.map((r: string[]) => ({
                id: r[0],
                courseId: r[1],
                courseName: r[2],
                courseCode: r[3],
                facultyId: r[4],
                facultyName: r[5],
                roomId: r[6],
                roomName: r[7],
                classId: r[8],
                timeSlot: JSON.parse(r[9]),
                semester: r[10],
                metadata: r[11] ? JSON.parse(r[11]) : undefined,
            } as TimetableEntry));
        } catch (error) {
            console.log("No timetable found for specified metadata:", error);
            return [];
        }
    }

    // --- UTILS ---
    async resetToDefaults(): Promise<void> {
        await this.saveDepartments(DEFAULT_DEPARTMENTS);
        await this.saveCourses(DEFAULT_COURSES);
        await this.saveFaculty(DEFAULT_FACULTY);
        await this.saveRooms(DEFAULT_ROOMS);
        await this.saveAllotments(DEFAULT_ALLOTMENTS);
        await this.saveSchemas(DEFAULT_SCHEMAS);
    }

    async clearAll(): Promise<void> {
        await this.ensureInit();
        // Clear all sheets
        await Promise.all([
            replaceSheetData(this.accessToken!, this.spreadsheetId!, "Courses", [["ID", "Code", "Name", "Credits", "Type", "Semester", "Department", "RequiresLab", "EstimatedStudents"]]),
            replaceSheetData(this.accessToken!, this.spreadsheetId!, "Faculty", [["ID", "Name", "Initials", "MaxWeeklyHours", "Department"]]),
            replaceSheetData(this.accessToken!, this.spreadsheetId!, "Rooms", [["ID", "Name", "Capacity", "Type", "Building"]]),
            replaceSheetData(this.accessToken!, this.spreadsheetId!, "Allotments", [["CourseID", "FacultyID", "ClassIDs", "PreferredRoomID", "ManualSchedule"]]),
            replaceSheetData(this.accessToken!, this.spreadsheetId!, "Departments", [["ID", "Name", "Code"]]),
            replaceSheetData(this.accessToken!, this.spreadsheetId!, "Schemas", [["ID", "DepartmentID", "SemesterID", "CourseIDs"]]),
            replaceSheetData(this.accessToken!, this.spreadsheetId!, "Timetables", [["ID", "CourseID", "CourseName", "CourseCode", "FacultyID", "FacultyName", "RoomID", "RoomName", "ClassID", "TimeSlot", "Semester", "Metadata", "MetaSemester", "MetaDepartment", "MetaSection", "GeneratedAt"]]),
        ]);
    }
}

export const dataService = new DataService();
