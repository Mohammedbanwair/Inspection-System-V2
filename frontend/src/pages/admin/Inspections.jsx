import { useEffect, useMemo, useState } from "react";
import { api, formatApiError, API } from "../../lib/api";
import { toast } from "sonner";
import { useI18n } from "../../lib/i18n";
import { Eye, FilePdf, Trash, X, FileXls } from "@phosphor-icons/react";

const CAT_KEY = {
  electrical: "cat_electrical", mechanical: "cat_mechanical",
  chiller: "cat_chiller", panels_main: "cat_panels_main", panels_sub: "cat_panels_sub",
};

export default function Inspections() {
  const { t, lang } = useI18n();
  const [list, setList] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [viewing, setViewing] = useState(null);

  // Step-by-step filter state
  const [spec, setSpec]         = useState("");  // "electrical" | "mechanical"
  const [tType, setTType]       = useState("");  // "machine" | "panel" | "chiller"
  const [subGroup, setSubGroup] = useState("");  // machine: "A"|"B"  / panel: "main"|"sub"
  const [targetNum, setTargetNum] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [items, setItems]       = useState([]);  // dropdown items fetched from API

  // Derived values
  const tTypeOptions = spec === "electrical" ? ["machine", "panel"]
                     : spec === "mechanical" ? ["machine", "chiller"] : [];

  const needsSubGroup = tType === "machine" || tType === "panel";

  const subGroupOptions = tType === "machine"
    ? [{ value: "A", label: t("group_a") }, { value: "B", label: t("group_b") }]
    : tType === "panel"
    ? [{ value: "main", label: t("branch_panels_main") }, { value: "sub", label: t("branch_panels_sub") }]
    : [];

  const category = (() => {
    if (spec === "electrical") {
      if (tType === "machine") return "electrical";
      if (tType === "panel" && subGroup === "main") return "panels_main";
      if (tType === "panel" && subGroup === "sub")  return "panels_sub";
    }
    if (spec === "mechanical") {
      if (tType === "machine") return "mechanical";
      if (tType === "chiller") return "chiller";
    }
    return "";
  })();

  const step4Ready = tType && (!needsSubGroup || subGroup);

  // Fetch equipment list whenever type or sub-group changes
  useEffect(() => {
    if (!tType) { setItems([]); return; }
    const endpoint = tType === "machine" ? "/machines"
                   : tType === "panel"   ? "/panels"
                   : "/chillers";
    const params = {};
    if (tType === "machine" && subGroup) params.group = subGroup;
    if (tType === "panel"   && subGroup) params.panel_type = subGroup;
    api.get(endpoint, { params })
      .then(({ data }) => setItems(data))
      .catch(() => setItems([]));
    setTargetNum("");
  }, [tType, subGroup]);

  const getApiFilters = () => {
    const f = {};
    if (category)   f.category      = category;
    if (tType)      f.target_type   = tType;
    if (targetNum)  f.target_number = targetNum;
    if (dateFrom)   f.date_from     = dateFrom;
    if (dateTo)     f.date_to       = dateTo;
    return f;
  };

  const load = async () => {
    try {
      const { data } = await api.get("/inspections", { params: getApiFilters() });
      setList(data);
    } catch (e) { toast.error(formatApiError(e)); }
  };

  useEffect(() => {
    (async () => {
      try {
        const q = await api.get("/questions");
        setQuestions(q.data);
      } catch (e) { toast.error(formatApiError(e)); }
    })();
    load();
    // eslint-disable-next-line
  }, []);

  const qMap = useMemo(() => Object.fromEntries(questions.map((q) => [q.id, q])), [questions]);

  const apply = (e) => { e.preventDefault(); load(); };

  const reset = () => {
    setSpec(""); setTType(""); setSubGroup(""); setTargetNum("");
    setDateFrom(""); setDateTo(""); setItems([]);
    setTimeout(load, 0);
  };

  const exportExcel = async () => {
    if (!targetNum) {
      toast.error(lang === "ar" ? "يجب اختيار المعدة" : "Equipment selection required");
      return;
    }
    if (!dateFrom || !dateTo) {
      toast.error(lang === "ar" ? "يجب تحديد نطاق التاريخ" : "Date range required");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      Object.entries(getApiFilters()).forEach(([k, v]) => { if (v) params.append(k, v); });
      const res = await fetch(`${API}/inspections/export/excel?${params}`, {
        headers: { Authorization: `Bearer ${token}` }, credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inspection_${targetNum}_${dateFrom}_${dateTo}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(lang === "ar" ? "تم تصدير Excel ✓" : "Excel exported ✓");
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

  const ar = lang === "ar";

  return (
    <div data-testid="inspections-panel">
      <form onSubmit={apply} className="bg-white border border-slate-200 p-5 mb-4 space-y-3">

        {/* Row 1: Steps 1–4 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

          {/* Step 1: Specialty */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {ar ? "١ — القسم" : "1 — Section"}
            </span>
            <select value={spec}
                    onChange={e => { setSpec(e.target.value); setTType(""); setSubGroup(""); setTargetNum(""); }}
                    className="h-11 px-3 border border-slate-200"
                    data-testid="filter-spec-select">
              <option value="">{ar ? "— اختر —" : "— Select —"}</option>
              <option value="electrical">{t("cat_electrical")}</option>
              <option value="mechanical">{t("cat_mechanical")}</option>
            </select>
          </div>

          {/* Step 2: Equipment type */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {ar ? "٢ — نوع المعدة" : "2 — Equipment"}
            </span>
            <select value={tType}
                    onChange={e => { setTType(e.target.value); setSubGroup(""); setTargetNum(""); }}
                    disabled={!spec}
                    className="h-11 px-3 border border-slate-200 disabled:opacity-40"
                    data-testid="filter-type-select">
              <option value="">{ar ? "— اختر —" : "— Select —"}</option>
              {tTypeOptions.map(tp => <option key={tp} value={tp}>{typeLabel(tp)}</option>)}
            </select>
          </div>

          {/* Step 3: Sub-group / panel type */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {tType === "machine" ? (ar ? "٣ — المجموعة" : "3 — Group")
               : tType === "panel" ? (ar ? "٣ — نوع اللوحة" : "3 — Panel Type")
               : (ar ? "٣ — غير مطلوب" : "3 — N/A")}
            </span>
            <select value={subGroup}
                    onChange={e => { setSubGroup(e.target.value); setTargetNum(""); }}
                    disabled={!tType || !needsSubGroup}
                    className="h-11 px-3 border border-slate-200 disabled:opacity-40"
                    data-testid="filter-subgroup-select">
              <option value="">{needsSubGroup ? (ar ? "— اختر —" : "— Select —") : (ar ? "—" : "—")}</option>
              {subGroupOptions.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Step 4: Equipment number (dropdown from DB) */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {ar ? "٤ — المعدة" : "4 — Equipment"}
            </span>
            <select value={targetNum}
                    onChange={e => setTargetNum(e.target.value)}
                    disabled={!step4Ready}
                    className="h-11 px-3 border border-slate-200 disabled:opacity-40"
                    data-testid="filter-target-select">
              <option value="">{ar ? "— اختر المعدة —" : "— Select Equipment —"}</option>
              {items.map(item => (
                <option key={item.id} value={item.number}>
                  {item.number}{item.name ? ` — ${item.name}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Dates + Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input type="date" value={dateFrom}
                 onChange={e => setDateFrom(e.target.value)}
                 disabled={!step4Ready}
                 className="h-11 px-3 border border-slate-200 disabled:opacity-40"
                 data-testid="filter-date-from" />
          <input type="date" value={dateTo}
                 onChange={e => setDateTo(e.target.value)}
                 disabled={!step4Ready}
                 className="h-11 px-3 border border-slate-200 disabled:opacity-40"
                 data-testid="filter-date-to" />
          <button type="submit" disabled={!step4Ready}
                  className="h-11 px-4 bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-40"
                  data-testid="apply-filters-button">
            {t("apply")}
          </button>
          <button type="button" onClick={reset}
                  className="h-11 px-4 border border-slate-200 hover:bg-slate-100">
            {t("reset")}
          </button>
        </div>
      </form>

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-slate-900">{t("results")} ({list.length})</h3>
        <button onClick={exportExcel}
                className="h-10 px-4 bg-[#1D6F42] text-white font-semibold flex items-center gap-2 hover:bg-[#155734]"
                data-testid="export-excel-button">
          <FileXls size={16} weight="bold" /> {ar ? "تصدير Excel" : "Export Excel"}
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
                  <td className="px-4 py-3">{new Date(r.created_at).toLocaleString(ar ? "ar-EG" : "en-US")}</td>
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
                    {new Date(viewing.created_at).toLocaleString(ar ? "ar-EG" : "en-US")}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">{t("technician")}</div>
                  <div className="font-semibold">{viewing.technician_name}</div>
                </div>
              </div>
              <div className="border border-slate-200">
                {(viewing.answers || []).map((a, i) => (
                  <div key={a.question_id || `ans-${i}`}
                       className={`px-4 py-3 flex items-center gap-3 ${i > 0 ? "border-t border-slate-100" : ""}`}>
                    <span className={`h-7 min-w-[50px] px-2 text-xs font-bold flex items-center justify-center ${
                      a.answer === null || a.skipped ? "bg-slate-100 text-slate-500"
                      : a.answer ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {a.answer === null || a.skipped ? "N/A" : a.answer ? t("yes") : t("no")}
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
