import { motion } from "motion/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../ui/dialog";
import { Plus, Search, Users, Briefcase, Clock, Download, Trash2 } from "lucide-react";
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
import { useState, useMemo } from "react";
import { useTimetableStore } from "../../stores/timetableStore";
import { toast } from "sonner";
import { Faculty } from "../../types/timetable.types";

export function FacultyManagement() {
    const { faculty, updateFaculty, departments, importFaculty } = useTimetableStore();

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

    const filteredFaculty = useMemo(() => {
        return faculty.filter(f => {
            const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                f.initials.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDept = deptFilter === "all" || f.department === deptFilter;

            return matchesSearch && matchesDept;
        });
    }, [faculty, searchQuery, deptFilter]);

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
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="gap-2 rounded-xl"
                                onClick={() => {
                                    const csvContent = "Name,Initials,MaxWeeklyHours,Department\nDr. John Doe,JD,12,Computer Science";
                                    const blob = new Blob([csvContent], { type: 'text/csv' });
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = "faculty_template.csv";
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    window.URL.revokeObjectURL(url);
                                }}
                            >
                                <Download className="w-4 h-4" />
                                Template
                            </Button>
                            <Button
                                variant="outline"
                                className="gap-2 rounded-xl"
                                onClick={() => document.getElementById('faculty-csv-upload')?.click()}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Import CSV
                            </Button>
                            <input
                                type="file"
                                id="faculty-csv-upload"
                                className="hidden"
                                style={{ display: 'none' }}
                                accept=".csv"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = async (event) => {
                                            const text = event.target?.result as string;
                                            const rows = text.split('\n').slice(1); // Skip header
                                            const newFaculty: Faculty[] = rows
                                                .filter(row => row.trim() !== '')
                                                .map(row => {
                                                    const [name, initials, maxWeeklyHours, department] = row.split(',').map(s => s.trim());
                                                    if (!name || !initials) return null;
                                                    return {
                                                        id: `faculty-import-${Math.random().toString(36).substr(2, 9)}`,
                                                        name,
                                                        initials,
                                                        maxWeeklyHours: Number(maxWeeklyHours) || 12,
                                                        department: department || "Computer Science"
                                                    };
                                                })
                                                .filter(f => f !== null) as Faculty[];

                                            if (newFaculty.length > 0) {
                                                await importFaculty(newFaculty);
                                                toast.success(`Imported ${newFaculty.length} faculty members`);
                                            } else {
                                                toast.error("No valid faculty found in CSV");
                                            }
                                            e.target.value = ''; // Reset input
                                        };
                                        reader.readAsText(file);
                                    }
                                }}
                            />
                            <DialogTrigger asChild>
                                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/30">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add New Faculty
                                </Button>
                            </DialogTrigger>
                        </div>
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
            <motion.div
                initial={{ opacity: 0, y: 20 }}
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
            <motion.div
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

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="flex-1 rounded-xl border-slate-200 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                                    onClick={() => openEditDialog(f)}
                                >
                                    Edit Details
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Faculty Member?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to delete <span className="font-semibold text-slate-800">{f.name}</span>?
                                                <br />
                                                This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => {
                                                    const updatedFaculty = faculty.filter(faculty => faculty.id !== f.id);
                                                    updateFaculty(updatedFaculty);
                                                    toast.success('Faculty member deleted successfully!');
                                                }}
                                                className="bg-red-600 text-white hover:bg-red-700 border-none shadow-sm font-medium"
                                                style={{ backgroundColor: '#dc2626', color: 'white' }}
                                            >
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
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
