import { StatCard } from "../StatCard";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { BookOpen, Users, GraduationCap, Download, Sparkles, AlertCircle, CheckCircle } from "lucide-react";
import { motion } from "motion/react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import domtoimage from "dom-to-image-more";
import { useTimetableStore } from "../../stores/timetableStore";
import { generateTimetableViaAPI as generateTimetable, pollGenerationStatus, getTimetableForClass } from "../../utils/timetableGenerator";
import { exportTimetableToCSV } from "../../utils/csvExport";
import { GenerationResult } from "../../types/timetable.types";
import { TimetableGridView } from "../TimetableGridView";
import { Progress } from "../ui/progress";

// Hardcoded mock data removed - now using real timetable store

const dayColors: { [key: string]: string } = {
  Monday: "bg-blue-100 text-blue-700 border-blue-200",
  Tuesday: "bg-purple-100 text-purple-700 border-purple-200",
  Wednesday: "bg-amber-100 text-amber-700 border-amber-200",
  Thursday: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Friday: "bg-rose-100 text-rose-700 border-rose-200",
};

export function Dashboard({ onPageChange }: { onPageChange?: (page: any) => void }) {
  const { entries, courses, faculty, rooms, allotments, setEntries, setGenerationConflicts, semesters, fetchData,
    isGenerating, setIsGenerating, generationProgress, setGenerationProgress,
    generationStatus, setGenerationStatus, solutionsFound, setSolutionsFound,
    generationStartTime, setGenerationStartTime, saveTimetableEntries, exportAllTimetables } = useTimetableStore();
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedSemester, setSelectedSemester] = useState("all");
  const [selectedClass, setSelectedClass] = useState("bcs3a");
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState<string>("Calculating...");
  const timetableRef = useRef<HTMLDivElement>(null);
  const gridViewRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-select first class when data loads
  useEffect(() => {
    if (allotments.length > 0) {
      const allClasses = Array.from(new Set(allotments.flatMap(a => a.classIds || [])))
        .filter(c => c && typeof c === 'string')
        .sort();
      if (allClasses.length > 0) {
        const currentValid = allClasses.some(c => c.toLowerCase().replace(/[^a-z0-9]/g, '') === selectedClass);
        if (!currentValid) {
          setSelectedClass(allClasses[0].toLowerCase().replace(/[^a-z0-9]/g, ''));
        }
      }
    }
  }, [allotments, selectedClass]);

  const handleGenerateTimetable = async () => {
    // Validation: Check if data exists
    if (courses.length === 0 || faculty.length === 0 || rooms.length === 0 || allotments.length === 0) {
      toast.error("No data found! Please add courses, faculty, rooms, and course allotments before generating a timetable.");
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStatus("Starting generation...");
    setSolutionsFound(0);
    setGenerationStartTime(Date.now());
    setEstimatedTime("Calculating...");
    toast.loading("Generating timetable... This may take a moment.");

    try {
      const config = {
        semester: selectedSemester,
        department: selectedDepartment,
        classes: [],
        prioritizeCore: true
      };

      // Start generation and get session ID
      const { sessionId } = await generateTimetable(courses, faculty, rooms, allotments, config);

      // Start polling for progress
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const status = await pollGenerationStatus(sessionId);

          setGenerationProgress(status.progress || 0);
          setGenerationStatus(status.message || "Processing...");
          setSolutionsFound(status.solutions_found || 0);

          // Calculate estimated time remaining
          if (status.progress > 5 && status.progress < 95 && generationStartTime > 0) {
            const elapsed = (Date.now() - generationStartTime) / 1000; // seconds

            // Only show estimate after 5 seconds for accuracy
            if (elapsed >= 5) {
              const rate = status.progress / elapsed; // progress per second
              const remaining = (100 - status.progress) / rate; // seconds remaining

              // Validate: must be positive and reasonable (max 60 minutes)
              if (remaining > 0 && remaining < 3600) {
                if (remaining < 60) {
                  setEstimatedTime(`~${Math.ceil(remaining)}s remaining`);
                } else {
                  const mins = Math.ceil(remaining / 60);
                  setEstimatedTime(`~${mins} min remaining`);
                }
              } else if (remaining >= 3600) {
                setEstimatedTime("More than 1 hour...");
              }
            }
          } else if (status.progress >= 95) {
            setEstimatedTime("Finishing up...");
          }

          // Check if completed
          if (status.status === "completed" && status.result) {
            // Clear polling
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }

            const result = status.result;
            setGenerationResult(result);
            setGenerationConflicts(result.conflicts);

            if (result.timetable && result.timetable.length > 0) {
              setEntries(result.timetable);

              // Automatically save timetable to Google Sheets with metadata
              try {
                // Extract metadata from first entry
                const firstEntry = result.timetable[0];
                const metadata = {
                  semester: firstEntry.metadata?.semesterLevel?.toString() || firstEntry.semester || "Unknown",
                  department: firstEntry.metadata?.departmentCode || "Unknown",
                  section: firstEntry.classId || "Unknown"
                };

                await saveTimetableEntries(metadata);
                console.log('Timetable automatically saved to Google Sheets');
              } catch (saveError) {
                console.error('Failed to auto-save timetable:', saveError);
                // Don't show error to user - saving is in background
              }
            }

            setIsGenerating(false);
            toast.dismiss();
            setShowResultDialog(true);

            // Auto-switch to a class that has entries
            if (result.timetable.length > 0) {
              const currentClassHasEntries = result.timetable.some(
                (e: any) => e.classId.toLowerCase().replace(/[^a-z0-9]/g, '') === selectedClass
              );

              if (!currentClassHasEntries) {
                const firstClassWithEntries = result.timetable[0].classId;
                const cleanId = firstClassWithEntries.toLowerCase().replace(/[^a-z0-9]/g, '');
                setSelectedClass(cleanId);
                toast.info(`Switched view to ${firstClassWithEntries} (has scheduled classes)`);
              }
            }

            if (result.success) {
              toast.success(result.message);
            } else {
              toast.warning("Generated with issues. Some classes could not be scheduled due to conflicts.");
            }
          } else if (status.status === "error") {
            // Clear polling
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }

            setIsGenerating(false);
            toast.dismiss();
            toast.error("Error during generation: " + status.message);
          }
        } catch (pollError) {
          console.error("Polling error:", pollError);
        }
      }, 1000); // Poll every second

    } catch (error) {
      setIsGenerating(false);
      toast.dismiss();
      toast.error("Error starting generation: " + (error as Error).message);

      // Clear polling if it was started
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  };


  return (
    <>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h2 className="text-slate-800 dark:text-slate-100 mb-2">Dashboard Overview</h2>
        <p className="text-slate-500">Monitor and manage your timetable system efficiently</p>
      </motion.div>

      {/* Statistics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-3 gap-6 mb-8"
      >
        <StatCard
          title="Total Courses Offered"
          value={courses.length.toString()}
          icon={BookOpen}
          gradient="from-blue-500 to-cyan-500"
          trend={courses.length > 0 ? `${courses.length} courses` : "No courses"}
        />
        <StatCard
          title="Total Faculty Members"
          value={faculty.length.toString()}
          icon={Users}
          gradient="from-violet-500 to-purple-500"
          trend={faculty.length > 0 ? `${faculty.length} faculty` : "No faculty"}
        />
        <StatCard
          title="Available Rooms"
          value={rooms.length.toString()}
          icon={GraduationCap}
          gradient="from-amber-500 to-orange-500"
          trend={rooms.length > 0 ? `${rooms.length} rooms` : "No rooms"}
        />
      </motion.div>

      {/* Timetable Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div ref={timetableRef} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-8 py-6 border-b border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Generated Timetable</h2>
                <p className="text-slate-500">Fall 2025 Academic Schedule</p>
              </div>
            </div>

            {/* Filters - These affect GENERATION, not what's displayed */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-300 mb-2">Department (for generation)</label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="bg-white border-slate-200 rounded-xl hover:border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {Array.from(new Set(courses.map(c => c.department).filter(Boolean))).sort().map(dept => (
                      <SelectItem key={dept} value={dept.toLowerCase()}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-300 mb-2">Semester (for generation)</label>
                <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                  <SelectTrigger className="bg-white border-slate-200 rounded-xl hover:border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Semesters</SelectItem>
                    {semesters.map(sem => (
                      <SelectItem key={sem.id} value={sem.name}>{sem.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-300 mb-2">Class (to view)</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="bg-white border-slate-200 rounded-xl hover:border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Show all class options - sections come from allotments */}
                    {Array.from(new Set(allotments.flatMap(a => a.classIds || [])))
                      .filter(c => c && typeof c === 'string')
                      .sort()
                      .map(classId => (
                        <SelectItem key={classId} value={classId.toLowerCase().replace(/[^a-z0-9]/g, '')}>
                          {classId}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-2">
                <Button
                  onClick={handleGenerateTimetable}
                  disabled={isGenerating}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/20"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isGenerating ? "Generating..." : "Generate Timetable"}
                </Button>
                {entries.length > 0 && !isGenerating && (
                  <>
                    <Button
                      onClick={() => {
                        const classIdDisplay = allotments.flatMap(a => a.classIds)
                          .find(c => c.toLowerCase().replace(/[^a-z0-9]/g, '') === selectedClass) || selectedClass.toUpperCase();

                        // Get department and semester from actual entries
                        let actualDepartment = "Unknown";
                        let actualSemester = "Unknown";

                        if (entries.length > 0) {
                          const firstEntry = entries[0];
                          const course = courses.find(c => c.id === firstEntry.courseId);
                          if (course) {
                            actualDepartment = course.department || "Unknown";
                            actualSemester = course.semester || "Unknown";
                          }
                        }

                        exportTimetableToCSV(
                          entries,
                          courses,
                          faculty,
                          rooms,
                          {
                            department: actualDepartment,
                            semester: actualSemester,
                            classId: classIdDisplay
                          }
                        );
                      }}
                      variant="outline"
                      className="rounded-xl border-slate-300 hover:bg-slate-50"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button
                      onClick={async () => {
                        try {
                          toast.loading("Exporting all timetables to Google Sheets...");
                          await exportAllTimetables();
                          toast.dismiss();
                          toast.success("All timetables exported to Google Sheets successfully!");
                        } catch (error) {
                          toast.dismiss();
                          toast.error("Failed to export to Sheets: " + (error as Error).message);
                        }
                      }}
                      variant="outline"
                      className="rounded-xl border-green-300 hover:bg-green-50 text-green-700 hover:text-green-800"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export All to Sheets
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {isGenerating && (
              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">{generationStatus}</span>
                  <span className="text-sm text-blue-700">{generationProgress}%</span>
                </div>
                <Progress value={generationProgress} className="h-2 mb-2" />
                <div className="flex items-center justify-between text-xs">
                  <div className="text-blue-600">
                    {solutionsFound > 0 && `🔍 Solutions found: ${solutionsFound}`}
                  </div>
                  <div className="text-blue-600 font-medium">
                    {estimatedTime}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Timetable Cards Grid */}
          <div className="p-8">
            {entries.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Filter entries based on selected class */}
                {(() => {
                  // Helper to find the original class ID from the selected value
                  const getOriginalClassId = (selectedValue: string) => {
                    const allClasses = Array.from(new Set(allotments.flatMap(a => a.classIds || []))).filter(c => c && typeof c === 'string');
                    return allClasses.find(c => c.toLowerCase().replace(/[^a-z0-9]/g, '') === selectedValue) || "BCS-3A";
                  };

                  const targetClassId = getOriginalClassId(selectedClass);

                  // Simple filtering: Just show entries for the selected class
                  // No complex semester/department filtering in display - that happens during generation
                  const filteredEntries = getTimetableForClass(entries, targetClassId);

                  if (filteredEntries.length === 0) {
                    return (
                      <div className="col-span-1 lg:col-span-2 text-center py-12">
                        <p className="text-slate-400 mb-2">No classes scheduled for {targetClassId}</p>
                        <p className="text-sm text-slate-500">Try generating the timetable again or check your constraints.</p>
                      </div>
                    );
                  }

                  return filteredEntries.slice(0, 8).map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="group relative bg-gradient-to-br from-slate-50 to-white rounded-xl p-5 border border-slate-200/60 hover:border-slate-300 hover:shadow-lg transition-all duration-300"
                    >
                      {/* Top Section */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-slate-800 dark:text-slate-100 mb-1">{entry.courseName}</h3>
                          <p className="text-sm text-slate-500">{entry.classId}</p>
                        </div>
                        <Badge className={`${dayColors[entry.timeSlot.day]} border`}>
                          {entry.timeSlot.day}
                        </Badge>
                      </div>

                      {/* Details */}
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <div className="p-1.5 rounded-lg bg-blue-50">
                            <Users className="w-3.5 h-3.5 text-blue-600" />
                          </div>
                          <span className="text-sm">{entry.facultyName}</span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <div className="p-1.5 rounded-lg bg-violet-50">
                            <span className="text-xs">🕐</span>
                          </div>
                          <span className="text-sm">{entry.timeSlot.startTime} - {entry.timeSlot.endTime}</span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <div className="p-1.5 rounded-lg bg-amber-50">
                            <span className="text-xs">📍</span>
                          </div>
                          <span className="text-sm">Room {entry.roomName}</span>
                        </div>
                      </div>

                      {/* Hover Effect Border */}
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/0 to-indigo-500/0 group-hover:from-blue-500/5 group-hover:to-indigo-500/5 transition-all duration-300 pointer-events-none"></div>
                    </motion.div>
                  ));
                })()}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-400 mb-4">No timetable generated yet</p>
                <p className="text-sm text-slate-500">Click "Generate Timetable" to create a schedule</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Generation Results Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {generationResult?.success ? (
                <><CheckCircle className="w-5 h-5 text-green-600" /> Generation Successful</>
              ) : (
                <><AlertCircle className="w-5 h-5 text-amber-600" /> Generation Completed with Issues</>
              )}
            </DialogTitle>
            <DialogDescription>{generationResult?.message}</DialogDescription>
          </DialogHeader>

          {generationResult && (
            <div className="space-y-4">
              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">Scheduled</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {generationResult.statistics?.scheduledCourses || 0}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700">
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">Total Slots Used</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {generationResult.statistics?.usedSlots || 0}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/30">
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">Conflicts</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {generationResult.statistics?.conflictsFound || 0}
                  </p>
                </div>
              </div>

              {/* Conflicts List */}
              {generationResult.conflicts.length > 0 && (
                <div className="max-h-64 overflow-y-auto">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Issues Found:</h4>
                  <div className="space-y-2">
                    {generationResult.conflicts.map((conflict, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border ${conflict.severity === 'error'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-amber-50 border-amber-200'
                          }`}
                      >
                        <p className="text-sm text-slate-700 dark:text-slate-300">{conflict.message}</p>
                        <p className="text-xs text-slate-500 mt-1">Type: {conflict.type}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowResultDialog(false);
                    if (onPageChange) onPageChange("Conflicts");
                  }}
                  className="flex-1 border-slate-200"
                >
                  <AlertCircle className="w-4 h-4 mr-2 text-amber-600" />
                  View Conflicts
                </Button>
                <Button
                  onClick={() => setShowResultDialog(false)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden Grid View for Export */}
      <div
        ref={gridViewRef}
        style={{ position: 'absolute', left: '-9999px', top: '0' }}
      >
        <TimetableGridView
          entries={getTimetableForClass(entries,
            selectedClass === "bcs3a" ? "BCS-3A" :
              selectedClass === "bcs3b" ? "BCS-3B" :
                selectedClass === "bse4b" ? "BSE-4B" : "BAI-2A"
          )}
        />
      </div>
    </>
  );
}
