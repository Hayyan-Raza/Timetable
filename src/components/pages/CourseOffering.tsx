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

export function CourseOffering() {
  const { courses, updateCourses, semesters } = useTimetableStore();
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
        courseCode = `${courseCode}-L`;
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
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white rounded-2xl border border-slate-200/60 p-6 mb-6"
      >
        <div className="grid grid-cols-6 gap-4">
          <div className="relative col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search courses by name or code..."
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
              {Array.from(new Set(courses.map(c => c.department).filter(Boolean))).sort().map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="rounded-xl border-slate-200">
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
            <SelectTrigger className="rounded-xl border-slate-200">
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
            <SelectTrigger className="rounded-xl border-slate-200">
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
                <h3 className="text-slate-800 mb-2">{selectedCourse.name}</h3>
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
    </>
  );
}
