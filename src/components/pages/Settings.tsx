import { motion } from "motion/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { User, Lock, Palette, Globe, Save, Bot, Bug, RotateCcw, Upload, Trash2, Download } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAppContext } from "../../App";
import { toast } from "sonner";
import { themes, useTheme, type Theme } from "../../context/ThemeContext";
import { useTimetableStore } from "../../stores/timetableStore";
import { useAuth } from "../../contexts/AuthContext";
import { dataService } from "../../services/dataService";
import { ExternalLink, Database } from "lucide-react";
import { parseCompleteTimetable, downloadSampleCompleteTimetable } from "../../utils/completeTimetableParser";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

export function Settings() {
  const { settings, updateSettings } = useAppContext();
  const { currentTheme, setTheme } = useTheme();
  const { debugMode, toggleDebugMode, resetToDefaults, clearAllData, importCompleteTimetable } = useTimetableStore();
  const { user } = useAuth();

  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "+92 300 1234567", // Placeholder
  });

  useEffect(() => {
    if (user) {
      const nameParts = user.name.split(" ");
      setProfileData(prev => ({
        ...prev,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        email: user.email,
      }));
    }
  }, [user]);

  const [regionSettings, setRegionSettings] = useState({
    language: "English (US)",
    timezone: "PKT (UTC+5)",
    dateFormat: "DD/MM/YYYY",
  });

  const [apiKey, setApiKey] = useState(localStorage.getItem("gemini_api_key") || "");

  // Data Management State
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveProfile = () => {
    toast.success("Profile information updated successfully!");
  };

  const handleSaveAll = () => {
    toast.success("All changes saved successfully!");
  };

  // Data Management Handlers
  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all data to defaults? This cannot be undone.')) {
      try {
        await resetToDefaults();
        toast.success('Data reset to defaults successfully!');
      } catch (error) {
        toast.error('Failed to reset data');
      }
    }
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to DELETE ALL DATA? This cannot be undone.')) {
      try {
        await clearAllData();
        toast.success('All data cleared successfully!');
      } catch (error) {
        toast.error('Failed to clear data');
      }
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await parseCompleteTimetable(file);

      if (!result.success) {
        toast.error('Failed to parse CSV file');
        console.error('Parse errors:', result.errors);
        return;
      }

      setImportPreview(result);
      setIsImportDialogOpen(true);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to read CSV file');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview?.data) return;

    setImporting(true);
    try {
      await importCompleteTimetable(importPreview.data);
      toast.success(`Successfully imported ${importPreview.summary.coursesCount} courses, ${importPreview.summary.facultyCount} faculty, ${importPreview.summary.roomsCount} rooms, and ${importPreview.summary.allotmentsCount} allotments!`);
      setIsImportDialogOpen(false);
      setImportPreview(null);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import data');
    } finally {
      setImporting(false);
    }
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
              <Avatar className="w-20 h-20 border-4 border-white dark:border-slate-600 shadow-md">
                <AvatarImage src={user?.picture} />
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xl">
                  {profileData.firstName[0]}{profileData.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-slate-800 dark:text-slate-100 mb-1 text-xl font-semibold">
                  {user?.name || "Guest User"}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{profileData.email}</p>
                <div className="flex gap-2">
                  <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 border">
                    Administrator
                  </Badge>
                  <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                    Synced with Google
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-600 dark:text-slate-300 mb-2 block">First Name</Label>
                  <Input
                    value={profileData.firstName}
                    readOnly
                    className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 opacity-70 cursor-not-allowed"
                  />
                </div>
                <div>
                  <Label className="text-slate-600 dark:text-slate-300 mb-2 block">Last Name</Label>
                  <Input
                    value={profileData.lastName}
                    readOnly
                    className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 opacity-70 cursor-not-allowed"
                  />
                </div>
              </div>
              <div>
                <Label className="text-slate-600 dark:text-slate-300 mb-2 block">Email Address</Label>
                <Input
                  type="email"
                  value={profileData.email}
                  readOnly
                  className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 opacity-70 cursor-not-allowed"
                />
              </div>
              <div>
                <Label className="text-slate-600 dark:text-slate-300 mb-2 block">Phone Number</Label>
                <Input
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
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
                <Label className="text-slate-600 dark:text-slate-300 mb-2 block">Gemini API Key</Label>
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

          {/* Data Management Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Database className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-slate-800 dark:text-slate-100">Data Management</h3>
            </div>

            <div className="space-y-6">
              {/* Google Sheets Link */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-800 dark:text-slate-100 mb-1">Google Sheets Database</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">View and edit your raw data directly in Google Sheets</p>
                  </div>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      const url = dataService.getSpreadsheetUrl();
                      if (url) window.open(url, "_blank");
                      else toast.error("Spreadsheet not connected yet");
                    }}
                  >
                    Open Sheet
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Import / Export</Label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept=".csv"
                      style={{ display: 'none' }}
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="w-full justify-start border-blue-200 hover:bg-blue-50 text-blue-700 dark:border-blue-800 dark:hover:bg-blue-900/30 dark:text-blue-300"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Import from CSV
                    </Button>
                    <Button
                      onClick={downloadSampleCompleteTimetable}
                      variant="outline"
                      className="w-full justify-start border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Sample CSV
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Danger Zone</Label>
                  <div className="space-y-2">
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      className="w-full justify-start border-orange-200 hover:bg-orange-50 text-orange-700 dark:border-orange-900/50 dark:hover:bg-orange-900/20 dark:text-orange-400"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset to Defaults
                    </Button>
                    <Button
                      onClick={handleClearAll}
                      variant="outline"
                      className="w-full justify-start border-red-200 hover:bg-red-50 text-red-700 dark:border-red-900/50 dark:hover:bg-red-900/20 dark:text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear All Data
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Note:</strong> Data is synchronized with your connected Google Sheet. Changes are saved automatically.
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
                <Label className="text-slate-600 dark:text-slate-300 mb-2 block text-sm">Language</Label>
                <Input
                  value={regionSettings.language}
                  onChange={(e) => setRegionSettings({ ...regionSettings, language: e.target.value })}
                  className="rounded-xl border-slate-200"
                />
              </div>
              <div>
                <Label className="text-slate-600 dark:text-slate-300 mb-2 block text-sm">Time Zone</Label>
                <Input
                  value={regionSettings.timezone}
                  onChange={(e) => setRegionSettings({ ...regionSettings, timezone: e.target.value })}
                  className="rounded-xl border-slate-200"
                />
              </div>
              <div>
                <Label className="text-slate-600 dark:text-slate-300 mb-2 block text-sm">Date Format</Label>
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

      {/* Import Preview Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle className="text-sm">Import Preview</DialogTitle>
            <DialogDescription className="text-xs">Review CSV data</DialogDescription>
          </DialogHeader>

          {importPreview && (
            <div className="space-y-2">
              <div className="text-xs text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-800">
                ✓ CSV parsed successfully!
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                  <div className="text-lg font-bold text-blue-900 dark:text-blue-100">{importPreview.summary.coursesCount}</div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">Courses</div>
                </div>
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded">
                  <div className="text-lg font-bold text-purple-900 dark:text-purple-100">{importPreview.summary.facultyCount}</div>
                  <div className="text-xs text-purple-700 dark:text-purple-300">Faculty</div>
                </div>
                <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                  <div className="text-lg font-bold text-green-900 dark:text-green-100">{importPreview.summary.roomsCount}</div>
                  <div className="text-xs text-green-700 dark:text-green-300">Rooms</div>
                </div>
                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded">
                  <div className="text-lg font-bold text-orange-900 dark:text-orange-100">{importPreview.summary.allotmentsCount}</div>
                  <div className="text-xs text-orange-700 dark:text-orange-300">Allotments</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(false)}
              disabled={importing}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={importing}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {importing ? "Importing..." : "Confirm Import"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
