import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../lib/i18n";
import { Gear, SignOut, User, Translate, Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "../context/ThemeContext";
import NotificationBell from "./NotificationBell";

export default function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t, lang, toggle } = useI18n();
  const { theme, toggle: toggleTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700" data-testid="top-bar">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
        <Link to={user?.role === "admin" ? "/admin" : "/tech"} className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="h-8 w-8 sm:h-9 sm:w-9 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center shrink-0">
            <Gear size={18} weight="bold" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{t("app_title")}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              {user?.role === "admin" ? t("admin_panel") : t("tech_panel")}
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {user?.role === "admin" && <NotificationBell />}
          <button onClick={toggleTheme}
                  className="h-9 w-9 sm:h-10 sm:px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center"
                  title="Toggle dark mode">
            {theme === "dark" ? <Sun size={16} weight="bold" /> : <Moon size={16} weight="bold" />}
          </button>
          <button onClick={toggle}
                  className="h-9 sm:h-10 px-2 sm:px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 sm:gap-2"
                  data-testid="lang-toggle"
                  title="Language / اللغة">
            <Translate size={15} />
            <span className="text-sm font-semibold">{lang === "ar" ? "EN" : "ع"}</span>
          </button>
          <div className="hidden md:flex items-center gap-2 text-sm">
            <div className="h-8 w-8 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <User size={16} weight="bold" />
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100" data-testid="current-user-name">{user?.name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{user?.employee_number}</div>
            </div>
          </div>
          <button onClick={handleLogout}
                  className="h-9 sm:h-10 px-2 sm:px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 flex items-center gap-1.5 sm:gap-2 transition-all duration-150"
                  data-testid="logout-button">
            <SignOut size={16} />
            <span className="hidden sm:inline">{t("logout")}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
