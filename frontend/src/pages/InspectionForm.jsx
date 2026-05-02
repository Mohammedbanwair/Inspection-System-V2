import { useEffect, useMemo, useState } from "react";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import { useI18n } from "../lib/i18n";
import {
  CheckCircle, XCircle, FloppyDisk, ArrowLeft, ArrowRight,
} from "@phosphor-icons/react";

const TARGET_LABEL_KEY = { machine: "machine_number", chiller: "chiller_number", panel: "panel_number" };
const TARGET_API = { machine: "/machines", chiller: "/chillers", panel: "/panels" };

export default function InspectionForm({ branch, onBack, onSubmitted }) {
  const { t, lang } = useI18n();
  const { category, target_type } = branch;
  const [items, setItems] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [targetId, setTargetId] = useState("");
  const [answers, setAnswers] = useState({});
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [t1, q] = await Promise.all([
          api.get(TARGET_API[target_type]),
          api.get("/questions", { params: { category } }),
        ]);
        setItems(t1.data);
        setQuestions(q.data);
      } catch (e) {
        toast.error(formatApiError(e));
      }
    })();
  }, [category, target_type]);

  const setAnswer = (qid, v) =>
    setAnswers((p) => ({ ...p, [qid]: { ...(p[qid] || {}), answer: v } }));
  const setNoteFor = (qid, n) =>
    setAnswers((p) => ({ ...p, [qid]: { ...(p[qid] || {}), note: n } }));

  const completed = useMemo(
    () => questions.filter((q) => answers[q.id]?.answer !== undefined).length,
    [answers, questions],
  );

  const submit = async () => {
    if (!targetId) return toast.error(t("select_target"));
    if (completed < questions.length) return toast.error(t("required_all_answered"));
    setSubmitting(true);
    try {
      await api.post("/inspections", {
        category, target_type, target_id: targetId, notes,
        answers: Object.entries(answers).map(([qid, v]) => ({
          question_id: qid, answer: !!v.answer, note: v.note || "",
        })),
      });
      toast.success(t("inspection_saved"));
      onSubmitted?.();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const BackArrow = lang === "ar" ? ArrowRight : ArrowLeft;
  const targetLabel = t(TARGET_LABEL_KEY[target_type]);
  const sectionLabel = t(
    category === "electrical" ? "cat_electrical" :
    category === "mechanical" ? "cat_mechanical" :
    category === "chiller" ? "cat_chiller" : "tab_chillers",
  );
  const sectionLabelFinal =
    category === "panels" ? t("tab_chillers").replace(/.*/, "") + (lang === "ar" ? "لوحات" : "Panels") : sectionLabel;

  return (
    <div className="fade-in" data-testid="inspection-form">
      <button
        onClick={onBack}
        className="h-10 px-4 mb-4 bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 flex items-center gap-2"
        data-testid="back-button"
      >
        <BackArrow size={16} weight="bold" />
        <span>{t("back")}</span>
      </button>

      <div className="mb-6">
        <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          {t("new_inspection")} · {sectionLabelFinal}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 p-5 md:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            {targetLabel}
          </label>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full h-14 mt-2 px-4 border border-slate-200 bg-white text-slate-900 text-lg focus:outline-none focus:ring-2 focus:ring-[#005CBE]"
            data-testid="target-select"
          >
            <option value="">{t("select_target")}</option>
            {items.map((m) => (
              <option key={m.id} value={m.id}>
                {m.number} {m.name ? `— ${m.name}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="bg-white border border-slate-200 p-5">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            {t("progress")}
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-4xl font-bold text-slate-900" data-testid="progress-count">
              {completed}
            </span>
            <span className="text-slate-500">/ {questions.length}</span>
          </div>
          <div className="h-2 bg-slate-100 mt-3">
            <div className="h-full bg-emerald-500 transition-all duration-300"
                 style={{ width: `${questions.length ? (completed / questions.length) * 100 : 0}%` }} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {questions.length === 0 && (
          <div className="text-center text-slate-500 py-10 border border-dashed border-slate-200 bg-white">
            {t("no_questions")}
          </div>
        )}
        {questions.map((q, idx) => {
          const curr = answers[q.id];
          return (
            <div key={q.id} className="bg-white border border-slate-200 p-5">
              <div className="mb-4">
                <span className="text-xs font-semibold text-slate-500">{idx + 1}.</span>
                <p className="text-lg font-semibold text-slate-900 mt-1 leading-relaxed">{q.text}</p>
              </div>
              <div className="flex gap-0">
                <button type="button" onClick={() => setAnswer(q.id, true)}
                        className={`seg-btn ${curr?.answer === true ? "active-yes" : ""}`}
                        data-testid={`q-${q.id}-yes`}>
                  <CheckCircle size={22} weight="bold" />
                  <span>{t("yes")}</span>
                </button>
                <button type="button" onClick={() => setAnswer(q.id, false)}
                        className={`seg-btn ${curr?.answer === false ? "active-no" : ""}`}
                        data-testid={`q-${q.id}-no`}>
                  <XCircle size={22} weight="bold" />
                  <span>{t("no")}</span>
                </button>
              </div>
              {curr?.answer === false && (
                <input type="text" placeholder={t("note_optional")}
                       value={curr?.note || ""}
                       onChange={(e) => setNoteFor(q.id, e.target.value)}
                       className="w-full h-11 mt-3 px-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005CBE]"
                       data-testid={`q-${q.id}-note`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 bg-white border border-slate-200 p-5">
        <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          {t("general_notes")}
        </label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                  className="w-full mt-2 p-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005CBE]"
                  data-testid="inspection-notes" />
        <button onClick={submit} disabled={submitting}
                className="mt-4 h-14 px-8 bg-slate-900 text-white font-bold text-lg flex items-center gap-2 hover:bg-slate-800 disabled:opacity-60"
                data-testid="submit-inspection-button">
          <FloppyDisk size={20} weight="bold" />
          <span>{submitting ? t("saving") : t("save_inspection")}</span>
        </button>
      </div>
    </div>
  );
}
