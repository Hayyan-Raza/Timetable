import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Clock, AlertCircle, Calendar, Users, BookOpen } from "lucide-react";

export function Login() {
    const { login, loading } = useAuth();
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        setError(null);
        try {
            await login();
        } catch (err) {
            console.error(err);
            setError("Failed to sign in. Please try again.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30 p-4">
            <div className="  max-w-md">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg p-8">

                    {/* Header */}
                    <div className="flex flex-col items-center gap-4 mb-6 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Clock className="text-white" size={32} strokeWidth={2.5} />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Welcome to Timetabler
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Smart scheduling for modern universities
                            </p>
                        </div>
                    </div>

                    {/* Features List */}
                    <div className="mb-6 space-y-3 py-4 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                        <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                <Calendar className="text-blue-600 dark:text-blue-400" size={16} />
                            </div>
                            <span>Automated timetable generation</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                                <Users className="text-indigo-600 dark:text-indigo-400" size={16} />
                            </div>
                            <span>Faculty and room management</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                                <BookOpen className="text-purple-600 dark:text-purple-400" size={16} />
                            </div>
                            <span>Course and curriculum planning</span>
                        </div>
                    </div>

                    {/* Error Message Display */}
                    {error && (
                        <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {/* Google Login Button */}
                    <Button
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full h-11 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-3"
                    >
                        {loading ? (
                            <span className="animate-pulse">Connecting...</span>
                        ) : (
                            <>
                                <GoogleIcon className="w-5 h-5" />
                                Continue with Google
                            </>
                        )}
                    </Button>

                    {/* Footer */}
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-6 text-center leading-relaxed">
                        By continuing, you agree to our{' '}
                        <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">Terms of Service</a>
                        {' '}and{' '}
                        <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</a>
                    </p>
                </div>

                {/* Bottom tagline */}
                <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
                    Trusted by universities worldwide for efficient scheduling
                </p>
            </div>
        </div>
    );
}

// Google Icon Component
function GoogleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24">
            <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
            />
            <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
        </svg>
    );
}

