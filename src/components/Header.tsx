import { Search, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Input } from "./ui/input";

export function Header() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-[var(--border-color)] shadow-sm transition-colors duration-300"
      style={{ background: "var(--header-bg)" }}
    >
      <div className="flex items-center justify-between px-8 py-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-[var(--header-fg)] font-semibold text-lg">Timetable Management System</h1>
            <p className="text-sm text-[var(--fg-secondary)]">Fall 2025 – MAJU</p>
          </div>
        </div>

        {/* Search & Profile */}
        <div className="flex items-center gap-6">
          {/* Search Bar */}
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--fg-secondary)] w-4 h-4" />
            <Input
              type="text"
              placeholder="Search classes, courses, or faculty..."
              className="pl-11 pr-4 py-2.5 bg-[var(--bg-secondary)] border-0 rounded-full focus:bg-[var(--bg-primary)] focus:ring-2 focus:ring-blue-500/20 transition-all text-[var(--fg-primary)] placeholder:text-[var(--fg-secondary)]"
            />
          </div>

          {/* Profile */}
          <div className="flex items-center gap-3 pl-6 border-l border-[var(--border-color)]">
            <Avatar className="w-10 h-10 ring-2 ring-blue-100 dark:ring-blue-900">
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                DA
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <div>
                <p className="text-sm text-[var(--header-fg)] font-medium">Dr. Ali</p>
                <p className="text-xs text-[var(--fg-secondary)]">Administrator</p>
              </div>
              <ChevronDown className="w-4 h-4 text-[var(--fg-secondary)]" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
