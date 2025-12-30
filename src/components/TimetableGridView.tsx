import { TimetableEntry } from "../types/timetable.types";

interface TimetableGridViewProps {
    entries: TimetableEntry[];
    className?: string;
}

const TIME_SLOTS = [
    { start: "09:00", end: "10:30", label: "09:00-10:30" },
    { start: "10:30", end: "12:00", label: "10:30-12:00" },
    { start: "12:00", end: "13:00", label: "12:00-13:00" },
    { start: "13:00", end: "14:30", label: "13:00-14:30" },
    { start: "14:00", end: "15:30", label: "14:00-15:30" },
    { start: "15:30", end: "17:00", label: "15:30-17:00" },
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// Color mapping for different course types
const getCourseColor = (courseName: string) => {
    if (courseName.includes("Operating Systems") || courseName.includes("Database Systems")) {
        return "bg-blue-100 text-blue-900";
    } else if (courseName.includes("OOP") || courseName.includes("Database Lab")) {
        return "bg-purple-100 text-purple-900";
    } else if (courseName.includes("Computer Networks") || courseName.includes("Web Engineering") || courseName.includes("Data Structures")) {
        return "bg-pink-100 text-pink-900";
    }
    return "bg-slate-100 text-slate-900";
};

export function TimetableGridView({ entries, className = "" }: TimetableGridViewProps) {
    // Create a map of entries by day and time slot
    const getEntryForSlot = (day: string, timeSlot: typeof TIME_SLOTS[0]) => {
        return entries.find(
            (entry) =>
                entry.timeSlot.day === day &&
                entry.timeSlot.startTime === timeSlot.start
        );
    };

    return (
        <div className={`bg-white p-8 ${className}`} style={{ width: '1200px' }}>
            <style>{`
        .timetable-export * {
          outline: none !important;
          border: none !important;
        }
        .timetable-export h2 {
          outline: none !important;
          border: none !important;
        }
        .timetable-export table {
          outline: none !important;
          border: none !important;
        }
        .timetable-export th,
        .timetable-export td {
          outline: none !important;
        }
        .timetable-export .header-border {
          border-bottom: 2px solid rgb(226 232 240) !important;
        }
        .timetable-export .row-border {
          border-bottom: 1px solid rgb(241 245 249) !important;
        }
      `}</style>

            <div className="timetable-export">
                <h2 className="text-2xl font-semibold text-slate-800 mb-6">
                    Weekly Timetable
                </h2>

                <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: '0' }}>
                    <thead>
                        <tr>
                            <th className="bg-slate-50 p-4 text-sm font-semibold text-slate-700 w-32 header-border">
                                Time
                            </th>
                            {DAYS.map((day) => (
                                <th
                                    key={day}
                                    className="bg-slate-50 p-4 text-sm font-semibold text-slate-700 header-border"
                                >
                                    {day}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {TIME_SLOTS.map((slot, index) => (
                            <tr key={slot.label}>
                                <td className={`bg-slate-50 p-4 text-xs font-medium text-slate-600 text-center align-middle ${index < TIME_SLOTS.length - 1 ? 'row-border' : ''}`}>
                                    {slot.label}
                                </td>
                                {DAYS.map((day) => {
                                    const entry = getEntryForSlot(day, slot);
                                    return (
                                        <td
                                            key={`${day}-${slot.label}`}
                                            className={`p-3 align-top ${index < TIME_SLOTS.length - 1 ? 'row-border' : ''}`}
                                        >
                                            {entry ? (
                                                <div className={`${getCourseColor(entry.courseName)} rounded-lg p-4 h-full min-h-[100px]`}>
                                                    <div className="font-semibold text-sm mb-2 leading-tight">
                                                        {entry.courseName}
                                                    </div>
                                                    <div className="text-xs mb-2 leading-tight">
                                                        {entry.facultyName}
                                                    </div>
                                                    <div className="text-xs">
                                                        📍 {entry.courseCode} • 🏛️ {entry.roomName}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="h-[100px]"></div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
