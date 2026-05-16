import { useState, useEffect, useCallback } from "react";
import { api, formatApiError, downloadBlob } from "../../lib/api";
import { toast } from "sonner";
import { useI18n } from "../../lib/i18n";
import { FileXls, FilePdf } from "@phosphor-icons/react";
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

const PURPLE   = "#6B2D6B";
const ELEC_CLR = "#3B82F6";
const MECH_CLR = "#F97316";
const PM_CLR   = "#10B981";
const BAR_CLRS = ["#6B2D6B","#9B4F9B","#C084C0","#3B82F6","#F97316","#10B981","#EF4444","#F59E0B","#8B5CF6","#06B6D4"];

const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

function fmtMttr(minutes) {
  if (!minutes || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function KpiCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white border border-slate-200 p-4 sm:p-5">
      <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">{label}</div>
      <div className="text-2xl sm:text-3xl font-bold" style={{ color: accent || "#0f172a" }}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 shadow-lg rounded px-3 py-2 text-xs">
      <div className="font-bold text-slate-700 mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color }} className="flex gap-2">
          <span>{p.name}:</span>
          <span className="font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function Analytics() {
  const { t, lang } = useI18n();
  const ar = lang === "ar";

  const currentYear = new Date().getFullYear();
  const [yearFilter,    setYearFilter]    = useState(String(currentYear));
  const [monthFilter,   setMonthFilter]   = useState("");
  const [machineFilter, setMachineFilter] = useState("");
  const [specFilter,    setSpecFilter]    = useState("");
  const [machines,      setMachines]      = useState([]);
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(false);

  useEffect(() => {
    api.get("/machines").then(({ data: ms }) => setMachines(ms)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (yearFilter)    params.year      = Number(yearFilter);
      if (monthFilter)   params.month     = Number(monthFilter);
      if (machineFilter) params.machine_id = machineFilter;
      if (specFilter)    params.specialty  = specFilter;
      const { data: res } = await api.get("/analytics/maintenance", { params });
      setData(res);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  }, [yearFilter, monthFilter, machineFilter, specFilter]);

  useEffect(() => { load(); }, [load]);

  const exportFile = async (type) => {
    try {
      const params = new URLSearchParams();
      if (yearFilter)    params.append("year",       yearFilter);
      if (monthFilter)   params.append("month",      monthFilter);
      if (machineFilter) params.append("machine_id", machineFilter);
      if (specFilter)    params.append("specialty",  specFilter);
      const ext = type === "excel" ? "xlsx" : "pdf";
      await downloadBlob(
        `/analytics/maintenance/export/${type}?${params}`,
        `analytics_${yearFilter || "all"}_${monthFilter || "all"}.${ext}`
      );
      toast.success(ar ? "تم التصدير ✓" : "Exported ✓");
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const ov = data?.overview ?? {};
  const monthNames = ar ? MONTHS_AR : MONTHS_EN;

  // Pie data
  const pieData = [
    { name: t("elec_label"), value: ov.electrical_count ?? 0 },
    { name: t("mech_label"), value: ov.mechanical_count ?? 0 },
  ].filter((d) => d.value > 0);

  const yearOptions = [];
  for (let y = currentYear; y >= currentYear - 5; y--) yearOptions.push(y);

  return (
    <div data-testid="analytics-panel">
      {/* Filters */}
      <div className="bg-white border border-slate-200 p-4 sm:p-5 mb-5">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}
                  className="h-11 px-3 border border-slate-200 bg-white text-sm">
            <option value="">{t("all_years")}</option>
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}
                  className="h-11 px-3 border border-slate-200 bg-white text-sm">
            <option value="">{t("all_months")}</option>
            {monthNames.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>

          <select value={machineFilter} onChange={(e) => setMachineFilter(e.target.value)}
                  className="h-11 px-3 border border-slate-200 bg-white text-sm">
            <option value="">{ar ? "كل المكائن" : "All Machines"}</option>
            {machines.map((m) => <option key={m.id} value={m.id}>{m.number}{m.name ? ` — ${m.name}` : ""}</option>)}
          </select>

          <select value={specFilter} onChange={(e) => setSpecFilter(e.target.value)}
                  className="h-11 px-3 border border-slate-200 bg-white text-sm">
            <option value="">{t("specialty_all")}</option>
            <option value="electrical">{ar ? "كهربائي" : "Electrical"}</option>
            <option value="mechanical">{ar ? "ميكانيكي" : "Mechanical"}</option>
          </select>

          <div className="flex gap-2 col-span-2 sm:col-span-1 md:col-span-1">
            <button onClick={() => exportFile("excel")}
                    className="flex-1 h-11 bg-[#1D6F42] text-white font-semibold flex items-center justify-center gap-1.5 hover:bg-[#155734] text-sm">
              <FileXls size={15} weight="bold" />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button onClick={() => exportFile("pdf")}
                    className="flex-1 h-11 bg-red-700 text-white font-semibold flex items-center justify-center gap-1.5 hover:bg-red-800 text-sm">
              <FilePdf size={15} weight="bold" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-[#6B2D6B] rounded-full animate-spin" />
        </div>
      )}

      {!loading && data && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-5">
            <KpiCard label={t("kpi_total_breakdowns")} value={ov.total_breakdowns ?? 0} accent={PURPLE} />
            <KpiCard label={t("kpi_pm_count")}         value={ov.pm_count ?? 0} accent={PM_CLR} />
            <KpiCard label={t("kpi_downtime_hours")}   value={`${ov.total_downtime_hours ?? 0}h`} />
            <KpiCard label={t("kpi_mttr")}             value={fmtMttr(ov.mttr_minutes)} sub="Mean Time To Repair" />
            <KpiCard label={t("kpi_mtbf")}             value={ov.mtbf_hours ? `${ov.mtbf_hours}h` : "—"} sub="Mean Time Between Failures" />
            <KpiCard label={t("kpi_availability")}
                     value={ov.availability_pct != null && ov.availability_pct > 0 ? `${ov.availability_pct}%` : "—"}
                     sub="Availability = MTBF/(MTBF+MTTR)"
                     accent={ov.availability_pct >= 95 ? "#10B981" : ov.availability_pct >= 80 ? "#F59E0B" : ov.availability_pct > 0 ? "#EF4444" : undefined} />
            <KpiCard label={t("kpi_most_failed")}      value={ov.most_failed_machine || "—"} accent={PURPLE}
                     sub={ar ? "أعلى عدد تعطلات" : "highest failure count"} />
          </div>

          {/* Row 1: Monthly Trend + Specialty Pie */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Monthly Trend LineChart */}
            <div className="lg:col-span-2 bg-white border border-slate-200 p-4 sm:p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-4">{t("chart_monthly_trend")}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.monthly_trend} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={(v) => v.split(" ")[0]} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="count"          name={t("chart_breakdowns")}
                        stroke={PURPLE}   strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="downtime_hours" name={t("chart_downtime")}
                        stroke={ELEC_CLR} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="pm_count"       name={t("chart_pm")}
                        stroke={PM_CLR}   strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Specialty Pie */}
            <div className="bg-white border border-slate-200 p-4 sm:p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-4">{t("chart_by_specialty")}</h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                         dataKey="value" nameKey="name" paddingAngle={3}>
                      <Cell fill={ELEC_CLR} />
                      <Cell fill={MECH_CLR} />
                    </Pie>
                    <Tooltip formatter={(v, name) => [v, name]} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">
                  {ar ? "لا توجد بيانات" : "No data"}
                </div>
              )}
              {/* specialty counts below pie */}
              <div className="flex gap-4 mt-2 justify-center text-xs">
                <span style={{ color: ELEC_CLR }} className="font-semibold">
                  {t("elec_label")}: {ov.electrical_count ?? 0}
                </span>
                <span style={{ color: MECH_CLR }} className="font-semibold">
                  {t("mech_label")}: {ov.mechanical_count ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Row 2: Top Machines + Top Reasons */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Top Machines horizontal bar */}
            <div className="bg-white border border-slate-200 p-4 sm:p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-4">{t("chart_top_machines")}</h3>
              {data.by_machine.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(data.by_machine.length * 36 + 20, 200)}>
                  <BarChart data={data.by_machine} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="machine" tick={{ fontSize: 10 }} width={64} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name={t("chart_breakdowns")} radius={[0, 3, 3, 0]}>
                      {data.by_machine.map((_, i) => <Cell key={i} fill={BAR_CLRS[i % BAR_CLRS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                  {ar ? "لا توجد بيانات" : "No data"}
                </div>
              )}
            </div>

            {/* Top Reasons horizontal bar */}
            <div className="bg-white border border-slate-200 p-4 sm:p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-4">{t("chart_top_reasons")}</h3>
              {data.top_reasons.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(data.top_reasons.length * 36 + 20, 200)}>
                  <BarChart data={data.top_reasons} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="reason" tick={{ fontSize: 10 }} width={110} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name={t("chart_breakdowns")} fill={PURPLE} radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                  {ar ? "لا توجد بيانات" : "No data"}
                </div>
              )}
            </div>
          </div>

          {/* Per-machine table */}
          {data.by_machine.length > 0 && (
            <div className="bg-white border border-slate-200 overflow-x-auto">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-700">{t("per_machine_table")}</h3>
              </div>
              <table className="w-full text-sm min-w-[480px]">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-start px-4 py-3 font-semibold">{ar ? "المكينة" : "Machine"}</th>
                    <th className="text-center px-4 py-3 font-semibold">{t("chart_breakdowns")}</th>
                    <th className="text-center px-4 py-3 font-semibold">{t("chart_downtime")}</th>
                    <th className="text-center px-4 py-3 font-semibold">{ar ? "MTTR" : "MTTR"}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_machine.map((row, i) => {
                    const machMttr = row.count > 0
                      ? fmtMttr((row.downtime_hours * 60) / row.count)
                      : "—";
                    return (
                      <tr key={row.machine} className={`border-t border-slate-100 ${i % 2 ? "bg-slate-50/40" : ""}`}>
                        <td className="px-4 py-3 font-semibold">
                          <span className="px-2 py-1 text-xs font-bold bg-[#EDE0ED] text-[#6B2D6B]">{row.machine}</span>
                          {row.name && <span className="text-slate-500 ms-2 text-xs">{row.name}</span>}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700">{row.count}</td>
                        <td className="px-4 py-3 text-center font-mono text-xs">{row.downtime_hours}h</td>
                        <td className="px-4 py-3 text-center font-mono text-xs font-bold" style={{ color: PURPLE }}>
                          {machMttr}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!loading && !data && (
        <div className="text-center text-slate-400 py-16">{t("no_results")}</div>
      )}
    </div>
  );
}
