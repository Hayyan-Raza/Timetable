import { motion } from "motion/react";
import { Button } from "../ui/button";
import { useState, useRef, useEffect } from "react";
import { Bot, Send, User, Trash2, AlertCircle } from "lucide-react";
import { useTimetableStore } from "../../stores/timetableStore";
import { toast } from "sonner";
import { Room, Faculty, Course } from "../../types/timetable.types";
import { geminiService } from "../../services/geminiService";
import { Markdown } from "../ui/markdown";

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export function Agent() {
    const { rooms, faculty, courses, allotments, departments, updateRooms, updateFaculty, updateCourses, updateAllotments } = useTimetableStore();
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>(() => {
        const saved = localStorage.getItem("agent_chat_history");
        return saved ? JSON.parse(saved) : [
            {
                id: '1',
                role: 'assistant',
                content: "Hello! I'm your Timetable Assistant. I can help you create rooms, faculty, and courses. Just ask me! (Make sure you've set your API Key in Settings)",
                timestamp: new Date()
            }
        ];
    });
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
        localStorage.setItem("agent_chat_history", JSON.stringify(messages));
    }, [messages]);

    const executeCommands = (text: string) => {
        let processedCount = 0;

        // 1. Try to parse JSON blocks for bulk actions
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            try {
                const data = JSON.parse(jsonMatch[1]);
                if (data.action === 'bulk_create') {
                    if (data.type === 'faculty') {
                        const newFaculty = data.data.map((f: any) => ({
                            id: `fac-${Date.now()}-${Math.random()}`,
                            name: f.name,
                            initials: f.initials,
                            department: f.department,
                            maxWeeklyHours: 12
                        }));
                        updateFaculty([...faculty, ...newFaculty]);
                        processedCount += newFaculty.length;
                    } else if (data.type === 'course') {
                        const newCourses = data.data.map((c: any) => ({
                            id: `course-${Date.now()}-${Math.random()}`,
                            code: c.code,
                            name: c.name,
                            credits: parseInt(c.credits),
                            department: c.department || 'BS-CS',
                            semester: c.semester || '1',
                            type: c.type || 'Core',
                            requiresLab: c.requiresLab || false,
                            estimatedStudents: c.estimatedStudents || 50
                        }));
                        updateCourses([...courses, ...newCourses]);
                        processedCount += newCourses.length;
                    } else if (data.type === 'room') {
                        const newRooms = data.data.map((r: any) => ({
                            id: `room-${Date.now()}-${Math.random()}`,
                            name: r.name,
                            capacity: parseInt(r.capacity),
                            type: r.type || 'lecture',
                            building: "Main Block"
                        }));
                        updateRooms([...rooms, ...newRooms]);
                        processedCount += newRooms.length;
                    } else if (data.type === 'allotment') {
                        const newAllotments: any[] = [];
                        data.data.forEach((a: any) => {
                            const course = courses.find(c => c.code.toLowerCase() === a.courseCode.toLowerCase());
                            const fac = faculty.find(f => f.initials.toLowerCase() === a.facultyInitials.toLowerCase());
                            if (course && fac) {
                                newAllotments.push({
                                    courseId: course.id,
                                    facultyId: fac.id,
                                    classIds: [a.classId]
                                });
                            }
                        });
                        if (newAllotments.length > 0) {
                            updateAllotments([...allotments, ...newAllotments]);
                            processedCount += newAllotments.length;
                        }
                    } else if (data.type === 'update_allotment') {
                        // Update allotments
                        const updatedAllotments = allotments.map(a => {
                            const update = data.data.find((u: any) => {
                                const course = courses.find(c => c.code.toLowerCase() === u.courseCode?.toLowerCase());
                                const fac = faculty.find(f => f.initials.toLowerCase() === u.facultyInitials?.toLowerCase());
                                return a.courseId === course?.id && a.facultyId === fac?.id;
                            });
                            if (update) {
                                return {
                                    ...a,
                                    classIds: update.classId ? [update.classId] : a.classIds,
                                    preferredRoomId: update.roomName ? rooms.find(r => r.name === update.roomName)?.id : a.preferredRoomId
                                };
                            }
                            return a;
                        });
                        updateAllotments(updatedAllotments);
                        processedCount += data.data.length;
                    } else if (data.type === 'delete_allotment') {
                        // Delete allotments
                        const filtered = allotments.filter(a => {
                            const course = courses.find(c => c.id === a.courseId);
                            const fac = faculty.find(f => f.id === a.facultyId);
                            return !data.data.some((d: any) =>
                                course?.code.toLowerCase() === d.courseCode?.toLowerCase() &&
                                fac?.initials.toLowerCase() === d.facultyInitials?.toLowerCase()
                            );
                        });
                        processedCount = allotments.length - filtered.length;
                        updateAllotments(filtered);
                    } else if (data.type === 'update_course') {
                        // Update courses
                        const updatedCourses = courses.map(c => {
                            const update = data.data.find((u: any) => u.code?.toLowerCase() === c.code.toLowerCase());
                            if (update) {
                                return { ...c, ...update, id: c.id };
                            }
                            return c;
                        });
                        updateCourses(updatedCourses);
                        processedCount += data.data.length;
                    } else if (data.type === 'delete_course') {
                        const filtered = courses.filter(c =>
                            !data.data.some((d: any) => c.code.toLowerCase() === d.code?.toLowerCase())
                        );
                        processedCount = courses.length - filtered.length;
                        updateCourses(filtered);
                    } else if (data.type === 'update_faculty') {
                        const updatedFaculty = faculty.map(f => {
                            const update = data.data.find((u: any) => u.initials?.toLowerCase() === f.initials.toLowerCase());
                            if (update) {
                                return { ...f, ...update, id: f.id };
                            }
                            return f;
                        });
                        updateFaculty(updatedFaculty);
                        processedCount += data.data.length;
                    } else if (data.type === 'delete_faculty') {
                        const filtered = faculty.filter(f =>
                            !data.data.some((d: any) => f.initials.toLowerCase() === d.initials?.toLowerCase())
                        );
                        processedCount = faculty.length - filtered.length;
                        updateFaculty(filtered);
                    } else if (data.type === 'update_room') {
                        const updatedRooms = rooms.map(r => {
                            const update = data.data.find((u: any) => u.name?.toLowerCase() === r.name.toLowerCase());
                            if (update) {
                                return { ...r, ...update, id: r.id };
                            }
                            return r;
                        });
                        updateRooms(updatedRooms);
                        processedCount += data.data.length;
                    } else if (data.type === 'delete_room') {
                        const filtered = rooms.filter(r =>
                            !data.data.some((d: any) => r.name.toLowerCase() === d.name?.toLowerCase())
                        );
                        processedCount = rooms.length - filtered.length;
                        updateRooms(filtered);
                    }
                }
            } catch (e) {
                console.error("Failed to parse JSON command", e);
            }
        }

        // 2. Process line-by-line commands
        const lines = text.split('\n');
        lines.forEach(line => {
            const lowerLine = line.toLowerCase().trim();
            const cleanLine = lowerLine.replace(/^```/, '').replace(/```$/, '').trim();

            try {
                if (cleanLine.startsWith("create room")) {
                    const parts = cleanLine.split(' ');
                    if (parts.length >= 4) {
                        const name = parts[2];
                        const capacity = parseInt(parts[3]);
                        const type = parts[4] || 'lecture';

                        const newRoom: Room = {
                            id: `room-${Date.now()}-${Math.random()}`,
                            name,
                            capacity,
                            type: type as 'lecture' | 'lab' | 'both',
                            building: "Main Block"
                        };

                        updateRooms([...rooms, newRoom]);
                        processedCount++;
                    }
                }
                else if (cleanLine.startsWith("add faculty")) {
                    const match = line.match(/add faculty "([^"]+)" (\w+) (\w+)/i);
                    if (match) {
                        const [_, name, initials, dept] = match;
                        const newFaculty: Faculty = {
                            id: `fac-${Date.now()}-${Math.random()}`,
                            name,
                            initials,
                            department: dept,
                            maxWeeklyHours: 12
                        };
                        updateFaculty([...faculty, newFaculty]);
                        processedCount++;
                    }
                }
                else if (cleanLine.startsWith("add course")) {
                    // Updated: add course [Code] "[Name]" [Credits] [Department] [Semester]
                    const match = line.match(/add course ([\w-]+) "([^"]+)" (\d+)(?:\s+([\w-]+))?(?:\s+(\d+))?/i);
                    if (match) {
                        const [_, code, name, credits, dept, sem] = match;
                        const newCourse: Course = {
                            id: `course-${Date.now()}-${Math.random()}`,
                            code,
                            name,
                            credits: parseInt(credits),
                            department: dept || 'BS-CS',
                            semester: sem || '1',
                            type: 'Core',
                            requiresLab: false,
                            estimatedStudents: 50
                        };
                        updateCourses([...courses, newCourse]);
                        processedCount++;
                    }
                }
                else if (cleanLine.startsWith("create allotment")) {
                    // create allotment [CourseCode] [FacultyInitials] [ClassID] [RoomName (optional)]
                    const parts = cleanLine.split(' ');
                    if (parts.length >= 4) {
                        const courseCode = parts[2];
                        const facultyInitials = parts[3];
                        const classId = parts[4];
                        const roomName = parts[5]; // Optional

                        // Find IDs
                        const course = courses.find(c => c.code.toLowerCase() === courseCode.toLowerCase());
                        const fac = faculty.find(f => f.initials.toLowerCase() === facultyInitials.toLowerCase());
                        const room = roomName ? rooms.find(r => r.name.toLowerCase() === roomName.toLowerCase()) : null;

                        if (course && fac) {
                            const newAllotment = {
                                courseId: course.id,
                                facultyId: fac.id,
                                classIds: [classId],
                                ...(room ? { preferredRoomId: room.id } : {})
                            };
                            updateAllotments([...allotments, newAllotment]);
                            processedCount++;
                        } else {
                            console.warn(`Could not find course ${courseCode} or faculty ${facultyInitials}`);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to execute command:", line);
            }
        });

        if (processedCount > 0) {
            toast.success(`Executed ${processedCount} actions successfully`);
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim()) return;

        const apiKey = localStorage.getItem("gemini_api_key");
        if (!apiKey) {
            toast.error("Please set your Gemini API Key in Settings first!");
            return;
        }

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");

        // Reset textarea height to normal
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        setIsLoading(true);

        try {
            // Filter out the initial system message if it exists in UI but not needed for API context if we send SYSTEM_PROMPT separately
            // But here we just pass the conversation so far.
            // We exclude the message we just added (userMessage) because we are sending it as the 'message' argument.
            // Actually, let's pass the previous messages as history.
            const history = messages.map(m => ({ role: m.role, content: m.content }));

            // Prepare Data Context
            const dataContext = JSON.stringify({
                departments: departments.map(d => ({ code: d.code, name: d.name })),
                courses: courses.map(c => ({ code: c.code, name: c.name, credits: c.credits, department: c.department, semester: c.semester })),
                faculty: faculty.map(f => ({ name: f.name, initials: f.initials, dept: f.department })),
                rooms: rooms.map(r => ({ name: r.name, capacity: r.capacity, type: r.type })),
                allotments: allotments.map(a => {
                    const c = courses.find(co => co.id === a.courseId);
                    const f = faculty.find(fa => fa.id === a.facultyId);
                    return {
                        course: c?.code || 'Unknown',
                        faculty: f?.initials || 'Unknown',
                        classes: a.classIds
                    };
                })
            }, null, 2);

            const responseText = await geminiService.sendMessage(input, history, apiKey, dataContext);

            // Execute any commands hidden in the response
            executeCommands(responseText);

            // Strip out code blocks for display (keep only the conversational text)
            const cleanResponse = responseText
                .replace(/```json[\s\S]*?```/g, '') // Remove JSON blocks
                .replace(/```[\s\S]*?```/g, '')      // Remove any other code blocks
                .trim();

            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: cleanResponse || "Done! I've processed your request.",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botMessage]);
        } catch (error: any) {
            console.error("Agent Error:", error);
            toast.error("Failed to get response from Agent");
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `Error: ${error.message || "Unknown error occurred"}. \n\nPlease check your API key in Settings and try again.`,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
        // Shift+Enter will naturally create a new line
    };

    return (
        <div className="max-w-3xl mx-auto h-[calc(100vh-6rem)] flex flex-col">
            {/* Minimal Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex items-center justify-between px-4"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-lg text-white shadow-md shadow-violet-500/20">
                        <Bot className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Timetable Assistant</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Powered by Gemini 2.5</p>
                    </div>
                </div>
                <button
                    onClick={() => setMessages([])}
                    className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Clear Chat"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </motion.div>

            {/* Chat Area */}
            <div className="flex-1 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm overflow-hidden flex flex-col relative">

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar scroll-smooth">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                            <Bot className="w-12 h-12 mb-2" />
                            <p>Start a conversation...</p>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={msg.id}
                            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            {/* Avatar */}
                            <div className={`
                                w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm
                                ${msg.role === 'user'
                                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400'}
                            `}>
                                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </div>

                            {/* Message Bubble */}
                            <div className={`
                                max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm
                                ${msg.role === 'user'
                                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-sm'
                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-sm'}
                            `}>
                                {msg.role === 'assistant' ? (
                                    <Markdown content={msg.content} />
                                ) : (
                                    <div className="whitespace-pre-wrap break-words">
                                        {msg.content}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}

                    {isLoading && (
                        <div className="flex items-start gap-3 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                                <Bot className="w-4 h-4 text-violet-600" />
                            </div>
                            <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-slate-200 inline-block">
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-600 text-sm">Thinking</span>
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}      <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-transparent">
                    <div className="relative flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-full border border-slate-200 dark:border-slate-700 shadow-lg shadow-slate-200/20 dark:shadow-black/20">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask me to create a room, faculty, or course..."
                            className="flex-1 border-none shadow-none focus-visible:ring-0 bg-transparent px-4 py-3 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 resize-none max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent"
                            disabled={isLoading}
                            rows={1}
                            style={{
                                minHeight: '2.5rem',
                                maxHeight: '8rem'
                            }}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                            }}
                        />
                        <Button
                            onClick={handleSendMessage}
                            disabled={isLoading || !input.trim()}
                            size="icon"
                            className="rounded-full w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-4 h-4 ml-0.5" />
                        </Button>
                    </div>
                    <div className="text-center mt-2">
                        <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            AI can make mistakes. Check generated data.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
