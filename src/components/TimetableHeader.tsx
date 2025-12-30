import { Badge } from "./ui/badge";

interface TimetableHeaderProps {
    department: string;
    semester: string;
    classId: string;
}

export function TimetableHeader({ department, semester, classId }: TimetableHeaderProps) {
    return (
        <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
            <h3 className="text-xl font-bold text-slate-800 mb-3">Timetable Overview</h3>
            <div className="flex items-center gap-6 text-sm flex-wrap">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-600">Department:</span>
                    <Badge className="bg-blue-600 text-white">
                        {department === "all" ? "All Departments" : department}
                    </Badge>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-600">Semester:</span>
                    <Badge className="bg-purple-600 text-white">
                        {semester === "all" ? "All Semesters" : semester}
                    </Badge>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-600">Class/Section:</span>
                    <Badge className="bg-green-600 text-white">
                        {classId}
                    </Badge>
                </div>
            </div>
        </div>
    );
}
