import { ChevronDown, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useAuth } from "../contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function Header() {
  const { user, logout } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

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

          {/* Profile */}
          <div className="pl-6 border-l border-[var(--border-color)]">
            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none" asChild>
                <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 -mr-2 rounded-xl transition-colors">
                  <Avatar className="w-10 h-10 ring-2 ring-blue-100 dark:ring-blue-900 shadow-sm border border-white dark:border-slate-800">
                    <AvatarImage src={user?.picture} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                      {user ? getInitials(user.name) : "GU"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2">
                    <div className="text-left">
                      <p className="text-sm text-[var(--header-fg)] font-medium max-w-[120px] truncate">
                        {user?.name || "Guest User"}
                      </p>
                      <p className="text-xs text-[var(--fg-secondary)]">Administrator</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-[var(--fg-secondary)]" />
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-slate-800 dark:text-slate-100">{user?.name}</p>
                    <p className="text-xs leading-none text-slate-500 dark:text-slate-400">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />
                <DropdownMenuItem
                  className="text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/10 cursor-pointer"
                  onClick={logout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
