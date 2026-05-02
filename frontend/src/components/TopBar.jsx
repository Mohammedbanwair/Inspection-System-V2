import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Gear, SignOut, User } from "@phosphor-icons/react";

export default function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header
      className="sticky top-0 z-30 bg-white border-b border-slate-200"
      data-testid="top-bar"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          to={user?.role === "admin" ? "/admin" : "/tech"}
          className="flex items-center gap-3"
        >
          <div className="h-9 w-9 bg-slate-900 text-white flex items-center justify-center">
            <Gear size={20} weight="bold" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">نظام الفحص الرقمي</div>
            <div className="text-xs text-slate-500">
              {user?.role === "admin" ? "لوحة المدير" : "لوحة الفني"}
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-sm">
            <div className="h-8 w-8 bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
              <User size={16} weight="bold" />
            </div>
            <div>
              <div className="font-semibold text-slate-900" data-testid="current-user-name">
                {user?.name}
              </div>
              <div className="text-xs text-slate-500">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="h-10 px-4 bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 hover:text-slate-900 flex items-center gap-2 transition-all duration-150"
            data-testid="logout-button"
          >
            <SignOut size={16} />
            <span>خروج</span>
          </button>
        </div>
      </div>
    </header>
  );
}
