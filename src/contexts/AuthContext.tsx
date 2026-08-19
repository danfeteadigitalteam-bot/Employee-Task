import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import type { Employee } from "@/types/database";
import { EDGE_FUNCTION_BASE } from "@/lib/supabase";

interface AuthContextType {
  employee: Employee | null;
  isLoading: boolean;
  login: (employeeCode: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshEmployee: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_KEY = "ews_session";
const SESSION_TOKEN_KEY = "ews_token";
const REQUEST_TIMEOUT_MS = 20000;

function readCachedEmployee(): Employee | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Employee) : null;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [employee, setEmployee] = useState<Employee | null>(readCachedEmployee);
  const [isLoading, setIsLoading] = useState(false);

  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_TOKEN_KEY);
    setEmployee(null);
  }, []);

  const refreshEmployee = useCallback(async () => {
    const storedEmployee = localStorage.getItem(SESSION_KEY);
    const storedToken = localStorage.getItem(SESSION_TOKEN_KEY);

    if (!storedEmployee || !storedToken) {
      setEmployee(readCachedEmployee());
      return;
    }

    setIsLoading(true);
    try {
      const emp = JSON.parse(storedEmployee) as Employee;
      const response = await fetchWithTimeout(
        `${EDGE_FUNCTION_BASE}/validate-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            session_token: storedToken,
            employee_id: emp.id,
          }),
        },
        REQUEST_TIMEOUT_MS
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403 || response.status === 404) {
          clearSession();
        }
        return;
      }

      const data = await response.json();
      if (data.valid && data.employee) {
        setEmployee(data.employee);
        localStorage.setItem(SESSION_KEY, JSON.stringify(data.employee));
      } else {
        clearSession();
      }
    } catch {
      // Keep the cached session on network failure or timeout.
    } finally {
      setIsLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    refreshEmployee();
  }, [refreshEmployee]);

  const login = useCallback(async (employeeCode: string, pin: string) => {
    try {
      const response = await fetchWithTimeout(
        `${EDGE_FUNCTION_BASE}/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            employee_code: employeeCode,
            pin,
          }),
        },
        REQUEST_TIMEOUT_MS
      );

      const data = await response.json();

      if (data.success && data.session_token && data.employee) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(data.employee));
        localStorage.setItem(SESSION_TOKEN_KEY, data.session_token);
        setEmployee(data.employee);
        return { success: true };
      }

      return { success: false, error: data.error || "Login failed" };
    } catch {
      return { success: false, error: "Connection error. Please try again." };
    }
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({ employee, isLoading, login, logout, refreshEmployee }),
    [employee, isLoading, login, logout, refreshEmployee]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
