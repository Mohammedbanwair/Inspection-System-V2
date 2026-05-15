import { useEffect, useMemo, useState } from "react";
import { api, formatApiError } from "../../lib/api";
import { toast } from "sonner";
import { useI18n } from "../../lib/i18n";
import { WarningOctagon } from "@phosphor-icons/react";

const CAT_KEY = {
  electrical: "cat_electrical", mechanical: "cat_mechanical",
  chiller: "cat_chiller", panels_main: "cat_panels_main",
  panels_sub: "cat_panels_sub", cooling_tower: "cat_cooling_tower",
};

export default function Failures() {
  const { t, lang } = useI18n();
  const ar = lang === "ar";

  const [all,     setAll]     = useState([]);
  const [loading, setLoading] = useState(true);

  // Step-by-step filter — mirrors Inspections page
  const [spec,      setSpec]      = useState("");
  const [tType,     setTType]     = useState("");
  const [subGroup,  setSubGroup]  = useState("");
  const [targetNum, setTargetNum] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/failures/open");
        setAll(data);
      } catch (e) { toast.error(formatApiError(e)); }
      finally { setLoading(false); }
    })();
  }, []);

  const tTypeOptions = spec === "electrical" ? ["machine", "panel"]
                     : spec === "mechanical" ? ["machine", "chiller", "cooling_tower"]
                     : [];

  const needsSubGroup = tType === "panel";

  const subGroupOptions = tType === "panel"
    ? [{ value: "main", label: t("branch_panels_main") }, { value: "sub", label: t("branch_panels_sub") }]
    : [];

  // Pre-filter (without targetNum) — used to derive Step 4 dropdown
  const preFiltered = useMemo(() => all.filter((f) => {
    if (spec === "electrical") {
      if (!["electrical", "panels_main", "panels_sub"].includes(f.category)) return false;
    } else if (spec === "mechanical") {
      if (!["mechanical", "chiller", "cooling_tower"].includes(f.category)) return false;
    }
    if (tType === "panel") {
      if (f.target_type !== "panel") return false;
      if (subGroup === "main" && f.category !== "panels_main") return false;
      if (subGroup === "sub"  && f.category !== "panels_sub")  return false;
    } else if (tType === "cooling_tower") {
      if (f.target_type !== "cooling_tower") return false;
    } else if (tType) {
      if (f.target_type !== tType) return false;
    }
    return true;
  }), [all, spec, tType, subGroup]);

  const availableNumbers = useMemo(() =>
    [...new Set(preFiltered.map((f) => f.target_number))].sort(),
  [preFiltered]);

  const list = useMemo(() =>
    targetNum ? preFiltered.filter((f) => f.target_number === targetNum) : preFiltered,
  [preFiltered, targetNum]);

  // Group by target, sorted by most failures first
  const grouped = useMemo(() => {
    const map = {};
    for (const f of list) {
      const key = `${f.target_type}:${f.target_number}`;
      if (!map[key]) map[key] = { target_type: f.target_type, target_number: f.target_number, target_name: f.target_name, items: [] };
      map[key].items.push(f);
    }
    return Object.values(map).sort((a, b) => b.items.length - a.items.length);
  }, [list]);

  const typeLabel = (tt) => t(
    tt === "machine" ? "machine" : tt === "chiller" ? "chiller" :
    tt === "cooling_tower" ? "cooling_tower" : "panel"
  );
  const catLabel = (c) => t(CAT_KEY[c] || c);

  const reset = () => { setSpec(""); setTType(""); setSubGroup(""); setTargetNum(""); };

  return (
    <div data-testid="failures-panel">

      {/* Step-by-step filter */}
      <div className="bg-white border border-slate-200 p-4 sm:p-5 mb-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">

          {/* Step 1: Section */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {ar ? "١ — القسم" : "1 — Section"}
            </span>
            <select
              value={spec}
              onChange={(e) => { setSpec(e.target.value); setTType(""); setSubGroup(""); setTargetNum(""); }}
              className="h-11 px-3 border border-slate-200"
            >
              <option value="">{ar ? "— الكل —" : "— All —"}</option>
              <option value="electrical">{t("cat_electrical")}</option>
              <option value="mechanical">{t("cat_mechanical")}</option>
            </select>
          </div>

          {/* Step 2: Equipment type */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {ar ? "٢ — نوع المعدة" : "2 — Equipment"}
            </span>
            <select
              value={tType}
              onChange={(e) => { setTType(e.target.value); setSubGroup(""); setTargetNum(""); }}
              disabled={!spec}
              className="h-11 px-3 border border-slate-200 disabled:opacity-40"
            >
              <option value="">{ar ? "— الكل —" : "— All —"}</option>
              {tTypeOptions.map((tp) => <option key={tp} value={tp}>{typeLabel(tp)}</option>)}
            </select>
          </div>

          {/* Step 3: Panel sub-type */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {needsSubGroup
                ? (ar ? "٣ — نوع اللوحة" : "3 — Panel Type")
                : (ar ? "٣ — غير مطلوب"  : "3 — N/A")}
            </span>
            <select
              value={subGroup}
              onChange={(e) => { setSubGroup(e.target.value); setTargetNum(""); }}
              disabled={!needsSubGroup}
              className="h-11 px-3 border border-slate-200 disabled:opacity-40"
            >
              <option value="">{needsSubGroup ? (ar ? "— الكل —" : "— All —") : "—"}</option>
              {subGroupOptions.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Step 4: Equipment number */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {ar ? "٤ — المعدة" : "4 — Equipment"}
            </span>
            <select
              value={targetNum}
              onChange={(e) => setTargetNum(e.target.value)}
              disabled={availableNumbers.length === 0}
              className="h-11 px-3 border border-slate-200 disabled:opacity-40"
            >
              <option value="">{ar ? "— الكل —" : "— All —"}</option>
              {availableNumbers.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={reset}
            className="h-11 px-5 border border-slate-200 hover:bg-slate-100 font-semibold text-sm"
          >
            {t("reset")}
          </button>
        </div>
      </div>

      {/* Results header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <WarningOctagon size={20} weight="bold" className="text-red-500" />
          {t("open_failures")} ({list.length})
        </h3>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 p-8 text-center text-emerald-700 font-semibold">
          ✓ {t("no_open_failures")}
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((g) => (
            <div key={`${g.target_type}-${g.target_number}`} className="bg-white border border-slate-200">
              <div className="bg-slate-900 text-white px-4 sm:px-5 py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className="px-2 py-1 text-xs font-semibold bg-white/10 shrink-0">
                    {typeLabel(g.target_type)}
                  </span>
                  <span className="font-bold text-base sm:text-lg">{g.target_number}</span>
                  {g.target_name && (
                    <span className="text-sm text-slate-300 truncate">— {g.target_name}</span>
                  )}
                </div>
                <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold shrink-0">
                  {g.items.length} {t("fails_label")}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[400px]">
                  <tbody>
                    {g.items.map((f, i) => (
                      <tr key={`${f.question_id}-${i}`}
                          className={`border-t border-slate-100 ${i % 2 ? "bg-slate-50/40" : ""}`}>
                        <td className="px-5 py-3 w-32">
                          <span className="px-2 py-1 text-xs font-semibold bg-slate-100">
                            {catLabel(f.category)}
                          </span>
                        </td>
                        <td className="px-5 py-3 max-w-xs">
                          <div className="font-medium text-slate-900 truncate" title={f.question_text}>
                            {f.question_text}
                          </div>
                          {f.note && (
                            <div className="text-xs text-slate-500 mt-1 truncate" title={f.note}>
                              {t("notes")}: {f.note}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-500 w-48">
                          {f.technician_name}
                          <div>{new Date(f.since).toLocaleString(ar ? "ar-EG" : "en-US")}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
