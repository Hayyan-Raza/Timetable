import { TimetableEntry, Course, Faculty, Room } from '../types/timetable.types';

/**
 * Exports timetable entries to a CSV file with optional metadata header
 * @param entries - Array of timetable entries to export
 * @param courses - Array of courses for lookup
 * @param faculty - Array of faculty members for lookup
 * @param rooms - Array of rooms for lookup
 * @param metadata - Optional metadata (department, semester, classId) to include as header
 */
export function exportTimetableToCSV(
    entries: TimetableEntry[],
    courses: Course[],
    faculty: Faculty[],
    rooms: Room[],
    metadata?: { department?: string; semester?: string; classId?: string }
): void {
    if (entries.length === 0) {
        alert('No timetable data to export');
        return;
    }

    // Build header section with metadata (as CSV comments)
    const headerLines: string[] = [];
    if (metadata) {
        headerLines.push('# Timetable');
        if (metadata.department) headerLines.push(`# Department: ${metadata.department}`);
        if (metadata.semester) headerLines.push(`# Semester: ${metadata.semester}`);
        if (metadata.classId) headerLines.push(`# Class/Section: ${metadata.classId}`);
        headerLines.push('');  // Empty line
    }

    // Define CSV headers
    const headers = ['Day', 'Time', 'Course Code', 'Course Name', 'Faculty', 'Room', 'Class/Section', 'Department'];

    // Map entries to CSV rows
    const rows = entries.map(entry => {
        const course = courses.find(c => c.id === entry.courseId);
        const fac = faculty.find(f => f.id === entry.facultyId);
        const room = rooms.find(r => r.id === entry.roomId);

        // Format time as "HH:MM-HH:MM"
        const timeStr = entry.timeSlot ?
            `${entry.timeSlot.startTime}-${entry.timeSlot.endTime}` : '';

        return [
            entry.timeSlot?.day || '',
            timeStr,
            course?.code || entry.courseCode || '',
            course?.name || entry.courseName || '',
            fac?.name || entry.facultyName || '',
            room?.name || entry.roomName || '',
            entry.classId || '',
            course?.department || ''
        ];
    });

    // Sort by day and time
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    rows.sort((a, b) => {
        const dayComparison = dayOrder.indexOf(a[0]) - dayOrder.indexOf(b[0]);
        if (dayComparison !== 0) return dayComparison;
        return a[1].localeCompare(b[1]); // Sort by time
    });

    // Generate CSV content with proper escaping
    const csvLines = [
        ...headerLines,
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ];
    const csvContent = csvLines.join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().split('T')[0];
    link.download = `timetable_${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
