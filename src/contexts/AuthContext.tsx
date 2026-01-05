import React, { createContext, useContext, useState, useEffect } from "react";
import { googleLogout, useGoogleLogin, TokenResponse } from "@react-oauth/google";

interface User {
    id: string;
    name: string;
    email: string;
    picture: string;
}

interface AuthContextType {
    user: User | null;
    accessToken: string | null;
    login: () => void;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Check for local storage persistence on boot
    useEffect(() => {
        console.log("AuthContext: Initializing...");
        const storedToken = localStorage.getItem("google_access_token");
        const storedUser = localStorage.getItem("google_user");

        if (storedToken && storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setAccessToken(storedToken);
                setUser(parsedUser);
                console.log("AuthContext: Restored user session");
            } catch (e) {
                console.error("AuthContext: Failed to parse stored user", e);
                localStorage.removeItem("google_user");
            }
        }
        setLoading(false);
        console.log("AuthContext: Loading set to false");
    }, []);

    const login = useGoogleLogin({
        onSuccess: async (tokenResponse: TokenResponse) => {
            setAccessToken(tokenResponse.access_token);
            localStorage.setItem("google_access_token", tokenResponse.access_token);

            // Fetch User Info
            try {
                const userInfo = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                }).then((res) => res.json());

                const userData = {
                    id: userInfo.sub,
                    name: userInfo.name,
                    email: userInfo.email,
                    picture: userInfo.picture,
                };

                setUser(userData);
                localStorage.setItem("google_user", JSON.stringify(userData));
            } catch (error) {
                console.error("Failed to fetch user info", error);
                logout();
            }
        },
        onError: (error) => console.log("Login Failed:", error),
        scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets",
    });

    const logout = () => {
        googleLogout();
        setUser(null);
        setAccessToken(null);
        localStorage.removeItem("google_access_token");
        localStorage.removeItem("google_user");
    };

    return (
        <AuthContext.Provider value={{ user, accessToken, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
