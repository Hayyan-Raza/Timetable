// Standard sections for all departments
export const STANDARD_SECTIONS = [
    { code: 'AM', name: 'Section A Morning' },
    { code: 'BM', name: 'Section B Morning' },
    { code: 'CM', name: 'Section C Morning' },
    { code: 'DM', name: 'Section D Morning' },
    { code: 'EM', name: 'Section E Morning' },
    { code: 'FM', name: 'Section F Morning' },
    { code: 'GM', name: 'Section G Morning' },
    { code: 'AW', name: 'Section A Weekend' }
] as const;

// Generate unique ID
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format a section identifier with department and semester context
 * @example formatSectionId("BSSE", "1", "AM") => "BSSE-1-AM"
 */
export function formatSectionId(deptCode: string, semester: string, sectionCode: string): string {
    return `${deptCode}-${semester}-${sectionCode}`;
}

/**
 * Parse a section identifier to extract department, semester, and section code
 * @example parseSectionId("BSSE-1-AM") => { deptCode: "BSSE", semester: "1", sectionCode: "AM" }
 */
export function parseSectionId(sectionId: string): { deptCode: string, semester: string, sectionCode: string } | null {
    const parts = sectionId.split('-');
    if (parts.length < 3) return null;

    // Handle cases like "BS-AI-1-AM" or "BSSE-1-AM"
    // Find the semester number (first numeric part)
    const semesterIndex = parts.findIndex(p => /^\d+$/.test(p));
    if (semesterIndex === -1) return null;

    const deptCode = parts.slice(0, semesterIndex).join('-');
    const semester = parts[semesterIndex];
    const sectionCode = parts.slice(semesterIndex + 1).join('-');

    return { deptCode, semester, sectionCode };
}

/**
 * Get display name for a section
 * @example getSectionDisplayName("BSSE-1-AM") => "Semester 1 - Section A Morning"
 */
export function getSectionDisplayName(sectionId: string): string {
    const parsed = parseSectionId(sectionId);
    if (!parsed) return sectionId;

    const section = STANDARD_SECTIONS.find(s => s.code === parsed.sectionCode);
    const sectionName = section?.name || parsed.sectionCode;

    return `Semester ${parsed.semester} - ${sectionName}`;
}

/**
 * Auto-generate sections for a department
 * Creates 8 standard sections for each semester with department-scoped IDs
 */
export function generateSectionsForDepartment(
    departmentCode: string,
    semesterCount: number = 8
): Section[] {
    const sections: Section[] = [];

    for (let sem = 1; sem <= semesterCount; sem++) {
        STANDARD_SECTIONS.forEach(section => {
            sections.push({
                id: generateId(),
                code: formatSectionId(departmentCode, sem.toString(), section.code), // Use fully qualified ID
                name: section.name,
                semester: sem.toString()
            });
        });
    }

    return sections;
}

export interface Section {
    id: string;
    code: string;
    name: string;
    semester: string;
}
