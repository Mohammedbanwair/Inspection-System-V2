import { useEffect, useState } from "react";
import { api, formatApiError } from "../../lib/api";
import { toast } from "sonner";
import { useI18n } from "../../lib/i18n";
import { Plus, PencilSimple, Trash } from "@phosphor-icons/react";

const CATS = ["electrical", "mechanical", "chiller", "panels_main", "panels_sub", "cooling_tower"];
const CAT_KEY = {
  electrical: "cat_electrical",
  mechanical: "cat_mechanical",
  chiller: "cat_chiller",
  panels_main: "cat_panels_main",
  panels_sub: "cat_panels_sub",
  cooling_tower: "cat_cooling_tower",
};

export default function Questions() {
  const { t, lang } = useI18n();
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [category, setCategory] = useState("electrical");
  const [text, setText] = useState("");
  const [answerType, setAnswerType] = useState("yes_no");
  const [unit, setUnit] = useState("°C");

  const load = async () => {
    try {
      const { data } = await api.get("/questions");
      setList(data);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  useEffect(() => { load(); }, []);

  const NUMERIC_CATS = ["panels_main", "panels_sub", "chiller", "cooling_tower"];

  const openCreate = () => {
    setEditing(null); setText(""); setCategory("electrical");
    setAnswerType("yes_no"); setUnit("°C"); setShowForm(true);
  };
  const openEdit = (q) => {
    setEditing(q); setText(q.text); setCategory(q.category);
    setAnswerType(q.answer_type || "yes_no");
    setUnit(q.unit || "°C"); setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        text, category,
        answer_type: NUMERIC_CATS.includes(category) ? answerType : "yes_no",
        unit: answerType === "numeric" ? unit : null,
      };
      if (editing) {
        await api.patch(`/questions/${editing.id}`, payload);
      } else {
        await api.post("/questions", { ...payload, order: list.length });
      }
      toast.success(t("save"));
      setShowForm(false);
      load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const del = async (q) => {
    if (!window.confirm(t("confirm_delete"))) return;
    try { await api.delete(`/questions/${q.id}`); toast.success("✓"); load(); }
    catch (err) { toast.error(formatApiError(err)); }
  };

  const filtered = filter === "all" ? list : list.filter((q) => q.category === filter);

  return (
    <div data-testid="questions-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-bold text-slate-900">{t("tab_questions")} ({filtered.length})</h3>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
                  className="h-10 px-3 border border-slate-200 focus:outline-none"
                  data-testid="question-filter">
            <option value="all">{t("all_sections")}</option>
            {CATS.map((c) => <option key={c} value={c}>{t(CAT_KEY[c])}</option>)}
          </select>
          <button onClick={openCreate}
                  className="h-10 px-4 bg-slate-900 text-white font-semibold flex items-center gap-2 hover:bg-slate-800"
                  data-testid="add-question-button">
            <Plus size={16} weight="bold" /> {t("add_question")}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={save}
              className="bg-white border border-slate-200 p-5 mb-4 fade-in"
              data-testid="question-form">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select value={category}
                    onChange={(e) => { setCategory(e.target.value); setAnswerType("yes_no"); }}
                    className="h-12 px-3 border border-slate-200" data-testid="question-category-select">
              {CATS.map((c) => <option key={c} value={c}>{t(CAT_KEY[c])}</option>)}
            </select>
            <input required placeholder={t("question_text")} value={text}
                   onChange={(e) => setText(e.target.value)}
                   className="h-12 px-3 border border-slate-200 md:col-span-2 focus:outline-none focus:ring-2 focus:ring-[#005CBE]"
                   data-testid="question-text-input" />
            <div className="flex gap-2">
              <button type="submit"
                      className="h-12 px-5 bg-slate-900 text-white font-semibold hover:bg-slate-800 flex-1"
                      data-testid="save-question-button">{t("save")}</button>
              <button type="button" onClick={() => setShowForm(false)}
                      className="h-12 px-5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100">
                {t("cancel")}
              </button>
            </div>
          </div>

          {NUMERIC_CATS.includes(category) && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-slate-600">
                {lang === "ar" ? "نوع الإجابة:" : "Answer Type:"}
              </span>
              <button
                type="button"
                onClick={() => setAnswerType("yes_no")}
                className={`h-10 px-4 flex items-center gap-2 font-semibold text-sm border-2 transition-all ${
                  answerType === "yes_no"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 text-slate-600 hover:border-slate-400"
                }`}
              >
                ✅ {lang === "ar" ? "نعم / لا" : "Yes / No"}
              </button>
              <button
                type="button"
                onClick={() => setAnswerType("numeric")}
                className={`h-10 px-4 flex items-center gap-2 font-semibold text-sm border-2 transition-all ${
                  answerType === "numeric"
                    ? "border-purple-700 bg-purple-700 text-white"
                    : "border-slate-200 text-slate-600 hover:border-purple-400"
                }`}
              >
                🔢 {lang === "ar" ? "رقمي" : "Numeric"}
              </button>
              {answerType === "numeric" && (
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder={lang === "ar" ? "الوحدة (°C, kg...)" : "Unit (°C, kg...)"}
                  className="h-10 px-3 border border-slate-200 w-36 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              )}
            </div>
          )}
        </form>
      )}

      <div className="bg-white border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-start px-4 py-3 font-semibold">{t("section")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("question_text")}</th>
              <th className="text-start px-4 py-3 font-semibold">{lang === "ar" ? "نوع الإجابة" : "Answer Type"}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((q, i) => (
              <tr key={q.id} className={`border-t border-slate-100 ${i % 2 ? "bg-slate-50/40" : ""}`}>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 text-xs font-semibold bg-slate-100">{t(CAT_KEY[q.category])}</span>
                </td>
                <td className="px-4 py-3">{q.text}</td>
                <td className="px-4 py-3">
                  {q.answer_type === "numeric"
                    ? <span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-700">رقمي {q.unit || "°C"}</span>
                    : <span className="px-2 py-1 text-xs font-semibold bg-slate-100 text-slate-600">نعم / لا</span>
                  }
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(q)}
                            className="h-9 w-9 border border-slate-200 hover:bg-slate-100 flex items-center justify-center"
                            data-testid={`edit-question-${q.id}`}>
                      <PencilSimple size={14} />
                    </button>
                    <button onClick={() => del(q)}
                            className="h-9 w-9 border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center"
                            data-testid={`delete-question-${q.id}`}>
                      <Trash size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="3" className="text-center text-slate-500 py-8">{t("no_results")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
