import { motion } from "motion/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../ui/dialog";
import { Plus, Search, MapPin, Users, Building } from "lucide-react";
import { useState } from "react";
import { useTimetableStore } from "../../stores/timetableStore";
import { toast } from "sonner";
import { Room } from "../../types/timetable.types";

export function RoomManagement() {
    const { rooms, updateRooms } = useTimetableStore();
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        capacity: 40,
        type: "lecture",
        building: "Main Block",
    });

    const [selectedRooms, setSelectedRooms] = useState<string[]>([]);

    const filteredRooms = rooms.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.building && r.building.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesType = typeFilter === "all" || r.type === typeFilter;

        return matchesSearch && matchesType;
    });

    const handleAddRoom = () => {
        if (!formData.name) {
            toast.error("Room Name is required");
            return;
        }

        const newRoom: Room = {
            id: `room-${Date.now()}`,
            name: formData.name,
            capacity: formData.capacity,
            type: formData.type as 'lecture' | 'lab' | 'both',
            building: formData.building,
        };

        updateRooms([...rooms, newRoom]);
        setIsAddDialogOpen(false);
        toast.success('Room added successfully!');

        setFormData({
            name: "",
            capacity: 40,
            type: "lecture",
            building: "Main Block",
        });
    };

    const handleEditRoom = () => {
        if (selectedRoom) {
            const updatedRooms = rooms.map(r => {
                if (r.id === selectedRoom.id) {
                    return {
                        ...r,
                        name: formData.name,
                        capacity: formData.capacity,
                        type: formData.type as 'lecture' | 'lab' | 'both',
                        building: formData.building,
                    };
                }
                return r;
            });

            updateRooms(updatedRooms);
            setIsEditDialogOpen(false);
            setSelectedRoom(null);
            toast.success('Room updated successfully!');
        }
    };

    const handleDeleteRoom = (roomId: string) => {
        const updatedRooms = rooms.filter(r => r.id !== roomId);
        updateRooms(updatedRooms);
        toast.success('Room deleted successfully!');
        if (selectedRooms.includes(roomId)) {
            setSelectedRooms(selectedRooms.filter(id => id !== roomId));
        }
    };

    const handleBulkDelete = () => {
        const updatedRooms = rooms.filter(r => !selectedRooms.includes(r.id));
        updateRooms(updatedRooms);
        setSelectedRooms([]);
        toast.success(`${selectedRooms.length} rooms deleted successfully!`);
    };

    const toggleSelectRoom = (roomId: string) => {
        if (selectedRooms.includes(roomId)) {
            setSelectedRooms(selectedRooms.filter(id => id !== roomId));
        } else {
            setSelectedRooms([...selectedRooms, roomId]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedRooms.length === filteredRooms.length) {
            setSelectedRooms([]);
        } else {
            setSelectedRooms(filteredRooms.map(r => r.id));
        }
    };

    const openEditDialog = (room: Room) => {
        setSelectedRoom(room);
        setFormData({
            name: room.name,
            capacity: room.capacity,
            type: room.type,
            building: room.building || "Main Block",
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
                        <h2 className="text-slate-800 dark:text-slate-100 mb-2">Room Management</h2>
                        <p className="text-slate-500 dark:text-slate-400">Manage classrooms and labs</p>
                    </div>
                    <div className="flex gap-2">
                        {selectedRooms.length > 0 && (
                            <Button
                                variant="destructive"
                                onClick={handleBulkDelete}
                                className="rounded-xl shadow-lg shadow-red-500/30"
                            >
                                Delete Selected ({selectedRooms.length})
                            </Button>
                        )}
                        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/30">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add New Room
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Add New Room</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div>
                                        <Label>Room Name</Label>
                                        <Input
                                            placeholder="e.g., Room 101"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="mt-2"
                                        />
                                    </div>
                                    <div>
                                        <Label>Capacity</Label>
                                        <Input
                                            type="number"
                                            value={formData.capacity}
                                            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                                            className="mt-2"
                                        />
                                    </div>
                                    <div>
                                        <Label>Type</Label>
                                        <Select value={formData.type} onValueChange={(value: string) => setFormData({ ...formData, type: value })}>
                                            <SelectTrigger className="mt-2">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="lecture">Lecture Hall</SelectItem>
                                                <SelectItem value="lab">Laboratory</SelectItem>
                                                <SelectItem value="both">Multi-purpose</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Building</Label>
                                        <Input
                                            placeholder="e.g., Main Block"
                                            value={formData.building}
                                            onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                                            className="mt-2"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={handleAddRoom} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                                        Add Room
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
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <input
                            type="checkbox"
                            checked={selectedRooms.length === filteredRooms.length && filteredRooms.length > 0}
                            onChange={toggleSelectAll}
                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-600 dark:text-slate-300">Select All</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 flex-1 w-full md:w-auto">
                        <div className="relative col-span-2">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <Input
                                placeholder="Search rooms by name or building..."
                                className="pl-10 rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                                <SelectValue placeholder="Room Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="lecture">Lecture Hall</SelectItem>
                                <SelectItem value="lab">Laboratory</SelectItem>
                                <SelectItem value="both">Multi-purpose</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </motion.div>

            {/* Rooms Grid */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                {filteredRooms.length === 0 && (
                    <div className="col-span-3 text-center py-12">
                        <p className="text-slate-500 dark:text-slate-400">No rooms found. Add one to get started!</p>
                    </div>
                )}

                {filteredRooms.map((room, index) => (
                    <motion.div
                        key={room.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className={`group bg-white dark:bg-slate-800 rounded-2xl border p-6 hover:shadow-lg transition-all duration-300 relative ${selectedRooms.includes(room.id)
                                ? 'border-blue-500 ring-1 ring-blue-500'
                                : 'border-slate-200/60 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                    >
                        <div className="absolute top-4 right-4 z-10">
                            <input
                                type="checkbox"
                                checked={selectedRooms.includes(room.id)}
                                onChange={() => toggleSelectRoom(room.id)}
                                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold ${room.type === 'lab' ? 'bg-gradient-to-br from-purple-500 to-pink-600' : 'bg-gradient-to-br from-blue-500 to-cyan-600'
                                    }`}>
                                    {room.type === 'lab' ? <Users className="w-5 h-5" /> : <Building className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h3 className="text-slate-800 dark:text-slate-100 font-medium">{room.name}</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{room.type}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 mb-4">
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                <MapPin className="w-4 h-4 text-blue-500" />
                                <span className="text-sm">{room.building}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                <Users className="w-4 h-4 text-violet-500" />
                                <span className="text-sm">Capacity: {room.capacity}</span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1 rounded-xl border-slate-200 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                                onClick={() => openEditDialog(room)}
                            >
                                Edit
                            </Button>
                            <Button
                                variant="destructive"
                                className="flex-1 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                                onClick={() => handleDeleteRoom(room.id)}
                            >
                                Delete
                            </Button>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Room</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Room Name</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <Label>Capacity</Label>
                            <Input
                                type="number"
                                value={formData.capacity}
                                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <Label>Type</Label>
                            <Select value={formData.type} onValueChange={(value: string) => setFormData({ ...formData, type: value })}>
                                <SelectTrigger className="mt-2">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="lecture">Lecture Hall</SelectItem>
                                    <SelectItem value="lab">Laboratory</SelectItem>
                                    <SelectItem value="both">Multi-purpose</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Building</Label>
                            <Input
                                value={formData.building}
                                onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                                className="mt-2"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleEditRoom} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
