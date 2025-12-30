const SYSTEM_PROMPT = `
You are an intelligent assistant for a University Timetable Management System.
Your role is to help the user manage their timetable data (Departments, Rooms, Faculty, Courses) and answer questions about the system.

IMPORTANT: The system is DEPARTMENT-BASED:
- Departments exist (e.g., BS-CS, BS-SE, BS-AI)
- Each course belongs to a specific department
- Each faculty member belongs to a department
- When creating courses, you MUST specify which department they belong to
- Courses are NOT shared across departments - each department has its own curriculum

RESPONSE FORMATTING:
- When displaying lists of data (courses, faculty, etc.), ALWAYS use markdown tables
- Example table format:
  | Course Code | Name | Credits |
  |-------------|------|---------|
  | CS101 | Programming | 3 |
  | CS102 | Data Structures | 3 |
- Use **bold** for emphasis
- Keep responses clean and professional
- Avoid excessive use of asterisks or special characters

You have the ability to EXECUTE ACTIONS by outputting specific command blocks.
When the user asks to create or add data, you MUST output the corresponding command in a code block.

Supported Commands:
1. Create Room:
   \`\`\`
   create room [Name] [Capacity] [Type: lecture/lab/both]
   \`\`\`

2. Add Faculty:
   \`\`\`
   add faculty "[Name]" [Initials] [Department]
   \`\`\`

3. Add Course (MUST include department and semester):
   \`\`\`
   add course [Code] "[Name]" [Credits] [Department] [Semester]
   \`\`\`
   Example: add course "CS101" "Programming Fundamentals" 3 "BS-CS" "1"

4. Bulk Actions (JSON):
   You can create multiple items at once by outputting a JSON block.
   \`\`\`json
   {
     "action": "bulk_create",
     "type": "faculty", // or "course", "room", "allotment"
     "data": [
       // For Faculty: { "name": "John Doe", "initials": "JD", "department": "CS" }
       // For Course: { "code": "CS101", "name": "Programming", "credits": 3, "department": "BS-CS", "semester": "1" }
       // For Allotment: { "courseCode": "CS101", "facultyInitials": "JD", "classIds": ["BSCS-1A"], "roomName": "R12" }
     ]
   }
   \`\`\`

5. Create Allotment (with REQUIRED room assignment):
   \`\`\`
   create allotment [CourseCode] [FacultyInitials] [ClassID] [RoomName]
   \`\`\`
   Example: create allotment CS101 JD BSCS-1A R12
   NOTE: You MUST always assign a room when creating allotments. Choose an appropriate room based on course type (lecture/lab).

RULES:
1. ALWAYS check which departments exist before creating courses
2. When user asks to create courses for a specific department/semester, check if those courses already exist
3. When showing data to user, use clean markdown tables
4. Focus on timetable management, but you CAN answer questions about the conversation history
5. If the user asks about unrelated topics, politely refuse
6. When asked to create data, ALWAYS use the command format above
7. For multiple items, PREFER the JSON format
8. Be concise and helpful
`;

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export const geminiService = {
    async sendMessage(message: string, history: ChatMessage[], apiKey: string, dataContext?: string) {
        try {
            // Convert history to Gemini format
            const historyParts = history.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            }));

            // Ensure turn order is respected (User -> Model -> User -> Model)
            // We start with System (User) -> Ack (Model)
            // If history starts with Model (Greeting), we need a dummy User message before it.
            let finalHistory = historyParts;
            if (historyParts.length > 0 && historyParts[0].role === 'model') {
                finalHistory = [
                    { role: 'user', parts: [{ text: "Start conversation." }] },
                    ...historyParts
                ];
            }

            const effectiveSystemPrompt = dataContext
                ? `${SYSTEM_PROMPT}\n\nCURRENT SYSTEM DATA:\n${dataContext}`
                : SYSTEM_PROMPT;

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        contents: [
                            { role: "user", parts: [{ text: effectiveSystemPrompt }] },
                            { role: "model", parts: [{ text: "Understood. I have access to the current system data and am ready to assist." }] },
                            ...finalHistory,
                            { role: "user", parts: [{ text: message }] }
                        ],
                        generationConfig: {
                            temperature: 0.7,
                        }
                    }),
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Gemini API Error Response:", response.status, errorText);
                let errorMessage = "Failed to fetch response";
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error?.message || errorMessage;
                } catch (e) {
                    errorMessage = errorText || errorMessage;
                }
                throw new Error(`API Error (${response.status}): ${errorMessage}`);
            }

            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
        } catch (error) {
            console.error("Gemini API Error:", error);
            throw error;
        }
    }
};
