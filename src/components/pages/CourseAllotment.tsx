import { motion } from "motion/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "../ui/dialog";
import { Plus, Search, Clock, Upload, Trash2 } from "lucide-react";
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
  const { allotments, updateAllotments, courses, faculty, departments, rooms } = useTimetableStore();
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

      // Validate required fields
      const requiredFields = ['courseName', 'facultyName', 'sections'];
      const errors: string[] = [];

      data.forEach((row, index) => {
        requiredFields.forEach(field => {
          if (!row[field]) {
            errors.push(`Row ${index + 2}: Missing required field '${field}'`);
          }
        });
      });

      if (errors.length > 0) {
        toast.error(`CSV validation failed: ${errors[0]}`);
        console.error('Validation errors:', errors);
        return;
      }

      // Map CSV data to allotments
      const newAllotments = data.map(row => {
        const course = courses.find(c => c.name === row.courseName || c.code === row.courseName);
        const facultyMember = faculty.find(f => f.name === row.facultyName);

        if (!course) {
          errors.push(`Course not found: ${row.courseName}`);
          return null;
        }
        if (!facultyMember) {
          errors.push(`Faculty not found: ${row.facultyName}`);
          return null;
        }

        return {
          courseId: course.id,
          facultyId: facultyMember.id,
          classIds: row.sections.split(',').map((s: string) => s.trim()).filter((s: string) => s),
          preferredRoomId: row.roomName ? rooms.find(r => r.name === row.roomName)?.id : undefined,
          department: row.department || course.department
        };
      }).filter(Boolean);

      if (errors.length > 0) {
        toast.error(`Mapping failed: ${errors[0]}`);
        console.error('Mapping errors:', errors);
        return;
      }

      setImportPreview({ allotments: newAllotments, count: newAllotments.length });
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
    } finally {
      setImporting(false);
    }
  };

  // Convert allotments to display format
  const displayAllotments = allotments.map(allotment => {
    const course = courses.find(c => c.id === allotment.courseId);
    const facultyMember = faculty.find(f => f.id === allotment.facultyId);
    const room = allotment.preferredRoomId ? rooms.find(r => r.id === allotment.preferredRoomId) : null;

    return {
      id: allotment.courseId + allotment.facultyId,
      faculty: facultyMember?.name || "Unknown Faculty",
      initials: facultyMember?.initials || "??",
      course: course?.name || "Unknown Course",
      code: course?.code || "???",
      department: allotment.department || course?.department || "",
      semester: course?.semester || "",
      classes: allotment.classIds,
      room: room?.name || "Not Assigned",
      hours: course ? course.credits * 1.5 : 0, // Approximate hours
      status: "Confirmed",
    };
  });

  const filteredAllotments = displayAllotments.filter(allotment => {
    const matchesSearch = allotment.faculty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      allotment.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
      allotment.code.toLowerCase().includes(searchQuery.toLowerCase());

    // Department filter - normalize comparison
    const courseDept = (allotment.department || '').toUpperCase().trim();
    const selectedDept = departmentFilter.toUpperCase().trim();
    const matchesDepartment = departmentFilter === "all" || courseDept === selectedDept;

    // Semester filter - normalize to just the number
    let courseSemester = String(allotment.semester || '').trim();
    let selectedSem = String(semesterFilter).trim();

    // Remove "Semester " prefix if exists
    courseSemester = courseSemester.replace(/^Semester\s*/i, '');
    selectedSem = selectedSem.replace(/^Semester\s*/i, '');

    const matchesSemester = semesterFilter === "all" || courseSemester === selectedSem;

    return matchesSearch && matchesDepartment && matchesSemester;
  });

  // Get unique semesters - normalize to just numbers
  const uniqueSemesters = Array.from(
    new Set(
      courses
        .map(c => {
          let sem = String(c.semester || '').trim();
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

  const handleRemoveAllotment = (allotmentId: string) => {
    const updatedAllotments = allotments.filter(a => {
      const id = a.courseId + a.facultyId;
      return id !== allotmentId;
    });
    updateAllotments(updatedAllotments);
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
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>

            {/* Delete All Button */}
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
                    <Button variant="outline">Cancel</Button>
                    <Button
                      onClick={() => {
                        updateAllotments([]);
                        toast.success('All allotments deleted successfully!');
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white"
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
                      <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded text-sm text-slate-500">
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
        className="bg-white rounded-2xl border border-slate-200/60 p-6 mb-6"
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
        className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
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
                          const actualAllotment = allotments.find(a => (a.courseId + a.facultyId) === allotment.id);
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
        <DialogContent className="sm:max-w-[500px]">
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
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {importing ? "Importing..." : "Confirm Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
