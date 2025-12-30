import { Header } from "./components/Header";
import { SplashScreen } from "./components/SplashScreen";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/pages/Dashboard";
import { CourseOffering } from "./components/pages/CourseOffering";
import { CourseAllotment } from "./components/pages/CourseAllotment";
import { Timetable } from "./components/pages/Timetable";
import { Settings } from "./components/pages/Settings";
import { DataManagement } from "./components/pages/DataManagement";
import { FacultyManagement } from "./components/pages/FacultyManagement";
import { RoomManagement } from "./components/pages/RoomManagement";
import { Departments } from "./components/pages/Departments";
import EditTimetable from "./components/pages/EditTimetable";
import { Toaster } from "./components/ui/sonner";
import { Agent } from "./components/pages/Agent";
import { Conflicts } from "./components/pages/Conflicts";
import { useState, createContext, useContext, useEffect } from "react";
import { useTimetableStore } from "./stores/timetableStore";

type PageType = "Dashboard" | "Course Offering" | "Faculty Management" | "Room Management" | "Course Allotment" | "Timetable" | "Edit Timetable" | "Settings" | "Data Management" | "Agent" | "Departments" | "Semesters" | "Conflicts";

interface AppSettings {
  compactMode: boolean;
}

interface AppContextType {
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return context;
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activePage, setActivePage] = useState<PageType>("Dashboard");
  const [settings, setSettings] = useState<AppSettings>({
    compactMode: false,
  });
  const { fetchData } = useTimetableStore();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const renderPage = () => {
    switch (activePage) {
      case "Dashboard":
        return <Dashboard onPageChange={setActivePage} />;
      case "Course Offering":
        return <CourseOffering />;
      case "Faculty Management":
        return <FacultyManagement />;
      case "Room Management":
        return <RoomManagement />;
      case "Course Allotment":
        return <CourseAllotment />;
      case "Timetable":
        return <Timetable />;
      case "Edit Timetable":
        return <EditTimetable />;
      case "Data Management":
        return <DataManagement />;
      case "Settings":
        return <Settings />;
      case "Agent":
        return <Agent />;
      case "Departments":
        return <Departments />;
      case "Conflicts":
        return <Conflicts onPageChange={setActivePage} />;
      default:
        return <Dashboard />;
    }
  };

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <AppContext.Provider value={{ settings, updateSettings }}>
      <div
        className="min-h-screen transition-colors duration-300"
        style={{ background: "var(--app-bg)" }}
      >
        <Header />

        <div className="flex">
          <Sidebar activePage={activePage} onPageChange={setActivePage} />

          <main className={`flex-1 ${settings.compactMode ? 'p-4' : 'p-8'} ml-64 pt-24`}>
            {renderPage()}
          </main>
        </div>
        <Toaster position="top-right" />
      </div>
    </AppContext.Provider>
  );
}
