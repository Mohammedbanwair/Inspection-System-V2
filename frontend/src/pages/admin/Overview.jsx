import { useEffect, useState } from "react";
import { api, formatApiError } from "../../lib/api";
import { toast } from "sonner";
import { useI18n } from "../../lib/i18n";
import {
  ClipboardText, Lightning, WarningOctagon,
} from "@phosphor-icons/react";
import {
  ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie, Cell, Tooltip as RechartTooltip,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";

const CAUSE_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#3b82f6", "#8b5cf6"];
const BAR_COLOR    = "#6B2D6B";

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const MONTHS_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function KpiCard({ icon: Icon, label, value, sub, accent = "bg-slate-900", testid }) {
  return (
    <div
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex flex-col gap-3"
      data-testid={testid}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 leading-tight">
          {label}
        </span>
        <div className={`h-9 w-9 flex items-center justify-center rounded-lg text-white ${accent}`}>
          <Icon size={17} weight="bold" />
        </div>
      </div>
      <div className="text-4xl font-bold text-slate-900 dark:text-slate-100">{value ?? "—"}</div>
      {sub && <div className="text-xs text-slate-400 dark:text-slate-500">{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">{children}</h3>
  );
}

function ChartCard({ title, children, className = "" }) {
  return (
    <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 ${className}`}>
      <SectionTitle>{title}</SectionTitle>
      {children}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded px-3 py-2 text-xs">
      <div className="font-bold text-slate-700 dark:text-slate-300 mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex gap-2" style={{ color: p.color }}>
          <span>{p.name}:</span>
          <span className="font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function Overview() {
  const { t, lang } = useI18n();
  const ar = lang === "ar";

  const [stats,   setStats]   = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [analyt,  setAnalyt]  = useState(null);
  const [failures,setFailures]= useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const currentYear = new Date().getFullYear();
        const [s, m, a, f] = await Promise.all([
          api.get("/stats/overview"),
          api.get("/stats/monthly-breakdown"),
          api.get("/analytics/maintenance", { params: { year: currentYear } }),
          api.get("/failures/open"),
        ]);
        setStats(s.data);
        setMonthly(m.data);
        setAnalyt(a.data);
        setFailures((f.data || []).slice(0, 5));
      } catch (e) { toast.error(formatApiError(e)); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-700 border-t-slate-700 dark:border-t-slate-300 rounded-full animate-spin" />
    </div>
  );

  const monthNames = ar ? MONTHS_AR : MONTHS_EN;

  // Monthly trend data — last 12 months points from analytics
  const trendData = (analyt?.monthly_trend || []).map((d) => ({
    name: monthNames[d.month - 1] ?? d.month,
    [ar ? "توقفات" : "Breakdowns"]: d.count,
    [ar ? "ساعات" : "Hours"]: d.downtime_hours,
  }));

  // Top machines by downtime
  const topMachines = (analyt?.top_machines || []).slice(0, 6).map((m) => ({
    name: m.machine_number,
    [ar ? "ساعات" : "Hours"]: m.downtime_hours,
  }));

  // Pie data from monthly top causes
  const pieData = (monthly?.top_causes || []).map((c, i) => ({
    name: c.cause.length > 25 ? c.cause.slice(0, 25) + "…" : c.cause,
    value: c.count,
    color: CAUSE_COLORS[i] || "#94a3b8",
  }));

  const axisStyle = { fill: ar ? "#64748b" : "#64748b", fontSize: 11 };

  return (
    <div className="space-y-5" data-testid="admin-overview">

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={ClipboardText}
          label={t("total_inspections")}
          value={stats?.total_inspections?.toLocaleString()}
          sub={ar ? `${stats?.today_inspections ?? 0} اليوم` : `${stats?.today_inspections ?? 0} today`}
          accent="bg-[#005CBE]"
          testid="stat-total-inspections"
        />
        <KpiCard
          icon={ClipboardText}
          label={t("today_inspections")}
          value={stats?.today_inspections}
          accent="bg-slate-900 dark:bg-slate-700"
          testid="stat-today-inspections"
        />
        <KpiCard
          icon={WarningOctagon}
          label={ar ? "أعطال مفتوحة" : "Open Failures"}
          value={stats?.open_fails ?? 0}
          accent="bg-amber-500"
          testid="stat-open-fails"
        />
        <KpiCard
          icon={Lightning}
          label={ar ? "توقفات هذا الشهر" : "Breakdowns This Month"}
          value={monthly?.total ?? 0}
          sub={ar ? `${monthly?.downtime_hours ?? 0} ساعة تراكمية` : `${monthly?.downtime_hours ?? 0}h total downtime`}
          accent="bg-red-600"
          testid="stat-monthly-breakdowns"
        />
      </div>

      {/* ── Row 2: Bar chart + Pie chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Top machines bar */}
        <ChartCard
          title={ar ? "أعلى المكائن توقفاً (ساعات)" : "Top Machines by Downtime (hrs)"}
          className="lg:col-span-2"
        >
          {topMachines.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
              {t("no_results")}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topMachines} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={axisStyle} />
                <YAxis tick={axisStyle} />
                <RechartTooltip content={<CustomTooltip />} />
                <Bar
                  dataKey={ar ? "ساعات" : "Hours"}
                  fill={BAR_COLOR}
                  radius={[3, 3, 0, 0]}
                >
                  {topMachines.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === 0 ? "#ef4444" : i === 1 ? "#f97316" : BAR_COLOR}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Top causes pie */}
        <ChartCard title={ar ? "أسباب التوقفات" : "Breakdown Causes"}>
          {pieData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
              {t("no_breakdowns_month")}
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <PieChart width={160} height={140}>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={65}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <RechartTooltip
                  formatter={(value, name) => [value, name]}
                  contentStyle={{ fontSize: 11 }}
                />
              </PieChart>
              <div className="w-full space-y-1 mt-1">
                {pieData.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: entry.color }} />
                    <span className="flex-1 text-slate-600 dark:text-slate-400 truncate">{entry.name}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── Row 3: Monthly trend line + Recent failures ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Monthly trend */}
        <ChartCard
          title={ar ? "المؤشر الشهري — التوقفات وساعات التوقف" : "Monthly Trend — Breakdowns & Downtime"}
          className="lg:col-span-2"
        >
          {trendData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
              {t("no_results")}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={axisStyle} />
                <YAxis tick={axisStyle} />
                <RechartTooltip content={<CustomTooltip />} />
                <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey={ar ? "توقفات" : "Breakdowns"}
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey={ar ? "ساعات" : "Hours"}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Recent open failures */}
        <ChartCard title={ar ? "آخر الأعطال المفتوحة" : "Recent Open Failures"}>
          {failures.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center text-emerald-600 dark:text-emerald-400 gap-2">
              <span className="text-2xl">✓</span>
              <span className="text-sm font-semibold">{t("no_open_failures")}</span>
            </div>
          ) : (
            <div className="space-y-2">
              {failures.map((f, i) => {
                const isOld = i >= 2;
                return (
                  <div
                    key={f.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs ${
                      i === 0
                        ? "bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-800"
                        : "bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800"
                    }`}
                  >
                    <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${i === 0 ? "bg-red-500" : "bg-amber-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {f.machine_number ?? f.target_number ?? "—"} — {f.question_text ?? f.description ?? "—"}
                      </div>
                      <div className="text-slate-400 dark:text-slate-500 mt-0.5">
                        {f.technician_name ?? "—"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>
      </div>

    </div>
  );
}
