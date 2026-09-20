import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { apiFetch } from "./api";
import { clearSession, loadToken, loadUser, saveSession } from "./storage";

export type MobileUser = {
  id: string;
  name: string;
  staffCode: string;
  email: string;
  phone: string;
  role: "SUPER_ADMIN" | "ADMIN" | "EMPLOYEE" | "BROKER";
};

type AuthContextValue = {
  user: MobileUser | null;
  token: string | null;
  isLoading: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [storedToken, storedUser] = await Promise.all([loadToken(), loadUser<MobileUser>()]);
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
      }
      setIsLoading(false);
    })();
  }, []);

  const signIn = useCallback(async (identifier: string, password: string) => {
    const result = await apiFetch<{ token: string; user: MobileUser }>("/auth/login", {
      method: "POST",
      body: { identifier, password },
      skipAuth: true,
    });
    await saveSession(result.token, result.user);
    setToken(result.token);
    setUser(result.user);
  }, []);

  const signOut = useCallback(async () => {
    if (token) {
      await apiFetch("/auth/logout", { method: "POST", token }).catch(() => undefined);
    }
    await clearSession();
    setToken(null);
    setUser(null);
  }, [token]);

  const value = useMemo(
    () => ({ user, token, isLoading, signIn, signOut }),
    [user, token, isLoading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
