import { motion } from "motion/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Plus, Search, Building2, Trash2, Pencil, BookOpen, Bot } from "lucide-react";
import { useState } from "react";
import { useTimetableStore } from "../../stores/timetableStore";
import { toast } from "sonner";
import { Department, SemesterSchema } from "../../types/timetable.types";

import { generateSectionsForDepartment } from "../../utils/sectionHelpers";


export function Departments() {
    const { departments, updateDepartments, semesters, courses, schemas, updateSchemas } = useTimetableStore();
    const safeSchemas = schemas || [];
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isSchemaDialogOpen, setIsSchemaDialogOpen] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
    const [selectedDepartmentForSchema, setSelectedDepartmentForSchema] = useState<Department | null>(null);
    const [selectedSemesterForSchema, setSelectedSemesterForSchema] = useState<string>("");
    const [courseSearch, setCourseSearch] = useState("");


    const [formData, setFormData] = useState({
        name: "",
        code: "",
    });

    const filteredDepartments = departments.filter(d =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddDepartment = () => {
        if (!formData.name || !formData.code) {
            toast.error("Name and Code are required");
            return;
        }

        const departmentId = crypto.randomUUID();

        // Auto-generate 8 standard sections for 8 semesters
        const sections = generateSectionsForDepartment(formData.code, 8);

        const newDepartment: Department = {
            id: departmentId,
            name: formData.name,
            code: formData.code,
            sections: sections
        };

        updateDepartments([...departments, newDepartment]);
        setIsAddDialogOpen(false);
        toast.success('Department added successfully!');

        setFormData({
            name: "",
            code: "",
        });
    };

    const handleDeleteDepartment = (id: string) => {
        const updatedDepartments = departments.filter(d => d.id !== id);
        updateDepartments(updatedDepartments);
        toast.success('Department deleted successfully!');
    };

    const handleEditClick = (dept: Department) => {
        setEditingDepartment(dept);
        setFormData({
            name: dept.name,
            code: dept.code,
        });
        setIsEditDialogOpen(true);
    };

    const handleUpdateDepartment = () => {
        if (!editingDepartment || !formData.name || !formData.code) return;

        const updatedDepartments = departments.map(d =>
            d.id === editingDepartment.id
                ? { ...d, name: formData.name, code: formData.code }
                : d
        );

        updateDepartments(updatedDepartments);
        setIsEditDialogOpen(false);
        setEditingDepartment(null);
        setFormData({ name: "", code: "" });
        toast.success('Department updated successfully!');
    };

    const handleManageSchema = (dept: Department) => {
        setSelectedDepartmentForSchema(dept);
        // Select first active semester by default if available
        const firstSem = semesters.find(s => s.active);
        if (firstSem) setSelectedSemesterForSchema(firstSem.name);
        setCourseSearch(""); // Reset search
        setIsSchemaDialogOpen(true);
    };

    const getCurrentSchema = () => {
        if (!selectedDepartmentForSchema || !selectedSemesterForSchema) return null;
        return safeSchemas.find(s =>
            (s.departmentId === selectedDepartmentForSchema.id ||
                (s.departmentId === 'dept-bscs' && selectedDepartmentForSchema.code === 'BSCS')) &&
            s.semesterId === selectedSemesterForSchema
        );
    };

    const handleAddCourseToSchema = (courseId: string) => {
        if (!selectedDepartmentForSchema || !selectedSemesterForSchema) return;

        const currentSchema = getCurrentSchema();
        let newSchemas = [...safeSchemas];

        if (currentSchema) {
            // Update existing schema
            if (currentSchema.courseIds.includes(courseId)) return; // Already added

            newSchemas = newSchemas.map(s =>
                s.id === currentSchema.id
                    ? { ...s, courseIds: [...s.courseIds, courseId] }
                    : s
            );
        } else {
            // Create new schema
            const newSchema: SemesterSchema = {
                id: crypto.randomUUID(),
                departmentId: selectedDepartmentForSchema.id,
                semesterId: selectedSemesterForSchema,
                courseIds: [courseId]
            };
            newSchemas.push(newSchema);
        }

        updateSchemas(newSchemas);
        toast.success("Course added to curriculum");
    };

    const handleRemoveCourseFromSchema = (courseId: string) => {
        const currentSchema = getCurrentSchema();
        if (!currentSchema) return;

        const newSchemas = safeSchemas.map(s =>
            s.id === currentSchema.id
                ? { ...s, courseIds: s.courseIds.filter(id => id !== courseId) }
                : s
        );

        updateSchemas(newSchemas);
        toast.success("Course removed from curriculum");
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
                        <h2 className="text-slate-800 dark:text-slate-100 mb-2">Departments</h2>
                        <p className="text-slate-500 dark:text-slate-400">Manage university departments</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                // Extract unique departments from courses
                                const uniqueDepts = Array.from(new Set(
                                    courses.map(c => c.department).filter(Boolean)
                                ));

                                if (uniqueDepts.length === 0) {
                                    toast.error('No departments found in courses. Import courses first.');
                                    return;
                                }

                                // Create department objects for new departments only
                                const existingCodes = new Set(departments.map(d => d.code));
                                const newDepartments = uniqueDepts
                                    .filter(code => !existingCodes.has(code))
                                    .map(code => {
                                        const deptId = crypto.randomUUID();
                                        return {
                                            id: deptId,
                                            name: code, // Use code as name for now
                                            code: code,
                                            sections: generateSectionsForDepartment(code, 8)
                                        };
                                    });

                                if (newDepartments.length === 0) {
                                    toast.info('All course departments already exist!');
                                    return;
                                }

                                updateDepartments([...departments, ...newDepartments]);
                                toast.success(`Auto-generated ${newDepartments.length} departments from courses!`);
                            }}
                            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        >
                            <Bot className="w-4 h-4 mr-2" />
                            Auto-Generate from Courses
                        </Button>
                        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/30">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add New Department
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Add New Department</DialogTitle>
                                    <DialogDescription>
                                        Enter the details for the new department.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div>
                                        <Label>Department Name</Label>
                                        <Input
                                            placeholder="e.g., Computer Science"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="mt-2"
                                        />
                                    </div>
                                    <div>
                                        <Label>Department Code</Label>
                                        <Input
                                            placeholder="e.g., CS"
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                            className="mt-2"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={handleAddDepartment} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                                        Add Department
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Edit Department</DialogTitle>
                                <DialogDescription>
                                    Update the details for the department.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div>
                                    <Label>Department Name</Label>
                                    <Input
                                        placeholder="e.g., Computer Science"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="mt-2"
                                    />
                                </div>
                                <div>
                                    <Label>Department Code</Label>
                                    <Input
                                        placeholder="e.g., CS"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        className="mt-2"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleUpdateDepartment} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                                    Update Department
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Schema Management Dialog */}
                    <Dialog open={isSchemaDialogOpen} onOpenChange={setIsSchemaDialogOpen}>
                        <DialogContent className="max-w-xl max-h-[500px] flex flex-col">
                            <DialogHeader>
                                <DialogTitle>Manage Curriculum</DialogTitle>
                                <DialogDescription>
                                    {selectedDepartmentForSchema?.name} ({selectedDepartmentForSchema?.code})
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex gap-2 items-center border-b pb-3">
                                <Select value={selectedSemesterForSchema} onValueChange={setSelectedSemesterForSchema}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Select Semester" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {semesters.map(sem => (
                                            <SelectItem key={sem.id} value={sem.name}>{sem.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {selectedSemesterForSchema && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2"
                                        onClick={() => {
                                            if (!selectedDepartmentForSchema || !selectedSemesterForSchema) return;

                                            // Normalize semester for comparison
                                            const normalizeSemester = (sem: string | number) => String(sem).replace(/^Semester\s+/i, '').trim();
                                            const normalizedSelectedSemester = normalizeSemester(selectedSemesterForSchema);

                                            // Find all courses matching this department and semester
                                            const matchingCourses = courses.filter(c => {
                                                const courseSemester = c.semester ? normalizeSemester(c.semester) : '';
                                                return c.department === selectedDepartmentForSchema.code &&
                                                    courseSemester === normalizedSelectedSemester;
                                            });

                                            if (matchingCourses.length === 0) {
                                                toast.info(`No courses found for ${selectedDepartmentForSchema.code} - ${selectedSemesterForSchema}`);
                                                return;
                                            }

                                            // Add all matching courses to schema
                                            const currentSchema = getCurrentSchema();
                                            const newIds = matchingCourses.map(c => c.id);

                                            if (currentSchema) {
                                                const updated = safeSchemas.map(s =>
                                                    s.id === currentSchema.id
                                                        ? { ...s, courseIds: newIds }
                                                        : s
                                                );
                                                updateSchemas(updated);
                                            } else {
                                                const newSchema: SemesterSchema = {
                                                    id: crypto.randomUUID(),
                                                    departmentId: selectedDepartmentForSchema.id,
                                                    semesterId: selectedSemesterForSchema,
                                                    courseIds: newIds
                                                };
                                                updateSchemas([...safeSchemas, newSchema]);
                                            }

                                            toast.success(`Auto-generated curriculum with ${matchingCourses.length} courses!`);
                                        }}
                                    >
                                        <Bot className="w-4 h-4" />
                                        Auto-Generate
                                    </Button>
                                )}
                            </div>

                            {selectedSemesterForSchema ? (
                                <>
                                    {/* Current Curriculum Section */}
                                    {(() => {
                                        const currentSchema = getCurrentSchema();
                                        const currentCourseIds = currentSchema?.courseIds || [];

                                        if (currentCourseIds.length > 0) {
                                            return (
                                                <div className="border-b bg-blue-50/50">
                                                    <div className="px-4 py-2 flex items-center justify-between">
                                                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Current Curriculum ({currentCourseIds.length} courses)</h4>
                                                    </div>
                                                    <div className="px-4 pb-3 space-y-1.5 max-h-[200px] overflow-y-auto">
                                                        {currentCourseIds.map(courseId => {
                                                            const course = courses.find(c => c.id === courseId);
                                                            if (!course) return null;
                                                            return (
                                                                <div
                                                                    key={course.id}
                                                                    className="flex items-center justify-between p-2 rounded bg-white border border-blue-200 text-sm"
                                                                >
                                                                    <div className="flex-1">
                                                                        <div className="font-medium text-slate-800 dark:text-slate-100">{course.name}</div>
                                                                        <div className="text-xs text-slate-500">
                                                                            {course.code} • {course.credits} Credits
                                                                        </div>
                                                                    </div>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="text-red-500 hover:text-red-700 h-7"
                                                                        onClick={() => handleRemoveCourseFromSchema(course.id)}
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}

                                    <div className="px-4 pt-3 pb-2">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <Input
                                                placeholder="Search courses by name or code..."
                                                className="pl-10"
                                                value={courseSearch}
                                                onChange={(e) => setCourseSearch(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto space-y-2 px-4 pb-4">
                                        {!courseSearch.trim() ? (
                                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                                <Search className="w-12 h-12 mb-2 opacity-50" />
                                                <p className="text-sm">Type to search for courses</p>
                                                <p className="text-xs mt-1">Or use Auto-Generate to add all matching courses</p>
                                            </div>
                                        ) : (
                                            (() => {
                                                const currentSchema = getCurrentSchema();
                                                const existingIds = currentSchema?.courseIds || [];

                                                const normalizeSemester = (sem: string | number) => String(sem).replace(/^Semester\s+/i, '').trim();
                                                const normalizedSelectedSemester = normalizeSemester(selectedSemesterForSchema);

                                                const availableCourses = courses.filter(c => {
                                                    const courseSemester = c.semester ? normalizeSemester(c.semester) : '';
                                                    const matchesSemester = courseSemester === normalizedSelectedSemester;
                                                    const matchesDepartment = c.department === selectedDepartmentForSchema?.code;
                                                    const matchesSearch = c.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
                                                        c.code.toLowerCase().includes(courseSearch.toLowerCase());
                                                    return matchesSemester && matchesDepartment && matchesSearch;
                                                });

                                                if (availableCourses.length === 0) {
                                                    return (
                                                        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                                            <BookOpen className="w-12 h-12 mb-2 opacity-50" />
                                                            <p className="text-sm">No courses found matching "{courseSearch}"</p>
                                                        </div>
                                                    );
                                                }

                                                return availableCourses.map(course => {
                                                    const isAdded = existingIds.includes(course.id);
                                                    return (
                                                        <div
                                                            key={course.id}
                                                            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${isAdded
                                                                ? 'bg-blue-50 border-blue-200'
                                                                : 'bg-white border-slate-200 hover:border-slate-300'
                                                                }`}
                                                        >
                                                            <div className="flex-1">
                                                                <div className="font-medium text-sm text-slate-800 dark:text-slate-100">{course.name}</div>
                                                                <div className="text-xs text-slate-500 mt-0.5">
                                                                    {course.code} • {course.credits} Credits
                                                                    {course.type && ` • ${course.type}`}
                                                                </div>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                variant={isAdded ? "destructive" : "default"}
                                                                onClick={() => {
                                                                    if (isAdded) {
                                                                        handleRemoveCourseFromSchema(course.id);
                                                                    } else {
                                                                        handleAddCourseToSchema(course.id);
                                                                    }
                                                                }}
                                                            >
                                                                {isAdded ? 'Remove' : 'Add'}
                                                            </Button>
                                                        </div>
                                                    );
                                                });
                                            })()
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-slate-400">
                                    <div className="text-center">
                                        <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">Select a semester to manage curriculum</p>
                                    </div>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>
            </motion.div>

            {/* Filters */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-6 mb-6"
            >
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                        placeholder="Search departments..."
                        className="pl-10 rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </motion.div>

            {/* Departments Grid */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                {filteredDepartments.length === 0 && (
                    <div className="col-span-3 text-center py-12">
                        <p className="text-slate-500 dark:text-slate-400">No departments found. Add one to get started!</p>
                    </div>
                )}

                {filteredDepartments.map((dept, index) => (
                    <motion.div
                        key={dept.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-6 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg transition-all duration-300"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-slate-800 dark:text-slate-100 font-medium">{dept.name}</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Code: {dept.code}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    onClick={() => handleEditClick(dept)}
                                >
                                    <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    onClick={() => handleDeleteDepartment(dept.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Sections Display */}
                        {dept.sections && dept.sections.length > 0 && (
                            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                    Sections ({dept.sections.length} total)
                                </p>
                                <div className="grid grid-cols-4 gap-2">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => {
                                        const semSections = dept.sections?.filter(s => s.semester === sem.toString()) || [];
                                        return (
                                            <div key={sem} className="text-center p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                                <div className="text-xs text-slate-500 dark:text-slate-400">Sem {sem}</div>
                                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                    {semSections.length} sections
                                                </div>
                                                {semSections.length > 0 && (
                                                    <div className="text-[10px] text-slate-400 mt-1">
                                                        {semSections.map(s => s.code).join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <Button
                            variant="outline"
                            className="w-full mt-2 border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                            onClick={() => handleManageSchema(dept)}
                        >
                            <BookOpen className="w-4 h-4 mr-2" />
                            Manage Curriculum
                        </Button>
                    </motion.div>
                ))}
            </motion.div>
        </>
    );
}
