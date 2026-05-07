import { useEffect, useMemo, useState } from "react";
import { api, formatApiError } from "../../lib/api";
import { toast } from "sonner";
import { useI18n } from "../../lib/i18n";
import { WarningOctagon, FunnelSimple } from "@phosphor-icons/react";

const CATS = ["electrical", "mechanical"];
const CAT_KEY = {
  electrical: "cat_electrical", mechanical: "cat_mechanical",
};
const TYPES = ["machine", "chiller", "panel"];

export default function Failures() {
  const { t, lang } = useI18n();
  const [all, setAll] = useState([]);
  const [filters, setFilters] = useState({ target_number: "", target_type: "", category: "" });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/failures/open");
      setAll(data);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const list = useMemo(() => all.filter((f) => {
    if (filters.target_number && !f.target_number.toUpperCase().startsWith(filters.target_number.toUpperCase())) return false;
    if (filters.target_type && f.target_type !== filters.target_type) return false;
    if (filters.category && f.category !== filters.category) return false;
    return true;
  }), [all, filters]);

  // Group by target
  const grouped = useMemo(() => {
    const map = {};
    for (const f of list) {
      const key = `${f.target_type}:${f.target_number}`;
      if (!map[key]) map[key] = { target_type: f.target_type, target_number: f.target_number, target_name: f.target_name, items: [] };
      map[key].items.push(f);
    }
    return Object.values(map).sort((a, b) => b.items.length - a.items.length);
  }, [list]);

  const typeLabel = (tt) => t(tt === "machine" ? "machine" : tt === "chiller" ? "chiller" : "panel");
  const catLabel = (c) => t(CAT_KEY[c] || "cat_electrical");

  return (
    <div data-testid="failures-panel">
      <div className="bg-white border border-slate-200 p-5 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-widest md:col-span-4 mb-1">
          <FunnelSimple size={14} /> {t("filter_target_number")} / {t("filter_type")} / {t("filter_category")}
        </div>
        <input placeholder={t("filter_target_number")} value={filters.target_number}
               onChange={(e) => setFilters({ ...filters, target_number: e.target.value })}
               className="h-11 px-3 border border-slate-200 font-mono"
               data-testid="failure-filter-number" />
        <select value={filters.target_type}
                onChange={(e) => setFilters({ ...filters, target_type: e.target.value })}
                className="h-11 px-3 border border-slate-200" data-testid="failure-filter-type">
          <option value="">{t("all_types")}</option>
          {TYPES.map((tp) => <option key={tp} value={tp}>{typeLabel(tp)}</option>)}
        </select>
        <select value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="h-11 px-3 border border-slate-200" data-testid="failure-filter-category">
          <option value="">{t("all_categories")}</option>
          {CATS.map((c) => <option key={c} value={c}>{t(CAT_KEY[c])}</option>)}
        </select>
        <button onClick={() => setFilters({ target_number: "", target_type: "", category: "" })}
                className="h-11 px-4 bg-white border border-slate-200 hover:bg-slate-100 font-semibold">
          {t("reset")}
        </button>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <WarningOctagon size={20} weight="bold" className="text-red-500" />
          {t("open_failures")} ({list.length})
        </h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 p-8 text-center text-emerald-700 font-semibold">
          ✓ {t("no_open_failures")}
        </div>
      ) : null}
      {!loading && grouped.length > 0 && (
        <div className="space-y-4">
          {grouped.map((g) => (
            <div key={`${g.target_type}-${g.target_number}`} className="bg-white border border-slate-200">
              <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 text-xs font-semibold bg-white/10">{typeLabel(g.target_type)}</span>
                  <span className="font-bold text-lg">{g.target_number}</span>
                  {g.target_name && <span className="text-sm text-slate-300">— {g.target_name}</span>}
                </div>
                <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold">
                  {g.items.length} {t("fails_label")}
                </span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {g.items.map((f, i) => (
                    <tr key={`${f.question_id}-${i}`} className={`border-t border-slate-100 ${i % 2 ? "bg-slate-50/40" : ""}`}>
                      <td className="px-5 py-3 w-32">
                        <span className="px-2 py-1 text-xs font-semibold bg-slate-100">{catLabel(f.category)}</span>
                      </td>
                      <td className="px-5 py-3 max-w-xs">
                        <div className="font-medium text-slate-900 truncate" title={f.question_text}>{f.question_text}</div>
                        {f.note && <div className="text-xs text-slate-500 mt-1 truncate" title={f.note}>{t("notes")}: {f.note}</div>}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500 w-48">
                        {f.technician_name}
                        <div>{new Date(f.since).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
