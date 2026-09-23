import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/context/AuthContext";

export function RoleRoute({ nurse }: { nurse: boolean }) {
  const { user } = useAuth();
  return (user?.role === "interimaire") === nurse ? <Outlet /> : <Navigate to="/accueil" replace />;
}
