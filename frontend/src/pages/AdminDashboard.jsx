import { useState, useEffect } from "react";
import TopBar from "../components/TopBar";
import { useI18n } from "../lib/i18n";
import { api } from "../lib/api";
import Overview from "./admin/Overview";
import Failures from "./admin/Failures";
import Machines from "./admin/Machines";
import Chillers from "./admin/Chillers";
import CoolingTowers from "./admin/CoolingTowers";
import Panels from "./admin/Panels";
import Questions from "./admin/Questions";
import Users from "./admin/Users";
import Inspections from "./admin/Inspections";
import Preventive from "./admin/Preventive";
import PreventivePlan from "./admin/PreventivePlan";
import RegistrationRequests from "./admin/RegistrationRequests";
import {
  ChartBar, Wrench, Question, UsersThree, ClipboardText, Snowflake, ListChecks,
  WarningOctagon, UserPlus, Drop, Clipboard, CalendarCheck,
} from "@phosphor-icons/react";

const TABS = [
  { key: "overview", label_key: "tab_overview", Icon: ChartBar, Component: Overview },
  { key: "failures", label_key: "tab_failures", Icon: WarningOctagon, Component: Failures },
  { key: "inspections", label_key: "tab_inspections", Icon: ClipboardText, Component: Inspections },
  { key: "preventive", label_key: "tab_preventive", Icon: Clipboard, Component: Preventive },
  { key: "preventive-plan", label_key: "tab_preventive_plan", Icon: CalendarCheck, Component: PreventivePlan },
  { key: "machines", label_key: "tab_machines", Icon: Wrench, Component: Machines },
  { key: "chillers", label_key: "tab_chillers", Icon: Snowflake, Component: Chillers },
  { key: "cooling-towers", label_key: "tab_cooling_towers", Icon: Drop, Component: CoolingTowers },
  { key: "panels", label_key: "tab_panels", Icon: ListChecks, Component: Panels },
  { key: "questions", label_key: "tab_questions", Icon: Question, Component: Questions },
  { key: "users", label_key: "tab_users", Icon: UsersThree, Component: Users },
  { key: "requests", label_key: "tab_requests", Icon: UserPlus, Component: RegistrationRequests },
];

export default function AdminDashboard() {
  const { t, lang } = useI18n();
  const [active, setActive] = useState("overview");
  const [pendingCount, setPendingCount] = useState(0);

  // Poll pending registration requests count every 2 minutes
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const { data } = await api.get("/registration-requests/count");
        setPendingCount(data.count);
      } catch {}
    };
    fetchCount();
    const id = setInterval(fetchCount, 120000);
    return () => clearInterval(id);
  }, []);

  const ActiveComp = TABS.find((tab) => tab.key === active).Component;

  return (
    <div className="min-h-screen" data-testid="admin-dashboard">
      <TopBar />
      <main className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            {t("admin_panel")}
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mt-1">{t("control_center")}</h1>
        </div>

        <div className="flex flex-wrap border-b border-slate-200 mb-6 overflow-x-auto">
          {TABS.map(({ key, label_key, Icon }) => {
            const isActive = active === key;
            const showBadge = key === "requests" && pendingCount > 0;
            return (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={`px-5 py-4 border-b-4 flex items-center gap-2 font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
                data-testid={`admin-tab-${key}`}
              >
                <Icon size={18} weight={isActive ? "bold" : "regular"} />
                <span>{t(label_key)}</span>
                {showBadge && (
                  <span className="h-5 min-w-[20px] px-1 bg-red-500 text-white text-xs font-bold flex items-center justify-center rounded-full">
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="fade-in">
          <ActiveComp onCountChange={active === "requests" ? setPendingCount : undefined} />
        </div>
      </main>
    </div>
  );
}
