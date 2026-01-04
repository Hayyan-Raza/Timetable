import { create } from 'zustand';

export interface LogEntry {
    id: string;
    timestamp: Date;
    type: 'log' | 'error' | 'warn' | 'info';
    message: string;
    args: any[];
}

interface LogStore {
    logs: LogEntry[];
    isCapturing: boolean;
    maxLogs: number;
    addLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
    clearLogs: () => void;
    startCapturing: () => void;
    stopCapturing: () => void;
}

export const useLogStore = create<LogStore>((set, get) => ({
    logs: [],
    isCapturing: false,
    maxLogs: 500, // Keep last 500 logs

    addLog: (entry) => {
        const newLog: LogEntry = {
            ...entry,
            id: `${Date.now()}-${Math.random()}`,
            timestamp: new Date(),
        };

        set((state) => {
            const newLogs = [...state.logs, newLog];
            // Keep only the last maxLogs entries
            if (newLogs.length > state.maxLogs) {
                return { logs: newLogs.slice(-state.maxLogs) };
            }
            return { logs: newLogs };
        });
    },

    clearLogs: () => set({ logs: [] }),

    startCapturing: () => {
        if (get().isCapturing) return;

        // Store original console methods
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        const originalInfo = console.info;

        // Override console methods
        console.log = (...args: any[]) => {
            originalLog(...args);
            get().addLog({
                type: 'log',
                message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '),
                args
            });
        };

        console.error = (...args: any[]) => {
            originalError(...args);
            get().addLog({
                type: 'error',
                message: args.map(arg => {
                    if (arg instanceof Error) {
                        return `${arg.name}: ${arg.message}\n${arg.stack}`;
                    }
                    return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
                }).join(' '),
                args
            });
        };

        console.warn = (...args: any[]) => {
            originalWarn(...args);
            get().addLog({
                type: 'warn',
                message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '),
                args
            });
        };

        console.info = (...args: any[]) => {
            originalInfo(...args);
            get().addLog({
                type: 'info',
                message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '),
                args
            });
        };

        // Store originals for restoration
        (window as any).__originalConsole = {
            log: originalLog,
            error: originalError,
            warn: originalWarn,
            info: originalInfo
        };

        set({ isCapturing: true });
    },

    stopCapturing: () => {
        if (!get().isCapturing) return;

        // Restore original console methods
        const originals = (window as any).__originalConsole;
        if (originals) {
            console.log = originals.log;
            console.error = originals.error;
            console.warn = originals.warn;
            console.info = originals.info;
            delete (window as any).__originalConsole;
        }

        set({ isCapturing: false });
    },
}));
