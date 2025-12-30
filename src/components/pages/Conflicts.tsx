import { useState, useEffect } from "react";
import { useTimetableStore } from "../../stores/timetableStore";
import { checkAllConflicts } from "../../utils/constraints";
import { Conflict } from "../../types/timetable.types";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
    AlertTriangle,
    Search,
    CheckCircle2,
    Users,
    Building2,
    GraduationCap,
    RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

export function Conflicts({ onPageChange }: { onPageChange: (page: any) => void }) {
    const { entries, generationConflicts, setNavigationFilter } = useTimetableStore();
    const [foundConflicts, setFoundConflicts] = useState<Conflict[]>([]);

    const handleConflictClick = (conflict: Conflict) => {
        if (!conflict.affectedEntries || conflict.affectedEntries.length === 0) {
            // If it's an unscheduled session, we might not have entries, 
            // but the message might contain bits of info (like classId)
            const classMatch = conflict.message.match(/Class '([^']+)'/);
            if (classMatch) {
                const classId = classMatch[1];
                setNavigationFilter({ classId });
                onPageChange("Timetable");
            }
            return;
        }

        // Get info from first affected entry
        const entryId = conflict.affectedEntries[0];
        const entry = entries.find(e => e.id === entryId);

        if (entry) {
            setNavigationFilter({
                department: entry.metadata?.departmentCode,
                semesterLevel: entry.metadata?.semesterLevel.toString(),
                classId: entry.classId
            });
            onPageChange("Timetable");
        }
    };
    const [isChecking, setIsChecking] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);

    // Load generation conflicts immediately if they exist
    useEffect(() => {
        if (generationConflicts && generationConflicts.length > 0) {
            setFoundConflicts(generationConflicts);
            setHasChecked(true);
        }
    }, [generationConflicts]);

    const handleCheckConflicts = () => {
        if (entries.length === 0) {
            toast.error("No timetable data found. Generate or load a timetable first.");
            return;
        }

        setIsChecking(true);
        setHasChecked(false);

        // Small delay for UI feel
        setTimeout(() => {
            const auditConflicts = checkAllConflicts(entries);
            // Merge audit conflicts with persistent generation conflicts (especially unscheduled ones)
            // Unscheduled ones won't be in audit because they have no entries
            const merged = [...auditConflicts];

            // Avoid duplicates if same messages
            generationConflicts.forEach(gc => {
                if (!merged.some(m => m.message === gc.message)) {
                    merged.push(gc);
                }
            });

            setFoundConflicts(merged);
            setIsChecking(false);
            setHasChecked(true);

            if (merged.length > 0) {
                toast.error(`Found ${merged.length} issues in schedule!`);
            } else {
                toast.success("No conflicts detected. The schedule is clean!");
            }
        }, 800);
    };

    const categories = [
        { type: 'faculty-clash', label: 'Teacher Conflicts', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { type: 'room-clash', label: 'Room Conflicts', icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50' },
        { type: 'student-clash', label: 'Class Conflicts', icon: GraduationCap, color: 'text-amber-600', bg: 'bg-amber-50' },
    ];

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">Schedule Auditor</h2>
                    <p className="text-slate-500">Detect and resolve overlaps in your generated timetable</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <Button
                        onClick={handleCheckConflicts}
                        disabled={isChecking}
                        size="lg"
                        className="rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-lg shadow-red-500/20 px-8"
                    >
                        {isChecking ? (
                            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                            <Search className="w-5 h-5 mr-2" />
                        )}
                        {isChecking ? "Auditing Schedule..." : "Check for Conflicts"}
                    </Button>
                </motion.div>
            </div>

            {!hasChecked && !isChecking ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl border border-dashed border-slate-300 p-20 text-center"
                >
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">Ready to Audit</h3>
                    <p className="text-slate-500 max-w-md mx-auto">
                        Click the button above to run a comprehensive check for teacher, room, and student overlaps in your current schedule.
                    </p>
                </motion.div>
            ) : isChecking ? (
                <div className="space-y-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-2xl" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    {foundConflicts.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-emerald-50 border border-emerald-100 rounded-3xl p-12 text-center"
                        >
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-emerald-800 mb-2">Schedule is Conflict-Free!</h3>
                            <p className="text-emerald-700">All teachers, rooms, and classes are properly isolated.</p>
                        </motion.div>
                    ) : (
                        <div className="space-y-8">
                            {categories.map((cat) => {
                                const catConflicts = foundConflicts.filter(c => c.type === cat.type);
                                if (catConflicts.length === 0) return null;

                                const Icon = cat.icon;

                                return (
                                    <motion.div
                                        key={cat.type}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        <div className="flex items-center gap-3 mb-4 ml-2">
                                            <div className={`p-2 rounded-lg ${cat.bg}`}>
                                                <Icon className={`w-5 h-5 ${cat.color}`} />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{cat.label}</h3>
                                            <Badge variant="outline" className="ml-2 bg-white">{catConflicts.length}</Badge>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <AnimatePresence>
                                                {catConflicts.map((conflict, idx) => (
                                                    <motion.div
                                                        key={`${cat.type}-${idx}`}
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                        onClick={() => handleConflictClick(conflict)}
                                                        className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-400 hover:shadow-md transition-all group cursor-pointer relative"
                                                    >
                                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">View in Timetable →</Badge>
                                                        </div>
                                                        <div className="flex items-start gap-4">
                                                            <div className="mt-1 p-2 bg-red-50 rounded-full group-hover:bg-red-100 transition-colors">
                                                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                                            </div>
                                                            <div>
                                                                <p className="text-slate-800 dark:text-slate-100 font-medium mb-1">{conflict.message}</p>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider opacity-60">
                                                                        {conflict.severity}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
