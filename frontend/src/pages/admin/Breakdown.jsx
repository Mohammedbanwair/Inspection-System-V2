import { useEffect, useState } from "react";
import { api, formatApiError, API } from "../../lib/api";
import { toast } from "sonner";
import { useI18n } from "../../lib/i18n";
import {
  CheckCircle, Trash, Lightning, WarningCircle, CheckSquare, Calendar,
  Gear, Plus, PencilSimple, X, FileXls,
} from "@phosphor-icons/react";

function parseTime12h(str) {
  if (!str) return null;
  const m = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1]);
  const mn = parseInt(m[2]);
  const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + mn;
}

function calcDuration(start, end) {
  const s = parseTime12h(start);
  const e = parseTime12h(end);
  if (s === null || e === null) return "—";
  let diff = e - s;
  if (diff < 0) diff += 1440;
  return `${Math.floor(diff / 60)}h ${String(diff % 60).padStart(2, "0")}m`;
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

export default function Breakdown() {
  const { t, lang } = useI18n();
  const ar = lang === "ar";

  const [list, setList] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [machineId, setMachineId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");
  const [showReasons, setShowReasons] = useState(false);

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
      if (status) params.status = status;
      const { data } = await api.get("/breakdowns", { params });
      setList(data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const apply = (e) => { e.preventDefault(); load(); };
  const reset = () => {
    setMachineId(""); setDateFrom(""); setDateTo(""); setStatus("");
    setTimeout(load, 0);
  };

  const resolve = async (id) => {
    try {
      await api.patch(`/breakdowns/${id}/resolve`);
      toast.success("✓");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
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
      if (sel)     params.append("machine_number", sel.number);
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo)   params.append("date_to", dateTo);
      if (status)   params.append("status", status);
      const res = await fetch(`${API}/breakdowns/export/excel?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `machine_downtime_${dateFrom || "all"}_${dateTo || "all"}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(ar ? "تم التصدير ✓" : "Exported ✓");
    } catch (e) { toast.error(e.message); }
  };

  const total    = list.length;
  const open     = list.filter((b) => b.status === "submitted").length;
  const resolved = list.filter((b) => b.status === "resolved").length;
  const todayStr = new Date().toDateString();
  const today    = list.filter((b) => new Date(b.created_at).toDateString() === todayStr).length;

  return (
    <div data-testid="breakdown-panel">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: t("total_breakdowns"),    value: total,    Icon: Lightning,     color: "text-slate-900" },
          { label: t("open_breakdowns"),     value: open,     Icon: WarningCircle, color: "text-amber-600" },
          { label: t("resolved_breakdowns"), value: resolved, Icon: CheckSquare,   color: "text-emerald-600" },
          { label: t("today_breakdowns"),    value: today,    Icon: Calendar,      color: "text-slate-900" },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="bg-white border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Icon size={15} weight="bold" />
              <span className="text-xs font-semibold uppercase tracking-widest">{label}</span>
            </div>
            <div className={`text-3xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Manage Reasons collapsible */}
      <div className="bg-white border border-slate-200 mb-4">
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
      <form onSubmit={apply} className="bg-white border border-slate-200 p-4 sm:p-5 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
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
                 className="h-11 px-3 border border-slate-200" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                 className="h-11 px-3 border border-slate-200" />
          <select value={status} onChange={(e) => setStatus(e.target.value)}
                  className="h-11 px-3 border border-slate-200 bg-white">
            <option value="">{t("all_statuses")}</option>
            <option value="submitted">{t("bd_open")}</option>
            <option value="resolved">{t("resolved")}</option>
          </select>
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

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-slate-900">{t("results")} ({list.length})</h3>
        <button
          onClick={exportExcel}
          className="h-10 px-4 bg-[#1D6F42] text-white font-semibold flex items-center gap-2 hover:bg-[#155734] text-sm"
        >
          <FileXls size={16} weight="bold" />
          {t("export_excel_downtime")}
        </button>
      </div>

      <div className="bg-white border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-start px-4 py-3 font-semibold">{t("date")}</th>
              <th className="text-start px-4 py-3 font-semibold">{ar ? "المكينة" : "Machine"}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("technician")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("brief_description")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("start_time")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("end_time")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("downtime_duration")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("status")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan="9" className="text-center text-slate-400 py-8">
                <div className="inline-block w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              </td></tr>
            )}
            {!loading && list.length === 0 && (
              <tr><td colSpan="9" className="text-center text-slate-500 py-8">{t("no_results")}</td></tr>
            )}
            {list.map((b, i) => (
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
                <td className="px-4 py-3 font-mono text-xs">{b.start_time || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{b.end_time || "—"}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 text-xs font-bold bg-[#EDE0ED] text-[#6B2D6B]">
                    {calcDuration(b.start_time, b.end_time)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-semibold ${
                    b.status === "resolved"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {b.status === "resolved" ? t("resolved") : t("bd_open")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {b.status !== "resolved" && (
                      <button
                        onClick={() => resolve(b.id)}
                        className="h-9 px-3 border border-emerald-300 text-emerald-700 hover:bg-emerald-50 flex items-center gap-1 text-xs font-semibold"
                      >
                        <CheckCircle size={14} weight="bold" />
                        {t("resolve")}
                      </button>
                    )}
                    <button
                      onClick={() => del(b.id)}
                      className="h-9 w-9 border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
