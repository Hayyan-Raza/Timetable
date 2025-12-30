import { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Download, Calendar as CalendarIcon, Grid3x3, List, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTimetableStore } from "../../stores/timetableStore";
import { getTimetableForClass } from "../../utils/timetableGenerator";
import jsPDF from "jspdf";
import domtoimage from "dom-to-image-more";
import { resolveClassInfo, ClassMetadata } from "../../utils/classMetadata";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";

const courseColors = [
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-violet-100 text-violet-700 border-violet-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-cyan-100 text-cyan-700 border-cyan-200",
];

export function Timetable() {
  const {
    entries, courses, faculty, rooms, allotments, departments, semesters, schemas,
    fetchData, clearEntries, navigationFilter, setNavigationFilter
  } = useTimetableStore();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [department, setDepartment] = useState(""); // Start empty to force selection
  const [semesterLevel, setSemesterLevel] = useState(""); // Start empty to force selection
  const [selectedClass, setSelectedClass] = useState(""); // Start empty, will be set by effect
  const timetableRef = useRef<HTMLDivElement>(null);

  // Handle navigation from Conflicts page
  useEffect(() => {
    if (navigationFilter) {
      console.log("Timetable: Applying navigation filter", navigationFilter);
      if (navigationFilter.department) setDepartment(navigationFilter.department);
      if (navigationFilter.semesterLevel) setSemesterLevel(navigationFilter.semesterLevel);
      if (navigationFilter.classId) setSelectedClass(navigationFilter.classId);

      // Clear the filter so it doesn't re-apply if we switch away and back
      setNavigationFilter(null);
    }
  }, [navigationFilter, setNavigationFilter]);

  // Ensure data is loaded
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 1. Get unique Departments from generated entries - MEMOIZED
  // Try metadata first, fallback to course lookup
  const availableDepartments = useMemo(() => {
    return Array.from(
      new Set(
        entries.map(e => {
          // Try metadata first
          if (e.metadata?.departmentCode) {
            return e.metadata.departmentCode;
          }
          // Fallback: lookup course and get department
          const course = courses.find(c => c.id === e.courseId);
          return course?.department;
        }).filter(Boolean)
      )
    ).sort();
  }, [entries, courses]);

  // 2. Get unique Semester Levels for the selected department - MEMOIZED
  const availableSemesters = useMemo(() => {
    return Array.from(
      new Set(
        entries
          .filter(e => {
            const dept = e.metadata?.departmentCode || courses.find(c => c.id === e.courseId)?.department;
            return dept === department;
          })
          .map(e => {
            // Try metadata first
            if (e.metadata?.semesterLevel) {
              return e.metadata.semesterLevel;
            }
            // Fallback: lookup course and get semester
            const course = courses.find((c: any) => c.id === e.courseId);
            let sem: string | number | undefined | null = course?.semester;
            if (typeof sem === 'string') {
              const match = sem.match(/\d+/);
              sem = match ? parseInt(match[0]) : undefined;
            }
            return sem as number | undefined;
          })
          .filter((s): s is number => s !== null && s !== undefined)
      )
    ).sort((a, b) => a - b);
  }, [entries, courses, department]);

  // 3. Get unique Classes for selected department and semester - MEMOIZED
  const availableClasses = useMemo(() => {
    return Array.from(
      new Set(
        entries
          .filter(e => {
            const dept = e.metadata?.departmentCode || courses.find((c: any) => c.id === e.courseId)?.department;
            let sem: string | number | undefined | null = e.metadata?.semesterLevel;
            if (!sem) {
              const course = courses.find((c: any) => c.id === e.courseId);
              sem = course?.semester;
              if (typeof sem === 'string') {
                const match = sem.match(/\d+/);
                sem = match ? parseInt(match[0]) : undefined;
              }
            }
            return dept === department && sem?.toString() === semesterLevel;
          })
          .map(e => e.classId)
          .filter(Boolean)
      )
    ).sort();
  }, [entries, courses, department, semesterLevel]);

  // Helper for display naming if needed
  const uniqueGeneratedClasses = Array.from(new Set(entries.map(e => e.classId))).sort();
  const classMetadataMap = new Map<string, ClassMetadata>();
  uniqueGeneratedClasses.forEach(cls => {
    classMetadataMap.set(cls, resolveClassInfo(cls, allotments, courses, departments, semesters, schemas));
  });

  // Reset downstream selections when upstream changes
  useEffect(() => {
    setSemesterLevel("");
    setSelectedClass("");
  }, [department]);

  useEffect(() => {
    setSelectedClass("");
  }, [semesterLevel]);

  // Auto-select first class if current selection is invalid or empty
  useEffect(() => {
    if (availableClasses.length > 0) {
      if (!selectedClass || !availableClasses.includes(selectedClass)) {
        // Prefer a class that actually has entries
        const classWithEntries = availableClasses.find(c => entries.some(e => e.classId === c));
        setSelectedClass(classWithEntries || availableClasses[0]);
      }
    }
  }, [availableClasses, selectedClass, entries]);

  // Get class-specific timetable from generated entries
  // If no class selected yet, return empty
  const classEntries = selectedClass ? getTimetableForClass(entries, selectedClass) : [];

  console.log("DEBUG: Render State");
  console.log("DEBUG: selectedClass:", selectedClass);
  console.log("DEBUG: classEntries length:", classEntries.length);
  if (selectedClass && classEntries.length === 0) {
    console.log("DEBUG: Investigation - Entries for selected class:", entries.filter(e => e.classId === selectedClass).length);
    console.log("DEBUG: First 3 entries classIds:", entries.slice(0, 3).map(e => e.classId));
  }



  // Determine days to show based on entries
  // We want to show all days that have at least one class, sorted chronologically
  const allDays: ("Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday")[] =
    ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const usedDays = new Set(classEntries.map(e => e.timeSlot.day));

  // If no classes, default to Mon-Fri
  const days = usedDays.size > 0
    ? allDays.filter(day => usedDays.has(day))
    : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  // Group entries by day and time slot for display
  const timetableData: Record<string, any[]> = {};
  days.forEach(day => timetableData[day] = []);

  classEntries.forEach((entry, index) => {
    const course = courses.find(c => c.id === entry.courseId);
    const facultyMember = faculty.find(f => f.id === entry.facultyId);
    const room = rooms.find(r => r.id === entry.roomId);

    if (index === 0) {
      console.log("DEBUG: Entry #0 Lookup");
      console.log("DEBUG: Entry CourseID:", entry.courseId, "Found?", !!course);
      console.log("DEBUG: Entry FacultyID:", entry.facultyId, "Found?", !!facultyMember);
      console.log("DEBUG: Entry RoomID:", entry.roomId, "Found?", !!room);
      if (!course) console.log("DEBUG: Available Courses IDs:", courses.map(c => c.id).slice(0, 5));
    }

    if (course && facultyMember && room && timetableData[entry.timeSlot.day]) {
      // ... exist logic
      const dayData = {
        time: `${entry.timeSlot.startTime}-${entry.timeSlot.endTime}`,
        course: course.name,
        code: course.code,
        faculty: facultyMember.name,
        room: room.name,
      };

      timetableData[entry.timeSlot.day].push(dayData);
    } else {
      console.warn("DEBUG: Skipping entry due to missing data", {
        hasCourse: !!course,
        hasFaculty: !!facultyMember,
        hasRoom: !!room,
        dayValid: !!timetableData[entry.timeSlot.day]
      });
    }
  });

  const handleExportPDF = async () => {
    if (!timetableRef.current) {
      toast.error("Could not find timetable to export");
      return;
    }

    const toastId = toast.loading("Generating PDF...");

    try {
      const element = timetableRef.current;
      const scale = 2; // Increase resolution

      const dataUrl = await domtoimage.toPng(element, {
        height: element.offsetHeight * scale,
        width: element.offsetWidth * scale,
        style: {
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: `${element.offsetWidth}px`,
          height: `${element.offsetHeight}px`,
          background: "white" // Ensure white background
        }
      });

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [element.offsetWidth * scale, element.offsetHeight * scale]
      });

      pdf.addImage(dataUrl, "PNG", 0, 0, element.offsetWidth * scale, element.offsetHeight * scale);
      pdf.save(`timetable-${selectedClass}-sem${semesterLevel}.pdf`);

      toast.dismiss(toastId);
      toast.success("Timetable exported successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      toast.dismiss(toastId);
      toast.error("Failed to export PDF");
    }
  };

  const handleDeleteTimetable = () => {
    clearEntries();
    toast.success("Timetable deleted successfully");
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-slate-800 dark:text-slate-100 mb-2">Semester Timetable</h2>
            <p className="text-slate-500">View and manage class schedules</p>
          </div>
          <div className="flex gap-3">
            <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-all ${viewMode === "grid"
                  ? "bg-white shadow-sm text-blue-600"
                  : "text-slate-500 hover:text-slate-700"
                  }`}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-all ${viewMode === "list"
                  ? "bg-white shadow-sm text-blue-600"
                  : "text-slate-500 hover:text-slate-700"
                  }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200 shadow-sm"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Timetable
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the current timetable. You will need to regenerate it from the dashboard.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteTimetable}
                      className="bg-red-600 hover:bg-red-700 text-white border-none shadow-sm font-medium"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                onClick={handleExportPDF}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/30"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      <div ref={timetableRef} className="bg-white p-4 rounded-xl">
        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200/60 p-6 mb-6"
        >
          <div className="grid grid-cols-3 gap-4">
            {/* 1. Department Selection */}
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="rounded-xl border-slate-200">
                <SelectValue placeholder="Select Department" />
              </SelectTrigger>
              <SelectContent>
                {availableDepartments.length === 0 && (
                  <SelectItem value="none" disabled>No Generated Timetables</SelectItem>
                )}
                {availableDepartments.map(dept => (
                  <SelectItem key={dept} value={dept || ""}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 2. Semester Level Selection (1-8) */}
            <Select value={semesterLevel} onValueChange={setSemesterLevel} disabled={!department}>
              <SelectTrigger className="rounded-xl border-slate-200">
                <SelectValue placeholder="Select Semester Level" />
              </SelectTrigger>
              <SelectContent>
                {availableSemesters.map(level => (
                  <SelectItem key={level} value={level?.toString() || ""}>Semester {level}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 3. Class Selection */}
            <Select value={selectedClass} onValueChange={setSelectedClass} disabled={!department || !semesterLevel}>
              <SelectTrigger className="rounded-xl border-slate-200">
                <SelectValue placeholder={(!department || !semesterLevel) ? "Select Dept & Level" : "Select Class"} />
              </SelectTrigger>
              <SelectContent>
                {availableClasses.length === 0 && (
                  <div className="p-2 text-sm text-slate-500">No classes available</div>
                )}
                {availableClasses.map(cls => {
                  const metadata = classMetadataMap.get(cls);
                  return (
                    <SelectItem key={cls} value={cls}>
                      Section {cls.split('-').pop() || cls} ({metadata?.displayName || cls})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Empty State */}
        {classEntries.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-2xl border border-slate-200/60 p-12 text-center"
          >
            <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-slate-800 dark:text-slate-100 mb-2">
              {(!department || !semesterLevel)
                ? "Select Filters to View Timetable"
                : (!selectedClass)
                  ? "Select a Class/Section"
                  : "No Timetable Generated"}
            </h3>
            <p className="text-slate-500 mb-4">
              {(!department || !semesterLevel)
                ? "Please select a Department and Semester Level to view classes."
                : (!selectedClass)
                  ? "Select a specific section to see its schedule."
                  : "Go to the Dashboard to generate a timetable for this class."}
            </p>
          </motion.div>
        )}

        {/* Timetable Grid View */}
        {viewMode === "grid" && classEntries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-4 text-left text-sm text-slate-600 dark:text-slate-300 w-32">Time</th>
                    {days.map((day) => (
                      <th key={day} className="px-4 py-4 text-center text-sm text-slate-600 dark:text-slate-300 min-w-[180px]">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Extract unique time slots from entries to avoid showing unused slots if desired, or use standard slots */}
                  {Array.from(new Set(classEntries.map(e => `${e.timeSlot.startTime}-${e.timeSlot.endTime}`)))
                    .sort()
                    .map((timeString, slotIndex) => {
                      return (
                        <tr key={timeString} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-sm text-slate-500 bg-slate-50/50">
                            {timeString}
                          </td>
                          {days.map((day) => {
                            const classData = timetableData[day]?.find(
                              (item: any) => item.time === timeString
                            );

                            return (
                              <td key={day} className="px-2 py-2">
                                {classData ? (
                                  <div className={`p-3 rounded-xl border ${courseColors[slotIndex % courseColors.length]} hover:shadow-md transition-all cursor-pointer`}>
                                    <p className="text-sm font-medium mb-1">{classData.course}</p>
                                    <p className="text-xs opacity-75">{classData.faculty}</p>
                                    <p className="text-xs opacity-75 mt-1">📍 {classData.room}</p>
                                  </div>
                                ) : (
                                  <div className="h-full min-h-[80px] flex items-center justify-center">
                                    <span className="text-slate-300 text-xs">-</span>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Timetable List View */}
        {viewMode === "list" && classEntries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-6"
          >
            {days.map((day, dayIndex) => (
              <div key={day} className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-4 border-b border-slate-200">
                  <h3 className="text-slate-800 flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5" />
                    {day}
                  </h3>
                </div>
                <div className="p-6 space-y-3">
                  {timetableData[day]?.map((classItem: any, index: number) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <Badge className={`${courseColors[dayIndex % courseColors.length]} border`}>
                        {classItem.time}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-slate-800 font-medium">{classItem.course}</p>
                        <p className="text-sm text-slate-500">{classItem.faculty}</p>
                      </div>
                      <Badge variant="outline" className="border-slate-200">
                        {classItem.room}
                      </Badge>
                    </motion.div>
                  ))}
                  {(!timetableData[day] || timetableData[day].length === 0) && (
                    <p className="text-center text-slate-400 py-8">No classes scheduled</p>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </>
  );
}
