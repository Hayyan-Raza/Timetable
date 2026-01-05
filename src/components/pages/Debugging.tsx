import { useState } from "react";
import { useTimetableStore } from "../../stores/timetableStore";
import { checkAllDebugIssues } from "../../utils/debugConstraints";
import { Conflict } from "../../types/timetable.types";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ConsoleTerminal } from "../ConsoleTerminal";
import {
    Bug,
    Search,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Calendar,
    FlaskConical,
    Building2,
    Users2,
    RefreshCw,
    AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

export function Debugging({ onPageChange }: { onPageChange: (page: any) => void }) {
    const { entries, generationConflicts, rooms, courses, setNavigationFilter } = useTimetableStore();
    const [foundIssues, setFoundIssues] = useState<Conflict[]>([]);
    const [isChecking, setIsChecking] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);

    const handleIssueClick = (issue: Conflict) => {
        if (!issue.affectedEntries || issue.affectedEntries.length === 0) {
            return;
        }

        // Get info from first affected entry
        const entryId = issue.affectedEntries[0];
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

    const handleRunDiagnostics = () => {
        if (entries.length === 0) {
            toast.error("No timetable data found. Generate or load a timetable first.");
            return;
        }

        setIsChecking(true);
        setHasChecked(false);

        setTimeout(() => {
            const allIssues = checkAllDebugIssues(entries, rooms, courses, generationConflicts);
            setFoundIssues(allIssues);
            setIsChecking(false);
            setHasChecked(true);

            if (allIssues.length > 0) {
                const errors = allIssues.filter(i => i.severity === 'error').length;
                const warnings = allIssues.filter(i => i.severity === 'warning').length;
                toast.info(`Found ${errors} errors and ${warnings} warnings`);
            } else {
                toast.success("No issues detected! Timetable is optimal.");
            }
        }, 800);
    };

    const categories = [
        // Hard Conflicts
        {
            type: 'faculty-clash',
            label: 'Teacher Conflicts',
            icon: Users2,
            color: 'text-red-600',
            bg: 'bg-red-50',
            description: 'Teacher assigned to multiple classes simultaneously'
        },
        {
            type: 'room-clash',
            label: 'Room Conflicts',
            icon: Building2,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
            description: 'Room double-booked at the same time'
        },
        {
            type: 'student-clash',
            label: 'Class Conflicts',
            icon: Users2,
            color: 'text-orange-600',
            bg: 'bg-orange-50',
            description: 'Class has overlapping courses'
        },
        {
            type: 'room-type-mismatch',
            label: 'Room Type Mismatches',
            icon: Building2,
            color: 'text-pink-600',
            bg: 'bg-pink-50',
            description: 'Lab courses in lecture-only rooms'
        },
        // Soft Constraints
        {
            type: 'daily-limit',
            label: 'Daily Limit Violations',
            icon: Calendar,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            description: 'More than 3 classes per day'
        },
        {
            type: 'break-requirement',
            label: 'Break Requirements',
            icon: Clock,
            color: 'text-yellow-600',
            bg: 'bg-yellow-50',
            description: 'Missing 1.5-hour break after consecutive classes'
        },
        {
            type: 'lab-continuity',
            label: 'Lab Continuity Issues',
            icon: FlaskConical,
            color: 'text-cyan-600',
            bg: 'bg-cyan-50',
            description: 'Lab sessions not in consecutive time slots'
        },
        {
            type: 'capacity-overflow',
            label: 'Capacity Warnings',
            icon: AlertCircle,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            description: 'Students exceed room capacity'
        },
        // Backend Issues
        {
            type: 'unscheduled',
            label: 'Unscheduled Sessions',
            icon: AlertTriangle,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
            description: 'Sessions that could not be scheduled'
        },
        {
            type: 'no-room',
            label: 'No Suitable Room',
            icon: Building2,
            color: 'text-slate-600',
            bg: 'bg-slate-50',
            description: 'No room matches requirements'
        },
        {
            type: 'no-slot',
            label: 'No Available Slots',
            icon: Clock,
            color: 'text-gray-600',
            bg: 'bg-gray-50',
            description: 'No valid time slots available'
        },
    ];

    const errorIssues = foundIssues.filter(i => i.severity === 'error');
    const warningIssues = foundIssues.filter(i => i.severity === 'warning');

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Bug className="w-6 h-6 text-purple-600" />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Debug Diagnostics</h2>
                    </div>
                    <p className="text-slate-500">Comprehensive constraint analysis and scheduling issue detection</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <Button
                        onClick={handleRunDiagnostics}
                        disabled={isChecking}
                        size="lg"
                        className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/20 px-8"
                    >
                        {isChecking ? (
                            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                            <Search className="w-5 h-5 mr-2" />
                        )}
                        {isChecking ? "Running Diagnostics..." : "Run Full Diagnostics"}
                    </Button>
                </motion.div>
            </div>

            {!hasChecked && !isChecking ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-20 text-center"
                >
                    <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Bug className="w-10 h-10 text-purple-300" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">Ready for Diagnostics</h3>
                    <p className="text-slate-500 max-w-md mx-auto mb-4">
                        Run comprehensive checks for hard conflicts, soft constraints, and scheduling issues.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto mt-8">
                        <div className="p-4 bg-slate-50 rounded-xl">
                            <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                            <p className="text-xs font-medium text-slate-600">Hard Conflicts</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl">
                            <Clock className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                            <p className="text-xs font-medium text-slate-600">Soft Constraints</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl">
                            <FlaskConical className="w-6 h-6 text-cyan-500 mx-auto mb-2" />
                            <p className="text-xs font-medium text-slate-600">Lab Issues</p>
                        </div>
                    </div>
                </motion.div>
            ) : isChecking ? (
                <div className="space-y-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-2xl" />
                    ))}
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white border border-slate-200 rounded-2xl p-6"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Total Issues</p>
                                    <p className="text-3xl font-bold text-slate-800">{foundIssues.length}</p>
                                </div>
                                <div className="p-3 bg-purple-100 rounded-xl">
                                    <Bug className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white border border-slate-200 rounded-2xl p-6"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Errors</p>
                                    <p className="text-3xl font-bold text-red-600">{errorIssues.length}</p>
                                </div>
                                <div className="p-3 bg-red-100 rounded-xl">
                                    <AlertTriangle className="w-6 h-6 text-red-600" />
                                </div>
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white border border-slate-200 rounded-2xl p-6"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Warnings</p>
                                    <p className="text-3xl font-bold text-amber-600">{warningIssues.length}</p>
                                </div>
                                <div className="p-3 bg-amber-100 rounded-xl">
                                    <AlertCircle className="w-6 h-6 text-amber-600" />
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Issues by Category */}
                    <div className="grid grid-cols-1 gap-8">
                        {foundIssues.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-emerald-50 border border-emerald-100 rounded-3xl p-12 text-center"
                            >
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-emerald-800 mb-2">Perfect Schedule!</h3>
                                <p className="text-emerald-700">No issues detected. All constraints satisfied.</p>
                            </motion.div>
                        ) : (
                            <div className="space-y-8">
                                {categories.map((cat) => {
                                    const catIssues = foundIssues.filter(i => i.type === cat.type);
                                    if (catIssues.length === 0) return null;

                                    const Icon = cat.icon;
                                    const isError = catIssues.some(i => i.severity === 'error');

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
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{cat.label}</h3>
                                                    <p className="text-xs text-slate-500">{cat.description}</p>
                                                </div>
                                                <Badge variant={isError ? "destructive" : "outline"} className="ml-2">
                                                    {catIssues.length}
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <AnimatePresence>
                                                    {catIssues.map((issue, idx) => (
                                                        <motion.div
                                                            key={`${cat.type}-${idx}`}
                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            transition={{ delay: idx * 0.05 }}
                                                            onClick={() => handleIssueClick(issue)}
                                                            className={`bg-white border ${issue.severity === 'error' ? 'border-red-200' : 'border-amber-200'} rounded-2xl p-5 hover:border-blue-400 hover:shadow-md transition-all group cursor-pointer relative`}
                                                        >
                                                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-xs">View →</Badge>
                                                            </div>
                                                            <div className="flex items-start gap-4">
                                                                <div className={`mt-1 p-2 ${issue.severity === 'error' ? 'bg-red-50' : 'bg-amber-50'} rounded-full group-hover:${issue.severity === 'error' ? 'bg-red-100' : 'bg-amber-100'} transition-colors`}>
                                                                    {issue.severity === 'error' ? (
                                                                        <AlertTriangle className="w-4 h-4 text-red-500" />
                                                                    ) : (
                                                                        <AlertCircle className="w-4 h-4 text-amber-500" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-slate-800 dark:text-slate-100 font-medium mb-1 text-sm">{issue.message}</p>
                                                                    <div className="flex items-center gap-2">
                                                                        <Badge
                                                                            variant={issue.severity === 'error' ? 'destructive' : 'secondary'}
                                                                            className="text-[10px] uppercase font-bold tracking-wider"
                                                                        >
                                                                            {issue.severity}
                                                                        </Badge>
                                                                        {issue.affectedEntries.length > 0 && (
                                                                            <span className="text-[10px] text-slate-400">
                                                                                {issue.affectedEntries.length} affected
                                                                            </span>
                                                                        )}
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
                </>
            )}

            {/* Console Terminal Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-8"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-slate-100">
                        <AlertTriangle className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Console Output</h3>
                        <p className="text-sm text-slate-500">Monitor real-time logs, errors, and warnings</p>
                    </div>
                </div>
                <ConsoleTerminal />
            </motion.div>
        </div>
    );
}
