import { useEffect, useState } from "react";
import { api, formatApiError, downloadBlob } from "../../lib/api";
import { toast } from "sonner";
import { useI18n } from "../../lib/i18n";
import {
  Trash, Calendar, Gauge,
  Gear, Plus, PencilSimple, X, FileXls,
} from "@phosphor-icons/react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

function calcDuration(start, end) {
  if (!start || !end) return "—";
  // ISO datetime format
  if (start.includes("T")) {
    const diff = Math.round((new Date(end) - new Date(start)) / 60000);
    if (diff <= 0) return "—";
    return `${Math.floor(diff / 60)}h ${String(diff % 60).padStart(2, "0")}m`;
  }
  // Legacy 12h format
  const _p = (s) => {
    const m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return null;
    let h = parseInt(m[1]);
    const mn = parseInt(m[2]);
    const ap = m[3].toUpperCase();
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return h * 60 + mn;
  };
  const s = _p(start), e = _p(end);
  if (s === null || e === null) return "—";
  let diff = e - s;
  if (diff < 0) diff += 1440;
  return `${Math.floor(diff / 60)}h ${String(diff % 60).padStart(2, "0")}m`;
}

function calcDurationMins(start, end) {
  if (!start || !end) return 0;
  if (start.includes("T")) {
    const diff = Math.round((new Date(end) - new Date(start)) / 60000);
    return diff > 0 ? diff : 0;
  }
  return 0;
}

function fmtStartEnd(str) {
  if (!str) return "—";
  if (str.includes("T")) {
    const [date, time] = str.split("T");
    const [, mo, dy] = date.split("-");
    return `${dy}/${mo} ${time.slice(0, 5)}`;
  }
  return str;
}

