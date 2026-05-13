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
import BreakdownAdmin from "./admin/Breakdown";
import {
  ChartBar, Wrench, Question, UsersThree, ClipboardText, Snowflake, ListChecks,
  WarningOctagon, UserPlus, Drop, Clipboard, CalendarCheck, Lightning,
  CaretDown, CaretRight,
} from "@phosphor-icons/react";

const NAV = [
  { key: "overview",    label_key: "tab_overview",    Icon: ChartBar,      Component: Overview },
  { key: "failures",    label_key: "tab_failures",    Icon: WarningOctagon, Component: Failures },
  { key: "inspections", label_key: "tab_inspections", Icon: ClipboardText,  Component: Inspections },
  { key: "breakdown",   label_key: "tab_breakdown",   Icon: Lightning,      Component: BreakdownAdmin },
  {
    group: "group_preventive",
    items: [
      { key: "preventive",      label_key: "tab_preventive",      Icon: Clipboard,     Component: Preventive },
      { key: "preventive-plan", label_key: "tab_preventive_plan", Icon: CalendarCheck, Component: PreventivePlan },
    ],
  },
  {
    group: "group_equipment",
    items: [
      { key: "machines",       label_key: "tab_machines",       Icon: Wrench,     Component: Machines },
      { key: "chillers",       label_key: "tab_chillers",       Icon: Snowflake,  Component: Chillers },
      { key: "cooling-towers", label_key: "tab_cooling_towers", Icon: Drop,       Component: CoolingTowers },
      { key: "panels",         label_key: "tab_panels",         Icon: ListChecks, Component: Panels },
    ],
  },
  // Note: Chillers & Cooling Towers are adjacent (both mechanical cooling equipment)
  {
    group: "group_setup",
    items: [
      { key: "questions", label_key: "tab_questions", Icon: Question,   Component: Questions },
      { key: "users",     label_key: "tab_users",     Icon: UsersThree, Component: Users },
      { key: "requests",  label_key: "tab_requests",  Icon: UserPlus,   Component: RegistrationRequests },
    ],
  },
];

function flatItems() {
  return NAV.flatMap((n) => n.group ? n.items : [n]);
}

function SidebarItem({ item, active, setActive, badge }) {
  const { t } = useI18n();
  const isActive = active === item.key;
  const { Icon } = item;
  return (
    <button
      onClick={() => setActive(item.key)}
      data-testid={`admin-tab-${item.key}`}
      className={`w-full flex items-center gap-3 px-4 py-3 text-[13px] font-semibold transition-all rounded-sm ${
        isActive
          ? "bg-slate-900 text-white"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <Icon size={17} weight={isActive ? "bold" : "regular"} className="shrink-0" />
      <span className="flex-1 text-start leading-tight">{t(item.label_key)}</span>
      {badge > 0 && (
        <span className="h-5 min-w-[20px] px-1 bg-red-500 text-white text-xs font-bold flex items-center justify-center rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
}

function SidebarGroup({ entry, active, setActive, openGroups, toggleGroup, pendingCount }) {
  const { t } = useI18n();
  const isOpen = openGroups[entry.group];
  const Caret = isOpen ? CaretDown : CaretRight;
  return (
    <div className="mt-1">
      <button
        onClick={() => toggleGroup(entry.group)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors"
      >
        <Caret size={11} weight="bold" />
        {t(entry.group)}
      </button>
      {isOpen && (
        <div className="ps-2">
          {entry.items.map((item) => (
            <SidebarItem
              key={item.key}
              item={item}
              active={active}
              setActive={setActive}
              badge={item.key === "requests" ? pendingCount : 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { t, lang } = useI18n();
  const [active, setActive] = useState("overview");
  const [pendingCount, setPendingCount] = useState(0);
  const [openGroups, setOpenGroups] = useState({
    group_preventive: true,
    group_equipment: true,
    group_setup: true,
  });

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

  const toggleGroup = (key) =>
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const ActiveComp = flatItems().find((i) => i.key === active)?.Component ?? Overview;

  return (
    <div className="min-h-screen" data-testid="admin-dashboard">
      <TopBar />
      <div className="max-w-[1400px] mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0">
          <div className="sticky top-4">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400 px-4 mb-3">
              {t("admin_panel")}
            </div>
            <nav className="space-y-0.5">
              {NAV.map((entry, idx) =>
                entry.group ? (
                  <SidebarGroup
                    key={entry.group}
                    entry={entry}
                    active={active}
                    setActive={setActive}
                    openGroups={openGroups}
                    toggleGroup={toggleGroup}
                    pendingCount={pendingCount}
                  />
                ) : (
                  <SidebarItem
                    key={entry.key}
                    item={entry}
                    active={active}
                    setActive={setActive}
                    badge={0}
                  />
                )
              )}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-slate-900">{t("control_center")}</h1>
          </div>
          <div className="fade-in">
            <ActiveComp onCountChange={active === "requests" ? setPendingCount : undefined} />
          </div>
        </main>
      </div>
    </div>
  );
}
