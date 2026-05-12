import { useEffect, useState } from "react";
import { api, formatApiError } from "../../lib/api";
import { toast } from "sonner";
import { useI18n } from "../../lib/i18n";
import { CheckCircle, Trash, Lightning, WarningCircle, CheckSquare, Calendar } from "@phosphor-icons/react";

export default function Breakdown() {
  const { t, lang } = useI18n();
  const ar = lang === "ar";

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [machineNum, setMachineNum] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (machineNum) params.machine_number = machineNum;
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

  useEffect(() => { load(); }, []);

  const apply = (e) => { e.preventDefault(); load(); };
  const reset = () => {
    setMachineNum(""); setDateFrom(""); setDateTo(""); setStatus("");
    setTimeout(load, 0);
  };

  const resolve = async (id) => {
    try {
      await api.patch(`/breakdowns/${id}/resolve`);
      toast.success("✓");
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const del = async (id) => {
    if (!window.confirm(t("confirm_delete"))) return;
    try {
      await api.delete(`/breakdowns/${id}`);
      toast.success("✓");
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const total = list.length;
  const open = list.filter((b) => b.status === "submitted").length;
  const resolved = list.filter((b) => b.status === "resolved").length;
  const todayStr = new Date().toDateString();
  const today = list.filter((b) => new Date(b.created_at).toDateString() === todayStr).length;

  return (
    <div data-testid="breakdown-panel">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: t("total_breakdowns"), value: total, Icon: Lightning, color: "text-slate-900" },
          { label: t("open_breakdowns"),  value: open,  Icon: WarningCircle, color: "text-red-600" },
          { label: t("resolved_breakdowns"), value: resolved, Icon: CheckSquare, color: "text-emerald-600" },
          { label: t("today_breakdowns"), value: today, Icon: Calendar, color: "text-slate-900" },
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

      {/* Filters */}
      <form onSubmit={apply} className="bg-white border border-slate-200 p-5 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder={ar ? "رقم المكينة" : "Machine #"}
            value={machineNum}
            onChange={(e) => setMachineNum(e.target.value)}
            className="h-11 px-3 border border-slate-200 text-sm"
          />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                 className="h-11 px-3 border border-slate-200" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                 className="h-11 px-3 border border-slate-200" />
          <select value={status} onChange={(e) => setStatus(e.target.value)}
                  className="h-11 px-3 border border-slate-200">
            <option value="">{t("all_statuses")}</option>
            <option value="submitted">{t("bd_open")}</option>
            <option value="resolved">{t("resolved")}</option>
          </select>
          <div className="flex gap-2">
            <button type="submit" className="h-11 px-4 bg-slate-900 text-white font-semibold hover:bg-slate-800 flex-1">
              {t("apply")}
            </button>
            <button type="button" onClick={reset} className="h-11 px-4 border border-slate-200 hover:bg-slate-100">
              {t("reset")}
            </button>
          </div>
        </div>
      </form>

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-slate-900">{t("results")} ({list.length})</h3>
      </div>

      <div className="bg-white border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-start px-4 py-3 font-semibold">{t("date")}</th>
              <th className="text-start px-4 py-3 font-semibold">{ar ? "المكينة" : "Machine"}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("technician")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("brief_description")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("start_time")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("end_time")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("status")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan="8" className="text-center text-slate-400 py-8">
                <div className="inline-block w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              </td></tr>
            )}
            {!loading && list.length === 0 && (
              <tr><td colSpan="8" className="text-center text-slate-500 py-8">{t("no_results")}</td></tr>
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
                <td className="px-4 py-3 max-w-[220px]">
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
                        title={t("resolve")}
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
