import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  Settings,
  Database,
  Users,
  GraduationCap,
  Building,
  Bot,
  Building2,
  AlertTriangle,
  Bug
} from "lucide-react";



interface SidebarProps {
  activePage: string;
  onPageChange: (page: any) => void;
}

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: Bot, label: "Agent" }, // Added Agent here for prominence
  { icon: BookOpen, label: "Course Offering" },
  { icon: Users, label: "Faculty Management" },
  { icon: Building2, label: "Departments" },
  { icon: Building, label: "Room Management" },
  { icon: GraduationCap, label: "Course Allotment" },
  { icon: Calendar, label: "Timetable" },
  { icon: Calendar, label: "Edit Timetable" }, // Using same icon for now
  { icon: AlertTriangle, label: "Conflicts" },
  { icon: Settings, label: "Settings" },
];

import { useTimetableStore } from "../stores/timetableStore";

export function Sidebar({ activePage, onPageChange }: SidebarProps) {
  const entries = useTimetableStore((state) => state.entries);
  const debugMode = useTimetableStore((state) => state.debugMode);

  // Base menu items
  const baseMenuItems = menuItems;

  // Conditionally add Debugging item if debug mode is enabled
  const displayMenuItems = debugMode
    ? [...baseMenuItems.slice(0, -1), { icon: Bug, label: "Debugging" }, baseMenuItems[baseMenuItems.length - 1]]
    : baseMenuItems;

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-64 border-r border-[var(--sidebar-border)] pt-24 px-4 z-40 transition-colors duration-300"
      style={{ background: "var(--sidebar-bg)" }}
    >
      <nav className="space-y-1">
        {displayMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.label;

          return (
            <button
              key={item.label}
              onClick={() => onPageChange(item.label)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                ${isActive
                  ? 'text-[var(--sidebar-active-fg)] shadow-lg'
                  : 'text-[var(--sidebar-fg)] hover:bg-[var(--sidebar-hover)]'
                }
              `}
              style={{
                background: isActive ? "var(--sidebar-active-bg)" : undefined
              }}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-[var(--sidebar-active-fg)]' : ''}`} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Quick Stats */}
      <div className="mt-8 p-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
        <p className="text-sm opacity-90 mb-2">This Week</p>
        <p className="text-2xl mb-1">{entries.length}</p>
        <p className="text-sm opacity-75">Active Sessions</p>
      </div>
    </aside>
  );
}
