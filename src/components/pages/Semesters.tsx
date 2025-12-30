import { motion } from "motion/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "../ui/dialog";
import { Plus, Calendar, Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import { useTimetableStore } from "../../stores/timetableStore";
import { toast } from "sonner";
import { Semester } from "../../types/timetable.types";
import { Switch } from "../ui/switch";

export function Semesters() {
    const { semesters, updateSemesters } = useTimetableStore();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
    const [formData, setFormData] = useState<{
        name: string;
        type: 'Fall' | 'Spring' | 'Summer';
        year: number;
        active: boolean;
    }>({
        name: "",
        type: "Fall",
        year: new Date().getFullYear(),
        active: false,
    });

    const handleAddSemester = () => {
        if (!formData.name) {
            toast.error("Name is required");
            return;
        }

        const newSemester: Semester = {
            id: crypto.randomUUID(),
            name: formData.name,
            type: formData.type,
            year: formData.year,
            active: formData.active,
        };

        // If new semester is active, deactivate others
        let updatedSemesters = [...semesters];
        if (newSemester.active) {
            updatedSemesters = updatedSemesters.map(s => ({ ...s, active: false }));
        }

        updateSemesters([...updatedSemesters, newSemester]);
        setIsAddDialogOpen(false);
        toast.success('Semester added successfully!');

        setFormData({
            name: "",
            type: "Fall",
            year: new Date().getFullYear(),
            active: false,
        });
    };

    const handleDeleteSemester = (id: string) => {
        const updatedSemesters = semesters.filter(s => s.id !== id);
        updateSemesters(updatedSemesters);
        toast.success('Semester deleted successfully!');
    };

    const handleEditClick = (sem: Semester) => {
        setEditingSemester(sem);
        setFormData({
            name: sem.name,
            type: sem.type,
            year: sem.year,
            active: sem.active,
        });
        setIsEditDialogOpen(true);
    };

    const handleUpdateSemester = () => {
        if (!editingSemester || !formData.name) return;

        let updatedSemesters = semesters.map(s =>
            s.id === editingSemester.id
                ? { ...s, name: formData.name, type: formData.type, year: formData.year, active: formData.active }
                : s
        );

        // If updated semester is active, deactivate others
        if (formData.active) {
            updatedSemesters = updatedSemesters.map(s =>
                s.id === editingSemester.id ? s : { ...s, active: false }
            );
        }

        updateSemesters(updatedSemesters);
        setIsEditDialogOpen(false);
        setEditingSemester(null);
        setFormData({
            name: "",
            type: "Fall",
            year: new Date().getFullYear(),
            active: false,
        });
        toast.success('Semester updated successfully!');
    };

    const toggleActive = (id: string) => {
        const updatedSemesters = semesters.map(s => ({
            ...s,
            active: s.id === id
        }));
        updateSemesters(updatedSemesters);
        toast.success('Active semester updated!');
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
                        <h2 className="text-slate-800 dark:text-slate-100 mb-2">Semesters</h2>
                        <p className="text-slate-500 dark:text-slate-400">Manage academic semesters</p>
                    </div>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/30">
                                <Plus className="w-4 h-4 mr-2" />
                                Add New Semester
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Add New Semester</DialogTitle>
                                <DialogDescription>
                                    Enter the details for the new semester.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div>
                                    <Label>Semester Name</Label>
                                    <Input
                                        placeholder="e.g., Fall 2024"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="mt-2"
                                    />
                                </div>
                                <div>
                                    <Label>Type</Label>
                                    <Select value={formData.type} onValueChange={(value: 'Fall' | 'Spring' | 'Summer') => setFormData({ ...formData, type: value })}>
                                        <SelectTrigger className="mt-2">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Fall">Fall</SelectItem>
                                            <SelectItem value="Spring">Spring</SelectItem>
                                            <SelectItem value="Summer">Summer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Year</Label>
                                    <Input
                                        type="number"
                                        value={formData.year}
                                        onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                        className="mt-2"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>Set as Active</Label>
                                    <Switch
                                        checked={formData.active}
                                        onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleAddSemester} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                                    Add Semester
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Edit Semester</DialogTitle>
                                <DialogDescription>
                                    Update the details for the semester.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div>
                                    <Label>Semester Name</Label>
                                    <Input
                                        placeholder="e.g., Fall 2024"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="mt-2"
                                    />
                                </div>
                                <div>
                                    <Label>Type</Label>
                                    <Select value={formData.type} onValueChange={(value: 'Fall' | 'Spring' | 'Summer') => setFormData({ ...formData, type: value })}>
                                        <SelectTrigger className="mt-2">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Fall">Fall</SelectItem>
                                            <SelectItem value="Spring">Spring</SelectItem>
                                            <SelectItem value="Summer">Summer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Year</Label>
                                    <Input
                                        type="number"
                                        value={formData.year}
                                        onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                        className="mt-2"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>Set as Active</Label>
                                    <Switch
                                        checked={formData.active}
                                        onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleUpdateSemester} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                                    Update Semester
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </motion.div>

            {/* Semesters Grid */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                {semesters.length === 0 && (
                    <div className="col-span-3 text-center py-12">
                        <p className="text-slate-500 dark:text-slate-400">No semesters found. Add one to get started!</p>
                    </div>
                )}

                {semesters.map((sem, index) => (
                    <motion.div
                        key={sem.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className={`group bg-white dark:bg-slate-800 rounded-2xl border p-6 hover:shadow-lg transition-all duration-300 ${sem.active ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200/60 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'}`}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${sem.active ? 'bg-blue-600' : 'bg-slate-400'}`}>
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-slate-800 dark:text-slate-100 font-medium">{sem.name}</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{sem.type} {sem.year}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    onClick={() => handleEditClick(sem)}
                                >
                                    <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    onClick={() => handleDeleteSemester(sem.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                            <span className={`text-sm ${sem.active ? 'text-blue-600 font-medium' : 'text-slate-500'}`}>
                                {sem.active ? 'Active Semester' : 'Inactive'}
                            </span>
                            {!sem.active && (
                                <Button variant="ghost" size="sm" onClick={() => toggleActive(sem.id)}>
                                    Set Active
                                </Button>
                            )}
                        </div>
                    </motion.div>
                ))}
            </motion.div>
        </>
    );
}
