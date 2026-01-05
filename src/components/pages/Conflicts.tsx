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
                    className="bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-20 text-center"
                >
                    <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <AlertTriangle className="w-12 h-12 text-slate-400 dark:text-slate-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-2">Ready to Audit</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                        Click the button above to run a comprehensive check for teacher, room, and student overlaps in your current schedule.
                    </p>
                </motion.div>
            ) : isChecking ? (
                <div className="space-y-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-slate-100 dark:bg-slate-700 animate-pulse rounded-2xl" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    {foundConflicts.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 border border-emerald-200 dark:border-emerald-800 rounded-3xl p-12 text-center shadow-sm"
                        >
                            <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900 dark:to-emerald-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                                <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-emerald-800 dark:text-emerald-200 mb-2">Schedule is Conflict-Free!</h3>
                            <p className="text-emerald-700 dark:text-emerald-300">All teachers, rooms, and classes are properly isolated.</p>
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
                                            <Badge variant="outline" className="ml-2 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">{catConflicts.length}</Badge>
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
                                                            <Badge variant="outline" className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">View in Timetable →</Badge>
                                                        </div>
                                                        <div className="flex items-start gap-4">
                                                            <div className="mt-1 p-2.5 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950 rounded-xl group-hover:from-red-100 group-hover:to-rose-100 dark:group-hover:from-red-900 dark:group-hover:to-rose-900 transition-all shadow-sm">
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
