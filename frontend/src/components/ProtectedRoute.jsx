import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function roleHome(role) {
  if (role === "admin") return "/admin";
  if (role === "helper") return "/helper";
  return "/tech";
}

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        ...
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  const allowed = Array.isArray(role) ? role : [role];
  if (role && !allowed.includes(user.role))
    return <Navigate to={roleHome(user.role)} replace />;
  return children;
}
