import React, { useState, useMemo } from 'react';
import { useTimetableStore } from '../../stores/timetableStore';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    useDraggable,
    useDroppable,
    pointerWithin
} from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

// Helper Component: Draggable Session Card
interface DraggableSessionProps {
    id: string;
    courseCode: string;
    courseName: string;
    roomName: string;
    facultyName: string;
}

function DraggableSession({ id, courseCode, courseName, roomName, facultyName }: DraggableSessionProps) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: id,
    });

    return (
        <Card
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`p-2 h-full text-xs shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${isDragging ? "opacity-30 border-blue-200 border-dashed bg-blue-50/50" : "bg-white"}`}
        >
            <div className="font-bold text-slate-800 dark:text-slate-100 truncate">{courseCode}</div>
            <div className="text-slate-500 truncate text-[10px]">{courseName}</div>
            <div className="text-blue-600 truncate text-[10px] font-medium">{facultyName}</div>
            <div className="mt-1 inline-block bg-slate-100 dark:bg-slate-600 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-600 dark:text-slate-200">
                {roomName}
            </div>
        </Card>
    );
}

// Helper Component: Droppable Slot Cell
interface DroppableSlotProps {
    id: string;
    children?: React.ReactNode;
}

function DroppableSlot({ id, children }: DroppableSlotProps) {
    const { isOver, setNodeRef } = useDroppable({
        id: id,
    });

    return (
        <div
            ref={setNodeRef}
            className={`h-24 border border-slate-100 p-1 flex flex-col gap-1 rounded-md transition-colors ${isOver ? "bg-green-50 border-green-300 ring-2 ring-green-200 ring-inset" : "bg-slate-50/50"
                }`}
        >
            {children}
        </div>
    );
}

