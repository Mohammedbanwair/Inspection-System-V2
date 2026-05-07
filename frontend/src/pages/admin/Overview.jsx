import { useEffect, useState } from "react";
import { api, formatApiError } from "../../lib/api";
import { toast } from "sonner";
import { useI18n } from "../../lib/i18n";
import {
  ClipboardText, Wrench, UsersThree, Question, Warning, CalendarCheck,
  Snowflake, ListChecks, WarningOctagon,
} from "@phosphor-icons/react";

const CAT_KEY = {
  electrical: "cat_electrical", mechanical: "cat_mechanical",
  chiller: "cat_chiller", panels: "cat_panels",
};

function Stat({ icon: Icon, label, value, accent, testid }) {
  return (
    <div className="bg-white border border-slate-200 p-5 flex flex-col gap-3" data-testid={testid}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</span>
        <div className={`h-9 w-9 flex items-center justify-center ${accent || "bg-slate-900 text-white"}`}>
          <Icon size={18} weight="bold" />
        </div>
      </div>
      <div className="text-4xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

export default function Overview() {
  const { t, lang } = useI18n();
  const [stats, setStats] = useState(null);
  const [openFails, setOpenFails] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, f] = await Promise.all([
          api.get("/stats/overview"),
          api.get("/failures/open"),
        ]);
        setStats(s.data);
        setOpenFails(f.data);
      } catch (e) { toast.error(formatApiError(e)); }
      finally { setLoading(false); }
    })();
  }, []);

  const catLabel = (c) => t(CAT_KEY[c] || "cat_electrical");
  const typeLabel = (tt) => t(tt === "machine" ? "machine" : tt === "chiller" ? "chiller" : "panel");

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6" data-testid="admin-overview">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Stat icon={ClipboardText} label={t("total_inspections")} value={stats?.total_inspections ?? "—"} testid="stat-total-inspections" />
        <Stat icon={CalendarCheck} label={t("today_inspections")} value={stats?.today_inspections ?? "—"} accent="bg-[#005CBE] text-white" testid="stat-today-inspections" />
        <Stat icon={WarningOctagon} label={t("open_fails_stat")} value={stats?.open_fails ?? "—"} accent="bg-red-500 text-white" testid="stat-open-fails" />
        <Stat icon={Wrench} label={t("machines_label")} value={stats?.total_machines ?? "—"} testid="stat-machines" />
        <Stat icon={Snowflake} label={t("chillers_label")} value={stats?.total_chillers ?? "—"} testid="stat-chillers" />
        <Stat icon={ListChecks} label={t("panels_label")} value={stats?.total_panels ?? "—"} testid="stat-panels" />
      </div>

      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
          <WarningOctagon size={20} weight="bold" className="text-red-500" />
          {t("open_failures")} ({openFails.length})
        </h3>
        <div className="bg-white border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-start px-4 py-3 font-semibold">{t("type")}</th>
                <th className="text-start px-4 py-3 font-semibold">{t("target_number")}</th>
                <th className="text-start px-4 py-3 font-semibold">{t("section")}</th>
                <th className="text-start px-4 py-3 font-semibold">{t("question")}</th>
                <th className="text-start px-4 py-3 font-semibold">{t("reported_by")}</th>
                <th className="text-start px-4 py-3 font-semibold">{t("since")}</th>
              </tr>
            </thead>
            <tbody>
              {openFails.length === 0 && (
                <tr><td colSpan="6" className="text-center text-emerald-700 py-8 font-semibold bg-emerald-50/40">
                  ✓ {t("no_open_failures")}
                </td></tr>
              )}
              {openFails.map((f, i) => (
                <tr key={`${f.target_id}-${f.question_id}`} className={`border-t border-slate-100 ${i % 2 ? "bg-slate-50/40" : ""}`}>
                  <td className="px-4 py-3">{typeLabel(f.target_type)}</td>
                  <td className="px-4 py-3 font-semibold">{f.target_number}</td>
                  <td className="px-4 py-3">{catLabel(f.category)}</td>
                  <td className="px-4 py-3">
                    <div>{f.question_text}</div>
                    {f.note && <div className="text-xs text-slate-500 mt-1">{t("notes")}: {f.note}</div>}
                  </td>
                  <td className="px-4 py-3">{f.technician_name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(f.since).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
