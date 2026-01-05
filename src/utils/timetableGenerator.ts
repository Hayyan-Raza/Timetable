import {
    TimetableEntry,
    Course,
    Faculty,
    Room,
    CourseAllotment,
    TimeSlot,
    GenerationConfig,
    GenerationResult,
    Conflict
} from '../types/timetable.types';
import { validateEntry, checkFacultyMaxHours, timeSlotsOverlap } from './constraints';
import {
    TIME_SLOTS,
    WEEKDAY_SLOTS,
    WEEKEND_SLOTS,
    STANDARD_WEEKDAY_SLOTS,
    EXTENDED_WEEKDAY_SLOTS
} from '../data/sampleData';

/**
 * Generate a unique ID for timetable entries
 */
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Shuffle array to randomize slot selection
 */
function shuffleSlots(slots: TimeSlot[]): TimeSlot[] {
    const shuffled = [...slots];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Find pairs of consecutive time slots for lab classes
 * Lab classes need 2 consecutive slots on the same day with no break
 */
function findConsecutiveSlots(slots: TimeSlot[]): [TimeSlot, TimeSlot][] {
    const consecutivePairs: [TimeSlot, TimeSlot][] = [];

    console.log(`    🔍 Finding consecutive slots from ${slots.length} total slots`);

    for (let i = 0; i < slots.length - 1; i++) {
        const slot1 = slots[i];
        const slot2 = slots[i + 1];

        // Check if consecutive: same day and slot1.endTime === slot2.startTime
        if (slot1.day === slot2.day && slot1.endTime === slot2.startTime) {
            console.log(`      ✅ Found pair: ${slot1.day} ${slot1.startTime}-${slot1.endTime} + ${slot2.startTime}-${slot2.endTime}`);
            consecutivePairs.push([slot1, slot2]);
        }
    }

    console.log(`    📊 Total consecutive pairs found: ${consecutivePairs.length}`);
    return consecutivePairs;
}

function convertTo24Hour(timeStr: string): string {
    const [time, modifier] = timeStr.trim().split(' ');
    let [hours, minutes] = time.split(':');

    if (hours === '12') {
        hours = '00';
    }

    if (modifier?.toLowerCase() === 'pm') {
        hours = (parseInt(hours, 10) + 12).toString();
    }

    return `${hours.padStart(2, '0')}:${minutes}`;
}

/**
 * Filter allotments based on configuration (Semester, Department)
 */
export function getRelevantAllotments(
    allotments: CourseAllotment[],
    courses: Course[],
    faculty: Faculty[],
    config: GenerationConfig
): CourseAllotment[] {
    // 1. DEDUPLICATE ALLOTMENTS
    const uniqueAllotmentsMap = new Map<string, CourseAllotment>();

    allotments.forEach(a => {
        const sortedClasses = [...a.classIds].sort().join(',');
        const key = `${a.courseId}-${a.facultyId}-${sortedClasses}`;
        if (!uniqueAllotmentsMap.has(key)) {
            uniqueAllotmentsMap.set(key, a);
        }
    });

    const uniqueAllotments = Array.from(uniqueAllotmentsMap.values());

    // 2. FILTER BASED ON CONFIG
    return uniqueAllotments.map(allotment => {
        const course = courses.find(c => c.id === allotment.courseId);
        const facultyMember = faculty.find(f => f.id === allotment.facultyId);

        if (!course || !facultyMember) return null;

        // Semester Filter
        if (config.semester && config.semester !== 'all') {
            const configSemester = config.semester.toLowerCase();
            const courseSemester = String(course.semester).toLowerCase();
            const configNumber = configSemester.match(/\d+/)?.[0];
            const isMatch = courseSemester === configSemester || (configNumber && courseSemester === configNumber);
            if (!isMatch) return null;
        }

        // Department Filter
        if (config.department && config.department !== 'all') {
            const dept = config.department.toLowerCase();
            const facultyDept = facultyMember.department?.toLowerCase() || '';
            const courseCode = course.code.toLowerCase();

            // Check if ANY of the classes belong to this department (heuristic)
            const matchingClassIds = allotment.classIds.filter(classId =>
                classId.toLowerCase().includes(dept)
            );

            const matchesFaculty = facultyDept.includes(dept) || facultyDept === dept;
            const matchesCourse = courseCode.startsWith(dept) || courseCode.includes(`-${dept}-`) || courseCode.includes(dept);

            // NEW: If we are generating for a specific department, 
            // and some classes match OR the course/faculty belongs to it, keep it.
            // BUT also keep it if the config specifically requested these classes (future use)
            if (matchingClassIds.length === 0 && !matchesFaculty && !matchesCourse) {
                return null;
            }

            // IMPORTANT: If we keep the allotment, DON'T filter out "other" classes from it 
            // unless they definitely belong to a DIFFERENT department. 
            // For now, let's just keep all classIds for the allotment if it survives.
            return allotment;
        }

        return allotment;
    }).filter((a): a is CourseAllotment => a !== null);
}

/**
 * Main timetable generation function using improved greedy algorithm
 */
export function generateTimetable(
    courses: Course[],
    faculty: Faculty[],
    rooms: Room[],
    allotments: CourseAllotment[],
    config: GenerationConfig
): GenerationResult {
    const entries: TimetableEntry[] = [];
    const conflicts: Conflict[] = [];
    const unscheduledCourses: string[] = [];

    // Track slot usage for load balancing
    const globalSlotUsage = new Map<string, number>();

    const relevantAllotments = getRelevantAllotments(allotments, courses, faculty, config);

    console.log('%c🔄 TIMETABLE GENERATION STARTED', 'color: #4CAF50; font-size: 16px; font-weight: bold');
    console.log(`Processing ${relevantAllotments.length} unique filtered allotments`);

    console.log(`After filtering: ${relevantAllotments.length} relevant allotments`);
    if (relevantAllotments.length > 0) {
        console.log('Allotments to schedule:', relevantAllotments.map(a => {
            const course = courses.find(c => c.id === a.courseId);
            return `${course?.code} for classes: ${a.classIds.join(', ')}`;
        }));
    }

    // Calculate faculty load (number of classes assigned)
    const facultyLoad = new Map<string, number>();
    relevantAllotments.forEach(a => {
        const current = facultyLoad.get(a.facultyId) || 0;
        facultyLoad.set(a.facultyId, current + a.classIds.length);
    });

    // Sort courses by priority: Lab courses FIRST (massive priority), then Core > Major > Elective > Credits DESC
    // STRATEGY: Schedule all lab courses before theory courses because:
    // 1. Lab courses need consecutive time slots (more constrained)
    // 2. Lab rooms are limited resources
    // 3. Getting labs scheduled first prevents them from failing later
    const sortedAllotments = [...relevantAllotments].sort((a, b) => {
        const courseA = courses.find(c => c.id === a.courseId)!;
        const courseB = courses.find(c => c.id === b.courseId)!;

        // 1. Lab Priority (HIGHEST PRIORITY - Schedule ALL labs before ANY theory courses)
        // Check if course is a Lab or requires a Lab
        const isLabA = courseA.code.endsWith('-L') || courseA.name.toLowerCase().includes('lab') || courseA.requiresLab;
        const isLabB = courseB.code.endsWith('-L') || courseB.name.toLowerCase().includes('lab') || courseB.requiresLab;

        if (isLabA && !isLabB) return -1000; // A comes WAY before B
        if (!isLabA && isLabB) return 1000;  // B comes WAY before A

        // 2. Course Type Priority (only matters within lab group or within theory group)
        const typePriority = { 'Core': 3, 'Major': 2, 'Elective': 1 };
        const priorityDiff = typePriority[courseB.type] - typePriority[courseA.type];
        if (priorityDiff !== 0) return priorityDiff;

        // 3. Credits (higher credits first)
        return courseB.credits - courseA.credits;
    });

    // Log the scheduling strategy
    const labAllotments = sortedAllotments.filter(a => {
        const course = courses.find(c => c.id === a.courseId);
        if (!course) return false;
        return course.code.endsWith('-L') || course.name.toLowerCase().includes('lab') || course.requiresLab;
    });
    const theoryAllotments = sortedAllotments.length - labAllotments.length;

    console.log(`%c📋 SCHEDULING STRATEGY: Lab Courses First`, 'color: #2196F3; font-weight: bold; font-size: 14px');
    console.log(`  Phase 1: Scheduling ${labAllotments.length} LAB courses first (need consecutive slots + lab rooms)`);
    console.log(`  Phase 2: Then scheduling ${theoryAllotments} THEORY courses`);
    if (labAllotments.length > 0) {
        console.log(`  Lab courses:`, labAllotments.map(a => {
            const c = courses.find(x => x.id === a.courseId);
            return c?.code;
        }));
    }

    // Try to schedule each course allotment
    for (const allotment of sortedAllotments) {
        const course = courses.find(c => c.id === allotment.courseId);
        const facultyMember = faculty.find(f => f.id === allotment.facultyId);

        if (!course || !facultyMember) continue;

        // Determine appropriate slots based on semester
        // Semesters 1-6: Weekdays (08:30 - 17:30)
        // Semesters 7-8: Weekends (09:00 - 18:00)
        let semesterNum = parseInt(course.semester.replace(/\D/g, '')) || 1;

        // Sanity check: If semester number is suspiciously large (e.g. 2025), it's likely a year.
        // Default to 1 (Weekdays) in that case.
        if (semesterNum > 12) {
            semesterNum = 1;
        }

        const isWeekend = semesterNum >= 7;
        const availableSlots = isWeekend ? WEEKEND_SLOTS : WEEKDAY_SLOTS;

        // Filter classes if config specifies specific classes
        const classesToSchedule = config.classes && config.classes.length > 0
            ? allotment.classIds.filter(cId => config.classes.includes(cId))
            : allotment.classIds;

        // Check for manual schedule
        let forcedSlot: TimeSlot | undefined;
        if (allotment.manualSchedule) {
            const { day, time } = allotment.manualSchedule;
            // Parse time string "08:30 - 10:00 AM" -> "08:30", "10:00"
            const parts = time.split('-').map(p => p.trim());

            if (parts.length >= 1) {
                const startTime = convertTo24Hour(parts[0]);
                // Try to match loosely against available slots
                forcedSlot = TIME_SLOTS.find(s =>
                    s.day.toLowerCase() === day.toLowerCase() &&
                    (time.includes(s.startTime) || startTime === s.startTime)
                );

                // If no match found, CREATE A CUSTOM SLOT
                if (!forcedSlot) {
                    let endTime = "00:00";
                    if (parts.length > 1) {
                        endTime = convertTo24Hour(parts[1]);
                    } else {
                        // Default to 1.5 hours later
                        const [h, m] = startTime.split(':').map(Number);
                        const endH = h + 1;
                        const endM = m + 30;
                        endTime = `${endH}:${endM}`;
                    }

                    forcedSlot = {
                        day: day as any,
                        startTime: startTime,
                        endTime: endTime
                    };
                }
            }
        }

        // Helper to score slots based on constraints
        // Lower score = Better slot
        const scoreSlotsForClass = (slots: TimeSlot[], currentClassId: string): TimeSlot[] => {
            if (forcedSlot) return [forcedSlot];

            return [...slots].sort((a, b) => {
                let scoreA = (globalSlotUsage.get(`${a.day}-${a.startTime}`) || 0) + Math.random();
                let scoreB = (globalSlotUsage.get(`${b.day}-${b.startTime}`) || 0) + Math.random();

                // Get existing entries for this class
                const classEntries = entries.filter(e => e.classId === currentClassId);

                // 1. Daily Limit Check
                const dayEntriesA = classEntries.filter(e => e.timeSlot.day === a.day);
                const dayEntriesB = classEntries.filter(e => e.timeSlot.day === b.day);

                // Hard limit: Max 4 classes per day (user requirement: max 4 classes/day)
                if (dayEntriesA.length >= 4) scoreA += 10000;
                if (dayEntriesB.length >= 4) scoreB += 10000;

                // Soft limit: Prefer 3 classes per day
                if (dayEntriesA.length >= 3) scoreA += 50;
                if (dayEntriesB.length >= 3) scoreB += 50;

                // 2. Consecutive Classes Check (Force Break)
                // We want to avoid 3 consecutive classes.
                // So if we have [Class] [Class] [Candidate], that's bad.
                // Or [Candidate] [Class] [Class].
                // Or [Class] [Candidate] [Class].

                const isConsecutiveBad = (slot: TimeSlot, dayEntries: TimetableEntry[]) => {
                    // Find index of this slot in the day's full schedule
                    // We need the master list of slots for this day to know adjacency
                    const daySlots = TIME_SLOTS.filter(s => s.day === slot.day);
                    const slotIndex = daySlots.findIndex(s => s.startTime === slot.startTime);

                    if (slotIndex === -1) return false;

                    const prev1 = daySlots[slotIndex - 1];
                    const prev2 = daySlots[slotIndex - 2];
                    const next1 = daySlots[slotIndex + 1];
                    const next2 = daySlots[slotIndex + 2];

                    const hasPrev1 = prev1 && dayEntries.some(e => e.timeSlot.startTime === prev1.startTime);
                    const hasPrev2 = prev2 && dayEntries.some(e => e.timeSlot.startTime === prev2.startTime);
                    const hasNext1 = next1 && dayEntries.some(e => e.timeSlot.startTime === next1.startTime);
                    const hasNext2 = next2 && dayEntries.some(e => e.timeSlot.startTime === next2.startTime);

                    // Case 1: [Class] [Class] [Candidate]
                    if (hasPrev1 && hasPrev2) return true;
                    // Case 2: [Candidate] [Class] [Class]
                    if (hasNext1 && hasNext2) return true;
                    // Case 3: [Class] [Candidate] [Class]
                    if (hasPrev1 && hasNext1) return true;

                    return false;
                };

                if (isConsecutiveBad(a, dayEntriesA)) scoreA += 100;
                if (isConsecutiveBad(b, dayEntriesB)) scoreB += 100;

                return scoreA - scoreB;
            });
        };

        // For each class this course is assigned to
        for (const classId of classesToSchedule) {
            // Re-calculate prioritized slots for THIS SPECIFIC CLASS
            // because scoring depends on the class's current schedule
            const prioritizedSlots = scoreSlotsForClass(availableSlots, classId);

            // Calculate how many sessions needed 
            const isLabCourse = course.code.endsWith('-L') || course.name.toLowerCase().includes('lab');

            const theorySessionsNeeded = isLabCourse ? 0 : (course.credits <= 3 ? 2 : 3);
            const labSessionsNeeded = (course.requiresLab || isLabCourse) ? 1 : 0;

            const sessionsNeeded = theorySessionsNeeded + labSessionsNeeded;
            let scheduled = 0;
            const usedDays = new Set<string>();

            // Try to schedule theory sessions - prefer spreading across different days
            for (const timeSlot of prioritizedSlots) {
                if (scheduled >= theorySessionsNeeded) break;

                // Prefer slots on days we haven't used yet (spread sessions across week)
                if (usedDays.has(timeSlot.day) && scheduled < 2) {
                    continue; // Try to get at least 2 different days first
                }

                // Find suitable room
                let suitableRooms = rooms.filter(r =>
                    (r.type === 'lecture' || r.type === 'both')
                );

                // Filter out rooms that are already booked at this time
                suitableRooms = suitableRooms.filter(room => {
                    const isBooked = entries.some(e =>
                        e.roomId === room.id &&
                        timeSlotsOverlap(e.timeSlot, timeSlot)
                    );
                    return !isBooked;
                });

                // Shuffle rooms to distribute classes across different rooms
                // Instead of always picking the first room, randomize the selection
                if (suitableRooms.length > 1) {
                    for (let i = suitableRooms.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [suitableRooms[i], suitableRooms[j]] = [suitableRooms[j], suitableRooms[i]];
                    }
                }

                // let slotAssigned = false;
                for (const room of suitableRooms) {
                    const newEntry: Omit<TimetableEntry, 'id'> = {
                        courseId: course.id,
                        courseName: course.name,
                        courseCode: course.code,
                        facultyId: facultyMember.id,
                        facultyName: facultyMember.name,
                        roomId: room.id,
                        roomName: room.name,
                        classId,
                        timeSlot,
                        semester: course.semester,
                        metadata: {
                            // Always extract department from classId for consistency (e.g., "BS-SE-1-AM" -> "BS-SE")
                            departmentCode: (() => {
                                const parts = classId.split('-');
                                return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : 'UNKNOWN';
                            })(),
                            semesterName: config.semester !== 'all' ? config.semester : course.semester,
                            semesterLevel: (() => {
                                const parts = classId.split('-');
                                return parts.length >= 3 ? parseInt(parts[2]) : (parseInt(String(course.semester).replace(/\D/g, '')) || 0);
                            })()
                        }
                    };

                    // Validate entry
                    const entryConflicts = validateEntry(
                        newEntry,
                        entries,
                        room.capacity,
                        course.estimatedStudents
                    );

                    // Log conflicts for debugging
                    if (entryConflicts.length > 0) {
                        console.log(`  🔍 Validation conflicts for ${course.code} in ${room.name} at ${timeSlot.day} ${timeSlot.startTime}:`,
                            entryConflicts.map(c => `${c.severity}: ${c.message}`));
                    }

                    // If no blocking conflicts OR if this is a forced slot (manual schedule)
                    // If forced, we ignore conflicts but maybe log them?
                    // The user wants "just create timetable", so we force it.
                    const hasErrors = entryConflicts.filter(c => c.severity === 'error').length > 0;

                    if (!hasErrors || forcedSlot) {
                        entries.push({
                            ...newEntry,
                            id: generateId()
                        });
                        scheduled++;
                        usedDays.add(timeSlot.day);

                        // Update global usage count
                        const slotKey = `${timeSlot.day}-${timeSlot.startTime}`;
                        globalSlotUsage.set(slotKey, (globalSlotUsage.get(slotKey) || 0) + 1);

                        // slotAssigned = true;
                        break; // Found a suitable room, move to next time slot
                    }
                }
            }

            // Second pass: if still need slots, allow same-day scheduling
            if (scheduled < theorySessionsNeeded) {
                for (const timeSlot of prioritizedSlots) {
                    if (scheduled >= theorySessionsNeeded) break;

                    let suitableRooms = rooms.filter(r =>
                        (r.type === 'lecture' || r.type === 'both')
                    );

                    // Filter out rooms that are already booked at this time
                    suitableRooms = suitableRooms.filter(room => {
                        const isBooked = entries.some(e =>
                            e.roomId === room.id &&
                            timeSlotsOverlap(e.timeSlot, timeSlot)
                        );
                        return !isBooked;
                    });

                    // Shuffle rooms to distribute classes
                    if (suitableRooms.length > 1) {
                        for (let i = suitableRooms.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [suitableRooms[i], suitableRooms[j]] = [suitableRooms[j], suitableRooms[i]];
                        }
                    }

                    for (const room of suitableRooms) {
                        const newEntry: Omit<TimetableEntry, 'id'> = {
                            courseId: course.id,
                            courseName: course.name,
                            courseCode: course.code,
                            facultyId: facultyMember.id,
                            facultyName: facultyMember.name,
                            roomId: room.id,
                            roomName: room.name,
                            classId,
                            timeSlot,
                            semester: course.semester,
                            metadata: {
                                // Always extract department from classId for consistency
                                departmentCode: (() => {
                                    const parts = classId.split('-');
                                    return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : 'UNKNOWN';
                                })(),
                                semesterName: config.semester !== 'all' ? config.semester : course.semester,
                                semesterLevel: (() => {
                                    const parts = classId.split('-');
                                    return parts.length >= 3 ? parseInt(parts[2]) : (parseInt(String(course.semester).replace(/\D/g, '')) || 0);
                                })()
                            }
                        };

                        const entryConflicts = validateEntry(
                            newEntry,
                            entries,
                            room.capacity,
                            course.estimatedStudents
                        );

                        if (entryConflicts.filter(c => c.severity === 'error').length === 0) {
                            entries.push({
                                ...newEntry,
                                id: generateId()
                            });
                            scheduled++;

                            // Update global usage count
                            const slotKey = `${timeSlot.day}-${timeSlot.startTime}`;
                            globalSlotUsage.set(slotKey, (globalSlotUsage.get(slotKey) || 0) + 1);

                            break;
                        }
                    }
                }
            }

            // Try to schedule lab session if needed (requires 2 CONSECUTIVE slots)
            if ((course.requiresLab || isLabCourse) && scheduled < sessionsNeeded) {
                // Find all consecutive slot pairs
                const consecutivePairs = findConsecutiveSlots(prioritizedSlots);

                console.log(`  🧪 Scheduling LAB for ${course.code} (${classId})`);
                console.log(`    - Sessions needed: ${sessionsNeeded}, already scheduled: ${scheduled}`);
                console.log(`    - Consecutive slot pairs found: ${consecutivePairs.length}`);

                // Log all lab rooms available
                const allLabRooms = rooms.filter(r => (r.type === 'lab' || r.type === 'both'));
                console.log(`    - Total lab rooms: ${allLabRooms.length}/${rooms.length}`);
                if (allLabRooms.length > 0) {
                    console.log(`    - Lab rooms:`, allLabRooms.map(r => `${r.name} (${r.type})`));
                }

                for (const [slot1, slot2] of consecutivePairs) {
                    if (scheduled >= sessionsNeeded) break;

                    let labRooms = rooms.filter(r =>
                        (r.type === 'lab' || r.type === 'both')
                    );

                    console.log(`    - Trying ${slot1.day} ${slot1.startTime}-${slot2.endTime}`);
                    console.log(`      Initial lab rooms: ${labRooms.length}`);

                    // Filter rooms available for BOTH consecutive slots
                    labRooms = labRooms.filter(room => {
                        const isSlot1Booked = entries.some(e =>
                            e.roomId === room.id &&
                            timeSlotsOverlap(e.timeSlot, slot1)
                        );
                        const isSlot2Booked = entries.some(e =>
                            e.roomId === room.id &&
                            timeSlotsOverlap(e.timeSlot, slot2)
                        );
                        return !isSlot1Booked && !isSlot2Booked;
                    });

                    console.log(`      Available lab rooms after filtering: ${labRooms.length}`);

                    // Shuffle lab rooms to distribute classes
                    if (labRooms.length > 1) {
                        for (let i = labRooms.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [labRooms[i], labRooms[j]] = [labRooms[j], labRooms[i]];
                        }
                    }

                    for (const room of labRooms) {
                        // Helper to format lab name without duplication
                        const baseName = course.name.trim();
                        const labSuffix = baseName.toLowerCase().endsWith(' lab') ? '' : ' Lab';
                        const labNamePart1 = `${baseName}${labSuffix} (Part 1)`;
                        const labNamePart2 = `${baseName}${labSuffix} (Part 2)`;

                        // Create entries for BOTH consecutive slots
                        const entry1: Omit<TimetableEntry, 'id'> = {
                            courseId: course.id,
                            courseName: labNamePart1,
                            courseCode: `${course.code}-L`,
                            facultyId: facultyMember.id,
                            facultyName: facultyMember.name,
                            roomId: room.id,
                            roomName: room.name,
                            classId,
                            timeSlot: slot1,
                            semester: course.semester,
                            metadata: {
                                // Always extract department from classId for consistency
                                departmentCode: (() => {
                                    const parts = classId.split('-');
                                    return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : 'UNKNOWN';
                                })(),
                                semesterName: config.semester !== 'all' ? config.semester : course.semester,
                                semesterLevel: (() => {
                                    const parts = classId.split('-');
                                    return parts.length >= 3 ? parseInt(parts[2]) : (parseInt(String(course.semester).replace(/\D/g, '')) || 0);
                                })()
                            }
                        };

                        const entry2: Omit<TimetableEntry, 'id'> = {
                            courseId: course.id,
                            courseName: labNamePart2,
                            courseCode: `${course.code}-L`,
                            facultyId: facultyMember.id,
                            facultyName: facultyMember.name,
                            roomId: room.id,
                            roomName: room.name,
                            classId,
                            timeSlot: slot2,
                            semester: course.semester,
                            metadata: {
                                // Always extract department from classId for consistency
                                departmentCode: (() => {
                                    const parts = classId.split('-');
                                    return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : 'UNKNOWN';
                                })(),
                                semesterName: config.semester !== 'all' ? config.semester : course.semester,
                                semesterLevel: (() => {
                                    const parts = classId.split('-');
                                    return parts.length >= 3 ? parseInt(parts[2]) : (parseInt(String(course.semester).replace(/\D/g, '')) || 0);
                                })()
                            }
                        };

                        // Validate both entries
                        const conflicts1 = validateEntry(entry1, entries, room.capacity, course.estimatedStudents);
                        const conflicts2 = validateEntry(entry2, entries, room.capacity, course.estimatedStudents);

                        // Only add if BOTH slots are valid
                        if (conflicts1.filter(c => c.severity === 'error').length === 0 &&
                            conflicts2.filter(c => c.severity === 'error').length === 0) {
                            entries.push({ ...entry1, id: generateId() });
                            entries.push({ ...entry2, id: generateId() });
                            scheduled += 2; // Lab counts as 2 sessions


                            // Update global usage count
                            const slotKey = `${slot1.day}-${slot1.startTime}`;
                            globalSlotUsage.set(slotKey, (globalSlotUsage.get(slotKey) || 0) + 1);

                            break;
                        }
                    }
                }
            }

            // If couldn't schedule all sessions, record as unscheduled
            if (scheduled < sessionsNeeded) {
                console.log(`❌ Only scheduled ${scheduled}/${sessionsNeeded} sessions for ${course.code} (${classId})`);
                unscheduledCourses.push(`${course.code} for ${classId}`);

                // Diagnose the failure
                let reason = "Unknown";
                const suitableRooms = rooms.filter(r => r.capacity >= course.estimatedStudents);
                const classEntries = entries.filter(e => e.classId === classId);
                const facultyEntries = entries.filter(e => e.facultyId === facultyMember.id);

                console.log(`  Diagnostics:`);
                console.log(`    - Suitable rooms: ${suitableRooms.length}/${rooms.length}`);
                console.log(`    - Class ${classId} has ${classEntries.length} entries already (${availableSlots.length} slots available)`);
                console.log(`    - Faculty ${facultyMember.name} has ${facultyEntries.length} entries already`);

                if (suitableRooms.length === 0) {
                    reason = `No rooms with sufficient capacity (need ${course.estimatedStudents}+ capacity)`;
                } else if (facultyEntries.length >= availableSlots.length) {
                    reason = `Faculty '${facultyMember.name}' fully booked (${facultyEntries.length}/${availableSlots.length} slots)`;
                } else if (classEntries.length >= availableSlots.length * 0.8) {
                    reason = `Class '${classId}' is overloaded (${classEntries.length} scheduled, ${availableSlots.length} available, needs ${sessionsNeeded - scheduled} more)`;
                } else {
                    reason = `Time slot/Resource conflicts (may need to relax constraints or add more rooms)`;
                }

                console.log(`Failed to schedule ${course.code} (${classId}): ${reason}`);

                conflicts.push({
                    type: 'student-clash',
                    message: `Could not find enough free slots for ${course.code} for Class '${classId}'. Scheduled ${scheduled}/${sessionsNeeded} sessions. Reason: ${reason}`,
                    affectedEntries: [],
                    severity: 'error'
                });
            }
        }
    }

    // Check faculty maximum hours
    for (const facultyMember of faculty) {
        const hoursConflict = checkFacultyMaxHours(
            facultyMember.id,
            entries,
            facultyMember.maxWeeklyHours
        );
        if (hoursConflict) {
            conflicts.push(hoursConflict);
        }
    }

    const statistics = {
        totalCourses: sortedAllotments.length,
        scheduledCourses: sortedAllotments.length - new Set(unscheduledCourses.map(u => u.split(' for ')[0])).size,
        unscheduledCourses: new Set(unscheduledCourses.map(u => u.split(' for ')[0])).size,
        totalSlots: TIME_SLOTS.length,
        usedSlots: entries.length,
        conflictsFound: conflicts.length
    };

    const success = conflicts.filter(c => c.severity === 'error').length === 0;
    const message = success
        ? `Successfully generated timetable! Scheduled ${entries.length} classes across ${new Set(entries.map(e => e.classId)).size} classes.`
        : `Timetable generated with ${conflicts.filter(c => c.severity === 'error').length} conflicts. ${unscheduledCourses.length} course-class combinations could not be fully scheduled.`;

    return {
        success,
        timetable: entries,
        conflicts,
        statistics,
        message
    };
}

/**
 * Generate timetable using the Python Backend (OR-Tools)
 */
export async function generateTimetableViaAPI(
    courses: Course[],
    faculty: Faculty[],
    rooms: Room[],
    allotments: CourseAllotment[],
    config: GenerationConfig
): Promise<{ sessionId: string }> {
    try {
        console.log('🚀 Sending generation request to backend...');

        // Filter allotments BEFORE sending to backend
        const relevantAllotments = getRelevantAllotments(allotments, courses, faculty, config);
        console.log(`📦 Sending ${relevantAllotments.length} relevant allotments to backend`);

        const response = await fetch('http://127.0.0.1:5000/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                courses,
                faculty,
                rooms,
                allotments: relevantAllotments,
                config
            })
        });

        if (!response.ok) {
            throw new Error(`Backend error: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Backend started generation with session:', result.session_id);
        return { sessionId: result.session_id };

    } catch (error) {
        console.error('❌ Failed to start generation via API:', error);
        throw error;
    }
}

/**
 * Poll for generation progress
 */
export async function pollGenerationStatus(sessionId: string): Promise<any> {
    try {
        const response = await fetch(`http://127.0.0.1:5000/generation-status/${sessionId}`);

        if (!response.ok) {
            throw new Error(`Failed to get status: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('❌ Failed to poll status:', error);
        throw error;
    }
}

/**
 * Get timetable entries for a specific class
 */
export function getTimetableForClass(
    entries: TimetableEntry[],
    classId: string
): TimetableEntry[] {
    return entries.filter(entry => entry.classId === classId);
}

/**
 * Get timetable entries for a specific faculty
 */
export function getTimetableForFaculty(
    entries: TimetableEntry[],
    facultyId: string
): TimetableEntry[] {
    return entries.filter(entry => entry.facultyId === facultyId);
}

/**
 * Group timetable entries by day for display
 */
export function groupByDay(entries: TimetableEntry[]): Record<string, TimetableEntry[]> {
    const grouped: Record<string, TimetableEntry[]> = {
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: []
    };

    entries.forEach(entry => {
        if (grouped[entry.timeSlot.day]) {
            grouped[entry.timeSlot.day].push(entry);
        } else {
            // Handle weekend days if they appear
            grouped[entry.timeSlot.day] = [entry];
        }
    });

    return grouped;
}
