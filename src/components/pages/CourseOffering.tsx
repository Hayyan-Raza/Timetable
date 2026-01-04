import { motion } from "motion/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../ui/dialog";
import { Plus, Search, BookOpen, Users, Trash2 } from "lucide-react";
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
import { useState } from "react";
import { useTimetableStore } from "../../stores/timetableStore";
import { toast } from "sonner";
import { parseCSV } from "../../utils/csvParser";
import { Upload, Download } from "lucide-react";
import { useRef } from "react";

export function CourseOffering() {
  const { courses, updateCourses, semesters, importCourses } = useTimetableStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [labFilter, setLabFilter] = useState("all"); // all, labs, non-labs
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    credits: 3,
    type: "Core",
    semester: "",
    department: "",
    requiresLab: false,
    estimatedStudents: 50,
  });

  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<{ valid: any[], invalid: string[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // importCourses is already destructured at the top level in the previous edit, but let's check.
  // The previous edit changed: const { courses, updateCourses, semesters, importCourses } = useTimetableStore();
  // So we don't need to destructure it again here.


  // Handle file selection for import
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseCSV(file);
      if (data.length === 0) {
        toast.error("CSV file is empty");
        return;
      }

      const validCourses: any[] = [];
      const invalidRows: string[] = [];

      data.forEach((row, index) => {
        // Map common variations including Allotments.csv format
        const code = row.Code || row.code;
        const name = row.Name || row.name || row.Subject || row.subject; // Added Subject
        const credits = row.Credits || row.credits || row['Credit Hours'] || row['credit hours']; // Added Credit Hours
        const type = row.Type || row.type;
        const semester = row.Semester || row.semester;
        const dept = row.Department || row.department;
        const reqLab = row.RequiresLab || row.requiresLab;
        const estStudents = row.EstimatedStudents || row.estimatedStudents;

        if (!name) {
          invalidRows.push(`Row ${index + 2}: Missing Course Name (or Subject)`);
          return;
        }

        // Auto-generate attributes if missing

        // Infer Lab requirement from name
        const inferredLab = String(reqLab).toLowerCase() === 'true' || String(reqLab) === '1' || name.toLowerCase().includes('lab');

        // Generate Code if missing: e.g. "BSCS-1-AICT" or "AICT"
        let generatedCode = code;
        if (!generatedCode) {
          // Create initials from name: "Applications of Information..." -> "AOI"
          const initials = name.split(' ')
            .map((word: string) => word[0].toUpperCase())
            .filter((char: string) => /[A-Z]/.test(char))
            .join('');

          // Format: DEPT-SEM-INITIALS (e.g. BSCS-1-AICT)
          const deptPrefix = dept ? `${dept}-` : 'GEN-';
          const semPrefix = semester ? `${semester}-` : '0-';
          generatedCode = `${deptPrefix}${semPrefix}${initials}`;

          // Add -L if it's a lab and doesn't have it
          if (inferredLab && !generatedCode.endsWith('-L')) {
            generatedCode += '-L';
          }
        }


        validCourses.push({
          id: `course-${Date.now()}-${index}`,
          code: generatedCode,
          name: name,
          credits: Number(credits) || 3, // Default to 3 if missing
          type: (type === 'Major' || type === 'Elective') ? type : 'Core', // Default to Core
          semester: String(semester || '1'),
          department: dept || '',
          requiresLab: inferredLab,
          estimatedStudents: Number(estStudents) || 50,
          capacity: Number(estStudents) || 50,
          enrolled: 0
        });
      });

      if (validCourses.length === 0) {
        toast.error("No valid courses found in CSV");
        return;
      }

      setImportPreview({ valid: validCourses, invalid: invalidRows });
      setIsImportDialogOpen(true);
    } catch (error) {
      console.error(error);
      toast.error("Failed to parse CSV");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview?.valid.length) return;
    setImporting(true);
    try {
      await importCourses(importPreview.valid);
      toast.success(`Successfully imported ${importPreview.valid.length} courses`);
      setIsImportDialogOpen(false);
      setImportPreview(null);
    } catch (e) {
      toast.error("Failed to import courses");
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadSample = () => {
    const headers = "Code,Name,Credits,Type,Semester,Department,RequiresLab,EstimatedStudents";
    const sample = "CS-101,Intro to Computing,3,Core,1,BSCS,false,50\nCS-102L,Programming Lab,1,Core,1,BSCS,true,50";
    const blob = new Blob([headers + "\n" + sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "courses_sample.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };


  // Map internal courses to display format
  const displayCourses = courses.map(course => ({
    ...course,
    capacity: course.estimatedStudents,
    enrolled: 0, // Default enrolled count
  }));

  const filteredCourses = displayCourses.filter(course => {
    const matchesSearch = course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || course.type.toLowerCase() === typeFilter;
    const matchesSemester = semesterFilter === "all" ||
      course.semester === semesterFilter ||
      `Semester ${course.semester}` === semesterFilter ||
      course.semester === semesterFilter.replace('Semester ', '');
    const matchesDepartment = departmentFilter === "all" ||
      course.department?.toLowerCase() === departmentFilter.toLowerCase();

    // Lab filter
    const isLab = course.requiresLab || course.code.endsWith('-L') || course.name.toLowerCase().includes('lab');
    const matchesLab = labFilter === "all" ||
      (labFilter === "labs" && isLab) ||
      (labFilter === "non-labs" && !isLab);

    return matchesSearch && matchesType && matchesSemester && matchesDepartment && matchesLab;
  });

  const handleAddCourse = () => {
    // Auto-append "-L" to lab course codes to avoid duplicates with theory courses
    let courseCode = formData.code;
    if (formData.requiresLab && !courseCode.endsWith('-L')) {
      courseCode = `${courseCode}-L`;
    }

    const newCourse = {
      id: `course-${Date.now()}`,
      code: courseCode,
      name: formData.name,
      credits: formData.credits,
      type: formData.type as 'Core' | 'Major' | 'Elective',
      semester: formData.semester,
      department: formData.department,
      requiresLab: formData.requiresLab,
      estimatedStudents: formData.estimatedStudents,
    };

    updateCourses([...courses, newCourse]);
    setIsAddDialogOpen(false);
    toast.success('Course added successfully!');

    setFormData({
      code: "",
      name: "",
      credits: 3,
      type: "Core",
      semester: "",
      department: "",
      requiresLab: false,
      estimatedStudents: 50,
    });
  };

  const handleEditCourse = () => {
    if (selectedCourse) {
      // Auto-append "-L" to lab course codes to avoid duplicates with theory courses
      let courseCode = formData.code;
      if (formData.requiresLab && !courseCode.endsWith('-L')) {
        courseCode = `${courseCode} - L`;
      }

      const updatedCourses = courses.map(c => {
        if (c.id === selectedCourse.id) {
          return {
            ...c,
            code: courseCode,
            name: formData.name,
            credits: formData.credits,
            type: formData.type as 'Core' | 'Major' | 'Elective',
            semester: formData.semester,
            department: formData.department,
            requiresLab: formData.requiresLab,
            estimatedStudents: formData.estimatedStudents,
          };
        }
        return c;
      });

      updateCourses(updatedCourses);
      setIsEditDialogOpen(false);
      setSelectedCourse(null);
      toast.success('Course updated successfully!');
    }
  };



  const openEditDialog = (course: any) => {
    setSelectedCourse(course);
    setFormData({
      code: course.code,
      name: course.name,
      credits: course.credits,
      type: course.type,
      semester: course.semester,
      department: course.department || "",
      requiresLab: course.requiresLab,
      estimatedStudents: course.estimatedStudents,
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (course: any) => {
    setSelectedCourse(course);
    setIsViewDialogOpen(true);
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
            <h2 className="text-slate-800 dark:text-slate-100 mb-2">Course Offering</h2>
            <p className="text-slate-500">Manage and view all offered courses for the semester</p>
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="outline"
              className="border-slate-200 text-slate-700 hover:bg-slate-50"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/30">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Course
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Course</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div>
                    <Label>Course Code</Label>
                    <Input
                      placeholder="e.g., CS-301"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Course Name</Label>
                    <Input
                      placeholder="e.g., Database Systems"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Credits</Label>
                    <Input
                      type="number"
                      value={formData.credits}
                      onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Course Type</Label>
                    <Select value={formData.type} onValueChange={(value: 'Core' | 'Major' | 'Elective') => setFormData({ ...formData, type: value })}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Core">Core</SelectItem>
                        <SelectItem value="Major">Major</SelectItem>
                        <SelectItem value="Elective">Elective</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Semester</Label>
                    <Select value={formData.semester} onValueChange={(value: string) => setFormData({ ...formData, semester: value })}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {semesters.map(sem => (
                          <SelectItem key={sem.id} value={sem.name}>{sem.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Input
                      placeholder="e.g., BSCS, BSSE, BSAI"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Estimated Students</Label>
                    <Input
                      type="number"
                      value={formData.estimatedStudents}
                      onChange={(e) => setFormData({ ...formData, estimatedStudents: parseInt(e.target.value) })}
                      className="mt-2"
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center space-x-2 mt-4">
                      <input
                        type="checkbox"
                        id="requiresLab"
                        checked={formData.requiresLab}
                        onChange={(e) => setFormData({ ...formData, requiresLab: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <Label htmlFor="requiresLab" className="cursor-pointer font-normal">
                        This is a Lab course (will append "-L" to course code)
                      </Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddCourse} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    Add Course
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
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search courses by name or code..."
              className="pl-10 rounded-xl border-slate-200 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="rounded-xl border-slate-200 w-[180px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {Array.from(new Set(courses.map(c => c.department).filter(Boolean))).sort().map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="rounded-xl border-slate-200 w-[150px]">
              <SelectValue placeholder="Course Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="core">Core</SelectItem>
              <SelectItem value="major">Major</SelectItem>
              <SelectItem value="elective">Elective</SelectItem>
            </SelectContent>
          </Select>
          <Select value={semesterFilter} onValueChange={setSemesterFilter}>
            <SelectTrigger className="rounded-xl border-slate-200 w-[150px]">
              <SelectValue placeholder="Semester" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Semesters</SelectItem>
              {semesters.map(sem => (
                <SelectItem key={sem.id} value={sem.name}>{sem.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={labFilter} onValueChange={setLabFilter}>
            <SelectTrigger className="rounded-xl border-slate-200 w-[150px]">
              <SelectValue placeholder="Lab Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              <SelectItem value="labs">Labs Only</SelectItem>
              <SelectItem value="non-labs">Non-Labs Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Courses Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {filteredCourses.length === 0 && (
          <div className="col-span-2 text-center py-12">
            <p className="text-slate-500">No courses found. Add a course to get started!</p>
          </div>
        )}

        {filteredCourses.map((course, index) => {
          return (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="group bg-white rounded-2xl border border-slate-200/60 p-6 hover:border-slate-300 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 border">
                      {course.code}
                    </Badge>
                    {course.department && (
                      <Badge className="bg-purple-100 text-purple-700 border-purple-200 border">
                        {course.department}
                      </Badge>
                    )}
                    <Badge variant="outline" className="border-slate-200">
                      {course.type}
                    </Badge>
                    {(course.requiresLab || course.code.endsWith('-L') || course.name.toLowerCase().includes('lab')) && (
                      <Badge className="bg-green-100 text-green-700 border-green-200 border">
                        🧪 Lab
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-slate-800 dark:text-slate-100 mb-1">{course.name}</h3>
                  <p className="text-sm text-slate-500">
                    {course.semester.startsWith('Semester') ? course.semester : `Semester ${course.semester}`}
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">{course.credits} Credit Hours</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Users className="w-4 h-4 text-violet-500" />
                  <span className="text-sm">Capacity: {course.capacity} Students</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl border-slate-200 hover:bg-slate-50"
                  onClick={() => openViewDialog(course)}
                >
                  View Details
                </Button>
                <Button
                  className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  onClick={() => openEditDialog(course)}
                >
                  Edit Course
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                      onClick={() => setSelectedCourse(course)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Course?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete <span className="font-semibold text-slate-800">{course.code} - {course.name}</span>?
                        <br />
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          const updatedCourses = courses.filter(c => c.id !== course.id);
                          updateCourses(updatedCourses);
                          toast.success('Course deleted successfully!');
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white border-none shadow-sm font-medium"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Edit Dialog - Similar to Add Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <Label>Course Code</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Course Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Credits</Label>
              <Input
                type="number"
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) })}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Course Type</Label>
              <Select value={formData.type} onValueChange={(value: 'Core' | 'Major' | 'Elective') => setFormData({ ...formData, type: value })}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Core">Core</SelectItem>
                  <SelectItem value="Major">Major</SelectItem>
                  <SelectItem value="Elective">Elective</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Department</Label>
              <Input
                placeholder="e.g., BSCS, BSSE, BSAI"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Estimated Students</Label>
              <Input
                type="number"
                value={formData.estimatedStudents}
                onChange={(e) => setFormData({ ...formData, estimatedStudents: parseInt(e.target.value) })}
                className="mt-2"
              />
            </div>
            <div className="col-span-2">
              <div className="flex items-center space-x-2 mt-4">
                <input
                  type="checkbox"
                  id="requiresLabEdit"
                  checked={formData.requiresLab}
                  onChange={(e) => setFormData({ ...formData, requiresLab: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="requiresLabEdit" className="cursor-pointer font-normal">
                  This is a Lab course (will append "-L" to course code)
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditCourse} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Course Details</DialogTitle>
          </DialogHeader>
          {selectedCourse && (
            <div className="py-4 space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 border">
                  {selectedCourse.code}
                </Badge>
                <Badge variant="outline" className="border-slate-200">
                  {selectedCourse.type}
                </Badge>
                {(selectedCourse.requiresLab || selectedCourse.code.endsWith('-L') || selectedCourse.name.toLowerCase().includes('lab')) && (
                  <Badge className="bg-green-100 text-green-700 border-green-200 border">
                    🧪 Lab
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-slate-500">
                  {selectedCourse.semester.startsWith('Semester') ? selectedCourse.semester : `Semester ${selectedCourse.semester}`}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-slate-500">Credit Hours</p>
                  <p className="text-slate-800">{selectedCourse.credits}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Capacity</p>
                  <p className="text-slate-800">{selectedCourse.capacity} students</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Import Preview Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Courses Preview</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">Valid Courses found:</span>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{importPreview?.valid.length || 0}</Badge>
              </div>
              <p className="text-xs text-slate-500">These courses will be added to your repository.</p>
            </div>

            {importPreview?.invalid && importPreview.invalid.length > 0 && (
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 max-h-40 overflow-y-auto">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-amber-700">Rows skipped ({importPreview.invalid.length}):</span>
                </div>
                <ul className="text-xs text-amber-600 space-y-1 list-disc pl-4">
                  {importPreview.invalid.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-center">
              <Button variant="link" onClick={handleDownloadSample} className="text-blue-600 text-xs">
                <Download className="w-3 h-3 mr-1" /> Download Sample CSV
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleConfirmImport}
              disabled={importing || !importPreview?.valid.length}
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
