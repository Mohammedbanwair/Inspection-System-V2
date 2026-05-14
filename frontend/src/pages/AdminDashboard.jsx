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
import MDBReadings from "./admin/MDBReadings";
import {
  ChartBar, Wrench, Question, UsersThree, ClipboardText, Snowflake, ListChecks,
  WarningOctagon, UserPlus, Drop, Clipboard, CalendarCheck, Lightning,
  CaretDown, CaretRight, List, X, Gauge,
} from "@phosphor-icons/react";

const NAV = [
  { key: "overview",    label_key: "tab_overview",    Icon: ChartBar,      Component: Overview },
  { key: "failures",    label_key: "tab_failures",    Icon: WarningOctagon, Component: Failures },
  { key: "inspections", label_key: "tab_inspections", Icon: ClipboardText,  Component: Inspections },
  { key: "breakdown",   label_key: "tab_breakdown",   Icon: Lightning,      Component: BreakdownAdmin },
  { key: "mdb-readings", label_key: "tab_mdb_readings", Icon: Gauge, Component: MDBReadings },
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

function SidebarItem({ item, active, setActive, badge, onClose }) {
  const { t } = useI18n();
  const isActive = active === item.key;
  const { Icon } = item;
  return (
    <button
      onClick={() => { setActive(item.key); onClose?.(); }}
      data-testid={`admin-tab-${item.key}`}
      className={`w-full flex items-center gap-3 px-4 py-3 text-[15px] font-semibold transition-all rounded-sm ${
        isActive
          ? "bg-slate-900 text-white"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <Icon size={18} weight={isActive ? "bold" : "regular"} className="shrink-0" />
      <span className="flex-1 text-start leading-tight">{t(item.label_key)}</span>
      {badge > 0 && (
        <span className="h-5 min-w-[20px] px-1 bg-red-500 text-white text-xs font-bold flex items-center justify-center rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
}

function SidebarGroup({ entry, active, setActive, openGroups, toggleGroup, pendingCount, onClose }) {
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
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarNav({ active, setActive, openGroups, toggleGroup, pendingCount, onClose }) {
  const { t } = useI18n();
  return (
    <nav className="space-y-0.5">
      {NAV.map((entry) =>
        entry.group ? (
          <SidebarGroup
            key={entry.group}
            entry={entry}
            active={active}
            setActive={setActive}
            openGroups={openGroups}
            toggleGroup={toggleGroup}
            pendingCount={pendingCount}
            onClose={onClose}
          />
        ) : (
          <SidebarItem
            key={entry.key}
            item={entry}
            active={active}
            setActive={setActive}
            badge={0}
            onClose={onClose}
          />
        )
      )}
    </nav>
  );
}

export default function AdminDashboard() {
  const { t, lang } = useI18n();
  const [active, setActive] = useState("overview");
  const [pendingCount, setPendingCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
  const activeLabel = t(flatItems().find((i) => i.key === active)?.label_key ?? "tab_overview");

  return (
    <div className="min-h-screen" data-testid="admin-dashboard">
      <TopBar />

      {/* Mobile section bar */}
      <div className="md:hidden sticky top-16 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-bold text-slate-900">{activeLabel}</span>
        <button
          onClick={() => setSidebarOpen(true)}
          className="h-10 w-10 border border-slate-200 flex items-center justify-center hover:bg-slate-100"
          aria-label="Open menu"
        >
          <List size={20} weight="bold" />
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <aside
            className="absolute top-0 h-full w-72 bg-white overflow-y-auto flex flex-col shadow-2xl"
            style={{ [lang === "ar" ? "right" : "left"]: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                {t("admin_panel")}
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="h-9 w-9 border border-slate-200 flex items-center justify-center hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 p-2 overflow-y-auto">
              <SidebarNav
                active={active}
                setActive={setActive}
                openGroups={openGroups}
                toggleGroup={toggleGroup}
                pendingCount={pendingCount}
                onClose={() => setSidebarOpen(false)}
              />
            </div>
          </aside>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4 sm:py-6 md:flex md:gap-6">
        {/* Desktop sidebar — hidden on mobile */}
        <aside className="hidden md:block w-64 flex-shrink-0">
          <div className="sticky top-4">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400 px-4 mb-3">
              {t("admin_panel")}
            </div>
            <SidebarNav
              active={active}
              setActive={setActive}
              openGroups={openGroups}
              toggleGroup={toggleGroup}
              pendingCount={pendingCount}
            />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="mb-4 md:mb-5 hidden md:block">
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
