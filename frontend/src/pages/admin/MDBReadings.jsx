import { useEffect, useState } from "react";
import { api, formatApiError, API } from "../../lib/api";
import { toast } from "sonner";
import { useI18n } from "../../lib/i18n";
import { Trash, FileXls, FilePdf, Image, X } from "@phosphor-icons/react";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "https://www.inspet.pro";

export default function MDBReadings() {
  const { t, lang } = useI18n();
  const ar = lang === "ar";

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [panelFilter, setPanelFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [viewingImage, setViewingImage] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (panelFilter) params.panel_number = panelFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo)   params.date_to   = dateTo;
      const { data } = await api.get("/mdb-readings", { params });
      setList(data);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const apply = (e) => { e.preventDefault(); load(); };
  const reset = () => {
    setPanelFilter(""); setDateFrom(""); setDateTo("");
    setTimeout(load, 0);
  };

  const del = async (id) => {
    if (!window.confirm(t("confirm_delete"))) return;
    try {
      await api.delete(`/mdb-readings/${id}`);
      toast.success("✓");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const exportFile = async (type) => {
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (panelFilter) params.append("panel_number", panelFilter);
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo)   params.append("date_to",   dateTo);
      const url = `${API}/mdb-readings/export/${type}?${params}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `mdb_readings_${dateFrom || "all"}_${dateTo || "all"}.${type === "excel" ? "xlsx" : "pdf"}`;
      a.click();
      URL.revokeObjectURL(href);
      toast.success(ar ? "تم التصدير ✓" : "Exported ✓");
    } catch (e) { toast.error(e.message); }
  };

  const uniquePanels = [...new Set(list.map((r) => r.panel_number))].sort();

  const totalEntries = list.length;
  const todayStr = new Date().toDateString();
  const todayCount = list.filter((r) => new Date(r.created_at).toDateString() === todayStr).length;
  const avgL1 = list.length ? (list.reduce((s, r) => s + (r.l1 || 0), 0) / list.length).toFixed(1) : "—";
  const avgNeutral = list.length ? (list.reduce((s, r) => s + (r.neutral || 0), 0) / list.length).toFixed(1) : "—";

  return (
    <div data-testid="mdb-readings-panel">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: ar ? "إجمالي القراءات" : "Total Readings",   value: totalEntries },
          { label: ar ? "اليوم"            : "Today",            value: todayCount },
          { label: ar ? "متوسط L1"         : "Avg L1 (A)",       value: avgL1 },
          { label: ar ? "متوسط Neutral"    : "Avg Neutral (A)",  value: avgNeutral },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-slate-200 p-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">{label}</div>
            <div className="text-3xl font-bold text-slate-900">{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <form onSubmit={apply} className="bg-white border border-slate-200 p-4 sm:p-5 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <select
            value={panelFilter}
            onChange={(e) => setPanelFilter(e.target.value)}
            className="h-11 px-3 border border-slate-200 bg-white text-sm"
          >
            <option value="">{ar ? "كل اللوحات" : "All Panels"}</option>
            {uniquePanels.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                 className="h-11 px-3 border border-slate-200 text-sm" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                 className="h-11 px-3 border border-slate-200 text-sm" />
          <button type="submit"
                  className="h-11 px-4 bg-slate-900 text-white font-semibold hover:bg-slate-800 text-sm">
            {t("apply")}
          </button>
          <button type="button" onClick={reset}
                  className="h-11 px-4 border border-slate-200 hover:bg-slate-100 text-sm">
            {t("reset")}
          </button>
        </div>
      </form>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="text-lg font-bold text-slate-900">{t("results")} ({list.length})</h3>
        <div className="flex gap-2">
          <button
            onClick={() => exportFile("excel")}
            className="h-10 px-4 bg-[#1D6F42] text-white font-semibold flex items-center gap-2 hover:bg-[#155734] text-sm"
          >
            <FileXls size={16} weight="bold" />
            {ar ? "تصدير Excel" : "Export Excel"}
          </button>
          <button
            onClick={() => exportFile("pdf")}
            className="h-10 px-4 bg-red-700 text-white font-semibold flex items-center gap-2 hover:bg-red-800 text-sm"
          >
            <FilePdf size={16} weight="bold" />
            PDF
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-start px-4 py-3 font-semibold">{ar ? "اللوحة" : "Panel"}</th>
              <th className="text-start px-4 py-3 font-semibold">{ar ? "التاريخ" : "Date"}</th>
              <th className="text-start px-4 py-3 font-semibold">{ar ? "الوقت" : "Time"}</th>
              <th className="text-center px-4 py-3 font-semibold">L1 (A)</th>
              <th className="text-center px-4 py-3 font-semibold">L2 (A)</th>
              <th className="text-center px-4 py-3 font-semibold">L3 (A)</th>
              <th className="text-center px-4 py-3 font-semibold">N (A)</th>
              <th className="text-start px-4 py-3 font-semibold">{t("technician")}</th>
              <th className="text-start px-4 py-3 font-semibold">{ar ? "ملاحظات" : "Notes"}</th>
              <th className="text-center px-4 py-3 font-semibold">{ar ? "صورة" : "Image"}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan="11" className="text-center py-8">
                <div className="inline-block w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              </td></tr>
            )}
            {!loading && list.length === 0 && (
              <tr><td colSpan="11" className="text-center text-slate-500 py-8">{t("no_results")}</td></tr>
            )}
            {list.map((r, i) => {
              const dt = r.created_at || "";
              const date = dt.slice(0, 10);
              const time = dt.slice(11, 16);
              const imgUrl = r.image_url ? `${BACKEND}${r.image_url}` : null;
              return (
                <tr key={r.id} className={`border-t border-slate-100 ${i % 2 ? "bg-slate-50/40" : ""}`}>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs font-bold bg-[#EDE0ED] text-[#6B2D6B]">
                      {r.panel_number}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{date}</td>
                  <td className="px-4 py-3 font-mono text-xs">{time}</td>
                  <td className="px-4 py-3 text-center font-bold font-mono">{r.l1}</td>
                  <td className="px-4 py-3 text-center font-bold font-mono">{r.l2}</td>
                  <td className="px-4 py-3 text-center font-bold font-mono">{r.l3}</td>
                  <td className="px-4 py-3 text-center font-bold font-mono">{r.neutral}</td>
                  <td className="px-4 py-3">{r.technician_name}</td>
                  <td className="px-4 py-3 max-w-[140px]">
                    {r.notes ? (
                      <div className="text-xs text-slate-500 truncate" title={r.notes}>{r.notes}</div>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {imgUrl ? (
                      <button
                        onClick={() => setViewingImage(imgUrl)}
                        className="h-9 w-9 border border-[#005CBE] text-[#005CBE] hover:bg-blue-50 flex items-center justify-center mx-auto"
                      >
                        <Image size={15} weight="bold" />
                      </button>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => del(r.id)}
                      className="h-9 w-9 border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center"
                    >
                      <Trash size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Image lightbox */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setViewingImage(null)}
        >
          <button
            onClick={() => setViewingImage(null)}
            className="absolute top-4 end-4 h-10 w-10 bg-white/20 hover:bg-white/30 text-white flex items-center justify-center rounded-full"
          >
            <X size={20} weight="bold" />
          </button>
          <img
            src={viewingImage}
            alt="MDB"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
