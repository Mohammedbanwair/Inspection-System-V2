import { useState, useEffect, useCallback } from "react";
import { api, formatApiError, downloadBlob } from "../../lib/api";
import { toast } from "sonner";
import { useI18n } from "../../lib/i18n";
import { FileXls, FilePdf, ArrowsOut, X as XIcon } from "@phosphor-icons/react";
import {
  ResponsiveContainer,
  ComposedChart, LineChart, Line,
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

function FullscreenChart({ title, normalHeight = 220, children }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="relative group" style={{ height: normalHeight }}>
        {children}
        <button
          onClick={() => setOpen(true)}
          className="absolute top-1 end-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 border border-slate-200 text-slate-400 hover:text-slate-700 rounded"
          title="توسيع"
        >
          <ArrowsOut size={13} />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <span className="font-bold text-slate-700">{title}</span>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700">
                <XIcon size={20} />
              </button>
            </div>
            <div className="p-5" style={{ height: "65vh" }}>
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
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
  const [dateFrom,      setDateFrom]      = useState("");
  const [dateTo,        setDateTo]        = useState("");
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
      // date range takes priority over year/month dropdowns
      if (dateFrom && dateTo) {
        params.date_from = dateFrom;
        params.date_to   = dateTo;
      } else {
        if (yearFilter)  params.year  = Number(yearFilter);
        if (monthFilter) params.month = Number(monthFilter);
      }
      if (machineFilter) params.machine_id = machineFilter;
      if (specFilter)    params.specialty  = specFilter;
      const { data: res } = await api.get("/analytics/maintenance", { params });
      setData(res);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  }, [yearFilter, monthFilter, machineFilter, specFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const exportFile = async (type) => {
    try {
      const params = new URLSearchParams();
      if (dateFrom && dateTo) {
        params.append("date_from", dateFrom);
        params.append("date_to",   dateTo);
      } else {
        if (yearFilter)  params.append("year",  yearFilter);
        if (monthFilter) params.append("month", monthFilter);
      }
      if (machineFilter) params.append("machine_id", machineFilter);
      if (specFilter)    params.append("specialty",  specFilter);
      const ext = type === "excel" ? "xlsx" : "pdf";
      const label = dateFrom ? `${dateFrom}_${dateTo}` : `${yearFilter || "all"}_${monthFilter || "all"}`;
      await downloadBlob(
        `/analytics/maintenance/export/${type}?${params}`,
        `analytics_${label}.${ext}`
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
      <div className="bg-white border border-slate-200 p-4 sm:p-5 mb-5 space-y-3">
        {/* Row 1: Year / Month / Machine / Specialty */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <select value={yearFilter} onChange={(e) => { setYearFilter(e.target.value); setDateFrom(""); setDateTo(""); }}
                  className="h-11 px-3 border border-slate-200 bg-white text-sm">
            <option value="">{t("all_years")}</option>
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          <select value={monthFilter} onChange={(e) => { setMonthFilter(e.target.value); setDateFrom(""); setDateTo(""); }}
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
        </div>

        {/* Row 2: Custom date range + export */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setYearFilter(""); setMonthFilter(""); }}
            placeholder={t("date_from")}
            dir="ltr"
            className="h-11 px-3 border border-slate-200 text-sm"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setYearFilter(""); setMonthFilter(""); }}
            placeholder={t("date_to")}
            dir="ltr"
            className="h-11 px-3 border border-slate-200 text-sm"
          />
          <button
            onClick={() => exportFile("excel")}
            className="h-11 bg-[#1D6F42] text-white font-semibold flex items-center justify-center gap-1.5 hover:bg-[#155734] text-sm"
          >
            <FileXls size={15} weight="bold" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => exportFile("pdf")}
            className="h-11 bg-red-700 text-white font-semibold flex items-center justify-center gap-1.5 hover:bg-red-800 text-sm"
          >
            <FilePdf size={15} weight="bold" />
            <span>PDF</span>
          </button>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            <KpiCard label={t("kpi_total_breakdowns")} value={ov.total_breakdowns ?? 0} accent={PURPLE} />
            <KpiCard label={ar ? "غير مخططة" : "Unplanned"}
                     value={ov.unplanned_count ?? (ov.total_breakdowns ?? 0)}
                     accent="#EF4444"
                     sub={ar ? "توقف غير متوقع" : "unexpected downtime"} />
            <KpiCard label={ar ? "مخططة (PM)" : "Planned (PM)"}
                     value={ov.planned_count ?? 0}
                     accent="#10B981"
                     sub={ar ? "صيانة دورية" : "preventive maintenance"} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
            <KpiCard label={t("kpi_downtime_hours")}   value={`${ov.total_downtime_hours ?? 0}h`} />
            <KpiCard label={t("kpi_mttr")}             value={fmtMttr(ov.mttr_minutes)} sub="Mean Time To Repair" />
            <KpiCard label={t("kpi_mtbf")}             value={ov.mtbf_hours ? `${ov.mtbf_hours}h` : "—"} sub="Mean Time Between Failures" />
            <KpiCard label={t("kpi_availability")}
                     value={ov.availability_pct != null && (ov.total_breakdowns ?? 0) > 0 ? `${ov.availability_pct}%` : "—"}
                     sub="MTBF / (MTBF + MTTR)"
                     accent={ov.availability_pct >= 95 ? "#10B981" : ov.availability_pct >= 80 ? "#F59E0B" : ov.availability_pct >= 0 ? "#EF4444" : undefined} />
            <KpiCard label={t("kpi_most_failed")} value={ov.most_failed_machine || "—"} accent={PURPLE}
                     sub={ar ? "أعلى عدد تعطلات" : "highest failure count"} />
          </div>

          {/* Row 1: Monthly Trend + Specialty Pie */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Monthly Trend ComposedChart */}
            <div className="lg:col-span-2 bg-white border border-slate-200 p-4 sm:p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-1">{t("chart_monthly_trend")}</h3>
              <div className="flex gap-4 text-xs text-slate-500 mb-3 flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-red-400" />
                  {ar ? "غير مخططة" : "Unplanned"}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500" />
                  {ar ? "مخططة (PM)" : "Planned (PM)"}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-5 h-0.5 bg-blue-500" style={{ borderTop: "2px dashed #3B82F6" }} />
                  {ar ? "ساعات التوقف" : "Downtime (h)"}
                </span>
              </div>
              <FullscreenChart title={t("chart_monthly_trend")} normalHeight={220}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={data.monthly_trend.map((d) => ({
                    ...d,
                    unplanned_count: (d.count || 0) - (d.planned_count || 0),
                  }))}
                  margin={{ top: 4, right: 40, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={(v) => v.split(" ")[0]} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: ELEC_CLR }} unit="h" />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const unplanned = payload.find((p) => p.dataKey === "unplanned_count");
                      const planned   = payload.find((p) => p.dataKey === "planned_count");
                      const downtime  = payload.find((p) => p.dataKey === "downtime_hours");
                      const total     = (unplanned?.value || 0) + (planned?.value || 0);
                      return (
                        <div className="bg-white border border-slate-200 shadow-lg rounded px-3 py-2 text-xs min-w-[140px]">
                          <div className="font-bold text-slate-700 mb-1.5">{label}</div>
                          <div className="space-y-0.5">
                            <div className="flex justify-between gap-3">
                              <span className="text-slate-500">{ar ? "الإجمالي" : "Total"}</span>
                              <span className="font-bold text-slate-800">{total}</span>
                            </div>
                            {unplanned && (
                              <div className="flex justify-between gap-3">
                                <span style={{ color: "#EF4444" }}>{ar ? "غير مخطط" : "Unplanned"}</span>
                                <span className="font-semibold">{unplanned.value}</span>
                              </div>
                            )}
                            {planned && (
                              <div className="flex justify-between gap-3">
                                <span style={{ color: "#10B981" }}>{ar ? "مخطط (PM)" : "Planned (PM)"}</span>
                                <span className="font-semibold">{planned.value}</span>
                              </div>
                            )}
                            {downtime && (
                              <div className="flex justify-between gap-3 border-t border-slate-100 pt-0.5 mt-0.5">
                                <span style={{ color: ELEC_CLR }}>{ar ? "التوقف" : "Downtime"}</span>
                                <span className="font-semibold">{downtime.value}h</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar yAxisId="left" dataKey="unplanned_count" name={ar ? "غير مخططة" : "Unplanned"}
                       stackId="bd" fill="#EF4444" fillOpacity={0.85} radius={[0, 0, 0, 0]} maxBarSize={40} />
                  <Bar yAxisId="left" dataKey="planned_count"   name={ar ? "مخططة (PM)" : "Planned (PM)"}
                       stackId="bd" fill="#10B981" fillOpacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={40} />
                  <Line yAxisId="right" type="monotone" dataKey="downtime_hours"
                        name={ar ? "ساعات التوقف" : "Downtime (h)"}
                        stroke={ELEC_CLR} strokeWidth={2} dot={{ r: 3, fill: ELEC_CLR }}
                        activeDot={{ r: 5 }} strokeDasharray="5 3" />
                </ComposedChart>
              </ResponsiveContainer>
              </FullscreenChart>
            </div>

            {/* Specialty Pie */}
            <div className="bg-white border border-slate-200 p-4 sm:p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-4">{t("chart_by_specialty")}</h3>
              {pieData.length > 0 ? (
                <FullscreenChart title={t("chart_by_specialty")} normalHeight={220}>
                <ResponsiveContainer width="100%" height="100%">
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
                </FullscreenChart>
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
