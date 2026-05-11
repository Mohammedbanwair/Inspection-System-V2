import { useEffect, useMemo, useState } from "react";
import { api, formatApiError, API } from "../../lib/api";
import { toast } from "sonner";
import { useI18n } from "../../lib/i18n";
import { Eye, FilePdf, Trash, X } from "@phosphor-icons/react";

const SECTIONS = ["Clamp Unit", "Injection Unit", "Electrical Panel", "General"];

export default function Preventive() {
  const { t, lang } = useI18n();
  const [list, setList] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [viewing, setViewing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [machines, setMachines] = useState([]);
  const [targetNum, setTargetNum] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");

  const ar = lang === "ar";

  useEffect(() => {
    (async () => {
      try {
        const [mRes, qRes] = await Promise.all([
          api.get("/machines"),
          api.get("/questions", { params: { category: "preventive" } }),
        ]);
        setMachines(mRes.data);
        setQuestions(qRes.data);
      } catch (e) { toast.error(formatApiError(e)); }
    })();
    load();
    // eslint-disable-next-line
  }, []);

  const qMap = useMemo(() => Object.fromEntries(questions.map((q) => [q.id, q])), [questions]);

  const qBySection = useMemo(() => {
    const map = {};
    for (const q of questions) {
      const sec = q.section || "General";
      if (!map[sec]) map[sec] = [];
      map[sec].push(q);
    }
    return map;
  }, [questions]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { category: "preventive" };
      if (targetNum) params.target_number = targetNum;
      if (dateFrom)  params.date_from = dateFrom;
      if (dateTo)    params.date_to   = dateTo;
      const { data } = await api.get("/inspections", { params });
      setList(data);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };

  const apply = (e) => { e.preventDefault(); load(); };
  const reset = () => { setTargetNum(""); setDateFrom(""); setDateTo(""); setTimeout(load, 0); };

  const downloadPDF = async (id, num, date) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/inspections/${id}/export/preventive-pdf`, {
        headers: { Authorization: `Bearer ${token}` }, credentials: "include",
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `preventive_${num}_${date}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error(e.message); }
  };

  const del = async (id) => {
    if (!window.confirm(t("confirm_delete"))) return;
    try { await api.delete(`/inspections/${id}`); toast.success("✓"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div data-testid="preventive-panel">
      <form onSubmit={apply} className="bg-white border border-slate-200 p-5 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {ar ? "المكينة" : "Machine"}
            </span>
            <select value={targetNum} onChange={e => setTargetNum(e.target.value)}
                    className="h-11 px-3 border border-slate-200">
              <option value="">{ar ? "— الكل —" : "— All —"}</option>
              {machines.map(m => (
                <option key={m.id} value={m.number}>
                  {m.number}{m.name ? ` — ${m.name}` : ""}
                </option>
              ))}
            </select>
          </div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                 className="h-11 px-3 border border-slate-200 mt-5" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                 className="h-11 px-3 border border-slate-200 mt-5" />
          <div className="flex gap-2 mt-5">
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
              <th className="text-start px-4 py-3 font-semibold">{t("target_number")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("technician")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("status")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan="5" className="text-center text-slate-400 py-8">
                <div className="inline-block w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              </td></tr>
            )}
            {!loading && list.length === 0 && (
              <tr><td colSpan="5" className="text-center text-slate-500 py-8">{t("no_results")}</td></tr>
            )}
            {list.map((r, i) => {
              const fails = (r.answers || []).filter((a) => a.answer === false).length;
              const dateStr = r.created_at?.slice(0, 10) || "";
              return (
                <tr key={r.id} className={`border-t border-slate-100 ${i % 2 ? "bg-slate-50/40" : ""}`}>
                  <td className="px-4 py-3">
                    {new Date(r.created_at).toLocaleString(ar ? "ar-EG" : "en-US", {
                      year: "numeric", month: "numeric", day: "numeric",
                      hour: "numeric", hour12: true,
                    })}
                  </td>
                  <td className="px-4 py-3 font-semibold">{r.target_number}</td>
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
                              title={t("view_report")}>
                        <Eye size={14} />
                      </button>
                      <button onClick={() => downloadPDF(r.id, r.target_number, dateStr)}
                              className="h-9 px-3 border border-[#6B2D6B] text-[#6B2D6B] hover:bg-purple-50 flex items-center gap-1 text-xs font-semibold"
                              title={t("preventive_pdf")}>
                        <FilePdf size={14} />
                        {ar ? "PDF" : "PDF"}
                      </button>
                      <button onClick={() => del(r.id)}
                              className="h-9 w-9 border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center">
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
             onClick={() => setViewing(null)}>
          <div className="bg-white border border-slate-200 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
               onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  {t("preventive_maintenance")}
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  {ar ? "مكينة" : "Machine"} #{viewing.target_number}
                  {viewing.target_name ? ` — ${viewing.target_name}` : ""}
                </h3>
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => downloadPDF(viewing.id, viewing.target_number, viewing.created_at?.slice(0, 10))}
                  className="h-9 px-3 bg-[#6B2D6B] text-white font-semibold text-xs flex items-center gap-1 hover:bg-[#5a2559]"
                >
                  <FilePdf size={14} weight="bold" />
                  {t("download_pdf")}
                </button>
                <button onClick={() => setViewing(null)}
                        className="h-9 w-9 border border-slate-200 hover:bg-slate-100 flex items-center justify-center">
                  <X size={16} />
                </button>
              </div>
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

              {/* Sections */}
              {SECTIONS.map((sec) => {
                const secQs = qBySection[sec] || [];
                if (secQs.length === 0) return null;
                const answersMap = Object.fromEntries(
                  (viewing.answers || []).map((a) => [a.question_id, a])
                );
                return (
                  <div key={sec}>
                    <div className="bg-[#6B2D6B] text-white px-4 py-2 font-bold text-sm">{sec}</div>
                    <div className="border border-slate-200 border-t-0">
                      {secQs.map((q, i) => {
                        const a = answersMap[q.id];
                        const isNA = !a || a.skipped || a.answer === null;
                        const isOK = !isNA && a.answer === true;
                        const isFail = !isNA && a.answer === false;
                        return (
                          <div key={q.id}
                               className={`px-4 py-3 flex items-start gap-3 ${i > 0 ? "border-t border-slate-100" : ""}`}>
                            <span className={`h-7 min-w-[50px] px-2 text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                              isNA ? "bg-slate-100 text-slate-500"
                              : isOK ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"}`}>
                              {isNA ? "N/A" : isOK ? "✓" : "✗"}
                            </span>
                            <div className="flex-1">
                              <div className="text-sm">{q.text}</div>
                              {a?.note && (
                                <div className="text-xs text-slate-500 mt-1">{t("notes")}: {a.note}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {viewing.notes && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
                    {t("general_notes")}
                  </div>
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
