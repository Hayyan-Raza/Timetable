import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Clock, MapPin, User, Filter, Download } from "lucide-react";

interface TimetableEntry {
  semester: string;
  class: string;
  course: string;
  faculty: string;
  day: string;
  startTime: string;
  endTime: string;
  room: string;
}

interface TimetableCardProps {
  timetableData: TimetableEntry[];
}

const dayColors: { [key: string]: string } = {
  Monday: "bg-blue-100 text-blue-700 border-blue-200",
  Tuesday: "bg-purple-100 text-purple-700 border-purple-200",
  Wednesday: "bg-amber-100 text-amber-700 border-amber-200",
  Thursday: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Friday: "bg-rose-100 text-rose-700 border-rose-200",
};

export function TimetableCard({ timetableData }: TimetableCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-200/60 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-slate-800 mb-1">Generated Timetable</h2>
            <p className="text-sm text-slate-500">Fall 2025 Academic Schedule</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="rounded-xl border-slate-200 hover:bg-slate-50">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-2">Department</label>
            <Select defaultValue="cs">
              <SelectTrigger className="bg-white border-slate-200 rounded-xl hover:border-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cs">Computer Science (CS)</SelectItem>
                <SelectItem value="se">Software Engineering (SE)</SelectItem>
                <SelectItem value="ai">Artificial Intelligence (AI)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm text-slate-600 mb-2">Semester</label>
            <Select defaultValue="fall2025">
              <SelectTrigger className="bg-white border-slate-200 rounded-xl hover:border-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fall2025">Fall 2025</SelectItem>
                <SelectItem value="spring2025">Spring 2025</SelectItem>
                <SelectItem value="summer2025">Summer 2025</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm text-slate-600 mb-2">Class</label>
            <Select defaultValue="bcs3a">
              <SelectTrigger className="bg-white border-slate-200 rounded-xl hover:border-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bcs3a">BCS-3A</SelectItem>
                <SelectItem value="bcs3b">BCS-3B</SelectItem>
                <SelectItem value="bse4b">BSE-4B</SelectItem>
                <SelectItem value="bai2a">BAI-2A</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-end">
            <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/20">
              Generate Timetable
            </Button>
          </div>
        </div>
      </div>
      
      {/* Timetable Cards Grid */}
      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {timetableData.map((entry, index) => (
            <div
              key={index}
              className="group relative bg-gradient-to-br from-slate-50 to-white rounded-xl p-5 border border-slate-200/60 hover:border-slate-300 hover:shadow-lg transition-all duration-300"
            >
              {/* Top Section */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-slate-800 mb-1">{entry.course}</h3>
                  <p className="text-sm text-slate-500">{entry.class}</p>
                </div>
                <Badge className={`${dayColors[entry.day]} border`}>
                  {entry.day}
                </Badge>
              </div>
              
              {/* Details */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-slate-600">
                  <div className="p-1.5 rounded-lg bg-blue-50">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <span className="text-sm">{entry.faculty}</span>
                </div>
                
                <div className="flex items-center gap-2 text-slate-600">
                  <div className="p-1.5 rounded-lg bg-violet-50">
                    <Clock className="w-3.5 h-3.5 text-violet-600" />
                  </div>
                  <span className="text-sm">{entry.startTime} - {entry.endTime}</span>
                </div>
                
                <div className="flex items-center gap-2 text-slate-600">
                  <div className="p-1.5 rounded-lg bg-amber-50">
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <span className="text-sm">Room {entry.room}</span>
                </div>
              </div>
              
              {/* Hover Effect Border */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/0 to-indigo-500/0 group-hover:from-blue-500/5 group-hover:to-indigo-500/5 transition-all duration-300 pointer-events-none"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