function SpecialtyBadge({ specialty, ar }) {
  if (!specialty) return null;
  const isElec = specialty === "electrical";
  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
      isElec ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
    }`}>
      {isElec ? (ar ? "كهرباء" : "Elec") : (ar ? "ميكانيكا" : "Mech")}
    </span>
  );
}

function ManageReasons({ t, ar }) {
  const [reasons, setReasons] = useState([]);
  const [newText, setNewText] = useState("");
  const [newSpecialty, setNewSpecialty] = useState("");
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editSpecialty, setEditSpecialty] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () =>
    api.get("/downtime-reasons").then(({ data }) => setReasons(data)).catch(() => {});

  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!newText.trim()) return;
    setSaving(true);
    try {
      await api.post("/downtime-reasons", {
        text: newText.trim(),
        specialty: newSpecialty || null,
      });
      setNewText(""); setNewSpecialty("");
      load();
    } catch (err) { toast.error(formatApiError(err)); }
    finally { setSaving(false); }
  };

  const saveEdit = async (id) => {
    if (!editText.trim()) return;
    try {
      await api.patch(`/downtime-reasons/${id}`, {
        text: editText.trim(),
        specialty: editSpecialty || null,
      });
      setEditId(null);
      load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const del = async (id) => {
    if (!window.confirm(t("confirm_delete"))) return;
    try { await api.delete(`/downtime-reasons/${id}`); load(); }
    catch (err) { toast.error(formatApiError(err)); }
  };

  const specialtySelect = (value, onChange, cls = "") => (
    <select value={value} onChange={(e) => onChange(e.target.value)}
            className={`h-9 px-2 border border-slate-300 text-xs bg-white ${cls}`}>
      <option value="">{ar ? "الكل" : "All"}</option>
      <option value="electrical">{ar ? "كهرباء" : "Electrical"}</option>
      <option value="mechanical">{ar ? "ميكانيكا" : "Mechanical"}</option>
    </select>
  );

  return (
    <div className="space-y-2">
      <ul className="space-y-1">
        {reasons.map((r) => (
          <li key={r.id} className="flex items-center gap-2 border border-slate-100 px-3 py-2 bg-slate-50">
            {editId === r.id ? (
              <>
                <input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="flex-1 h-9 px-3 border border-slate-300 text-sm"
                  autoFocus
                />
                {specialtySelect(editSpecialty, setEditSpecialty, "w-28")}
                <button onClick={() => saveEdit(r.id)}
                        className="h-9 px-3 bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700">
                  {t("save")}
                </button>
                <button onClick={() => setEditId(null)}
                        className="h-9 w-9 border border-slate-200 hover:bg-slate-100 flex items-center justify-center">
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm">{r.text}</span>
                <SpecialtyBadge specialty={r.specialty} ar={ar} />
                <button onClick={() => { setEditId(r.id); setEditText(r.text); setEditSpecialty(r.specialty || ""); }}
                        className="h-8 w-8 border border-slate-200 hover:bg-white flex items-center justify-center text-slate-500">
                  <PencilSimple size={13} />
                </button>
                <button onClick={() => del(r.id)}
                        className="h-8 w-8 border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center">
                  <Trash size={13} />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="flex gap-2 mt-2">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder={ar ? "أضف سبباً جديداً..." : "Add new reason..."}
          className="flex-1 h-10 px-3 border border-slate-300 text-sm"
        />
        {specialtySelect(newSpecialty, setNewSpecialty, "w-28")}
        <button type="submit" disabled={saving || !newText.trim()}
                className="h-10 px-4 bg-[#6B2D6B] text-white font-semibold text-sm flex items-center gap-1.5 hover:bg-[#5a2559] disabled:opacity-50">
          <Plus size={14} weight="bold" />
          {t("add_reason")}
        </button>
      </form>
    </div>
  );
}

const PAGE_SIZES = [25, 50, 100];

export default function Breakdown() {
  const { t, lang } = useI18n();
  const ar = lang === "ar";

  const [list, setList] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [machineId, setMachineId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showReasons, setShowReasons] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    api.get("/machines").then(({ data }) => setMachines(data)).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      const sel = machines.find((m) => m.id === machineId);
      if (sel) params.machine_number = sel.number;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const { data } = await api.get("/breakdowns", { params });
      setList(data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const apply = (e) => { e.preventDefault(); setPage(1); load(); };
  const reset = () => {
    setMachineId(""); setDateFrom(""); setDateTo(""); setSearch(""); setPage(1);
    setTimeout(load, 0);
  };

  const del = async (id) => {
    if (!window.confirm(t("confirm_delete"))) return;
    try {
      await api.delete(`/breakdowns/${id}`);
      toast.success("✓");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const exportExcel = async () => {
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      const sel = machines.find((m) => m.id === machineId);
      if (sel)      params.append("machine_number", sel.number);
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo)   params.append("date_to", dateTo);
      await downloadBlob(
        `/breakdowns/export/excel?${params}`,
        `machine_downtime_${dateFrom || "all"}_${dateTo || "all"}.xlsx`
      );
      toast.success(ar ? "تم التصدير ✓" : "Exported ✓");
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? list.filter((b) =>
        (b.machine_number || "").toLowerCase().includes(q) ||
        (b.machine_name   || "").toLowerCase().includes(q) ||
        (b.technician_name|| "").toLowerCase().includes(q) ||
        (b.brief_description || "").toLowerCase().includes(q)
      )
    : list;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const total    = list.length;
  const todayStr = new Date().toDateString();
  const today    = list.filter((b) => new Date(b.created_at).toDateString() === todayStr).length;
  const totalDowntimeMins = list.reduce((sum, b) => sum + (calcDurationMins(b.start_time, b.end_time) || 0), 0);

  // Chart data — daily counts (last 14 days with data)
  const dailyCounts = {};
  list.forEach((b) => {
    const day = b.created_at?.slice(5, 10) || ""; // MM-DD
    if (day) dailyCounts[day] = (dailyCounts[day] || 0) + 1;
  });
  const barData = Object.entries(dailyCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, count]) => ({ date, count }));

  // Cause counts for pie
  const causeCounts = {};
  list.forEach((b) => {
    const cause = b.brief_description || "Other";
    causeCounts[cause] = (causeCounts[cause] || 0) + 1;
  });
  const pieData = Object.entries(causeCounts)
    .sort(([,a],[,b]) => b - a)
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));
  const PIE_COLORS = ["#6B2D6B","#005CBE","#EF4444","#F97316","#10B981","#8B5CF6"];

  return (
    <div data-testid="breakdown-panel">
      {/* Stats + Charts */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: t("total_breakdowns"),       value: total, Icon: Gauge,    color: "text-[#6B2D6B]" },
          { label: t("today_breakdowns"),       value: today, Icon: Calendar, color: "text-slate-900" },
          { label: ar ? "ساعات التوقف" : "Downtime Hours", value: `${Math.round(totalDowntimeMins / 60 * 10) / 10}h`, Icon: Gauge, color: "text-amber-600" },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Icon size={15} weight="bold" />
              <span className="text-xs font-semibold uppercase tracking-widest">{label}</span>
            </div>
            <div className={`text-3xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {list.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Bar chart — daily breakdown counts */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-lg">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
              {ar ? "التوقفات اليومية" : "Daily Breakdowns"}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={barData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [v, ar ? "توقف" : "Breakdowns"]} />
                <Bar dataKey="count" fill="#6B2D6B" radius={[3,3,0,0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart — top causes */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-lg">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
              {ar ? "أبرز الأسباب" : "Top Causes"}
            </div>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="40%" cy="50%" outerRadius={60} dataKey="value" label={({ value }) => value}>
                    {pieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                  </Pie>
                  <Legend
                    layout="vertical" align="right" verticalAlign="middle"
                    formatter={(v) => <span style={{ fontSize: 10 }}>{v.length > 20 ? v.slice(0, 20) + "…" : v}</span>}
                  />
                  <Tooltip formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center text-slate-400 text-sm">{t("no_results")}</div>
            )}
          </div>
        </div>
      )}

      {/* Manage Reasons collapsible */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mb-4 rounded-lg">
        <button
          onClick={() => setShowReasons((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2 font-semibold text-sm text-slate-700">
            <Gear size={16} weight="bold" />
            {t("manage_reasons")}
          </div>
          <span className="text-xs text-slate-400">{showReasons ? "▲" : "▼"}</span>
        </button>
        {showReasons && (
          <div className="px-5 pb-5 border-t border-slate-100">
            <div className="pt-4">
              <ManageReasons t={t} ar={ar} />
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <form onSubmit={apply} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 sm:p-5 mb-4 rounded-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <select
            value={machineId}
            onChange={(e) => setMachineId(e.target.value)}
            className="h-11 px-3 border border-slate-200 text-sm bg-white"
          >
            <option value="">{ar ? "كل المكائن" : "All Machines"}</option>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.number}{m.name ? ` — ${m.name}` : ""}
              </option>
            ))}
          </select>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                 dir="ltr" className="h-11 px-3 border border-slate-200" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                 dir="ltr" className="h-11 px-3 border border-slate-200" />
          <div className="flex gap-2">
            <button type="submit"
                    className="h-11 px-4 bg-slate-900 text-white font-semibold hover:bg-slate-800 flex-1 text-sm">
              {t("apply")}
            </button>
            <button type="button" onClick={reset}
                    className="h-11 px-3 border border-slate-200 hover:bg-slate-100 text-sm">
              {t("reset")}
            </button>
          </div>
        </div>
      </form>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={ar ? "🔍  بحث بالمكينة أو الفني أو السبب..." : "🔍  Search machine, technician, reason..."}
            className="h-10 px-3 border border-slate-200 text-sm flex-1 max-w-xs focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
          <span className="text-xs text-slate-500 shrink-0">
            {filtered.length} {ar ? "نتيجة" : "results"}
          </span>
        </div>
        <button
          onClick={exportExcel}
          className="h-10 px-4 bg-[#1D6F42] text-white font-semibold flex items-center gap-2 hover:bg-[#155734] text-sm shrink-0"
        >
          <FileXls size={16} weight="bold" />
          {t("export_excel_downtime")}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-x-auto rounded-lg">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-start px-4 py-3 font-semibold">{t("date")}</th>
              <th className="text-start px-4 py-3 font-semibold">{ar ? "المكينة" : "Machine"}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("technician")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("brief_description")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("start_time")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("end_time")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("downtime_duration")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan="8" className="text-center text-slate-400 py-8">
                <div className="inline-block w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              </td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan="8" className="text-center text-slate-500 py-8">{t("no_results")}</td></tr>
            )}
            {paginated.map((b, i) => (
              <tr key={b.id} className={`border-t border-slate-100 ${i % 2 ? "bg-slate-50/40" : ""}`}>
                <td className="px-4 py-3 whitespace-nowrap">
                  {new Date(b.created_at).toLocaleString(ar ? "ar-EG" : "en-US", {
                    year: "numeric", month: "numeric", day: "numeric",
                    hour: "numeric", hour12: true,
                  })}
                </td>
                <td className="px-4 py-3 font-semibold">
                  {b.machine_number}{b.machine_name ? ` — ${b.machine_name}` : ""}
                </td>
                <td className="px-4 py-3">{b.technician_name}</td>
                <td className="px-4 py-3 max-w-[200px]">
                  <div className="truncate" title={b.brief_description}>{b.brief_description}</div>
                  {b.repair_description && (
                    <div className="text-xs text-slate-400 truncate mt-0.5" title={b.repair_description}>
                      {b.repair_description}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs" dir="ltr">{fmtStartEnd(b.start_time)}</td>
                <td className="px-4 py-3 font-mono text-xs" dir="ltr">{fmtStartEnd(b.end_time)}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 text-xs font-bold bg-[#EDE0ED] text-[#6B2D6B]">
                    {calcDuration(b.start_time, b.end_time)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => del(b.id)}
                    className="h-9 w-9 border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center"
                  >
                    <Trash size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Pagination */}
        {filtered.length > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
            <span>
              {ar
                ? `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} من ${filtered.length}`
                : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} of ${filtered.length}`}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="h-8 w-8 flex items-center justify-center border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
              >‹</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = Math.max(1, Math.min(totalPages - 4, safePage - 2)) + i;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`h-8 w-8 flex items-center justify-center border rounded text-xs font-semibold ${
                      pg === safePage
                        ? "bg-slate-900 text-white border-slate-900"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >{pg}</button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="h-8 w-8 flex items-center justify-center border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
              >›</button>
            </div>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-slate-200 rounded px-2 py-1 text-xs"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>{s} {ar ? "/ صفحة" : "/ page"}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
