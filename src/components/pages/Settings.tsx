import { motion } from "motion/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { User, Lock, Palette, Globe, Save, Bot, Bug } from "lucide-react";
import { useState } from "react";
import { useAppContext } from "../../App";
import { toast } from "sonner";
import { themes, useTheme, type Theme } from "../../context/ThemeContext";
import { useTimetableStore } from "../../stores/timetableStore";

export function Settings() {
  const { settings, updateSettings } = useAppContext();
  const { currentTheme, setTheme } = useTheme();
  const { debugMode, toggleDebugMode } = useTimetableStore();
  const [profileData, setProfileData] = useState({
    firstName: "Ali",
    lastName: "Ahmed",
    email: "ali@maju.edu.pk",
    phone: "+92 300 1234567",
  });

  const [regionSettings, setRegionSettings] = useState({
    language: "English (US)",
    timezone: "PKT (UTC+5)",
    dateFormat: "DD/MM/YYYY",
  });

  const [apiKey, setApiKey] = useState(localStorage.getItem("gemini_api_key") || "");

  const handleSaveProfile = () => {
    toast.success("Profile information updated successfully!");
  };

  const handleSaveAll = () => {
    toast.success("All changes saved successfully!");
  };

  return (
    <>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h2 className="text-slate-800 dark:text-slate-100 mb-2">Settings</h2>
        <p className="text-slate-500 dark:text-slate-400">Manage your account and system preferences</p>
      </motion.div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="col-span-2 space-y-6">
          {/* Profile Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-slate-800 dark:text-slate-100">Profile Information</h3>
            </div>

            <div className="flex items-center gap-6 mb-6 p-6 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <Avatar className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600">
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xl">
                  DA
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-slate-800 dark:text-slate-100 mb-1">Dr. Ali</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{profileData.email}</p>
                <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 border">
                  Administrator
                </Badge>
              </div>
              <Button variant="outline" className="rounded-xl border-slate-200 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                Change Photo
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-600 dark:text-slate-300 mb-2 block">First Name</Label>
                  <Input
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  />
                </div>
                <div>
                  <Label className="text-slate-600 mb-2 block">Last Name</Label>
                  <Input
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    className="rounded-xl border-slate-200"
                  />
                </div>
              </div>
              <div>
                <Label className="text-slate-600 mb-2 block">Email Address</Label>
                <Input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="rounded-xl border-slate-200"
                />
              </div>
              <div>
                <Label className="text-slate-600 mb-2 block">Phone Number</Label>
                <Input
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="rounded-xl border-slate-200"
                />
              </div>
              <Button
                onClick={handleSaveProfile}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl"
              >
                Update Profile
              </Button>
            </div>
          </motion.div>

          {/* Security Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <Lock className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <h3 className="text-slate-800 dark:text-slate-100">Security</h3>
            </div>

            <div className="space-y-4">
              <div className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="font-medium text-slate-800 dark:text-slate-100">AI Agent Configuration</h4>
                </div>
                <Label className="text-slate-600 mb-2 block">Gemini API Key</Label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Enter your Gemini API Key"
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      localStorage.setItem("gemini_api_key", e.target.value);
                    }}
                    className="rounded-xl border-slate-200"
                  />
                  <Button
                    onClick={() => toast.success("API Key saved!")}
                    className="bg-slate-900 text-white rounded-xl"
                  >
                    Save
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Required for the Agent tab. Get a free key from Google AI Studio.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Appearance Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Palette className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-slate-800 dark:text-slate-100">Appearance</h3>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-slate-800 dark:text-slate-100 mb-4 font-medium">Theme</p>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(themes).map(([key, theme]) => (
                    <button
                      key={key}
                      onClick={() => setTheme(key as Theme)}
                      className={`
                        relative flex flex-col items-center gap-2 p-2 rounded-xl border-2 transition-all
                        ${currentTheme === key
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                        }
                      `}
                    >
                      <div className="flex w-full aspect-video rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                        {/* Sidebar Preview */}
                        <div
                          className="w-1/3 h-full"
                          style={{ background: theme.colors["--sidebar-bg"] }}
                        />
                        {/* Content Preview */}
                        <div className="flex-1 h-full bg-white dark:bg-slate-900 flex flex-col">
                          <div
                            className="h-3 w-full border-b"
                            style={{
                              background: theme.colors["--header-bg"],
                              borderColor: theme.colors["--border-color"]
                            }}
                          />
                          <div className="flex-1 bg-slate-50 dark:bg-slate-800/50" />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {theme.name}
                      </span>
                      {currentTheme === key && (
                        <div className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
                <div>
                  <p className="text-slate-800 dark:text-slate-100 mb-1">Compact View</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Reduce spacing and padding</p>
                </div>
                <Switch
                  checked={settings.compactMode}
                  onCheckedChange={(checked: boolean) => {
                    updateSettings({ compactMode: checked });
                    toast.success(checked ? "Compact mode enabled" : "Compact mode disabled");
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Bug className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <p className="text-slate-800 dark:text-slate-100 font-medium">Debug Mode</p>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Enable comprehensive diagnostics tab</p>
                </div>
                <Switch
                  checked={debugMode}
                  onCheckedChange={() => {
                    toggleDebugMode();
                    toast.success(debugMode ? "Debug mode disabled" : "Debug mode enabled");
                  }}
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Sidebar Settings */}
        <div className="space-y-6">
          {/* Language & Region */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/30">
                <Globe className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="text-slate-800 dark:text-slate-100">Language & Region</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-slate-600 mb-2 block text-sm">Language</Label>
                <Input
                  value={regionSettings.language}
                  onChange={(e) => setRegionSettings({ ...regionSettings, language: e.target.value })}
                  className="rounded-xl border-slate-200"
                />
              </div>
              <div>
                <Label className="text-slate-600 mb-2 block text-sm">Time Zone</Label>
                <Input
                  value={regionSettings.timezone}
                  onChange={(e) => setRegionSettings({ ...regionSettings, timezone: e.target.value })}
                  className="rounded-xl border-slate-200"
                />
              </div>
              <div>
                <Label className="text-slate-600 mb-2 block text-sm">Date Format</Label>
                <Input
                  value={regionSettings.dateFormat}
                  onChange={(e) => setRegionSettings({ ...regionSettings, dateFormat: e.target.value })}
                  className="rounded-xl border-slate-200"
                />
              </div>
            </div>
          </motion.div>

          {/* Save Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button
              onClick={handleSaveAll}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/30"
            >
              <Save className="w-4 h-4 mr-2" />
              Save All Changes
            </Button>
          </motion.div>
        </div>
      </div>
    </>
  );
}
