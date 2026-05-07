import { useEffect, useMemo, useState } from "react";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import { useI18n } from "../lib/i18n";
import {
  CheckCircle, XCircle, MinusCircle, FloppyDisk, ArrowLeft, ArrowRight, Clock,
} from "@phosphor-icons/react";

const TARGET_LABEL_KEY = { machine: "machine_number", chiller: "chiller_number", panel: "panel_number" };
const TARGET_API = { machine: "/machines", chiller: "/chillers", panel: "/panels" };

function formatHMS(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function InspectionForm({ branch, onBack, onSubmitted }) {
  const { t, lang } = useI18n();
  const { category, target_type, group, panel_type } = branch;
  const [items, setItems] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [targetId, setTargetId] = useState("");
  const [answers, setAnswers] = useState({});
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(null); // {in_cooldown, remaining_seconds, last_at, last_technician_name}

  useEffect(() => {
    (async () => {
      try {
        const params = {};
        if (group) params.group = group;
        if (panel_type) params.panel_type = panel_type;
        const [t1, q] = await Promise.all([
          api.get(TARGET_API[target_type], { params }),
          api.get("/questions", { params: { category } }),
        ]);
        setItems(t1.data);
        setQuestions(q.data);
      } catch (e) {
        toast.error(formatApiError(e));
      }
    })();
  }, [category, target_type]);

  // Fetch cooldown when target changes
  useEffect(() => {
    if (!targetId) { setCooldown(null); return; }
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/inspections/cooldown", {
          params: { target_id: targetId, category },
        });
        if (alive) setCooldown(data);
      } catch (e) {
        if (alive) setCooldown(null);
      }
    })();
    return () => { alive = false; };
  }, [targetId, category]);

  // Tick countdown every second
  useEffect(() => {
    if (!cooldown?.in_cooldown) return;
    const id = setInterval(() => {
      setCooldown((c) => {
        if (!c) return c;
        const next = c.remaining_seconds - 1;
        if (next <= 0) return { ...c, in_cooldown: false, remaining_seconds: 0 };
        return { ...c, remaining_seconds: next };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown?.in_cooldown]);

  const setAnswer = (qid, v) =>
    setAnswers((p) => ({ ...p, [qid]: { ...(p[qid] || {}), answer: v } }));
  const setNumericValue = (qid, v) =>
    setAnswers((p) => ({ ...p, [qid]: { ...(p[qid] || {}), numeric_value: v, answer: v !== "" ? true : undefined } }));
  const setNoteFor = (qid, n) =>
    setAnswers((p) => ({ ...p, [qid]: { ...(p[qid] || {}), note: n } }));

  const completed = useMemo(
    () => questions.filter((q) => {
      const a = answers[q.id];
      if (q.answer_type === "numeric") return a?.numeric_value !== undefined && a?.numeric_value !== "";
      return a?.answer !== undefined;  // "na", true, false are all defined
    }).length,
    [answers, questions],
  );

  const inCooldown = !!cooldown?.in_cooldown;

  const submit = async () => {
    if (!targetId) return toast.error(t("select_target"));
    if (inCooldown) return toast.error(t("cooldown_blocked"));
    if (completed < questions.length) return toast.error(t("required_all_answered"));
    setSubmitting(true);
    try {
      await api.post("/inspections", {
        category, target_type, target_id: targetId, notes,
        answers: Object.entries(answers).map(([qid, v]) => ({
          question_id: qid,
          answer: v.answer === "na" ? null : v.answer !== undefined ? !!v.answer : null,
          numeric_value: v.numeric_value !== undefined ? parseFloat(v.numeric_value) : null,
          note: v.note || "",
          skipped: v.answer === "na",
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
  const catLabelMap = {
    electrical: "cat_electrical", mechanical: "cat_mechanical",
    chiller: "cat_chiller", panels_main: "cat_panels_main", panels_sub: "cat_panels_sub",
  };
  const sectionLabelFinal = t(catLabelMap[category] || "cat_panels_sub");

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

      {inCooldown && (
        <div
          className="mb-6 bg-amber-50 border border-amber-300 p-5 flex items-start gap-4 fade-in"
          data-testid="cooldown-banner"
        >
          <div className="h-12 w-12 bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
            <Clock size={22} weight="bold" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-amber-900">
              {t("cooldown_active")}
            </div>
            <div className="text-xs text-amber-800 mt-1 leading-relaxed">
              {t("cooldown_message")}
              {cooldown.last_technician_name && (
                <> · {t("last_by")}: <span className="font-semibold">{cooldown.last_technician_name}</span></>
              )}
            </div>
            <div
              className="mt-3 text-3xl font-bold text-amber-900 tabular-nums tracking-wider"
              data-testid="cooldown-timer"
            >
              {formatHMS(cooldown.remaining_seconds)}
            </div>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {questions.length === 0 && (
          <div className="text-center text-slate-500 py-10 border border-dashed border-slate-200 bg-white">
            {t("no_questions")}
          </div>
        )}
        {questions.map((q, idx) => {
          const curr = answers[q.id];
          const isNumeric = q.answer_type === "numeric";
          return (
            <div key={q.id} className="bg-white border border-slate-200 p-5">
              <div className="mb-4">
                <span className="text-xs font-semibold text-slate-500">{idx + 1}.</span>
                <p className="text-lg font-semibold text-slate-900 mt-1 leading-relaxed">{q.text}</p>
              </div>
              {isNumeric ? (
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    value={curr?.numeric_value ?? ""}
                    onChange={(e) => setNumericValue(q.id, e.target.value)}
                    className="w-36 h-12 px-4 text-xl font-bold border-2 border-slate-200 focus:outline-none focus:border-[#6B2D6B] text-center"
                    data-testid={`q-${q.id}-numeric`}
                  />
                  <span className="text-lg font-semibold text-[#6B2D6B]">°C</span>
                  {curr?.numeric_value !== undefined && curr?.numeric_value !== "" && (
                    <span className="text-emerald-600 text-sm font-semibold">✓</span>
                  )}
                </div>
              ) : (
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
                  <button type="button" onClick={() => setAnswer(q.id, "na")}
                          className={`seg-btn ${curr?.answer === "na" ? "active-na" : ""}`}
                          data-testid={`q-${q.id}-na`}>
                    <MinusCircle size={22} weight="bold" />
                    <span>N/A</span>
                  </button>
                </div>
              )}
              {!isNumeric && curr?.answer === false && (
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
        <button onClick={submit} disabled={submitting || inCooldown}
                className="mt-4 h-14 px-8 bg-slate-900 text-white font-bold text-lg flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="submit-inspection-button">
          <FloppyDisk size={20} weight="bold" />
          <span>{submitting ? t("saving") : inCooldown ? t("cooldown_blocked_short") : t("save_inspection")}</span>
        </button>
      </div>
    </div>
  );
}
