import { motion } from "motion/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription, DialogClose } from "../ui/dialog";
import { Plus, Search, Clock, Upload, Trash2, Download } from "lucide-react";
import { useState, useRef } from "react";
import { useTimetableStore } from "../../stores/timetableStore";
import { toast } from "sonner";
import { parseCSV } from "../../utils/csvParser";

const avatarColors = [
  "bg-gradient-to-br from-blue-600 to-indigo-600",
  "bg-gradient-to-br from-violet-600 to-purple-600",
  "bg-gradient-to-br from-emerald-600 to-teal-600",
  "bg-gradient-to-br from-rose-600 to-pink-600",
  "bg-gradient-to-br from-amber-600 to-orange-600",
  "bg-gradient-to-br from-cyan-600 to-blue-600",
];

export function CourseAllotment() {
  const { allotments, updateAllotments, courses, faculty, rooms } = useTimetableStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [facultySearch, setFacultySearch] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [roomSearch, setRoomSearch] = useState("");
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    courseId: "",
    facultyId: "",
    classIds: "",
    preferredRoomId: "",
    department: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseCSV(file);

      if (data.length === 0) {
        toast.error("CSV file is empty");
        return;
      }

      // Determine CSV format
      const isNewFormat = 'Subject' in data[0] && 'Teachers' in data[0] && 'Department' in data[0];

      // Validate required fields based on format
      const requiredFields = isNewFormat
        ? ['Subject', 'Teachers', 'Department', 'Semester', 'Section']
        : ['courseName', 'facultyName', 'sections'];

      const validAllotments: any[] = [];
      const validationErrors: string[] = [];

      data.forEach((row, index) => {
        let courseName, facultyName, classIdsList, dept;

        // Check for missing fields
        const missingFields = requiredFields.filter(field => !row[field]);
        if (missingFields.length > 0) {
          validationErrors.push(`Row ${index + 2}: Skipped - Missing required fields: ${missingFields.join(', ')}`);
          return;
        }

        if (isNewFormat) {
          courseName = row.Subject;
          facultyName = row.Teachers;
          dept = row.Department; // Keep CSV department for reference
          // DON'T construct classId yet - wait until we match the course
          // to use the ACTUAL course department
        } else {
          courseName = row.courseName;
          facultyName = row.facultyName;
          classIdsList = row.sections?.split(',').map((s: string) => s.trim()).filter((s: string) => s) || [];
          dept = row.department;
        }

        // Smart course matching: Filter by department and semester first, then match by name
        let course;
        if (isNewFormat && row.Department && row.Semester) {
          // Filter courses by department and semester for more accurate matching
          const filteredCourses = courses.filter(c =>
            c.department === row.Department &&
            c.semester === row.Semester.toString()
          );

          // Now find by name or code within the filtered list
          course = filteredCourses.find(c =>
            c.name.toLowerCase() === courseName.toLowerCase() ||
            c.code.toLowerCase() === courseName.toLowerCase()
          );

          // Fallback: search all courses if not found
          if (!course) {
            course = courses.find(c =>
              c.name.toLowerCase() === courseName.toLowerCase() ||
              c.code.toLowerCase() === courseName.toLowerCase()
            );
          }
        } else {
          // Legacy format: simple name/code match
          course = courses.find(c => c.name === courseName || c.code === courseName);
        }

        const facultyMember = faculty.find(f => f.name === facultyName);

        if (!course) {
          validationErrors.push(`Row ${index + 2}: Skipped - Course not found: '${courseName}'`);
          return;
        }
        if (!facultyMember) {
          validationErrors.push(`Row ${index + 2}: Skipped - Faculty not found: '${facultyName}'`);
          return;
        }

        // NOW construct classId using the MATCHED COURSE's department (not CSV department)
        if (isNewFormat) {
          // Use COURSE department to ensure consistency
          const courseDept = course.department || row.Department;
          const cleanSem = row.Semester.toString().trim();
          const cleanSec = row.Section.toString().trim();
          const classId = `${courseDept}-${cleanSem}-${cleanSec}`;
          classIdsList = [classId];
          dept = courseDept; // Update dept to match course
        }

        validAllotments.push({
          courseId: course.id,
          facultyId: facultyMember.id,
          classIds: classIdsList,
          preferredRoomId: row.roomName ? rooms.find(r => r.name === row.roomName)?.id : undefined,
          department: dept || course.department
        });
      });

      if (validAllotments.length === 0) {
        console.error('Import validation errors:', validationErrors);
        toast.error(`No valid allotments found. Check console for details. Common issues: faculty names don't match, course names don't match.`);

        // Show a summary of error types
        const courseErrors = validationErrors.filter(e => e.includes('Course not found')).length;
        const facultyErrors = validationErrors.filter(e => e.includes('Faculty not found')).length;
        const missingFieldErrors = validationErrors.filter(e => e.includes('Missing required fields')).length;

        console.log(`\n📊 Error Summary:
- Course not found: ${courseErrors}
- Faculty not found: ${facultyErrors}  
- Missing fields: ${missingFieldErrors}
        
💡 Tips:
- Faculty names must match EXACTLY (check Faculty tab)
- Course names must match EXACTLY (check Course Offerings tab)
- Use full names, not abbreviations or codes`);
        return;
      }

      if (validationErrors.length > 0) {
        console.warn('Import validation warnings:', validationErrors);

        const courseErrors = validationErrors.filter(e => e.includes('Course not found'));
        const facultyErrors = validationErrors.filter(e => e.includes('Faculty not found'));

        if (courseErrors.length > 0) {
          console.log(`\n❌ Courses not found (${courseErrors.length}):`, courseErrors);
        }
        if (facultyErrors.length > 0) {
          console.log(`\n❌ Faculty not found (${facultyErrors.length}):`, facultyErrors);
        }

        toast.warning(
          `Found ${validAllotments.length} valid allotments. ${validationErrors.length} rows skipped. Check console for details.`,
          { duration: 5000 }
        );
      } else {
        toast.success(`All ${validAllotments.length} allotments validated successfully!`);
      }

      setImportPreview({ allotments: validAllotments, count: validAllotments.length });
      setIsImportDialogOpen(true);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to read CSV file');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview?.allotments) return;

    setImporting(true);
    try {
      const mergedAllotments = [...allotments, ...importPreview.allotments];
      await updateAllotments(mergedAllotments);
      toast.success(`Successfully imported ${importPreview.count} allotments!`);
      setIsImportDialogOpen(false);
      setImportPreview(null);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import allotments');
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    // Create CSV template with headers and realistic example data
    const headers = ['Subject', 'Teachers', 'Department', 'Semester', 'Section', 'RoomName'];

    const csvContent = [
      headers.join(','),
      // Example rows with realistic FULL course names (not codes!)
      'Programming Fundamentals,Dr. John Doe,BS-CS,1,A,R101',
      'Data Structures,Dr. Jane Smith,BS-CS,2,B,R102',
      'Software Engineering,Dr. Bob Johnson,BS-SE,3,A,R201',
      'Database Systems,Dr. Alice Williams,BS-CS,4,C,LAB-01'
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'allotment_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Template downloaded successfully!');
  };

  // Convert allotments to display format
  const displayAllotments = allotments.map(allotment => {
    const course = courses.find(c => c.id === allotment.courseId);
    const facultyMember = faculty.find(f => f.id === allotment.facultyId);
    const room = allotment.preferredRoomId ? rooms.find(r => r.id === allotment.preferredRoomId) : null;

    // Try to infer semester from classId if available (e.g. "BS-CS-1-AM" -> 1)
    // This prioritizes the actual allotted semester over the course's default semester
    let displaySemester = course?.semester || "";
    if (allotment.classIds && allotment.classIds.length > 0) {
      // Look for pattern like *-{Semester}-{Section} (e.g. -1-AM)
      // We look for a digit(s) bounded by hyphens near the end
      const classId = allotment.classIds[0];
      if (classId && typeof classId === 'string') {
        const match = classId.match(/-(\d+)-[^-]+$/);
        if (match) {
          displaySemester = match[1];
        }
      }
    }

    return {
      id: allotment.courseId + allotment.facultyId + (allotment.classIds || []).sort().join('-'),
      faculty: facultyMember?.name || "Unknown Faculty",
      initials: facultyMember?.initials || "??",
      course: course?.name || "Unknown Course",
      code: course?.code || "???",
      department: allotment.department || course?.department || "",
      semester: displaySemester,
      classes: allotment.classIds,
      room: room?.name || "Not Assigned",
      hours: course ? course.credits * 1.5 : 0, // Approximate hours
      status: "Confirmed",
    };
  });

  const filteredAllotments = displayAllotments.filter(allotment => {
    // Normalize helper: remove non-alphanumeric, uppercase
    const normalize = (str: string) => str ? str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';

    const matchesSearch =
      (allotment.faculty && allotment.faculty.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (allotment.course && allotment.course.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (allotment.code && allotment.code.toLowerCase().includes(searchQuery.toLowerCase()));

    // Department filter
    const courseDept = normalize(allotment.department);
    const selectedDept = normalize(departmentFilter);
    const matchesDepartment = departmentFilter === "all" || courseDept === selectedDept;

    // Semester filter
    const courseSemester = normalize(String(allotment.semester).replace(/^Semester\s*/i, ''));
    const selectedSem = normalize(String(semesterFilter).replace(/^Semester\s*/i, ''));
    const matchesSemester = semesterFilter === "all" || courseSemester === selectedSem;

    return matchesSearch && matchesDepartment && matchesSemester;
  });

  // Get unique semesters - normalize to just numbers
  // Derived from displayAllotments to ensure all visible semesters are filterable
  const uniqueSemesters = Array.from(
    new Set(
      displayAllotments
        .map(a => {
          let sem = String(a.semester || '').trim();
          // Remove "Semester " prefix if it exists
          sem = sem.replace(/^Semester\s*/i, '');
          return sem;
        })
        .filter(s => s !== '')
    )
  ).sort((a, b) => {
    // Sort numerically
    const numA = parseInt(a) || 0;
    const numB = parseInt(b) || 0;
    return numA - numB;
  });

  const handleSaveAllotment = () => {
    if (!formData.courseId || !formData.facultyId || !formData.classIds.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    const newAllotment = {
      courseId: formData.courseId,
      facultyId: formData.facultyId,
      classIds: formData.classIds.split(",").map(c => c.trim()).filter(c => c !== ""),
      ...(formData.preferredRoomId && formData.preferredRoomId !== "" ? { preferredRoomId: formData.preferredRoomId } : {}),
      ...(formData.department && formData.department !== "" ? { department: formData.department } : {}),
    };

    if (editingId) {
      // Update existing allotment
      const updatedAllotments = allotments.map(a =>
        (a.courseId + a.facultyId) === editingId ? newAllotment : a
      );
      updateAllotments(updatedAllotments);
      toast.success('Allotment updated successfully!');
    } else {
      // Check for duplicates - same course, faculty, AND department
      const exists = allotments.some(a =>
        a.courseId === newAllotment.courseId &&
        a.facultyId === newAllotment.facultyId &&
        (a.department || courses.find(c => c.id === a.courseId)?.department) ===
        (newAllotment.department || courses.find(c => c.id === newAllotment.courseId)?.department)
      );
      if (exists) {
        toast.error('This allotment already exists for this department!');
        return;
      }
      updateAllotments([...allotments, newAllotment]);
      toast.success('Allotment created successfully!');
    }

    setIsAddDialogOpen(false);
    setEditingId(null);
    setFormData({
      courseId: "",
      facultyId: "",
      classIds: "",
      preferredRoomId: "",
      department: "",
    });
  };

  const handleRemoveAllotment = async (allotmentId: string) => {
    const updatedAllotments = allotments.filter(a => {
      const id = a.courseId + a.facultyId + (a.classIds || []).sort().join('-');
      return id !== allotmentId;
    });
    await updateAllotments(updatedAllotments);
    toast.success('Allotment removed successfully!');
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
            <h2 className="text-slate-800 dark:text-slate-100 mb-2">Course Allotment</h2>
            <p className="text-slate-500">Assign courses to faculty members and manage teaching loads</p>
          </div>
          <div className="flex gap-3">
            <input
              type="file"
              accept=".csv"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileSelect}
            />
            <Button
              onClick={downloadTemplate}
              variant="outline"
              className="border-green-300 text-green-700 hover:bg-green-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>

            {/* Delete All Button */}
            {allotments.length > 0 && (
              <>
                <Button
                  onClick={async () => {
                    try {
                      let fixedCount = 0;
                      const correctedAllotments = allotments.map(allotment => {
                        const course = courses.find(c => c.id === allotment.courseId);
                        if (!course || !course.department) return allotment;

                        // Check each classId
                        const correctedClassIds = allotment.classIds.map(classId => {
                          // Extract parts: e.g., "BS-SE-1-AM" -> ["BS", "SE", "1", "AM"]
                          const parts = classId.split('-');
                          if (parts.length < 3) return classId; // Invalid format, skip

                          // Extract existing dept, sem, section
                          const existingDept = parts.length >= 2 ? `${parts[0]}-${parts[1]}` : '';
                          const semester = parts[2];
                          const section = parts.slice(3).join('-'); // Handle cases like "AM" or "A-EV"

                          // Check if department matches course department
                          if (existingDept !== course.department) {
                            fixedCount++;
                            // Fix it: use course department
                            return `${course.department}-${semester}-${section}`;
                          }
                          return classId; // Already correct
                        });

                        return {
                          ...allotment,
                          classIds: correctedClassIds,
                          department: course.department // Also update allotment department
                        };
                      });

                      if (fixedCount > 0) {
                        await updateAllotments(correctedAllotments);
                        toast.success(`Fixed ${fixedCount} mismatched section names!`);
                      } else {
                        toast.info('No mismatches found. All sections match their course departments.');
                      }
                    } catch (error) {
                      console.error('Fix error:', error);
                      toast.error('Failed to fix mismatches');
                    }
                  }}
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  🔧 Fix Mismatches
                </Button>
              </>
            )}
            {allotments.length > 0 && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete All
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete All Allotments?</DialogTitle>
                    <DialogDescription>
                      This will permanently delete all {allotments.length} allotment{allotments.length !== 1 ? 's' : ''}. This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline" className="border-slate-300 hover:bg-slate-100">Cancel</Button>
                    </DialogClose>
                    <Button
                      onClick={() => {
                        updateAllotments([]);
                        toast.success('All allotments deleted successfully!');
                      }}
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700 text-black font-semibold shadow-sm"
                    >
                      Delete All
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            <Dialog open={isAddDialogOpen} onOpenChange={(open: boolean) => {
              setIsAddDialogOpen(open);
              if (!open) {
                setEditingId(null);
                setFormData({ courseId: "", facultyId: "", classIds: "", preferredRoomId: "", department: "" });
                setFacultySearch("");
                setCourseSearch("");
                setRoomSearch("");
                setDepartmentSearch("");
              }
            }}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setEditingId(null);
                    setFormData({ courseId: "", facultyId: "", classIds: "", preferredRoomId: "", department: "" });
                  }}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/30"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Allotment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Edit Allotment' : 'Create New Allotment'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Department - FIRST */}
                  <div>
                    <Label>Department <span className="text-red-500">*</span></Label>
                    <Select
                      value={formData.department}
                      onValueChange={(value: string) => {
                        setFormData({ ...formData, department: value, courseId: "" });
                        setCourseSearch("");
                      }}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select department first..." />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="px-2 pb-2">
                          <Input
                            placeholder="Search departments..."
                            value={departmentSearch}
                            onChange={(e) => setDepartmentSearch(e.target.value)}
                            className="h-9"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        {Array.from(new Set(courses.map(c => c.department).filter(Boolean)))
                          .filter(d => d.toLowerCase().includes(departmentSearch.toLowerCase()))
                          .sort()
                          .map(dept => (
                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Course - filtered by department */}
                  <div>
                    <Label>Course</Label>
                    {!formData.department ? (
                      <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-500 dark:text-slate-400">
                        Please select a department first
                      </div>
                    ) : (
                      <Select value={formData.courseId} onValueChange={(value: string) => setFormData({ ...formData, courseId: value })}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select course..." />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="px-2 pb-2">
                            <Input
                              placeholder="Search courses..."
                              value={courseSearch}
                              onChange={(e) => setCourseSearch(e.target.value)}
                              className="h-9"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          {courses
                            .filter(c => c.department === formData.department)
                            .filter(c =>
                              c.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
                              c.code.toLowerCase().includes(courseSearch.toLowerCase())
                            )
                            .length === 0 && (
                              <div className="p-2 text-sm text-slate-500">No courses available for this department.</div>
                            )}
                          {courses
                            .filter(c => c.department === formData.department)
                            .filter(c =>
                              c.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
                              c.code.toLowerCase().includes(courseSearch.toLowerCase())
                            )
                            .map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Faculty Member */}
                  <div>
                    <Label>Faculty Member</Label>
                    <Select value={formData.facultyId} onValueChange={(value: string) => setFormData({ ...formData, facultyId: value })}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select faculty..." />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="px-2 pb-2">
                          <Input
                            placeholder="Search faculty..."
                            value={facultySearch}
                            onChange={(e) => setFacultySearch(e.target.value)}
                            className="h-9"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        {faculty.length === 0 && (
                          <div className="p-2 text-sm text-slate-500">No faculty available. Add faculty first.</div>
                        )}
                        {faculty
                          .filter(f => f.name.toLowerCase().includes(facultySearch.toLowerCase()))
                          .map(f => (
                            <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                          ))}
                        {faculty.filter(f => f.name.toLowerCase().includes(facultySearch.toLowerCase())).length === 0 && facultySearch && (
                          <div className="p-2 text-sm text-slate-500">No faculty found matching "{facultySearch}"</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>


                  <div>
                    <Label>Preferred Room</Label>
                    <Select value={formData.preferredRoomId} onValueChange={(value: string) => setFormData({ ...formData, preferredRoomId: value })}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select room (optional)..." />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="px-2 pb-2">
                          <Input
                            placeholder="Search rooms..."
                            value={roomSearch}
                            onChange={(e) => setRoomSearch(e.target.value)}
                            className="h-9"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        {rooms
                          .filter(r => r.name.toLowerCase().includes(roomSearch.toLowerCase()))
                          .map(r => (
                            <SelectItem key={r.id} value={r.id}>{r.name} ({r.type})</SelectItem>
                          ))}
                        {rooms.filter(r => r.name.toLowerCase().includes(roomSearch.toLowerCase())).length === 0 && roomSearch && (
                          <div className="p-2 text-sm text-slate-500">No rooms found matching "{roomSearch}"</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Sections (comma-separated)</Label>
                    <Input
                      placeholder="e.g., BSSE-1-AM, BSSE-1-BM, BSAI-2-CM"
                      value={formData.classIds}
                      onChange={(e) => setFormData({ ...formData, classIds: e.target.value })}
                      className="mt-2"
                    />
                    <p className="text-xs text-slate-500 mt-1">Enter section IDs separated by commas</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveAllotment} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    {editingId ? 'Update Allotment' : 'Create Allotment'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-6 mb-6"
      >
        <div className="grid grid-cols-4 gap-4">
          <div className="relative col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search by faculty name or course..."
              className="pl-10 rounded-xl border-slate-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="rounded-xl border-slate-200">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {Array.from(new Set(displayAllotments.map(a => a.department).filter(Boolean))).sort().map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={semesterFilter} onValueChange={setSemesterFilter}>
            <SelectTrigger className="rounded-xl border-slate-200">
              <SelectValue placeholder="Semester" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Semesters</SelectItem>
              {uniqueSemesters.sort().map(sem => (
                <SelectItem key={sem} value={sem}>{sem}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Allotments List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="text-left px-6 py-4 text-sm text-slate-600 dark:text-slate-300">Faculty Member</th>
                <th className="text-left px-6 py-4 text-sm text-slate-600 dark:text-slate-300">Course Details</th>
                <th className="text-left px-6 py-4 text-sm text-slate-600 dark:text-slate-300">Department</th>
                <th className="text-left px-6 py-4 text-sm text-slate-600 dark:text-slate-300">Semester</th>
                <th className="text-left px-6 py-4 text-sm text-slate-600 dark:text-slate-300">Room</th>
                <th className="text-left px-6 py-4 text-sm text-slate-600 dark:text-slate-300">Classes</th>
                <th className="text-left px-6 py-4 text-sm text-slate-600 dark:text-slate-300">Weekly Hours</th>
                <th className="text-right px-6 py-4 text-sm text-slate-600 dark:text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAllotments.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    No allotments found. Create an allotment to get started!
                  </td>
                </tr>
              )}

              {filteredAllotments.map((allotment, index) => (
                <motion.tr
                  key={allotment.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className={`w-10 h-10 ${avatarColors[index % avatarColors.length]}`}>
                        <AvatarFallback className={`${avatarColors[index % avatarColors.length]} text-white`}>
                          {allotment.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-slate-800 dark:text-slate-100">{allotment.faculty}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-slate-800 dark:text-slate-100">{allotment.course}</p>
                      <p className="text-sm text-slate-500">{allotment.code}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50">
                      {allotment.department || "N/A"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50">
                      {allotment.semester?.toString().replace(/^Semester\s*/i, '') || "N/A"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                      {allotment.room}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 flex-wrap">
                      {allotment.classes.map((cls) => (
                        <Badge key={cls} variant="outline" className="border-slate-200">
                          {cls}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="w-4 h-4" />
                      <span>{allotment.hours.toFixed(1)}h</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg border-slate-200 hover:bg-slate-50"
                        onClick={() => {
                          const actualAllotment = allotments.find(a => {
                            const id = a.courseId + a.facultyId + (a.classIds || []).sort().join('-');
                            return id === allotment.id;
                          });
                          if (actualAllotment) {
                            setFormData({
                              courseId: actualAllotment.courseId,
                              facultyId: actualAllotment.facultyId,
                              classIds: actualAllotment.classIds.join(", "),
                              preferredRoomId: actualAllotment.preferredRoomId || "",
                              department: actualAllotment.department || "",
                            });
                            setEditingId(allotment.id);
                            setIsAddDialogOpen(true);
                          }
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                        onClick={() => handleRemoveAllotment(allotment.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Import Preview Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Import Preview</DialogTitle>
            <DialogDescription>Review CSV data before importing</DialogDescription>
          </DialogHeader>

          {importPreview && (
            <div className="space-y-4">
              <div className="text-sm text-green-700 bg-green-50 p-3 rounded border border-green-200">
                ✓ CSV parsed successfully!
              </div>

              <div className="text-center p-6 bg-orange-50 border border-orange-200 rounded">
                <div className="text-4xl font-bold text-orange-900">{importPreview.count}</div>
                <div className="text-sm text-orange-700 mt-2">Allotments to import</div>
              </div>

              <div className="text-xs text-blue-700 bg-blue-50 p-2 rounded border border-blue-200">
                ℹ️ Expected CSV format: courseName, facultyName, sections, department (optional), roomName (optional)
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(false)}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={importing}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20"
            >
              {importing ? "Importing..." : "Confirm Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
