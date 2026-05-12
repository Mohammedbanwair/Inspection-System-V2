import { useEffect, useState } from "react";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../lib/i18n";
import TopBar from "../components/TopBar";
import InspectionForm from "./InspectionForm";
import {
  ClipboardText, ArrowRight, ArrowLeft, CheckSquare, WarningCircle,
  Timer, CalendarCheck, Warning,
} from "@phosphor-icons/react";

function timeAgo(dateStr, lang) {
  const mins = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (mins < 60) return lang === "ar" ? `منذ ${mins} دقيقة` : `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return lang === "ar" ? `منذ ${hrs} ساعة` : `${hrs} hr ago`;
  return new Date(dateStr).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US");
}

function PlanCard({ plan, failures, onStart, t, lang }) {
  const machineFails = failures.filter((f) => f.target_id === plan.machine_id);
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;
  return (
    <div className="bg-white border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xl font-bold text-slate-900">{plan.machine_number}</span>
            {plan.machine_name && (
              <span className="text-slate-500 text-sm">— {plan.machine_name}</span>
            )}
          </div>
          <div className="text-xs text-slate-400">{plan.scheduled_date}</div>
        </div>
        <button
          onClick={() => onStart(plan)}
          className="h-10 px-4 bg-slate-900 text-white font-semibold flex items-center gap-2 hover:bg-slate-800 text-sm shrink-0"
          data-testid={`start-plan-${plan.id}`}
        >
          {t("start_plan_inspection")} <Arrow size={14} weight="bold" />
        </button>
      </div>

      {machineFails.length > 0 ? (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-1.5 mb-2 text-red-600">
            <Warning size={14} weight="bold" />
            <span className="text-xs font-bold uppercase tracking-wide">
              {t("plan_failures")} ({machineFails.length})
            </span>
          </div>
          <ul className="space-y-1">
            {machineFails.map((f, i) => (
              <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                <span className="text-red-500 mt-0.5 shrink-0">✗</span>
                <span>
                  <span className="font-semibold text-slate-500 text-[10px] uppercase mr-1">
                    {f.category === "electrical" ? "Elec" : "Mech"}
                  </span>
                  {f.question_text}
                  {f.note && <span className="text-slate-400"> — {f.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-3 text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
          <CheckSquare size={13} weight="bold" />
          {t("no_failures_machine")}
        </div>
      )}
    </div>
  );
}

const TABS = ["dashboard", "plan"];

export default function HelperDashboard() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [branch, setBranch] = useState(null);
  const [history, setHistory] = useState([]);
  const [plans, setPlans] = useState([]);
  const [failures, setFailures] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const loadHistory = async () => {
    try {
      const { data } = await api.get("/inspections");
      setHistory(data);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const loadPlansAndFailures = async () => {
    setLoadingPlans(true);
    try {
      const [plansRes, failsRes] = await Promise.all([
        api.get("/preventive-plans"),
        api.get("/failures/open", { params: { target_type: "machine" } }),
      ]);
      setPlans(plansRes.data);
      setFailures(failsRes.data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => { loadHistory(); }, []);
  useEffect(() => {
    if (activeTab === "plan") loadPlansAndFailures();
  }, [activeTab]);

  const handleBack = () => setBranch(null);
  const handleSubmitted = () => { setBranch(null); loadHistory(); };

  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  const todayStr = new Date().toDateString();
  const todayInspections = history.filter(
    (h) => new Date(h.created_at).toDateString() === todayStr,
  );
  const todayCount = todayInspections.length;
  const todayFails = todayInspections.reduce(
    (sum, h) => sum + (h.answers || []).filter((a) => a.answer === false).length, 0,
  );
  const lastInspection = history[0] || null;

  if (branch) {
    return (
      <div className="min-h-screen" data-testid="helper-dashboard">
        <TopBar />
        <main className="max-w-7xl mx-auto p-6">
          <InspectionForm branch={branch} onBack={handleBack} onSubmitted={handleSubmitted} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" data-testid="helper-dashboard">
      <TopBar />
      <main className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            {t("helper_panel")}
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mt-1">
            {t("welcome")} {user?.name}
          </h1>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-5 py-3 border-b-4 font-semibold flex items-center gap-2 transition-all ${
              activeTab === "dashboard"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <ClipboardText size={16} weight={activeTab === "dashboard" ? "bold" : "regular"} />
            {t("preventive_maintenance")}
          </button>
          <button
            onClick={() => setActiveTab("plan")}
            className={`px-5 py-3 border-b-4 font-semibold flex items-center gap-2 transition-all ${
              activeTab === "plan"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <CalendarCheck size={16} weight={activeTab === "plan" ? "bold" : "regular"} />
            {t("tab_preventive_plan")}
            {plans.length > 0 && activeTab !== "plan" && (
              <span className="h-5 min-w-[20px] px-1 bg-[#6B2D6B] text-white text-xs font-bold flex items-center justify-center rounded-full">
                {plans.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "dashboard" && (
          <>
            {/* Daily Summary */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white border border-slate-200 p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-slate-500">
                  <CheckSquare size={15} weight="bold" />
                  <span className="text-xs font-semibold uppercase tracking-widest">
                    {t("today_inspections_count")}
                  </span>
                </div>
                <div className="text-3xl font-bold text-slate-900 mt-1">{todayCount}</div>
              </div>
              <div className="bg-white border border-slate-200 p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-slate-500">
                  <WarningCircle size={15} weight="bold" />
                  <span className="text-xs font-semibold uppercase tracking-widest">
                    {t("today_fails_count")}
                  </span>
                </div>
                <div className={`text-3xl font-bold mt-1 ${todayFails > 0 ? "text-red-600" : "text-slate-900"}`}>
                  {todayFails}
                </div>
              </div>
              <div className="bg-white border border-slate-200 p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-slate-500">
                  <Timer size={15} weight="bold" />
                  <span className="text-xs font-semibold uppercase tracking-widest">
                    {t("last_inspection_label")}
                  </span>
                </div>
                {lastInspection ? (
                  <>
                    <div className="text-sm font-bold text-slate-900 mt-1 truncate">
                      {lastInspection.target_number}
                    </div>
                    <div className="text-xs text-slate-500">{timeAgo(lastInspection.created_at, lang)}</div>
                  </>
                ) : (
                  <div className="text-xs text-slate-400 mt-2">{t("no_inspections_today")}</div>
                )}
              </div>
            </div>

            {/* Start Inspection Card */}
            <button
              onClick={() => setBranch({ category: "preventive", target_type: "machine" })}
              className="group bg-white border border-slate-200 p-7 text-start hover:bg-slate-900 hover:text-white transition-all duration-150 w-full"
              data-testid="start-preventive-btn"
            >
              <div className="flex items-start justify-between">
                <div className="h-14 w-14 bg-slate-900 text-white flex items-center justify-center group-hover:bg-white group-hover:text-slate-900">
                  <ClipboardText size={28} weight="bold" />
                </div>
                <Arrow size={22} className="text-slate-400 group-hover:text-white" weight="bold" />
              </div>
              <h3 className="text-2xl font-bold mt-5">{t("preventive_maintenance")}</h3>
              <p className="text-sm mt-2 leading-relaxed opacity-80">{t("branch_preventive_desc")}</p>
            </button>

            {/* History */}
            <div className="mt-10">
              <h3 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                <ClipboardText size={20} /> {t("recent_inspections")}
              </h3>
              <div className="bg-white border border-slate-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-start px-4 py-3 font-semibold">{t("date")}</th>
                      <th className="text-start px-4 py-3 font-semibold">{t("target_number")}</th>
                      <th className="text-start px-4 py-3 font-semibold">{t("status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 && (
                      <tr>
                        <td colSpan="3" className="text-center text-slate-500 py-6">
                          {t("no_inspections_yet")}
                        </td>
                      </tr>
                    )}
                    {history.map((h) => {
                      const fails = (h.answers || []).filter((a) => a.answer === false).length;
                      return (
                        <tr key={h.id} className="border-t border-slate-100">
                          <td className="px-4 py-3">
                            {new Date(h.created_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-US", {
                              year: "numeric", month: "numeric", day: "numeric",
                              hour: "numeric", hour12: true,
                            })}
                          </td>
                          <td className="px-4 py-3 font-semibold">{h.target_number}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-semibold ${
                              fails > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                            }`}>
                              {fails > 0 ? `${fails} ${t("fails_label")}` : t("healthy")}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === "plan" && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <CalendarCheck size={18} className="text-[#6B2D6B]" weight="bold" />
              <h3 className="text-lg font-bold text-slate-900">{t("today_plans")}</h3>
            </div>

            {loadingPlans && (
              <div className="text-slate-400 text-sm py-8 text-center">{t("loading")}</div>
            )}

            {!loadingPlans && plans.length === 0 && (
              <div className="bg-white border border-slate-200 p-10 text-center text-slate-400">
                {t("no_plans_today")}
              </div>
            )}

            {!loadingPlans && plans.length > 0 && (
              <div className="space-y-3">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    failures={failures}
                    onStart={(p) => setBranch({
                      category: "preventive",
                      target_type: "machine",
                      defaultTargetId: p.machine_id,
                    })}
                    t={t}
                    lang={lang}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
