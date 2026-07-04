import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "./supabase";

export type Role = "superadmin" | "admin" | "barista";

export type CustomUser = {
  id: string;
  username: string;
  display_name: string;
  role: Role;
};

type AuthContext = {
  user: CustomUser | null;
  role: Role;
  displayName: string;
  isAdmin: boolean;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  createUser: (
    username: string,
    password: string,
    name: string,
    role: Role,
  ) => Promise<string | null>;
};

const Ctx = createContext<AuthContext | null>(null);

const SESSION_KEY = "mias-cafe-session-v2";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        try {
          setUser(JSON.parse(saved) as CustomUser);
        } catch {
          /* ignore */
        }
      }
      setLoading(false);
    }
  }, []);

  const signIn = useCallback(async (username: string, password: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, username, display_name, role")
        .eq("username", username.trim().toLowerCase())
        .eq("password", password)
        .maybeSingle();

      if (error) return error.message;
      if (!data) return "Invalid username or password.";

      const sessionUser: CustomUser = {
        id: data.id,
        username: data.username,
        display_name: data.display_name,
        role: data.role as Role,
      };

      setUser(sessionUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
      return null;
    } catch (err: any) {
      return err.message || "An unexpected error occurred.";
    }
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  }, []);

  /** Admin-only: create a new user account in our custom table */
  const createUser = useCallback(
    async (
      username: string,
      password: string,
      name: string,
      newRole: Role,
    ): Promise<string | null> => {
      try {
        const { error } = await supabase.from("users").insert({
          username: username.trim().toLowerCase(),
          password,
          display_name: name,
          role: newRole,
        });
        if (error) return error.message;
        return null;
      } catch (err: any) {
        return err.message || "Could not create user.";
      }
    },
    [],
  );

  const role = useMemo(() => user?.role ?? "barista", [user]);
  const displayName = useMemo(() => user?.display_name ?? "", [user]);
  const isAdmin = useMemo(() => role === "superadmin" || role === "admin", [role]);

  const value = useMemo<AuthContext>(
    () => ({
      user,
      role,
      displayName,
      isAdmin,
      loading,
      signIn,
      signOut,
      createUser,
    }),
    [user, role, displayName, isAdmin, loading, signIn, signOut, createUser],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
