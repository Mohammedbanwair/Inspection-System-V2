import { useEffect, useState } from "react";
import { api, formatApiError } from "../../lib/api";
import { toast } from "sonner";
import { useI18n } from "../../lib/i18n";
import {
  ClipboardText, Wrench, UsersThree, Question, Warning, CalendarCheck,
  Snowflake, ListChecks, WarningOctagon, Lightning, CheckCircle,
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

function MiniStat({ label, value, color }) {
  return (
    <div className="flex flex-col gap-1 text-center">
      <div className={`text-2xl font-bold ${color || "text-slate-900"}`}>{value}</div>
      <div className="text-xs font-semibold text-slate-500 leading-tight">{label}</div>
    </div>
  );
}

export default function Overview() {
  const { t, lang } = useI18n();
  const ar = lang === "ar";
  const [stats, setStats] = useState(null);
  const [openFails, setOpenFails] = useState([]);
  const [monthly, setMonthly] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, f, m] = await Promise.all([
          api.get("/stats/overview"),
          api.get("/failures/open"),
          api.get("/stats/monthly-breakdown"),
        ]);
        setStats(s.data);
        setOpenFails(f.data);
        setMonthly(m.data);
      } catch (e) { toast.error(formatApiError(e)); }
      finally { setLoading(false); }
    })();
  }, []);

  const catLabel = (c) => t(CAT_KEY[c] || "cat_electrical");
  const typeLabel = (tt) => t(tt === "machine" ? "machine" : tt === "chiller" ? "chiller" : "panel");

  // Health score: % of today's inspections with zero failures
  const todayInspections = stats?.today_inspections ?? 0;
  const healthPct = todayInspections === 0 ? null
    : Math.round(((todayInspections - (stats?.today_fails ?? 0)) / todayInspections) * 100);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6" data-testid="admin-overview">

      {/* KPI Cards — removed open_fails, added health */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Stat icon={ClipboardText} label={t("total_inspections")}  value={stats?.total_inspections ?? "—"} testid="stat-total-inspections" />
        <Stat icon={CalendarCheck} label={t("today_inspections")}  value={stats?.today_inspections ?? "—"} accent="bg-[#005CBE] text-white" testid="stat-today-inspections" />
        <Stat icon={CheckCircle}   label={t("health_score")}
              value={healthPct !== null ? `${healthPct}%` : "—"}
              accent={healthPct !== null && healthPct >= 80 ? "bg-emerald-600 text-white" : healthPct !== null ? "bg-amber-500 text-white" : "bg-slate-900 text-white"}
              testid="stat-health" />
        <Stat icon={Wrench}        label={t("machines_label")}     value={stats?.total_machines ?? "—"} testid="stat-machines" />
        <Stat icon={Snowflake}     label={t("chillers_label")}     value={stats?.total_chillers ?? "—"} testid="stat-chillers" />
        <Stat icon={ListChecks}    label={t("panels_label")}       value={stats?.total_panels ?? "—"} testid="stat-panels" />
      </div>

      {/* Monthly Breakdown Indicator */}
      <div className="bg-white border border-slate-200">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <Lightning size={18} weight="bold" className="text-amber-500" />
          <h3 className="text-base font-bold text-slate-900">{t("monthly_breakdown_title")}</h3>
        </div>

        {monthly?.total === 0 ? (
          <div className="px-5 py-8 text-center text-emerald-700 font-semibold bg-emerald-50/40">
            ✓ {t("no_breakdowns_month")}
          </div>
        ) : (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Mini stats row */}
            <div>
              <div className="grid grid-cols-4 gap-3 mb-5 bg-slate-50 border border-slate-100 p-4">
                <MiniStat label={t("monthly_breakdowns_count")} value={monthly?.total ?? 0} />
                <MiniStat label={t("monthly_resolved")}         value={monthly?.resolved ?? 0} color="text-emerald-600" />
                <MiniStat label={t("monthly_open")}             value={monthly?.open ?? 0}     color={monthly?.open > 0 ? "text-red-500" : "text-slate-900"} />
                <MiniStat label={t("monthly_downtime_hours")}   value={`${monthly?.downtime_hours ?? 0}h`} color="text-amber-600" />
              </div>

              {/* Resolved vs Open bar */}
              {monthly?.total > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-500">
                    <span>{t("monthly_resolved")}</span>
                    <span>{Math.round((monthly.resolved / monthly.total) * 100)}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${(monthly.resolved / monthly.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Top causes */}
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                {t("top_causes_title")}
              </div>
              {monthly?.top_causes?.length === 0 ? (
                <p className="text-sm text-slate-400">—</p>
              ) : (
                <div className="space-y-2">
                  {monthly?.top_causes?.map((c, i) => {
                    const maxCount = monthly.top_causes[0]?.count || 1;
                    const pct = Math.round((c.count / maxCount) * 100);
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-slate-700 truncate flex-1" title={c.cause}>
                            <span className="font-bold text-slate-400 me-2">{i + 1}.</span>
                            {c.cause}
                          </span>
                          <span className="text-xs font-bold text-slate-600 shrink-0 bg-slate-100 px-2 py-0.5">
                            {c.count}x
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: i === 0 ? "#EF4444" : i === 1 ? "#F97316" : "#F59E0B",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Open Failures Table */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
          <WarningOctagon size={20} weight="bold" className="text-red-500" />
          {t("open_failures")} ({openFails.length})
        </h3>
        <div className="bg-white border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
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
                    {new Date(f.since).toLocaleString(ar ? "ar-EG" : "en-US")}
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
