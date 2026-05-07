import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../lib/i18n";
import { Gear, SignOut, User, Translate, Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "../context/ThemeContext";

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
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to={user?.role === "admin" ? "/admin" : "/tech"} className="flex items-center gap-3">
          <div className="h-9 w-9 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center">
            <Gear size={20} weight="bold" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{t("app_title")}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {user?.role === "admin" ? t("admin_panel") : t("tech_panel")}
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <button onClick={toggleTheme}
                  className="h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center"
                  title="Toggle dark mode">
            {theme === "dark" ? <Sun size={17} weight="bold" /> : <Moon size={17} weight="bold" />}
          </button>
          <button onClick={toggle}
                  className="h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                  data-testid="lang-toggle"
                  title="Language / اللغة">
            <Translate size={16} />
            <span className="text-sm">{lang === "ar" ? "EN" : "ع"}</span>
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
                  className="h-10 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 flex items-center gap-2 transition-all duration-150"
                  data-testid="logout-button">
            <SignOut size={16} />
            <span>{t("logout")}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
