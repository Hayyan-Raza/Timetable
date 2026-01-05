import { create } from 'zustand';
import {
    TimetableEntry,
    Course,
    Faculty,
    Room,
    CourseAllotment,
    Department,
    Semester,
    SemesterSchema,
    TimetableState,
    Conflict
} from '../types/timetable.types';
import { dataService } from '../services/dataService';

interface TimetableStore extends TimetableState {
    isLoading: boolean;
    error: string | null;

    // Generation progress state
    isGenerating: boolean;
    generationProgress: number;
    generationStatus: string;
    solutionsFound: number;
    generationStartTime: number;

    // Actions
    setEntries: (entries: TimetableEntry[]) => void;
    setGenerationConflicts: (conflicts: Conflict[]) => void;
    updateEntry: (entry: TimetableEntry) => void;
    clearEntries: () => void;

    // Generation progress actions
    setIsGenerating: (isGenerating: boolean) => void;
    setGenerationProgress: (progress: number) => void;
    setGenerationStatus: (status: string) => void;
    setSolutionsFound: (count: number) => void;
    setGenerationStartTime: (time: number) => void;

    // Async Data Actions
    fetchData: () => Promise<void>;
    updateCourses: (courses: Course[]) => Promise<void>;
    updateFaculty: (faculty: Faculty[]) => Promise<void>;
    updateRooms: (rooms: Room[]) => Promise<void>;
    updateAllotments: (allotments: CourseAllotment[]) => Promise<void>;
    updateDepartments: (departments: Department[]) => Promise<void>;
    updateSemesters: (semesters: Semester[]) => Promise<void>;
    updateSchemas: (schemas: SemesterSchema[]) => Promise<void>;

    // Bulk Import Actions
    importCourses: (courses: Course[]) => Promise<void>;
    importFaculty: (faculty: Faculty[]) => Promise<void>;
    importRooms: (rooms: Room[]) => Promise<void>;
    importCompleteTimetable: (data: { courses: Course[], faculty: Faculty[], rooms: Room[], allotments: CourseAllotment[] }) => Promise<void>;

    setNavigationFilter: (filter: { department?: string, semesterLevel?: string, classId?: string } | null) => void;
    setLastGenerated: (timestamp: string) => void;
    toggleDebugMode: () => void;

    // Timetable persistence
    saveTimetableEntries: (metadata: { semester: string, department: string, section: string }) => Promise<void>;
    checkTimetableExists: (metadata: { semester: string, department: string, section: string }) => Promise<boolean>;
    exportAllTimetables: () => Promise<void>;

    resetToDefaults: () => Promise<void>;
    clearAllData: () => Promise<void>;
}

