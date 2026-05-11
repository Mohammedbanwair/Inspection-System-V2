import { useEffect, useState } from "react";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../lib/i18n";
import TopBar from "../components/TopBar";
import InspectionForm from "./InspectionForm";
import { ClipboardText, ArrowRight, ArrowLeft, CheckSquare, WarningCircle, Timer } from "@phosphor-icons/react";

const PREVENTIVE_BRANCH = { category: "preventive", target_type: "machine" };

function timeAgo(dateStr, lang) {
  const mins = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (mins < 60) return lang === "ar" ? `منذ ${mins} دقيقة` : `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return lang === "ar" ? `منذ ${hrs} ساعة` : `${hrs} hr ago`;
  return new Date(dateStr).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US");
}

export default function HelperDashboard() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [branch, setBranch] = useState(null);
  const [history, setHistory] = useState([]);

  const loadHistory = async () => {
    try {
      const { data } = await api.get("/inspections");
      setHistory(data);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  useEffect(() => { loadHistory(); }, []);

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

  return (
    <div className="min-h-screen" data-testid="helper-dashboard">
      <TopBar />
      <main className="max-w-7xl mx-auto p-6">
        {!branch ? (
          <>
            <div className="mb-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                {t("helper_panel")}
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mt-1">
                {t("welcome")} {user?.name}
              </h1>
              <p className="text-sm text-slate-500 mt-1">{t("choose_section")}</p>
            </div>

            {/* Daily Summary */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white border border-slate-200 p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-slate-500">
                  <CheckSquare size={15} weight="bold" />
                  <span className="text-xs font-semibold uppercase tracking-widest">{t("today_inspections_count")}</span>
                </div>
                <div className="text-3xl font-bold text-slate-900 mt-1">{todayCount}</div>
              </div>
              <div className="bg-white border border-slate-200 p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-slate-500">
                  <WarningCircle size={15} weight="bold" />
                  <span className="text-xs font-semibold uppercase tracking-widest">{t("today_fails_count")}</span>
                </div>
                <div className={`text-3xl font-bold mt-1 ${todayFails > 0 ? "text-red-600" : "text-slate-900"}`}>
                  {todayFails}
                </div>
              </div>
              <div className="bg-white border border-slate-200 p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-slate-500">
                  <Timer size={15} weight="bold" />
                  <span className="text-xs font-semibold uppercase tracking-widest">{t("last_inspection_label")}</span>
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
              onClick={() => setBranch(PREVENTIVE_BRANCH)}
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
                      <tr><td colSpan="3" className="text-center text-slate-500 py-6">
                        {t("no_inspections_yet")}
                      </td></tr>
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
                              fails > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
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
        ) : (
          <InspectionForm
            branch={branch}
            onBack={handleBack}
            onSubmitted={handleSubmitted}
          />
        )}
      </main>
    </div>
  );
}
