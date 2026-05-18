import { useEffect, useState } from "react";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../lib/i18n";
import TopBar from "../components/TopBar";
import InspectionForm from "./InspectionForm";
import BreakdownForm from "./BreakdownForm";
import MDBReadingForm from "./MDBReadingForm";
import {
  Gear, Wrench, Snowflake, ListChecks, ClipboardText, ArrowRight, ArrowLeft, PencilSimple,
  CheckSquare, WarningCircle, Timer, Drop, Lightning, Gauge, House,
} from "@phosphor-icons/react";

const EDIT_WINDOW_MS = 60 * 60 * 1000;

function timeAgo(dateStr, lang) {
  const mins = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (mins < 60) return lang === "ar" ? `منذ ${mins} دقيقة` : `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return lang === "ar" ? `منذ ${hrs} ساعة` : `${hrs} hr ago`;
  return new Date(dateStr).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US");
}

const ALL_BRANCH_GROUPS = [
  {
    key: "elec-machines",
    permKey: "inspection_electrical",
    title_key: "branch_elec_machines",
    desc_key: "branch_elec_machines_desc",
    Icon: Gear,
    children: [
      { key: "elec-machines-a", category: "electrical", target_type: "machine", group: "A",
        title_key: "group_a", desc_key: "branch_elec_machines_desc", Icon: Gear },
      { key: "elec-machines-b", category: "electrical", target_type: "machine", group: "B",
        title_key: "group_b", desc_key: "branch_elec_machines_desc", Icon: Gear },
    ],
  },
  {
    key: "panels",
    permKey: "inspection_panels",
    title_key: "branch_panels",
    desc_key: "branch_panels_desc",
    Icon: ListChecks,
    children: [
      { key: "panels-main", category: "panels_main", target_type: "panel", panel_type: "main",
        title_key: "branch_panels_main", desc_key: "branch_panels_main_desc", Icon: ListChecks },
      { key: "panels-sub", category: "panels_sub", target_type: "panel", panel_type: "sub",
        title_key: "branch_panels_sub", desc_key: "branch_panels_sub_desc", Icon: ListChecks },
    ],
  },
  {
    key: "mech-machines",
    permKey: "inspection_mechanical",
    title_key: "branch_mech_machines",
    desc_key: "branch_mech_machines_desc",
    Icon: Wrench,
    children: [
      { key: "mech-machines-a", category: "mechanical", target_type: "machine", group: "A",
        title_key: "group_a", desc_key: "branch_mech_machines_desc", Icon: Wrench },
      { key: "mech-machines-b", category: "mechanical", target_type: "machine", group: "B",
        title_key: "group_b", desc_key: "branch_mech_machines_desc", Icon: Wrench },
    ],
  },
  {
    key: "chillers",
    permKey: "inspection_chiller",
    title_key: "branch_chillers",
    desc_key: "branch_chillers_desc",
    Icon: Snowflake,
    branch: { category: "chiller", target_type: "chiller" },
  },
  {
    key: "cooling-towers",
    permKey: "inspection_cooling_tower",
    title_key: "branch_cooling_towers",
    desc_key: "branch_cooling_towers_desc",
    Icon: Drop,
    branch: { category: "cooling_tower", target_type: "cooling_tower" },
  },
  {
    key: "preventive",
    permKey: "inspection_preventive",
    title_key: "branch_preventive",
    desc_key: "branch_preventive_desc",
    Icon: ClipboardText,
    branch: { category: "preventive", target_type: "machine" },
  },
];

export default function TechDashboard() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const ar = lang === "ar";

  const [activeTab, setActiveTab] = useState("home");
  const [branch, setBranch] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [history, setHistory] = useState([]);
  const [editInspection, setEditInspection] = useState(null);
  const [allowedForms, setAllowedForms] = useState(null);

  useEffect(() => {
    api.get("/form-permissions/me")
      .then(({ data }) => setAllowedForms(data))
      .catch(() => setAllowedForms(null));
  }, []);

  const loadHistory = async () => {
    try {
      const { data } = await api.get("/inspections");
      setHistory(data);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };
  useEffect(() => { loadHistory(); }, []);

  const canEdit = (created_at) =>
    Date.now() - new Date(created_at).getTime() < EDIT_WINDOW_MS;

  const handleEdit = (inspection) => {
    setEditInspection(inspection);
    setBranch({ category: inspection.category, target_type: inspection.target_type });
  };

  const handleInspectionBack = () => { setBranch(null); setEditInspection(null); };
  const handleInspectionSubmitted = () => {
    setBranch(null); setEditInspection(null);
    setActiveTab("home"); loadHistory();
  };

  const switchTab = (key) => { setActiveTab(key); setSelectedGroup(null); };

  const visibleBranches = ALL_BRANCH_GROUPS.filter(
    (b) => !allowedForms || allowedForms[b.permKey] !== false,
  );
  const Arrow = ar ? ArrowLeft : ArrowRight;

  const todayStr = new Date().toDateString();
  const todayInspections = history.filter(
    (h) => new Date(h.created_at).toDateString() === todayStr,
  );
  const todayCount = todayInspections.length;
  const todayFails = todayInspections.reduce(
    (sum, h) => sum + (h.answers || []).filter((a) => a.answer === false).length, 0,
  );
  const lastInspection = history[0] || null;

  const canBreakdown = !allowedForms || allowedForms.breakdown;
  const canMdb = !allowedForms || allowedForms.mdb_reading;
  const canInspect = visibleBranches.length > 0;

  const NAV_TABS = [
    { key: "home",       label_ar: "الرئيسية", label_en: "Home",      Icon: House },
    ...(canInspect   ? [{ key: "inspection", label_ar: "الفحص",     label_en: "Inspect",   Icon: ClipboardText }] : []),
    ...(canBreakdown ? [{ key: "breakdown",  label_ar: "توقف",      label_en: "Breakdown", Icon: Lightning }] : []),
    ...(canMdb       ? [{ key: "mdb",        label_ar: "القراءات",  label_en: "MDB",       Icon: Gauge }] : []),
  ];

  /* InspectionForm takes over full screen (no bottom nav) */
  if (branch) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900" data-testid="tech-dashboard">
        <TopBar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <InspectionForm
            branch={branch}
            editInspection={editInspection}
            onBack={handleInspectionBack}
            onSubmitted={handleInspectionSubmitted}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900" data-testid="tech-dashboard">
      <TopBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-24">

        {/* ── HOME ── */}
        {activeTab === "home" && (
          <div>
            <div className="mb-5">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {t("tech_panel")}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {t("welcome")} {user?.name}
              </h1>
            </div>

            {/* Daily summary */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 sm:p-4 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <CheckSquare size={14} weight="bold" />
                  <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest leading-tight">
                    {t("today_inspections_count")}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{todayCount}</div>
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 sm:p-4 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <WarningCircle size={14} weight="bold" />
                  <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest leading-tight">
                    {t("today_fails_count")}
                  </span>
                </div>
                <div className={`text-2xl sm:text-3xl font-bold mt-1 ${todayFails > 0 ? "text-red-600" : "text-slate-900 dark:text-slate-100"}`}>
                  {todayFails}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 sm:p-4 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Timer size={14} weight="bold" />
                  <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest leading-tight">
                    {t("last_inspection_label")}
                  </span>
                </div>
                {lastInspection ? (
                  <>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 truncate">
                      {lastInspection.target_number}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {timeAgo(lastInspection.created_at, lang)}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-slate-400 mt-2">{t("no_inspections_today")}</div>
                )}
              </div>
            </div>

            {/* Quick-action buttons */}
            <div className={`grid gap-2 sm:gap-3 mb-6 ${[canInspect, canBreakdown, canMdb].filter(Boolean).length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
              {canInspect && (
                <button
                  onClick={() => switchTab("inspection")}
                  className="flex flex-col items-center justify-center gap-2 py-5 bg-slate-900 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
                >
                  <ClipboardText size={24} weight="bold" />
                  <span className="text-xs font-semibold">{ar ? "فحص" : "Inspect"}</span>
                </button>
              )}
              {canBreakdown && (
                <button
                  onClick={() => switchTab("breakdown")}
                  className="flex flex-col items-center justify-center gap-2 py-5 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors"
                >
                  <Lightning size={24} weight="bold" />
                  <span className="text-xs font-semibold">{ar ? "توقف" : "Breakdown"}</span>
                </button>
              )}
              {canMdb && (
                <button
                  onClick={() => switchTab("mdb")}
                  className="flex flex-col items-center justify-center gap-2 py-5 bg-[#005CBE] text-white rounded-lg hover:bg-blue-800 transition-colors"
                >
                  <Gauge size={24} weight="bold" />
                  <span className="text-xs font-semibold">{ar ? "قراءات" : "MDB"}</span>
                </button>
              )}
            </div>

            {/* Recent inspections */}
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <ClipboardText size={18} /> {t("recent_inspections")}
              </h3>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-x-auto rounded-lg">
                <table className="w-full text-sm min-w-[480px]">
                  <thead className="bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="text-start px-4 py-3 font-semibold">{t("date")}</th>
                      <th className="text-start px-4 py-3 font-semibold">{t("section")}</th>
                      <th className="text-start px-4 py-3 font-semibold">{t("target_number")}</th>
                      <th className="text-start px-4 py-3 font-semibold">{t("status")}</th>
                      <th className="text-start px-4 py-3 font-semibold">{t("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 && (
                      <tr><td colSpan="5" className="text-center text-slate-500 py-6">
                        {t("no_inspections_yet")}
                      </td></tr>
                    )}
                    {history.map((h) => {
                      const fails = (h.answers || []).filter((a) => a.answer === false).length;
                      const catKey =
                        h.category === "electrical"   ? "cat_electrical"   :
                        h.category === "mechanical"   ? "cat_mechanical"   :
                        h.category === "chiller"      ? "cat_chiller"      :
                        h.category === "panels_main"  ? "cat_panels_main"  :
                        h.category === "panels_sub"   ? "cat_panels_sub"   :
                        h.category === "cooling_tower"? "cat_cooling_tower": "cat_preventive";
                      const editable = canEdit(h.created_at);
                      return (
                        <tr key={h.id} className="border-t border-slate-100 dark:border-slate-700">
                          <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                            {new Date(h.created_at).toLocaleString(ar ? "ar-EG" : "en-US", {
                              year: "numeric", month: "numeric", day: "numeric",
                              hour: "numeric", hour12: true,
                            })}
                          </td>
                          <td className="px-4 py-3 dark:text-slate-300">{t(catKey)}</td>
                          <td className="px-4 py-3 font-semibold dark:text-slate-100">{h.target_number}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-semibold ${
                              fails > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                            }`}>
                              {fails > 0 ? `${fails} ${t("fails_label")}` : t("healthy")}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {editable && (
                              <button
                                onClick={() => handleEdit(h)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#6B2D6B] text-white hover:bg-[#5a2559] transition-colors"
                                title={t("edit_window_hint")}
                              >
                                <PencilSimple size={13} weight="bold" />
                                {t("edit_report")}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── INSPECTION ── */}
        {activeTab === "inspection" && (
          <div>
            <div className="mb-5">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                {ar ? "اختر قسم الفحص" : "Select Inspection Type"}
              </h2>
            </div>

            {selectedGroup ? (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <button
                    onClick={() => setSelectedGroup(null)}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <Arrow size={18} weight="bold" /> {t("back")}
                  </button>
                  <span className="text-slate-300">|</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {t(selectedGroup.title_key)}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {selectedGroup.children.map(({ key, title_key, desc_key, Icon, category, target_type, group, panel_type }) => (
                    <button key={key}
                            onClick={() => setBranch({ category, target_type, group, panel_type })}
                            className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5 sm:p-7 text-start hover:bg-slate-900 hover:text-white transition-all duration-150"
                            data-testid={`branch-${key}`}>
                      <div className="flex items-start justify-between">
                        <div className="h-12 w-12 sm:h-14 sm:w-14 bg-slate-900 dark:bg-slate-600 text-white flex items-center justify-center group-hover:bg-white group-hover:text-slate-900">
                          <Icon size={24} weight="bold" />
                        </div>
                        <Arrow size={20} className="text-slate-400 group-hover:text-white" weight="bold" />
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold mt-4 sm:mt-5 dark:text-slate-100 group-hover:text-white">
                        {t(title_key)}
                      </h3>
                      <p className="text-sm mt-2 leading-relaxed opacity-80">{t(desc_key)}</p>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {visibleBranches.map((grp) => (
                  <button key={grp.key}
                          onClick={() => grp.children ? setSelectedGroup(grp) : setBranch(grp.branch)}
                          className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5 sm:p-7 text-start hover:bg-slate-900 hover:text-white transition-all duration-150"
                          data-testid={`branch-${grp.key}`}>
                    <div className="flex items-start justify-between">
                      <div className="h-12 w-12 sm:h-14 sm:w-14 bg-slate-900 dark:bg-slate-600 text-white flex items-center justify-center group-hover:bg-white group-hover:text-slate-900">
                        <grp.Icon size={24} weight="bold" />
                      </div>
                      <Arrow size={20} className="text-slate-400 group-hover:text-white" weight="bold" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold mt-4 sm:mt-5 dark:text-slate-100 group-hover:text-white">
                      {t(grp.title_key)}
                    </h3>
                    <p className="text-sm mt-2 leading-relaxed opacity-80">{t(grp.desc_key)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── BREAKDOWN ── */}
        {activeTab === "breakdown" && (
          <BreakdownForm
            onBack={() => switchTab("home")}
            onSubmitted={() => { switchTab("home"); loadHistory(); }}
          />
        )}

        {/* ── MDB READINGS ── */}
        {activeTab === "mdb" && (
          <MDBReadingForm
            onBack={() => switchTab("home")}
            onSubmitted={() => switchTab("home")}
          />
        )}
      </main>

      {/* ── BOTTOM NAVIGATION ── */}
      <nav
        className="fixed bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 z-40"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-stretch h-16 max-w-7xl mx-auto">
          {NAV_TABS.map(({ key, label_ar, label_en, Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => switchTab(key)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors relative ${
                  active
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                {active && (
                  <span className="absolute top-0 inset-x-0 h-0.5 bg-slate-900 dark:bg-white" />
                )}
                <Icon size={22} weight={active ? "bold" : "regular"} />
                <span className="text-[10px] font-semibold leading-none">
                  {ar ? label_ar : label_en}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
