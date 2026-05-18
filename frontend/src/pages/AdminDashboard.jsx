import { useState, useEffect } from "react";
import TopBar from "../components/TopBar";
import { useI18n } from "../lib/i18n";
import { api } from "../lib/api";
import Overview from "./admin/Overview";
import Failures from "./admin/Failures";
import Inspections from "./admin/Inspections";
import BreakdownAdmin from "./admin/Breakdown";
import MDBReadings from "./admin/MDBReadings";
import Analytics from "./admin/Analytics";
import PreventivePage from "./admin/PreventivePage";
import WorkSchedule from "./admin/WorkSchedule";
import Equipment from "./admin/Equipment";
import TeamManagement from "./admin/TeamManagement";
import Questions from "./admin/Questions";
import {
  ChartBar, Wrench, Question, ClipboardText,
  WarningOctagon, Clipboard, Lightning,
  CaretDown, CaretRight, List, X, Gauge, TrendUp,
  CalendarBlank, UsersThree, GearSix,
} from "@phosphor-icons/react";

const NAV = [
  { key: "overview", label_key: "tab_overview", Icon: ChartBar, Component: Overview },
  {
    group: "group_daily_ops",
    items: [
      { key: "inspections",  label_key: "tab_inspections",  Icon: ClipboardText,  Component: Inspections },
      { key: "breakdown",    label_key: "tab_breakdown",    Icon: Lightning,      Component: BreakdownAdmin },
      { key: "mdb-readings", label_key: "tab_mdb_readings", Icon: Gauge,          Component: MDBReadings },
      { key: "failures",     label_key: "tab_failures",     Icon: WarningOctagon, Component: Failures },
    ],
  },
  {
    group: "group_maintenance",
    items: [
      { key: "preventive",    label_key: "tab_preventive_group", Icon: Clipboard,     Component: PreventivePage },
      { key: "work-schedule", label_key: "tab_work_schedule",    Icon: CalendarBlank, Component: WorkSchedule },
    ],
  },
  {
    group: "group_assets",
    items: [
      { key: "equipment", label_key: "tab_equipment", Icon: Wrench, Component: Equipment },
    ],
  },
  {
    group: "group_reports",
    items: [
      { key: "analytics", label_key: "tab_analytics", Icon: TrendUp, Component: Analytics },
    ],
  },
  {
    group: "group_settings",
    items: [
      { key: "team",      label_key: "tab_team",      Icon: UsersThree, Component: TeamManagement },
      { key: "questions", label_key: "tab_questions", Icon: Question,   Component: Questions },
    ],
  },
];

function flatItems() {
  return NAV.flatMap((n) => (n.group ? n.items : [n]));
}

function SidebarItem({ item, active, setActive, badge, onClose }) {
  const { t } = useI18n();
  const isActive = active === item.key;
  const { Icon } = item;
  return (
    <button
      onClick={() => { setActive(item.key); onClose?.(); }}
      data-testid={`admin-tab-${item.key}`}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-[14px] font-semibold transition-all rounded-sm ${
        isActive
          ? "bg-slate-900 text-white dark:bg-slate-700"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
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

function SidebarGroup({ entry, active, setActive, openGroups, toggleGroup, pendingCount, onClose }) {
  const { t } = useI18n();
  const isOpen = openGroups[entry.group];
  const Caret = isOpen ? CaretDown : CaretRight;
  return (
    <div className="mt-2">
      <button
        onClick={() => toggleGroup(entry.group)}
        className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
      >
        <Caret size={10} weight="bold" />
        {t(entry.group)}
      </button>
      {isOpen && (
        <div className="ps-1 space-y-0.5">
          {entry.items.map((item) => (
            <SidebarItem
              key={item.key}
              item={item}
              active={active}
              setActive={setActive}
              badge={item.key === "team" ? pendingCount : 0}
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarNav({ active, setActive, openGroups, toggleGroup, pendingCount, onClose }) {
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
    group_daily_ops:   true,
    group_maintenance: false,
    group_assets:      false,
    group_reports:     false,
    group_settings:    false,
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

  const activeItem = flatItems().find((i) => i.key === active);
  const ActiveComp = activeItem?.Component ?? Overview;
  const activeLabel = t(activeItem?.label_key ?? "tab_overview");

  const isTeam = active === "team";

  return (
    <div className="min-h-screen dark:bg-slate-900" data-testid="admin-dashboard">
      <TopBar />

      {/* Mobile section bar */}
      <div className="md:hidden sticky top-14 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{activeLabel}</span>
        <button
          onClick={() => setSidebarOpen(true)}
          className="h-10 w-10 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300"
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
            className="absolute top-0 h-full w-72 bg-white dark:bg-slate-900 overflow-y-auto flex flex-col shadow-2xl"
            style={{ [lang === "ar" ? "right" : "left"]: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-2 text-slate-400">
                <GearSix size={14} weight="bold" />
                <span className="text-xs font-bold uppercase tracking-widest">{t("admin_panel")}</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="h-9 w-9 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300"
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
        {/* Desktop sidebar */}
        <aside className="hidden md:block w-60 flex-shrink-0">
          <div className="sticky top-20">
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 px-4 mb-3">
              <GearSix size={13} weight="bold" />
              <span className="text-[10px] font-bold uppercase tracking-widest">{t("admin_panel")}</span>
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
          <div className="fade-in">
            <ActiveComp
              onCountChange={isTeam ? setPendingCount : undefined}
              pendingCount={isTeam ? pendingCount : undefined}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