export default function EditTimetable() {
    const { entries, updateEntry, courses } = useTimetableStore();
    const [activeId, setActiveId] = useState<string | null>(null);
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

    const generatedClasses = useMemo(() => {
        return Array.from(new Set(entries.map(e => e.classId))).sort();
    }, [entries]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const [newDay, newStartTime] = (over.id as string).split('|');
            const entryToMove = entries.find(e => e.id === active.id);

            if (entryToMove && newDay && newStartTime) {
                const timeIntervals = [
                    { start: "08:30", end: "10:00" },
                    { start: "10:00", end: "11:30" },
                    { start: "11:30", end: "13:00" },
                    { start: "13:00", end: "14:30" },
                    { start: "14:30", end: "16:00" },
                    { start: "16:00", end: "17:30" }
                ];
                const matchingSlot = timeIntervals.find(t => t.start === newStartTime);
                const newEndTime = matchingSlot ? matchingSlot.end : entryToMove.timeSlot.endTime;

                const updatedEntry = {
                    ...entryToMove,
                    timeSlot: {
                        ...entryToMove.timeSlot,
                        day: newDay as "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday",
                        startTime: newStartTime,
                        endTime: newEndTime
                    }
                };
                updateEntry(updatedEntry);
            }
        }
        setActiveId(null);
    };

    const handleSave = () => {
        window.alert("Changes saved successfully!");
    };

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timeSlots = ["08:30", "10:00", "11:30", "13:00", "14:30", "16:00"];

    // SELECTION VIEW
    if (!selectedClassId) {
        return (
            <div className="p-8 space-y-6">
                <header>
                    <h1 className="text-2xl font-semibold text-slate-900">Edit Timetable</h1>
                    <p className="text-sm text-slate-500 mt-1">Select a class to modify its schedule.</p>
                </header>

                {generatedClasses.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-slate-200 shadow-sm">
                        <p className="text-slate-400 mb-2">No generated timetables found.</p>
                        <p className="text-sm text-slate-500">Go to the Dashboard to generate a new timetable.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {(() => {
                            // Group classes by semester
                            const classesBySemester: Record<string, any[]> = {};

                            generatedClasses.forEach((cls: string) => {
                                const classEntries = entries.filter((e: any) => e.classId === cls);
                                const firstEntry = classEntries[0];

                                let department = firstEntry?.metadata?.departmentCode || 'Unknown';
                                let semester: any = firstEntry?.metadata?.semesterLevel;

                                if (!semester) {
                                    const course = courses.find((c: any) => c.id === firstEntry?.courseId);
                                    semester = course?.semester || 'Unknown';
                                    if (!department) department = course?.department || department;
                                }

                                if (typeof semester === 'string') {
                                    const match = semester.match(/\d+/);
                                    semester = match ? match[0] : semester;
                                }

                                const semKey = `Semester ${semester}`;
                                if (!classesBySemester[semKey]) classesBySemester[semKey] = [];
                                classesBySemester[semKey].push({ cls, classEntries, department });
                            });

                            const sortedSemesters = Object.keys(classesBySemester).sort((a, b) => {
                                const numA = parseInt(a.match(/\d+/)?.[0] || '999');
                                const numB = parseInt(b.match(/\d+/)?.[0] || '999');
                                return numA - numB;
                            });

                            return sortedSemesters.map(semesterLabel => (
                                <div key={semesterLabel} className="space-y-4">
                                    {/* Semester Header - Simple */}
                                    <div className="flex items-center gap-3 px-1">
                                        <div className="flex items-center gap-2 text-blue-600">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                                            </svg>
                                            <h2 className="text-base font-semibold">{semesterLabel}</h2>
                                        </div>
                                        <div className="flex-1"></div>
                                        <span className="text-xs text-slate-500">
                                            {classesBySemester[semesterLabel].length} {classesBySemester[semesterLabel].length === 1 ? 'Section' : 'Sections'}
                                        </span>
                                    </div>

                                    {/* Classes - Single Column */}
                                    <div className="space-y-3">
                                        {classesBySemester[semesterLabel].map(({ cls, classEntries, department }: any) => {
                                            // Get unique courses and sort them
                                            const uniqueCourses = Array.from(new Set(classEntries.map((e: any) => e.courseCode || e.courseId))).sort();

                                            // Clean up department text
                                            const deptDisplay = department === 'Unknown' ? '' : department;

                                            return (
                                                <Card
                                                    key={cls}
                                                    className="cursor-pointer hover:shadow-md transition-all border border-slate-200 hover:border-blue-400 hover:ring-1 hover:ring-blue-100 bg-white group"
                                                    onClick={() => setSelectedClassId(cls)}
                                                >
                                                    {/* Card Header - Enhanced with better typography and stats */}
                                                    <CardHeader className="pb-3 pt-5 px-6 py-6">
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                                                                        {cls}
                                                                    </CardTitle>
                                                                    {(() => {
                                                                        const semNum = parseInt(semesterLabel.match(/\d+/)?.[0] || '0');
                                                                        const colorMap = [
                                                                            "bg-blue-50 text-blue-700 border-blue-200",
                                                                            "bg-emerald-50 text-emerald-700 border-emerald-200",
                                                                            "bg-violet-50 text-violet-700 border-violet-200",
                                                                            "bg-amber-50 text-amber-700 border-amber-200",
                                                                            "bg-rose-50 text-rose-700 border-rose-200",
                                                                            "bg-orange-50 text-orange-700 border-orange-200"
                                                                        ];
                                                                        const colorClass = colorMap[(semNum - 1) % colorMap.length] || colorMap[0];
                                                                        return (
                                                                            <Badge variant="outline" className={`text-[10px] font-semibold border uppercase tracking-wider ${colorClass}`}>
                                                                                Semester {semNum}
                                                                            </Badge>
                                                                        );
                                                                    })()}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                                                    {deptDisplay && (
                                                                        <>
                                                                            <span className="text-slate-700 dark:text-slate-300">{deptDisplay}</span>
                                                                            <span className="text-slate-300">•</span>
                                                                        </>
                                                                    )}
                                                                    <span className="text-slate-600">{uniqueCourses.length} Courses</span>
                                                                    <span className="text-slate-300">•</span>
                                                                    <span className="text-slate-600">{classEntries.length} Sessions</span>
                                                                </div>
                                                            </div>

                                                            {/* Arrow Icon with hover effect */}
                                                            <div className="h-8 w-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-all transform group-hover:translate-x-1">
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    </CardHeader>

                                                    {/* Horizontal Divider */}
                                                    <div className="px-6 py-0">
                                                        <div className="border-t border-slate-100"></div>
                                                    </div>

                                                    {/* Course Badges - Clean list */}
                                                    <CardContent className="px-6 pb-20 pt-6">
                                                        <div className="mb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                                            Active Courses
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 ">
                                                            {uniqueCourses.map((course: any) => (
                                                                <Badge
                                                                    key={course}
                                                                    variant="secondary"
                                                                    className="bg-slate-100 text-slate-600 hover:bg-white hover:shadow-sm hover:text-blue-600 border border-transparent hover:border-slate-200 transition-all font-medium text-[11px] px-2 py-0.5"
                                                                >
                                                                    {course}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                        <br ></br>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>
                )}
            </div>
        );
    }

    // EDITOR VIEW
    return (
        <div className="p-6 space-y-6">
            <header className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => setSelectedClassId(null)}
                        className="h-10 w-10 p-0 rounded-full hover:bg-slate-100"
                    >
                        ←
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Editing {selectedClassId}</h1>
                            <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50/30">
                                {(() => {
                                    const firstEntry = entries.find(e => e.classId === selectedClassId);
                                    const sem = firstEntry?.metadata?.semesterName || firstEntry?.semester || '';
                                    return sem.startsWith('Semester') ? sem : `Semester ${sem}`;
                                })()}
                            </Badge>
                        </div>
                        <p className="text-sm text-slate-500">Drag items to reschedule.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setSelectedClassId(null)}>Done</Button>
                    <Button onClick={handleSave} className="bg-slate-900 text-white hover:bg-slate-800">Save Changes</Button>
                </div>
            </header>

            <DndContext
                sensors={sensors}
                collisionDetection={pointerWithin}
                onDragStart={(event) => setActiveId(event.active.id as string)}
                onDragEnd={handleDragEnd}
            >
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div
                        className="grid bg-slate-50 border-b border-slate-200"
                        style={{ gridTemplateColumns: '100px repeat(5, 1fr)' }}
                    >
                        <div className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center border-r border-slate-200">Time</div>
                        {days.map(day => (
                            <div key={day} className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center border-r border-slate-200 last:border-0">
                                {day}
                            </div>
                        ))}
                    </div>

                    {timeSlots.map((time) => (
                        <div
                            key={time}
                            className="grid border-b border-slate-100 last:border-0"
                            style={{ gridTemplateColumns: '100px repeat(5, 1fr)' }}
                        >
                            <div className="p-4 text-xs font-medium text-slate-500 text-center border-r border-slate-200 flex items-center justify-center bg-slate-50/30">
                                {time}
                            </div>
                            {days.map(day => {
                                const slotId = `${day}|${time}`;
                                const slotEntries = entries.filter(e =>
                                    e.classId === selectedClassId &&
                                    e.timeSlot.day === day &&
                                    e.timeSlot.startTime === time
                                );

                                return (
                                    <div key={slotId} className="border-r border-slate-100 last:border-0 p-2 min-h-[100px]">
                                        <DroppableSlot id={slotId}>
                                            {slotEntries.map(entry => (
                                                <DraggableSession
                                                    key={entry.id}
                                                    id={entry.id}
                                                    courseCode={entry.courseCode}
                                                    courseName={entry.courseName || entry.courseId}
                                                    roomName={entry.roomName || entry.roomId}
                                                    facultyName={entry.facultyName}
                                                />
                                            ))}
                                        </DroppableSlot>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                <DragOverlay>
                    {activeId ? (
                        (() => {
                            const activeEntry = entries.find(e => e.id === activeId);
                            if (!activeEntry) return null;
                            return (
                                <Card className="p-2 w-48 bg-white shadow-xl border-blue-500 border opacity-90 rotate-3 cursor-grabbing pointer-events-none">
                                    <div className="font-bold text-slate-800 text-sm truncate">{activeEntry.courseCode}</div>
                                    <div className="text-slate-500 truncate text-[10px]">{activeEntry.courseName || activeEntry.courseId}</div>
                                    <div className="text-blue-600 truncate text-[10px] font-medium">{activeEntry.facultyName}</div>
                                    <div className="mt-1 inline-block bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-600">
                                        {activeEntry.roomName || activeEntry.roomId}
                                    </div>
                                </Card>
                            );
                        })()
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
