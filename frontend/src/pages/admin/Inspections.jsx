import { useEffect, useMemo, useState } from "react";
import { api, formatApiError, API } from "../../lib/api";
import { toast } from "sonner";
import { useI18n } from "../../lib/i18n";
import { Eye, DownloadSimple, FilePdf, Trash, X } from "@phosphor-icons/react";

const CATS = ["electrical", "mechanical", "chiller", "panels"];
const CAT_KEY = {
  electrical: "cat_electrical", mechanical: "cat_mechanical",
  chiller: "cat_chiller", panels: "cat_panels",
};
const TYPES = ["machine", "chiller", "panel"];

export default function Inspections() {
  const { t, lang } = useI18n();
  const [list, setList] = useState([]);
  const [techs, setTechs] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [filters, setFilters] = useState({
    target_number: "", target_type: "", category: "",
    technician_id: "", date_from: "", date_to: "",
  });
  const [viewing, setViewing] = useState(null);

  const load = async () => {
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const { data } = await api.get("/inspections", { params });
      setList(data);
    } catch (e) { toast.error(formatApiError(e)); }
  };

  useEffect(() => {
    (async () => {
      try {
        const [u, q] = await Promise.all([api.get("/users"), api.get("/questions")]);
        setTechs(u.data.filter((x) => x.role === "technician"));
        setQuestions(q.data);
      } catch (e) { toast.error(formatApiError(e)); }
    })();
    load();
    // eslint-disable-next-line
  }, []);

  const qMap = useMemo(() => Object.fromEntries(questions.map((q) => [q.id, q])), [questions]);

  const apply = (e) => { e.preventDefault(); load(); };
  const reset = () => {
    setFilters({ target_number: "", target_type: "", category: "", technician_id: "", date_from: "", date_to: "" });
    setTimeout(load, 0);
  };

  const exportCSV = async () => {
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v && k !== "technician_id") params.append(k, v);
      });
      const res = await fetch(`${API}/inspections/export/csv?${params}`, {
        headers: { Authorization: `Bearer ${token}` }, credentials: "include",
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inspections-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("export_csv"));
    } catch (e) { toast.error(e.message); }
  };

  const exportPDF = async (id, num) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/inspections/${id}/export/pdf`, {
        headers: { Authorization: `Bearer ${token}` }, credentials: "include",
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inspection_${num}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error(e.message); }
  };

  const del = async (id) => {
    if (!window.confirm(t("confirm_delete"))) return;
    try { await api.delete(`/inspections/${id}`); toast.success("✓"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  const typeLabel = (x) => t(x === "machine" ? "machine" : x === "chiller" ? "chiller" : "panel");

  return (
    <div data-testid="inspections-panel">
      <form onSubmit={apply}
            className="bg-white border border-slate-200 p-5 mb-4 grid grid-cols-2 md:grid-cols-7 gap-3">
        <input placeholder={t("filter_target_number")} value={filters.target_number}
               onChange={(e) => setFilters({ ...filters, target_number: e.target.value })}
               className="h-11 px-3 border border-slate-200" data-testid="filter-target-input" />
        <select value={filters.target_type}
                onChange={(e) => setFilters({ ...filters, target_type: e.target.value })}
                className="h-11 px-3 border border-slate-200" data-testid="filter-type-select">
          <option value="">{t("all_types")}</option>
          {TYPES.map((tp) => <option key={tp} value={tp}>{typeLabel(tp)}</option>)}
        </select>
        <select value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="h-11 px-3 border border-slate-200" data-testid="filter-category-select">
          <option value="">{t("all_categories")}</option>
          {CATS.map((c) => <option key={c} value={c}>{t(CAT_KEY[c])}</option>)}
        </select>
        <select value={filters.technician_id}
                onChange={(e) => setFilters({ ...filters, technician_id: e.target.value })}
                className="h-11 px-3 border border-slate-200" data-testid="filter-tech-select">
          <option value="">{t("all_techs")}</option>
          {techs.map((tt) => <option key={tt.id} value={tt.id}>{tt.name}</option>)}
        </select>
        <input type="date" value={filters.date_from}
               onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
               className="h-11 px-3 border border-slate-200" data-testid="filter-date-from" />
        <input type="date" value={filters.date_to}
               onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
               className="h-11 px-3 border border-slate-200" data-testid="filter-date-to" />
        <div className="flex gap-2">
          <button type="submit"
                  className="h-11 px-4 bg-slate-900 text-white font-semibold hover:bg-slate-800 flex-1"
                  data-testid="apply-filters-button">{t("apply")}</button>
          <button type="button" onClick={reset}
                  className="h-11 px-4 border border-slate-200 hover:bg-slate-100">
            {t("reset")}
          </button>
        </div>
      </form>

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-slate-900">{t("results")} ({list.length})</h3>
        <button onClick={exportCSV}
                className="h-10 px-4 bg-[#005CBE] text-white font-semibold flex items-center gap-2 hover:bg-[#004a99]"
                data-testid="export-csv-button">
          <DownloadSimple size={16} weight="bold" /> {t("export_csv")}
        </button>
      </div>

      <div className="bg-white border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-start px-4 py-3 font-semibold">{t("date")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("type")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("target_number")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("section")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("technician")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("status")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan="7" className="text-center text-slate-500 py-8">{t("no_results")}</td></tr>
            )}
            {list.map((r, i) => {
              const fails = (r.answers || []).filter((a) => !a.answer).length;
              return (
                <tr key={r.id} className={`border-t border-slate-100 ${i % 2 ? "bg-slate-50/40" : ""}`}>
                  <td className="px-4 py-3">{new Date(r.created_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}</td>
                  <td className="px-4 py-3">{typeLabel(r.target_type)}</td>
                  <td className="px-4 py-3 font-semibold">{r.target_number}</td>
                  <td className="px-4 py-3">{t(CAT_KEY[r.category] || "cat_electrical")}</td>
                  <td className="px-4 py-3">{r.technician_name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-semibold ${
                      fails > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {fails > 0 ? `${fails} ${t("fails_label")}` : t("healthy")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setViewing(r)}
                              className="h-9 w-9 border border-slate-200 hover:bg-slate-100 flex items-center justify-center"
                              data-testid={`view-inspection-${r.id}`}>
                        <Eye size={14} />
                      </button>
                      <button onClick={() => exportPDF(r.id, r.target_number)}
                              className="h-9 w-9 border border-slate-200 hover:bg-slate-100 flex items-center justify-center"
                              data-testid={`pdf-inspection-${r.id}`}>
                        <FilePdf size={14} />
                      </button>
                      <button onClick={() => del(r.id)}
                              className="h-9 w-9 border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center"
                              data-testid={`delete-inspection-${r.id}`}>
                        <Trash size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {viewing && (
        <div className="fixed inset-0 z-40 bg-slate-900/60 flex items-center justify-center p-4"
             onClick={() => setViewing(null)} data-testid="inspection-detail-modal">
          <div className="bg-white border border-slate-200 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
               onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">{t("inspection_details")}</div>
                <h3 className="text-xl font-bold text-slate-900">
                  {typeLabel(viewing.target_type)} #{viewing.target_number} — {t(CAT_KEY[viewing.category] || "cat_electrical")}
                </h3>
              </div>
              <button onClick={() => setViewing(null)}
                      className="h-9 w-9 border border-slate-200 hover:bg-slate-100 flex items-center justify-center">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-slate-500">{t("date")}</div>
                  <div className="font-semibold">
                    {new Date(viewing.created_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">{t("technician")}</div>
                  <div className="font-semibold">{viewing.technician_name}</div>
                </div>
              </div>
              <div className="border border-slate-200">
                {(viewing.answers || []).map((a, i) => (
                  <div key={i} className={`px-4 py-3 flex items-center gap-3 ${i > 0 ? "border-t border-slate-100" : ""}`}>
                    <span className={`h-7 min-w-[50px] px-2 text-xs font-bold flex items-center justify-center ${
                      a.answer ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {a.answer ? t("yes") : t("no")}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm">{qMap[a.question_id]?.text || "—"}</div>
                      {a.note && <div className="text-xs text-slate-500 mt-1">{t("notes")}: {a.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
              {viewing.notes && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">{t("general_notes")}</div>
                  <div className="bg-slate-50 border border-slate-200 p-3 text-sm">{viewing.notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
