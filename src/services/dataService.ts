import {
    Course,
    Faculty,
    Room,
    CourseAllotment,
    Department,
    Semester,
    SemesterSchema,
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
import { supabase } from './supabaseClient';

/**
 * Supabase-based data service for managing timetable data
 */
class DataService {
    /**
     * Initialize data storage
     */
    async initialize(): Promise<void> {
        // Auto-seeding removed to allow empty state.
    }

    /**
     * Load courses from Supabase
     */
    async loadCourses(): Promise<Course[]> {
        try {
            const { data, error } = await supabase.from('courses').select('*');
            if (error) throw error;

            // Map snake_case DB fields to camelCase TS interfaces if necessary
            // Our SQL schema uses snake_case but we need to match the TS interface
            return data.map((item: any) => ({
                id: item.id,
                code: item.code,
                name: item.name,
                credits: item.credits,
                type: item.type,
                semester: item.semester,
                department: item.department || '', // Import department from database
                requiresLab: item.requires_lab,
                estimatedStudents: item.estimated_students
            }));
        } catch (error) {
            console.error('Error loading courses:', error);
            return [];
        }
    }

    /**
     * Save courses to Supabase
     * Note: This replaces all courses. For individual updates, we should add specific methods.
     */
    async saveCourses(courses: Course[]): Promise<void> {
        try {
            // First delete all existing courses (since we are mimicking the previous full-save behavior)
            // In a real app, we would upsert or update specific records
            const { error: deleteError } = await supabase.from('courses').delete().neq('id', 'placeholder');
            if (deleteError) throw deleteError;

            const dbCourses = courses.map(c => ({
                id: c.id,
                code: c.code,
                name: c.name,
                credits: c.credits,
                type: c.type,
                semester: c.semester,
                department: c.department || '', // Save department to database
                requires_lab: c.requiresLab,
                estimated_students: c.estimatedStudents
            }));

            const { error } = await supabase.from('courses').insert(dbCourses);
            if (error) throw error;
        } catch (error) {
            console.error('Error saving courses:', error);
        }
    }



    /**
     * Save semesters (Disabled - using local constant)
     */
    async saveSemesters(_semesters: Semester[]): Promise<void> {
        // No-op since we are using static local data for semesters
        console.log('Semesters are static and cannot be modified via Supabase');
    }



    /**
     * Load faculty from Supabase
     */
    async loadFaculty(): Promise<Faculty[]> {
        try {
            const { data, error } = await supabase.from('faculty').select('*');
            if (error) throw error;

            return data.map((item: any) => ({
                id: item.id,
                name: item.name,
                initials: item.initials,
                maxWeeklyHours: item.max_weekly_hours,
                department: item.department
            }));
        } catch (error) {
            console.error('Error loading faculty:', error);
            return [];
        }
    }

    /**
     * Save faculty to Supabase
     */
    async saveFaculty(faculty: Faculty[]): Promise<void> {
        try {
            const { error: deleteError } = await supabase.from('faculty').delete().neq('id', 'placeholder');
            if (deleteError) throw deleteError;

            const dbFaculty = faculty.map(f => ({
                id: f.id,
                name: f.name,
                initials: f.initials,
                max_weekly_hours: f.maxWeeklyHours,
                department: f.department
            }));

            const { error } = await supabase.from('faculty').insert(dbFaculty);
            if (error) throw error;
        } catch (error) {
            console.error('Error saving faculty:', error);
        }
    }

    /**
     * Load rooms from Supabase
     */
    async loadRooms(): Promise<Room[]> {
        try {
            const { data, error } = await supabase.from('rooms').select('*');
            if (error) throw error;

            return data.map((item: any) => ({
                id: item.id,
                name: item.name,
                capacity: item.capacity,
                type: item.type,
                building: item.building
            }));
        } catch (error) {
            console.error('Error loading rooms:', error);
            return [];
        }
    }

    /**
     * Save rooms to Supabase
     */
    async saveRooms(rooms: Room[]): Promise<void> {
        try {
            const { error: deleteError } = await supabase.from('rooms').delete().neq('id', 'placeholder');
            if (deleteError) throw deleteError;

            const dbRooms = rooms.map(r => ({
                id: r.id,
                name: r.name,
                capacity: r.capacity,
                type: r.type,
                building: r.building
            }));

            const { error } = await supabase.from('rooms').insert(dbRooms);
            if (error) throw error;
        } catch (error) {
            console.error('Error saving rooms:', error);
        }
    }

    /**
     * Load course allotments from Supabase
     */
    async loadAllotments(): Promise<CourseAllotment[]> {
        try {
            const { data, error } = await supabase.from('allotments').select('*');
            if (error) throw error;

            return data.map((item: any) => ({
                courseId: item.course_id,
                facultyId: item.faculty_id,
                classIds: item.class_ids,
                preferredRoomId: item.preferred_room_id,
                manualSchedule: item.manual_schedule ? {
                    day: item.manual_schedule.day,
                    time: item.manual_schedule.time
                } : undefined
            }));
        } catch (error) {
            console.error('Error loading allotments:', error);
            return [];
        }
    }

    /**
     * Save course allotments to Supabase
     */
    async saveAllotments(allotments: CourseAllotment[]): Promise<void> {
        try {
            const { error: deleteError } = await supabase.from('allotments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (deleteError) throw deleteError;

            const dbAllotments = allotments.map(a => ({
                course_id: a.courseId,
                faculty_id: a.facultyId,
                class_ids: a.classIds,
                preferred_room_id: a.preferredRoomId,
                manual_schedule: a.manualSchedule
            }));

            const { error } = await supabase.from('allotments').insert(dbAllotments);
            if (error) throw error;
        } catch (error) {
            console.error('Error saving allotments:', error);
        }
    }

    /**
     * Load departments from Supabase
     */
    async loadDepartments(): Promise<Department[]> {
        try {
            const { data, error } = await supabase.from('departments').select('*');
            if (error) throw error;

            return data.map((item: any) => ({
                id: item.id,
                name: item.name,
                code: item.code
            }));
        } catch (error) {
            console.error('Error loading departments:', error);
            return [];
        }
    }

    /**
     * Save departments to Supabase
     */
    async saveDepartments(departments: Department[]): Promise<void> {
        try {
            const { error: deleteError } = await supabase.from('departments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (deleteError) throw deleteError;

            if (departments.length > 0) {
                const dbDepartments = departments.map(d => ({
                    id: d.id,
                    name: d.name,
                    code: d.code
                }));

                const { error } = await supabase.from('departments').insert(dbDepartments);
                if (error) throw error;
            }
        } catch (error) {
            console.error('Error saving departments:', error);
            throw error;
        }
    }



    /**
     * Load semesters from local constant (Supabase bypassed)
     */
    async loadSemesters(): Promise<Semester[]> {
        return DEFAULT_SEMESTERS;
    }



    /**
     * Load semester schemas from Supabase
     */
    async loadSchemas(): Promise<SemesterSchema[]> {
        try {
            const { data, error } = await supabase.from('semester_schemas').select('*');
            if (error) throw error;

            return data.map((item: any) => ({
                id: item.id,
                departmentId: item.department_id,
                semesterId: item.semester_id,
                courseIds: item.course_ids
            }));
        } catch (error) {
            console.error('Error loading schemas:', error);
            return [];
        }
    }

    /**
     * Save semester schemas to Supabase
     */
    async saveSchemas(schemas: SemesterSchema[]): Promise<void> {
        try {
            const { error: deleteError } = await supabase.from('semester_schemas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (deleteError) throw deleteError;

            if (schemas.length > 0) {
                const dbSchemas = schemas.map(s => ({
                    id: s.id,
                    department_id: s.departmentId,
                    semester_id: s.semesterId,
                    course_ids: s.courseIds
                }));

                const { error } = await supabase.from('semester_schemas').insert(dbSchemas);
                if (error) throw error;
            }
        } catch (error) {
            console.error('Error saving schemas:', error);
            throw error;
        }
    }



    /**
     * Reset all data to defaults
     */
    async resetToDefaults(): Promise<void> {
        await this.saveDepartments(DEFAULT_DEPARTMENTS);
        await this.saveCourses(DEFAULT_COURSES);
        await this.saveFaculty(DEFAULT_FACULTY);
        await this.saveRooms(DEFAULT_ROOMS);
        await this.saveAllotments(DEFAULT_ALLOTMENTS);
        await this.saveSchemas(DEFAULT_SCHEMAS);
    }

    /**
     * Clear all data
     */
    async clearAll(): Promise<void> {
        await supabase.from('allotments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('courses').delete().neq('id', 'placeholder');
        await supabase.from('faculty').delete().neq('id', 'placeholder');
        await supabase.from('rooms').delete().neq('id', 'placeholder');
        await supabase.from('departments').delete().neq('id', 'placeholder');
        await supabase.from('semesters').delete().neq('id', 'placeholder');
        await supabase.from('semester_schemas').delete().neq('id', 'placeholder');
    }
}

export const dataService = new DataService();