export const useTimetableStore = create<TimetableStore>((set, get) => ({
    // Initial state
    entries: [],
    courses: [],
    faculty: [],
    rooms: [],
    allotments: [],
    departments: [],
    semesters: [],
    schemas: [],
    generationConflicts: [],
    lastGenerated: null,
    navigationFilter: null,
    debugMode: false,
    isLoading: false,
    error: null,

    // Generation progress state
    isGenerating: false,
    generationProgress: 0,
    generationStatus: "",
    solutionsFound: 0,
    generationStartTime: 0,

    // Actions
    setEntries: (entries) => {
        console.log("Store: setEntries called with", entries.length, "entries");
        set({ entries, lastGenerated: new Date().toISOString() });
    },
    setGenerationConflicts: (conflicts) => {
        console.log("Store: setGenerationConflicts called with", conflicts.length, "conflicts");
        set({ generationConflicts: conflicts });
    },
    setNavigationFilter: (filter) => {
        set({ navigationFilter: filter });
    },
    updateEntry: (updatedEntry) => {
        set((state) => ({
            entries: state.entries.map((e) =>
                e.id === updatedEntry.id ? updatedEntry : e
            )
        }));
    },
    clearEntries: () => set({ entries: [], lastGenerated: null }),

    // Generation progress actions
    setIsGenerating: (isGenerating) => set({ isGenerating }),
    setGenerationProgress: (generationProgress) => set({ generationProgress }),
    setGenerationStatus: (generationStatus) => set({ generationStatus }),
    setSolutionsFound: (solutionsFound) => set({ solutionsFound }),
    setGenerationStartTime: (generationStartTime) => set({ generationStartTime }),

    fetchData: async () => {
        set({ isLoading: true, error: null });
        try {
            await dataService.initialize();
            const [courses, faculty, rooms, allotments, departments, semesters, schemas, loadedEntries] = await Promise.all([
                dataService.loadCourses(),
                dataService.loadFaculty(),
                dataService.loadRooms(),
                dataService.loadAllotments(),
                dataService.loadDepartments(),
                dataService.loadSemesters(),
                dataService.loadSchemas(),
                dataService.loadTimetableEntries(),
            ]);

            // Only set entries if some were loaded AND we don't have any current entries
            // This prevents overwriting a freshly generated timetable
            const { entries: currentEntries } = get();
            const entriesToSet = (loadedEntries.length > 0 && currentEntries.length === 0) ? loadedEntries : currentEntries;

            set({ courses, faculty, rooms, allotments, departments, semesters, schemas, entries: entriesToSet, isLoading: false });
        } catch (error) {
            console.error('Error fetching data:', error);
            set({ error: 'Failed to load data', isLoading: false });
        }
    },

    updateCourses: async (courses) => {
        set({ isLoading: true, error: null });
        try {
            await dataService.saveCourses(courses);
            set({ courses, isLoading: false });
        } catch (error) {
            set({ error: 'Failed to save courses', isLoading: false });
        }
    },

    updateFaculty: async (faculty) => {
        set({ isLoading: true, error: null });
        try {
            await dataService.saveFaculty(faculty);
            set({ faculty, isLoading: false });
        } catch (error) {
            set({ error: 'Failed to save faculty', isLoading: false });
        }
    },

    updateRooms: async (rooms) => {
        set({ isLoading: true, error: null });
        try {
            await dataService.saveRooms(rooms);
            set({ rooms, isLoading: false });
        } catch (error) {
            set({ error: 'Failed to save rooms', isLoading: false });
        }
    },

    updateAllotments: async (allotments) => {
        set({ isLoading: true, error: null });
        try {
            await dataService.saveAllotments(allotments);
            set({ allotments, isLoading: false });
        } catch (error) {
            set({ error: 'Failed to save allotments', isLoading: false });
        }
    },

    updateDepartments: async (departments) => {
        set({ isLoading: true, error: null });
        try {
            await dataService.saveDepartments(departments);
            set({ departments, isLoading: false });
        } catch (error) {
            set({ error: 'Failed to save departments', isLoading: false });
        }
    },

    updateSemesters: async (semesters) => {
        set({ isLoading: true, error: null });
        try {
            await dataService.saveSemesters(semesters);
            set({ semesters, isLoading: false });
        } catch (error) {
            set({ error: 'Failed to save semesters', isLoading: false });
        }
    },

    updateSchemas: async (schemas) => {
        set({ isLoading: true, error: null });
        try {
            await dataService.saveSchemas(schemas);
            set({ schemas, isLoading: false });
        } catch (error) {
            set({ error: 'Failed to save schemas', isLoading: false });
        }
    },

    setLastGenerated: (timestamp) => set({ lastGenerated: timestamp }),

    toggleDebugMode: () => {
        set((state) => ({ debugMode: !state.debugMode }));
    },

    // Timetable persistence methods
    saveTimetableEntries: async (metadata: { semester: string, department: string, section: string }) => {
        const { entries } = get();
        if (entries.length === 0) return;
        try {
            await dataService.saveTimetableEntries(entries, metadata);
            console.log('Timetable saved successfully');
        } catch (error) {
            console.error('Failed to save timetable:', error);
            throw error;
        }
    },

    checkTimetableExists: async (metadata: { semester: string, department: string, section: string }) => {
        try {
            return await dataService.checkTimetableExists(metadata.semester, metadata.department, metadata.section);
        } catch (error) {
            console.error('Failed to check timetable existence:', error);
            return false;
        }
    },

    exportAllTimetables: async () => {
        const { entries } = get();
        if (entries.length === 0) {
            throw new Error('No timetable entries to export');
        }
        try {
            // Extract metadata from entries
            // Use the first entry's metadata or fall back to generic values
            const firstEntry = entries[0];
            const metadata = {
                semester: firstEntry.metadata?.semesterLevel?.toString() || firstEntry.semester || 'All',
                department: firstEntry.metadata?.departmentCode || 'All',
                section: 'All Sections'
            };

            await dataService.saveTimetableEntries(entries, metadata);
            console.log('All timetables exported successfully to Google Sheets');
        } catch (error) {
            console.error('Failed to export all timetables:', error);
            throw error;
        }
    },

    resetToDefaults: async () => {
        set({ isLoading: true, error: null });
        try {
            await dataService.resetToDefaults();
            await get().fetchData();
        } catch (error) {
            set({ error: 'Failed to reset data', isLoading: false });
        }
    },

    // Bulk Import Methods
    importCourses: async (newCourses) => {
        const { courses } = get();
        // Merge with existing, avoiding duplicates by code
        const existingCodes = new Set(courses.map(c => c.code));
        const uniqueNewCourses = newCourses.filter(c => !existingCodes.has(c.code));
        const mergedCourses = [...courses, ...uniqueNewCourses];
        await get().updateCourses(mergedCourses);
    },

    importFaculty: async (newFaculty) => {
        const { faculty } = get();
        // Merge with existing, avoiding duplicates by name
        const existingNames = new Set(faculty.map(f => f.name));
        const uniqueNewFaculty = newFaculty.filter(f => !existingNames.has(f.name));
        const mergedFaculty = [...faculty, ...uniqueNewFaculty];
        await get().updateFaculty(mergedFaculty);
    },

    importRooms: async (newRooms) => {
        const { rooms } = get();
        // Merge with existing, avoiding duplicates by name
        const existingNames = new Set(rooms.map(r => r.name));
        const uniqueNewRooms = newRooms.filter(r => !existingNames.has(r.name));
        const mergedRooms = [...rooms, ...uniqueNewRooms];
        await get().updateRooms(mergedRooms);
    },

    importCompleteTimetable: async (data) => {
        const { courses: existingCourses, faculty: existingFaculty, rooms: existingRooms, allotments: existingAllotments } = get();

        // Merge courses (deduplicate by code)
        const existingCourseCodes = new Set(existingCourses.map(c => c.code));
        const uniqueNewCourses = data.courses.filter(c => !existingCourseCodes.has(c.code));
        const mergedCourses = [...existingCourses, ...uniqueNewCourses];

        // Merge faculty (deduplicate by name)
        const existingFacultyNames = new Set(existingFaculty.map(f => f.name));
        const uniqueNewFaculty = data.faculty.filter(f => !existingFacultyNames.has(f.name));
        const mergedFaculty = [...existingFaculty, ...uniqueNewFaculty];

        // Merge rooms (deduplicate by name)
        const existingRoomNames = new Set(existingRooms.map(r => r.name));
        const uniqueNewRooms = data.rooms.filter(r => !existingRoomNames.has(r.name));
        const mergedRooms = [...existingRooms, ...uniqueNewRooms];

        // Merge allotments (deduplicate by courseId-facultyId combination)
        // IMPORTANT: Remap IDs to match the merged courses and faculty
        const courseIdMap = new Map<string, string>();
        const facultyIdMap = new Map<string, string>();

        // Build mapping from old IDs to new IDs
        data.courses.forEach(newCourse => {
            const existing = mergedCourses.find(c => c.code === newCourse.code);
            if (existing && existing.id !== newCourse.id) {
                courseIdMap.set(newCourse.id, existing.id);
            }
        });

        data.faculty.forEach(newFaculty => {
            const existing = mergedFaculty.find(f => f.name === newFaculty.name);
            if (existing && existing.id !== newFaculty.id) {
                facultyIdMap.set(newFaculty.id, existing.id);
            }
        });

        // Remap allotment IDs
        const remappedAllotments = data.allotments.map(allotment => ({
            ...allotment,
            courseId: courseIdMap.get(allotment.courseId) || allotment.courseId,
            facultyId: facultyIdMap.get(allotment.facultyId) || allotment.facultyId
        }));

        // Deduplicate by courseId-facultyId-department combination
        // This allows same course+faculty for different departments
        const existingAllotmentKeys = new Set(
            existingAllotments.map(a => {
                const course = mergedCourses.find(c => c.id === a.courseId);
                const dept = a.department || course?.department || '';
                return `${a.courseId}-${a.facultyId}-${dept}`;
            })
        );

        const uniqueNewAllotments = remappedAllotments.filter(a => {
            const course = mergedCourses.find(c => c.id === a.courseId);
            const dept = a.department || course?.department || '';
            return !existingAllotmentKeys.has(`${a.courseId}-${a.facultyId}-${dept}`);
        });

        const mergedAllotments = [...existingAllotments, ...uniqueNewAllotments];

        // Save base entities first (courses, faculty, rooms)
        await Promise.all([
            get().updateCourses(mergedCourses),
            get().updateFaculty(mergedFaculty),
            get().updateRooms(mergedRooms)
        ]);

        // Then save allotments (which reference courses and faculty)
        await get().updateAllotments(mergedAllotments);
    },

    clearAllData: async () => {
        set({ isLoading: true, error: null });
        try {
            await Promise.all([
                dataService.saveCourses([]),
                dataService.saveFaculty([]),
                dataService.saveRooms([]),
                dataService.saveAllotments([]),
                dataService.saveDepartments([]),
                dataService.saveSemesters([]),
                dataService.saveSchemas([])
            ]);
            set({
                courses: [],
                faculty: [],
                rooms: [],
                allotments: [],
                departments: [],
                semesters: [],
                schemas: [],
                isLoading: false
            });
        } catch (error) {
            console.error('Error clearing data:', error);
            set({ error: 'Failed to clear data', isLoading: false });
        }
    }
}));
