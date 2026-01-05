import { Button } from "../ui/button";
import { RotateCcw, Upload, Trash2, Download, AlertCircle, CheckCircle } from "lucide-react";
import { motion } from "motion/react";
import { useTimetableStore } from "../../stores/timetableStore";
import { toast } from "sonner";
import { useRef, useState } from "react";
import { importService } from "../../services/importService";
import { parseCompleteTimetable, downloadSampleCompleteTimetable } from "../../utils/completeTimetableParser";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Alert, AlertDescription } from "../ui/alert";

export function DataManagement() {
    const { resetToDefaults, clearAllData, importCompleteTimetable } = useTimetableStore();
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [importPreview, setImportPreview] = useState<any>(null);
    const [importing, setImporting] = useState(false);

    const handleReset = async () => {
        if (confirm('Are you sure you want to reset all data to defaults? This cannot be undone.')) {
            try {
                await resetToDefaults();
                toast.success('Data reset to defaults successfully!');
                // No need to reload, store updates automatically
            } catch (error) {
                toast.error('Failed to reset data');
            }
        }
    };

    const handleClearAll = async () => {
        if (confirm('Are you sure you want to DELETE ALL DATA? This cannot be undone.')) {
            try {
                await clearAllData();
                toast.success('All data cleared successfully!');
            } catch (error) {
                toast.error('Failed to clear data');
            }
        }
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const result = await parseCompleteTimetable(file);

            if (!result.success) {
                toast.error('Failed to parse CSV file');
                console.error('Parse errors:', result.errors);
                return;
            }

            setImportPreview(result);
            setIsImportDialogOpen(true);
        } catch (error) {
            console.error('Import error:', error);
            toast.error('Failed to read CSV file');
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleConfirmImport = async () => {
        if (!importPreview?.data) return;

        setImporting(true);
        try {
            await importCompleteTimetable(importPreview.data);
            toast.success(`Successfully imported ${importPreview.summary.coursesCount} courses, ${importPreview.summary.facultyCount} faculty, ${importPreview.summary.roomsCount} rooms, and ${importPreview.summary.allotmentsCount} allotments!`);
            setIsImportDialogOpen(false);
            setImportPreview(null);
        } catch (error) {
            console.error('Import error:', error);
            toast.error('Failed to import data');
        } finally {
            setImporting(false);
        }
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-8"
            >
                <h2 className="text-slate-800 dark:text-slate-100 mb-2">Data Management</h2>
                <p className="text-slate-500">Manage your timetable data</p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm p-8"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Reset to Defaults */}
                    <div className="p-6 border border-red-200 rounded-xl bg-red-50/50">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 rounded-lg bg-gradient-to-br from-red-500 to-rose-600">
                                <RotateCcw className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-slate-800 dark:text-slate-100 font-semibold">Reset to Defaults</h3>
                                <p className="text-sm text-slate-500">Restore sample data</p>
                            </div>
                        </div>
                        <Button
                            onClick={handleReset}
                            variant="destructive"
                            className="w-full"
                        >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Reset Data
                        </Button>
                    </div>

                    {/* Clear All Data */}
                    <div className="p-6 border border-red-200 rounded-xl bg-red-50/50">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 rounded-lg bg-gradient-to-br from-red-500 to-rose-600">
                                <Trash2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-slate-800 dark:text-slate-100 font-semibold">Clear All Data</h3>
                                <p className="text-sm text-slate-500">Delete everything</p>
                            </div>
                        </div>
                        <Button
                            onClick={handleClearAll}
                            variant="destructive"
                            className="w-full"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear All
                        </Button>
                    </div>

                    {/* Import Data */}
                    <div className="p-6 border border-blue-200 rounded-xl bg-blue-50/50">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                                <Upload className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-slate-800 dark:text-slate-100 font-semibold">Import Complete Timetable</h3>
                                <p className="text-sm text-slate-500">Import from CSV (all data)</p>
                            </div>
                        </div>
                        <input
                            type="file"
                            accept=".csv"
                            style={{ display: 'none' }}
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                        />
                        <div className="space-y-2">
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Import CSV
                            </Button>
                            <Button
                                variant="outline"
                                onClick={downloadSampleCompleteTimetable}
                                className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Download Sample
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-slate-700">
                        <strong>Note:</strong> Data is now stored securely in the cloud (Supabase).
                        Changes are saved automatically.
                    </p>
                </div>
            </motion.div>

            {/* Import Preview Dialog */}
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogContent className="sm:max-w-[320px]">
                    <DialogHeader>
                        <DialogTitle className="text-sm">Import Preview</DialogTitle>
                        <DialogDescription className="text-xs">Review CSV data</DialogDescription>
                    </DialogHeader>

                    {importPreview && (
                        <div className="space-y-2">
                            <div className="text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200">
                                ✓ CSV parsed successfully!
                            </div>

                            <div className="grid grid-cols-4 gap-2 text-center">
                                <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                                    <div className="text-lg font-bold text-blue-900">{importPreview.summary.coursesCount}</div>
                                    <div className="text-xs text-blue-700">Courses</div>
                                </div>
                                <div className="p-2 bg-purple-50 border border-purple-200 rounded">
                                    <div className="text-lg font-bold text-purple-900">{importPreview.summary.facultyCount}</div>
                                    <div className="text-xs text-purple-700">Faculty</div>
                                </div>
                                <div className="p-2 bg-green-50 border border-green-200 rounded">
                                    <div className="text-lg font-bold text-green-900">{importPreview.summary.roomsCount}</div>
                                    <div className="text-xs text-green-700">Rooms</div>
                                </div>
                                <div className="p-2 bg-orange-50 border border-orange-200 rounded">
                                    <div className="text-lg font-bold text-orange-900">{importPreview.summary.allotmentsCount}</div>
                                    <div className="text-xs text-orange-700">Allotments</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 justify-end mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setIsImportDialogOpen(false)}
                            disabled={importing}
                            size="sm"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmImport}
                            disabled={importing}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {importing ? "Importing..." : "Confirm Import"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
