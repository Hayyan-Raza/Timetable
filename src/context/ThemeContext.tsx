import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "aubergine" | "ochin" | "monument";

interface ThemeColors {
    name: string;
    colors: {
        "--sidebar-bg": string;
        "--sidebar-fg": string;
        "--sidebar-hover": string;
        "--sidebar-active-bg": string;
        "--sidebar-active-fg": string;
        "--sidebar-border": string;
        "--header-bg": string;
        "--header-fg": string;
        "--bg-primary": string;
        "--fg-primary": string;
        "--bg-secondary": string;
        "--fg-secondary": string;
        "--border-color": string;
        "--app-bg": string;
    };
}

export const themes: Record<Theme, ThemeColors> = {
    light: {
        name: "Light",
        colors: {
            "--sidebar-bg": "#ffffff",
            "--sidebar-fg": "#475569", // slate-600
            "--sidebar-hover": "#f1f5f9", // slate-100
            "--sidebar-active-bg": "#e0e7ff", // indigo-100
            "--sidebar-active-fg": "#4338ca", // indigo-700
            "--sidebar-border": "#e2e8f0", // slate-200
            "--header-bg": "rgba(255, 255, 255, 0.9)",
            "--header-fg": "#1e293b", // slate-800
            "--bg-primary": "#ffffff",
            "--fg-primary": "#1e293b", // slate-800
            "--bg-secondary": "#f8fafc", // slate-50
            "--fg-secondary": "#64748b", // slate-500
            "--border-color": "#e2e8f0",
            "--app-bg": "#f8fafc",
        },
    },
    dark: {
        name: "Dark",
        colors: {
            "--sidebar-bg": "#1e293b", // slate-800
            "--sidebar-fg": "#cbd5e1", // slate-300
            "--sidebar-hover": "#334155", // slate-700
            "--sidebar-active-bg": "#334155", // slate-700
            "--sidebar-active-fg": "#ffffff",
            "--sidebar-border": "#334155", // slate-700
            "--header-bg": "rgba(30, 41, 59, 0.9)", // slate-800
            "--header-fg": "#f1f5f9", // slate-100
            "--bg-primary": "#0f172a", // slate-900
            "--fg-primary": "#f1f5f9", // slate-100
            "--bg-secondary": "#1e293b", // slate-800
            "--fg-secondary": "#94a3b8", // slate-400
            "--border-color": "#334155",
            "--app-bg": "#0f172a",
        },
    },
    aubergine: {
        name: "Aubergine",
        colors: {
            "--sidebar-bg": "#3F0E40",
            "--sidebar-fg": "#cfc3cf", // Light grey text
            "--sidebar-hover": "#350d36", // Darker aubergine
            "--sidebar-active-bg": "#1164A3", // Slack blue
            "--sidebar-active-fg": "#ffffff", // White text
            "--sidebar-border": "#5d2c5d", // Lighter aubergine border
            "--header-bg": "#ffffff",
            "--header-fg": "#1e293b",
            "--bg-primary": "#ffffff",
            "--fg-primary": "#1e293b",
            "--bg-secondary": "#f8fafc",
            "--fg-secondary": "#64748b",
            "--border-color": "#e2e8f0",
            "--app-bg": "#f8fafc",
        },
    },
    ochin: {
        name: "Ochin",
        colors: {
            "--sidebar-bg": "#303E4D",
            "--sidebar-fg": "#c0cddb", // Light blue-grey
            "--sidebar-hover": "#455364",
            "--sidebar-active-bg": "#6698c8", // Ochin blue
            "--sidebar-active-fg": "#ffffff",
            "--sidebar-border": "#455364",
            "--header-bg": "#ffffff",
            "--header-fg": "#1e293b",
            "--bg-primary": "#ffffff",
            "--fg-primary": "#1e293b",
            "--bg-secondary": "#f8fafc",
            "--fg-secondary": "#64748b",
            "--border-color": "#e2e8f0",
            "--app-bg": "#f8fafc",
        },
    },
    monument: {
        name: "Monument",
        colors: {
            "--sidebar-bg": "#0D7E83",
            "--sidebar-fg": "#e6f3f3", // Very light teal
            "--sidebar-hover": "#0a6367",
            "--sidebar-active-bg": "#F2C744", // Monument yellow
            "--sidebar-active-fg": "#0D7E83", // Dark teal text on yellow
            "--sidebar-border": "#0a6367",
            "--header-bg": "#ffffff",
            "--header-fg": "#1e293b",
            "--bg-primary": "#ffffff",
            "--fg-primary": "#1e293b",
            "--bg-secondary": "#f8fafc",
            "--fg-secondary": "#64748b",
            "--border-color": "#e2e8f0",
            "--app-bg": "#f8fafc",
        },
    },
};

interface ThemeContextType {
    currentTheme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem("app-theme");
        return (saved as Theme) || "light";
    });

    useEffect(() => {
        const root = document.documentElement;
        const themeColors = themes[currentTheme].colors;

        Object.entries(themeColors).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });

        localStorage.setItem("app-theme", currentTheme);

        // Handle legacy dark mode class for Tailwind
        if (currentTheme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

    }, [currentTheme]);

    return (
        <ThemeContext.Provider value={{ currentTheme, setTheme: setCurrentTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
