import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_TOKEN_KEY);
    setEmployee(null);
  }, []);

  const refreshEmployee = useCallback(async () => {
    const storedEmployee = localStorage.getItem(SESSION_KEY);
    const storedToken = localStorage.getItem(SESSION_TOKEN_KEY);

    if (!storedEmployee || !storedToken) {
      clearSession();
      setIsLoading(false);
      return;
    }

    try {
      const emp = JSON.parse(storedEmployee) as Employee;
      const response = await fetch(`${EDGE_FUNCTION_BASE}/validate-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          session_token: storedToken,
          employee_id: emp.id,
        }),
      });

      const data = await response.json();

      if (data.valid && data.employee) {
        setEmployee(data.employee);
        localStorage.setItem(SESSION_KEY, JSON.stringify(data.employee));
      } else {
        clearSession();
      }
    } catch {
      clearSession();
    } finally {
      setIsLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    refreshEmployee();
  }, [refreshEmployee]);

  const login = async (employeeCode: string, pin: string) => {
    try {
      const response = await fetch(`${EDGE_FUNCTION_BASE}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          employee_code: employeeCode,
          pin,
        }),
      });

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
  };

  const logout = () => {
    clearSession();
  };

  return (
    <AuthContext.Provider value={{ employee, isLoading, login, logout, refreshEmployee }}>
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
