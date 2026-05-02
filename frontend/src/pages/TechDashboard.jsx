import { useEffect, useMemo, useState } from "react";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import TopBar from "../components/TopBar";
import { useAuth } from "../context/AuthContext";
import {
  CheckCircle,
  XCircle,
  FloppyDisk,
  Gear,
  Wrench,
  Snowflake,
} from "@phosphor-icons/react";

const CATS = [
  { key: "electrical", label: "كهرباء", Icon: Gear },
  { key: "mechanical", label: "ميكانيكا", Icon: Wrench },
  { key: "chiller", label: "شيلر", Icon: Snowflake },
];

export default function TechDashboard() {
  const { user } = useAuth();
  const [machines, setMachines] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [machineId, setMachineId] = useState("");
  const [answers, setAnswers] = useState({}); // qid -> {answer, note}
  const [notes, setNotes] = useState("");
  const [activeCat, setActiveCat] = useState("electrical");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [m, q, h] = await Promise.all([
          api.get("/machines"),
          api.get("/questions"),
          api.get("/inspections", { params: { limit: 10 } }),
        ]);
        setMachines(m.data);
        setQuestions(q.data);
        setHistory(h.data);
      } catch (e) {
        toast.error(formatApiError(e));
      }
    })();
  }, []);

  const qByCat = useMemo(() => {
    const map = { electrical: [], mechanical: [], chiller: [] };
    questions.forEach((q) => map[q.category]?.push(q));
    return map;
  }, [questions]);

  const setAnswer = (qid, value) => {
    setAnswers((p) => ({ ...p, [qid]: { ...(p[qid] || {}), answer: value } }));
  };

  const setNoteFor = (qid, note) => {
    setAnswers((p) => ({ ...p, [qid]: { ...(p[qid] || {}), note } }));
  };

  const completed = useMemo(() => {
    return questions.filter((q) => answers[q.id]?.answer !== undefined).length;
  }, [answers, questions]);

  const submit = async () => {
    if (!machineId) return toast.error("اختر رقم المكينة أولاً");
    if (completed < questions.length)
      return toast.error("يرجى الإجابة على جميع الأسئلة قبل الحفظ");
    setSubmitting(true);
    try {
      const payload = {
        machine_id: machineId,
        notes,
        answers: Object.entries(answers).map(([question_id, v]) => ({
          question_id,
          answer: !!v.answer,
          note: v.note || "",
        })),
      };
      await api.post("/inspections", payload);
      toast.success("تم حفظ الفحص بنجاح");
      setAnswers({});
      setNotes("");
      setMachineId("");
      const h = await api.get("/inspections", { params: { limit: 10 } });
      setHistory(h.data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" data-testid="tech-dashboard">
      <TopBar />
      <main className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            فحص جديد
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mt-1">
            مرحباً {user?.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            اختر المكينة وأجب على الأسئلة بوضع ✓ أو ✗.
          </p>
        </div>

        {/* Machine + progress */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-slate-200 p-5 md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              رقم المكينة
            </label>
            <select
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
              className="w-full h-14 mt-2 px-4 border border-slate-200 bg-white text-slate-900 text-lg focus:outline-none focus:ring-2 focus:ring-[#005CBE]"
              data-testid="machine-select"
            >
              <option value="">— اختر مكينة —</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.number} {m.name ? `— ${m.name}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="bg-white border border-slate-200 p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              التقدم
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span
                className="text-4xl font-bold text-slate-900"
                data-testid="progress-count"
              >
                {completed}
              </span>
              <span className="text-slate-500">/ {questions.length}</span>
            </div>
            <div className="h-2 bg-slate-100 mt-3">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{
                  width: `${questions.length ? (completed / questions.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-6">
          {CATS.map(({ key, label, Icon }) => {
            const count = qByCat[key]?.length || 0;
            const done = qByCat[key]?.filter((q) => answers[q.id]?.answer !== undefined).length || 0;
            const active = activeCat === key;
            return (
              <button
                key={key}
                onClick={() => setActiveCat(key)}
                className={`flex-1 md:flex-none px-6 py-4 border-b-4 flex items-center gap-2 font-semibold transition-all ${
                  active
                    ? "border-slate-900 text-slate-900 bg-white"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
                data-testid={`tab-${key}`}
              >
                <Icon size={18} weight={active ? "bold" : "regular"} />
                <span>{label}</span>
                <span
                  className={`text-xs px-2 py-0.5 ${
                    done === count && count > 0
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {done}/{count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Questions */}
        <div className="space-y-3 fade-in">
          {qByCat[activeCat]?.length ? (
            qByCat[activeCat].map((q, idx) => {
              const curr = answers[q.id];
              return (
                <div key={q.id} className="bg-white border border-slate-200 p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <span className="text-xs font-semibold text-slate-500">
                        سؤال {idx + 1}
                      </span>
                      <p className="text-lg font-semibold text-slate-900 mt-1 leading-relaxed">
                        {q.text}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-0">
                    <button
                      type="button"
                      onClick={() => setAnswer(q.id, true)}
                      className={`seg-btn ${curr?.answer === true ? "active-yes" : ""}`}
                      data-testid={`q-${q.id}-yes`}
                    >
                      <CheckCircle size={22} weight="bold" />
                      <span>صح</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnswer(q.id, false)}
                      className={`seg-btn ${curr?.answer === false ? "active-no" : ""}`}
                      data-testid={`q-${q.id}-no`}
                    >
                      <XCircle size={22} weight="bold" />
                      <span>خطأ</span>
                    </button>
                  </div>
                  {curr?.answer === false && (
                    <input
                      type="text"
                      placeholder="ملاحظة (اختياري)"
                      value={curr?.note || ""}
                      onChange={(e) => setNoteFor(q.id, e.target.value)}
                      className="w-full h-11 mt-3 px-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005CBE]"
                      data-testid={`q-${q.id}-note`}
                    />
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center text-slate-500 py-10 border border-dashed border-slate-200 bg-white">
              لا توجد أسئلة في هذا القسم
            </div>
          )}
        </div>

        {/* Notes + submit */}
        <div className="mt-6 bg-white border border-slate-200 p-5">
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            ملاحظات عامة
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full mt-2 p-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005CBE]"
            placeholder="أي ملاحظة إضافية..."
            data-testid="inspection-notes"
          />
          <button
            onClick={submit}
            disabled={submitting}
            className="mt-4 h-14 px-8 bg-slate-900 text-white font-bold text-lg flex items-center gap-2 hover:bg-slate-800 disabled:opacity-60"
            data-testid="submit-inspection-button"
          >
            <FloppyDisk size={20} weight="bold" />
            <span>{submitting ? "جارٍ الحفظ..." : "حفظ الفحص"}</span>
          </button>
        </div>

        {/* History */}
        <div className="mt-10">
          <h3 className="text-xl font-bold text-slate-900 mb-3">آخر فحوصاتك</h3>
          <div className="bg-white border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-start px-4 py-3 font-semibold">التاريخ</th>
                  <th className="text-start px-4 py-3 font-semibold">رقم المكينة</th>
                  <th className="text-start px-4 py-3 font-semibold">عدد الأعطال</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 && (
                  <tr>
                    <td colSpan="3" className="text-center text-slate-500 py-6">
                      لا توجد فحوصات بعد
                    </td>
                  </tr>
                )}
                {history.map((h) => {
                  const fails = (h.answers || []).filter((a) => !a.answer).length;
                  return (
                    <tr key={h.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        {new Date(h.created_at).toLocaleString("ar-EG")}
                      </td>
                      <td className="px-4 py-3 font-semibold">{h.machine_number}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-semibold ${
                            fails > 0
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {fails > 0 ? `${fails} أعطال` : "سليم"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
