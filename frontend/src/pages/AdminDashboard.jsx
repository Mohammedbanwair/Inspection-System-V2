import { useState } from "react";
import TopBar from "../components/TopBar";
import { useI18n } from "../lib/i18n";
import Overview from "./admin/Overview";
import Machines from "./admin/Machines";
import Chillers from "./admin/Chillers";
import Panels from "./admin/Panels";
import Questions from "./admin/Questions";
import Users from "./admin/Users";
import Inspections from "./admin/Inspections";
import {
  ChartBar, Wrench, Question, UsersThree, ClipboardText, Snowflake, ListChecks,
} from "@phosphor-icons/react";

const TABS = [
  { key: "overview", label_key: "tab_overview", Icon: ChartBar, Component: Overview },
  { key: "inspections", label_key: "tab_inspections", Icon: ClipboardText, Component: Inspections },
  { key: "machines", label_key: "tab_machines", Icon: Wrench, Component: Machines },
  { key: "chillers", label_key: "tab_chillers", Icon: Snowflake, Component: Chillers },
  { key: "panels", label_key: "tab_panels", Icon: ListChecks, Component: Panels },
  { key: "questions", label_key: "tab_questions", Icon: Question, Component: Questions },
  { key: "users", label_key: "tab_users", Icon: UsersThree, Component: Users },
];

export default function AdminDashboard() {
  const { t } = useI18n();
  const [active, setActive] = useState("overview");
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
              </button>
            );
          })}
        </div>

        <div className="fade-in">
          <ActiveComp />
        </div>
      </main>
    </div>
  );
}
