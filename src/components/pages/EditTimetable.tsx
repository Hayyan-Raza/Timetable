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

    // Original item stays in place but is dimmed/hidden. We do not transform it.
    // The DragOverlay provides the moving visual.

    return (
        <Card
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            // Use opacity-30 for ghost effect.
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
    id: string; // Format: "Day-Time"
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

    // Get unique classes that have generated entries - MEMOIZED
    const generatedClasses = useMemo(() => {
        return Array.from(new Set(entries.map(e => e.classId))).sort();
    }, [entries]);

    // DEBUG LOGS REMOVED FOR CLEANLINESS (User reported duplications, we assume backend fix is live or they will regenerate)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        // console.log("HANDLE DRAG END:", { activeId: active.id, overId: over?.id });

        if (over && active.id !== over.id) {
            console.log(`Moved ${active.id} to ${over.id}`);

            // Expected Over ID format: "Day-StartTime" (e.g., "Monday-08:30")
            const [newDay, newStartTime] = (over.id as string).split('|');

            // Find the entry being moved
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
                const newEndTime = matchingSlot ? matchingSlot.end : entryToMove.timeSlot.endTime; // Fallback

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
        console.log("Saving timetable entries:", entries);
        window.alert("Changes saved successfully (to local session)!");
    };

    // Define Grid structure
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timeSlots = ["08:30", "10:00", "11:30", "13:00", "14:30", "16:00"];

    // SELECTION VIEW
    if (!selectedClassId) {
        return (
            <div className="p-8 space-y-8">
                <header>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Edit Timetable</h1>
                    <p className="text-slate-500 mt-2">Select a class to modify its schedule.</p>
                </header>

                {generatedClasses.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
                        <p className="text-slate-400 mb-2">No generated timetables found.</p>
                        <p className="text-sm text-slate-500">Go to the Dashboard to generate a new timetable.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {generatedClasses.map(cls => {
                            const classEntries = entries.filter(e => e.classId === cls);
                            const uniqueCourses = new Set(classEntries.map(e => e.courseId)).size;

                            const firstEntry = classEntries[0];

                            // Extract department and semester - OPTIM IZED
                            let department = firstEntry?.metadata?.departmentCode || 'Unknown';
                            let semester: string | number | undefined = firstEntry?.metadata?.semesterLevel;

                            // Fallback: extract from course lookup if needed
                            if (!department || !semester) {
                                const course = courses.find((c: any) => c.id === firstEntry?.courseId);
                                if (course) {
                                    department = course.department || department;
                                    semester = course.semester || semester;
                                }
                            }

                            // Normalize semester to number
                            if (typeof semester === 'string') {
                                const match = semester.match(/\d+/);
                                semester = match ? parseInt(match[0]) : semester;
                            }

                            return (
                                <Card
                                    key={cls}
                                    className="cursor-pointer hover:shadow-lg transition-all border border-slate-200 hover:border-blue-500 group"
                                    onClick={() => setSelectedClassId(cls)}
                                >
                                    <CardHeader className="pb-3 pt-5 px-6 space-y-2.5">
                                        {/* Department and Semester Badge */}
                                        <div className="flex items-center justify-center gap-2">
                                            <Badge className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-0 hover:bg-purple-100 text-xs px-2.5 py-0.5 font-medium">
                                                {department}
                                            </Badge>
                                            <Badge className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-0 hover:bg-blue-100 text-xs px-2.5 py-0.5 font-medium">
                                                Sem {semester}
                                            </Badge>
                                        </div>

                                        {/* Class ID */}
                                        <CardTitle className="text-2xl font-bold text-center text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {cls}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-3 pb-5 px-6">
                                        <div className="space-y-2.5 text-sm">
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-600 dark:text-slate-400">Total Sessions</span>
                                                <span className="font-bold text-slate-900 dark:text-slate-100">{classEntries.length}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-600 dark:text-slate-400">Subjects</span>
                                                <span className="font-bold text-slate-900 dark:text-slate-100">{uniqueCourses}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
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
                    {/* Header Row */}
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

                    {/* Time Rows */}
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
                                // Find entries for this slot AND selected class
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
