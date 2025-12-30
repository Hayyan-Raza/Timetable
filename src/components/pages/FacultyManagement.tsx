import { motion } from "motion/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../ui/dialog";
import { Plus, Search, Users, Briefcase, Clock } from "lucide-react";
import { useState } from "react";
import { useTimetableStore } from "../../stores/timetableStore";
import { toast } from "sonner";
import { Faculty } from "../../types/timetable.types";

export function FacultyManagement() {
    const { faculty, updateFaculty, departments } = useTimetableStore();

    const getDepartmentName = (deptIdOrName: string | undefined) => {
        if (!deptIdOrName) return "";
        const dept = departments.find(d => d.id === deptIdOrName || d.name === deptIdOrName);
        return dept ? dept.name : deptIdOrName;
    };

    const [searchQuery, setSearchQuery] = useState("");
    const [deptFilter, setDeptFilter] = useState("all");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        initials: "",
        maxWeeklyHours: 12,
        department: "Computer Science",
    });

    const filteredFaculty = faculty.filter(f => {
        const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.initials.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = deptFilter === "all" || f.department === deptFilter;

        return matchesSearch && matchesDept;
    });

    const handleAddFaculty = () => {
        if (!formData.name || !formData.initials) {
            toast.error("Name and Initials are required");
            return;
        }

        const newFaculty: Faculty = {
            id: `faculty-${Date.now()}`,
            name: formData.name,
            initials: formData.initials,
            maxWeeklyHours: formData.maxWeeklyHours,
            department: formData.department,
        };

        updateFaculty([...faculty, newFaculty]);
        setIsAddDialogOpen(false);
        toast.success('Faculty member added successfully!');

        setFormData({
            name: "",
            initials: "",
            maxWeeklyHours: 12,
            department: "Computer Science",
        });
    };

    const handleEditFaculty = () => {
        if (selectedFaculty) {
            const updatedFacultyList = faculty.map(f => {
                if (f.id === selectedFaculty.id) {
                    return {
                        ...f,
                        name: formData.name,
                        initials: formData.initials,
                        maxWeeklyHours: formData.maxWeeklyHours,
                        department: formData.department,
                    };
                }
                return f;
            });

            updateFaculty(updatedFacultyList);
            setIsEditDialogOpen(false);
            setSelectedFaculty(null);
            toast.success('Faculty updated successfully!');
        }
    };

    const openEditDialog = (facultyMember: Faculty) => {
        setSelectedFaculty(facultyMember);
        setFormData({
            name: facultyMember.name,
            initials: facultyMember.initials,
            maxWeeklyHours: facultyMember.maxWeeklyHours,
            department: facultyMember.department || "Computer Science",
        });
        setIsEditDialogOpen(true);
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
                        <h2 className="text-slate-800 dark:text-slate-100 mb-2">Faculty Management</h2>
                        <p className="text-slate-500 dark:text-slate-400">Manage faculty members and their workloads</p>
                    </div>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/30">
                                <Plus className="w-4 h-4 mr-2" />
                                Add New Faculty
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Add New Faculty</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div>
                                    <Label>Full Name</Label>
                                    <Input
                                        placeholder="e.g., Dr. Ali Ahmed"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="mt-2"
                                    />
                                </div>
                                <div>
                                    <Label>Initials</Label>
                                    <Input
                                        placeholder="e.g., AA"
                                        value={formData.initials}
                                        onChange={(e) => setFormData({ ...formData, initials: e.target.value })}
                                        className="mt-2"
                                    />
                                </div>
                                <div>
                                    <Label>Department</Label>
                                    <Select value={formData.department} onValueChange={(value: string) => setFormData({ ...formData, department: value })}>
                                        <SelectTrigger className="mt-2">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departments.map(dept => (
                                                <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Max Weekly Hours</Label>
                                    <Input
                                        type="number"
                                        value={formData.maxWeeklyHours}
                                        onChange={(e) => setFormData({ ...formData, maxWeeklyHours: parseInt(e.target.value) })}
                                        className="mt-2"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleAddFaculty} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                                    Add Faculty
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </motion.div >

            {/* Filters */}
            < motion.div
                initial={{ opacity: 0, y: 20 }
                }
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-6 mb-6"
            >
                <div className="grid grid-cols-3 gap-4">
                    <div className="relative col-span-2">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                            placeholder="Search faculty by name or initials..."
                            className="pl-10 rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={deptFilter} onValueChange={setDeptFilter}>
                        <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                            <SelectValue placeholder="Department" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Departments</SelectItem>
                            {departments.map(dept => (
                                <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </motion.div >

            {/* Faculty Grid */}
            < motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                {
                    filteredFaculty.length === 0 && (
                        <div className="col-span-3 text-center py-12">
                            <p className="text-slate-500 dark:text-slate-400">No faculty members found. Add one to get started!</p>
                        </div>
                    )
                }

                {
                    filteredFaculty.map((f, index) => (
                        <motion.div
                            key={f.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-6 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg transition-all duration-300"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                                        {f.initials}
                                    </div>
                                    <div>
                                        <h3 className="text-slate-800 dark:text-slate-100 font-medium">{f.name}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{getDepartmentName(f.department)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 mb-4">
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <Briefcase className="w-4 h-4 text-blue-500" />
                                    <span className="text-sm">{getDepartmentName(f.department)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <Clock className="w-4 h-4 text-violet-500" />
                                    <span className="text-sm">Max {f.maxWeeklyHours} hours/week</span>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                className="w-full rounded-xl border-slate-200 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                                onClick={() => openEditDialog(f)}
                            >
                                Edit Details
                            </Button>
                        </motion.div>
                    ))
                }
            </motion.div >

            {/* Edit Dialog */}
            < Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Faculty</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Full Name</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <Label>Initials</Label>
                            <Input
                                value={formData.initials}
                                onChange={(e) => setFormData({ ...formData, initials: e.target.value })}
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <Label>Department</Label>
                            <Select value={formData.department} onValueChange={(value: string) => setFormData({ ...formData, department: value })}>
                                <SelectTrigger className="mt-2">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {departments.map(dept => (
                                        <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Max Weekly Hours</Label>
                            <Input
                                type="number"
                                value={formData.maxWeeklyHours}
                                onChange={(e) => setFormData({ ...formData, maxWeeklyHours: parseInt(e.target.value) })}
                                className="mt-2"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleEditFaculty} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent >
            </Dialog >
        </>
    );
}
