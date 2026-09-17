import { SessionInactivity } from "@/components/SessionInactivity";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  type User,
  type LoginCredentials,
  type RegisterData,
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  fetchCurrentUser,
  clearAuth,
} from "@/services/auth";
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string;
  login: (data: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  refreshIdentity: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [isLoading, setLoading] = useState(true),
    [error, setError] = useState("");
  const generation = useRef(0),
    pending = useRef<AbortController | null>(null);
  const expireIdle = useCallback(() => { pending.current?.abort(); ++generation.current; clearAuth(); setUser(null); setLoading(false); setError(""); }, []);
  const refresh = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const attempt = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const current = await fetchCurrentUser(controller.signal);
      if (attempt === generation.current) setUser(current);
    } catch (e) {
      if (attempt === generation.current && !controller.signal.aborted) {
        setUser(null);
        setError((e as Error).message);
      }
    } finally {
      if (attempt === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    clearAuth();
    void refresh();
    const expire = () => setUser(null);
    window.addEventListener("infimatch:session-expired", expire);
    return () => {
      ++generation.current;
      pending.current?.abort();
      window.removeEventListener("infimatch:session-expired", expire);
    };
  }, [refresh]);
  async function refreshIdentity() {
    const attempt = generation.current;
    const current = await fetchCurrentUser();
    if (attempt === generation.current) setUser(current);
  }
  async function authenticate(action: () => Promise<{ user: User }>) {
    pending.current?.abort();
    const attempt = ++generation.current;
    setError("");
    setLoading(true);
    try {
      const r = await action();
      if (attempt === generation.current) setUser(r.user);
    } finally {
      if (attempt === generation.current) setLoading(false);
    }
  }
  async function login(data: LoginCredentials) {
    await authenticate(() => apiLogin(data));
  }
  async function register(data: RegisterData) {
    await authenticate(() => apiRegister(data));
  }
  async function logout() {
    pending.current?.abort();
    ++generation.current;
    await apiLogout();
    setUser(null);
    setLoading(false);
  }
  return (
    <AuthContext
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        register,
        logout,
        refresh,
        refreshIdentity,
      }}
    >
      {user && <SessionInactivity key={user.id} userId={user.id} expiresAt={user.idleExpiresAt} onExpire={expireIdle} />}
      {children}
    </AuthContext>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider absent");
  return value;
}
