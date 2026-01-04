import { useEffect, useRef, useState } from "react";
import { useLogStore } from "../stores/logStore";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Terminal as TerminalIcon, X, Trash2, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

export function ConsoleTerminal() {
    const { logs, isCapturing, startCapturing, stopCapturing, clearLogs } = useLogStore();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const handleCopyLogs = () => {
        const logText = logs.map(log =>
            `[${log.timestamp.toLocaleTimeString()}] [${log.type.toUpperCase()}] ${log.message}`
        ).join('\n');

        navigator.clipboard.writeText(logText);
        setCopied(true);
        toast.success("Logs copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
    };

    const getLogColor = (type: string) => {
        switch (type) {
            case 'error': return 'text-red-400';
            case 'warn': return 'text-yellow-400';
            case 'info': return 'text-blue-400';
            default: return 'text-slate-300';
        }
    };

    const getLogBadgeColor = (type: string) => {
        switch (type) {
            case 'error': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'warn': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'info': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl"
        >
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <div className="flex items-center gap-2">
                        <TerminalIcon className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-mono text-slate-300">Console Output</span>
                    </div>
                    <Badge className={`${isCapturing ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-slate-500/20 text-slate-400 border-slate-500/30'} text-xs`}>
                        {isCapturing ? '● Recording' : '○ Paused'}
                    </Badge>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCopyLogs}
                        disabled={logs.length === 0}
                        className="h-8 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                    >
                        {copied ? (
                            <Check className="w-4 h-4" />
                        ) : (
                            <Copy className="w-4 h-4" />
                        )}
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={clearLogs}
                        disabled={logs.length === 0}
                        className="h-8 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={isCapturing ? stopCapturing : startCapturing}
                        className="h-8 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                    >
                        {isCapturing ? <X className="w-4 h-4" /> : <TerminalIcon className="w-4 h-4" />}
                    </Button>
                </div>
            </div>

            {/* Terminal Body */}
            <div
                ref={scrollRef}
                className="h-96 overflow-y-auto p-4 font-mono text-sm bg-slate-900 custom-scrollbar"
            >
                {logs.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-500">
                        <div className="text-center">
                            <TerminalIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No logs yet</p>
                            <p className="text-xs mt-1">
                                {isCapturing ? 'Waiting for console output...' : 'Click the terminal icon to start capturing'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <AnimatePresence>
                        {logs.map((log) => (
                            <motion.div
                                key={log.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.2 }}
                                className="mb-2 hover:bg-slate-800/30 px-2 py-1 rounded transition-colors"
                            >
                                <div className="flex items-start gap-2">
                                    <span className="text-slate-500 text-xs shrink-0 mt-0.5">
                                        {log.timestamp.toLocaleTimeString()}
                                    </span>
                                    <Badge className={`${getLogBadgeColor(log.type)} text-[10px] uppercase font-bold tracking-wider shrink-0 mt-0.5`}>
                                        {log.type}
                                    </Badge>
                                    <pre className={`${getLogColor(log.type)} flex-1 whitespace-pre-wrap break-words`}>
                                        {log.message}
                                    </pre>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* Terminal Footer with Stats */}
            <div className="px-4 py-2 bg-slate-800 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-4">
                    <span>{logs.length} logs</span>
                    <span className="text-red-400">{logs.filter(l => l.type === 'error').length} errors</span>
                    <span className="text-yellow-400">{logs.filter(l => l.type === 'warn').length} warnings</span>
                </div>
                <span className="font-mono">Press Ctrl+C to copy | Ctrl+L to clear</span>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgb(15 23 42);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgb(51 65 85);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgb(71 85 105);
                }
            `}</style>
        </motion.div>
    );
}
