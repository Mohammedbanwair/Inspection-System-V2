import { useEffect, useState } from "react";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import { useI18n } from "../lib/i18n";
import { useAuth } from "../context/AuthContext";
import { ArrowLeft, ArrowRight, CheckCircle, Timer } from "@phosphor-icons/react";

function parseTime12h(str) {
  if (!str) return null;
  const m = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1]);
  const mn = parseInt(m[2]);
  const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + mn;
}

function calcDuration(start, end) {
  const s = parseTime12h(start);
  const e = parseTime12h(end);
  if (s === null || e === null) return null;
  let diff = e - s;
  if (diff < 0) diff += 1440;
  return `${Math.floor(diff / 60)}h ${String(diff % 60).padStart(2, "0")}m`;
}

function TimePicker({ label, onChange }) {
  const [h, setH] = useState("06");
  const [m, setM] = useState("00");
  const [ampm, setAmpm] = useState("AM");

  useEffect(() => {
    onChange(`${h}:${m} ${ampm}`);
    // eslint-disable-next-line
  }, [h, m, ampm]);

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const mins = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
        {label}
      </label>
      <div className="flex gap-1">
        <select value={h} onChange={(e) => setH(e.target.value)}
                className="flex-1 h-11 px-2 border border-slate-200 text-sm bg-white">
          {hours.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={m} onChange={(e) => setM(e.target.value)}
                className="flex-1 h-11 px-2 border border-slate-200 text-sm bg-white">
          {mins.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={ampm} onChange={(e) => setAmpm(e.target.value)}
                className="w-20 h-11 px-2 border border-slate-200 text-sm bg-white font-semibold">
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}

export default function BreakdownForm({ onBack, onSubmitted }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const ar = lang === "ar";
  const Arrow = ar ? ArrowLeft : ArrowRight;

  const [machines, setMachines] = useState([]);
  const [reasons, setReasons] = useState([]);
  const [machineId, setMachineId] = useState("");
  const [problem, setProblem] = useState("");
  const [otherDesc, setOtherDesc] = useState("");
  const [repairDesc, setRepairDesc] = useState("");
  const [startTime, setStartTime] = useState("06:00 AM");
  const [endTime, setEndTime] = useState("06:00 AM");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    Promise.all([api.get("/machines"), api.get("/downtime-reasons")])
      .then(([mRes, rRes]) => {
        setMachines(mRes.data);
        setReasons(rRes.data);
      })
      .catch((e) => toast.error(formatApiError(e)));
  }, []);

  const filteredReasons = reasons.filter(
    (r) => !r.specialty || r.specialty === user?.specialty
  );

  const isOther = problem === t("other_problem");
  const brief = isOther ? otherDesc.trim() : problem;
  const duration = calcDuration(startTime, endTime);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!machineId) { toast.error(ar ? "اختر مكينة" : "Select a machine"); return; }
    if (!brief)     { toast.error(ar ? "اختر أو اكتب سبب التوقف" : "Select or enter a downtime reason"); return; }
    setSaving(true);
    try {
      await api.post("/breakdowns", {
        machine_id: machineId,
        brief_description: brief,
        repair_description: repairDesc,
        start_time: startTime,
        end_time: endTime,
      });
      toast.success(t("breakdown_submitted"));
      setDone(true);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="flex items-center justify-center mb-4">
          <CheckCircle size={60} weight="fill" className="text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{t("breakdown_submitted")}</h2>
        <p className="text-sm text-slate-500 mb-8">
          {ar ? "تم تسليم تقرير التوقف إلى الادمن بنجاح." : "The downtime report has been delivered to the admin."}
        </p>
        <button onClick={onBack}
                className="h-11 px-8 bg-slate-900 text-white font-semibold hover:bg-slate-800">
          {t("back")}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack}
                className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
          <Arrow size={18} weight="bold" />
          {t("back")}
        </button>
        <span className="text-slate-300">|</span>
        <span className="text-sm font-semibold text-slate-900">{t("breakdown_report")}</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Machine + Reason */}
        <div className="bg-white border border-slate-200 p-4 sm:p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              {ar ? "المكينة" : "Machine"}
            </label>
            <select value={machineId} onChange={(e) => setMachineId(e.target.value)}
                    className="w-full h-11 px-3 border border-slate-200 bg-white text-sm">
              <option value="">{t("select_target")}</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.number}{m.name ? ` — ${m.name}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              {t("brief_description")}
            </label>
            <select value={problem} onChange={(e) => setProblem(e.target.value)}
                    className="w-full h-11 px-3 border border-slate-200 bg-white text-sm">
              <option value="">{t("select_problem")}</option>
              {filteredReasons.map((r) => <option key={r.id} value={r.text}>{r.text}</option>)}
              <option value={t("other_problem")}>{t("other_problem")}</option>
            </select>
            {isOther && (
              <input
                type="text"
                value={otherDesc}
                onChange={(e) => setOtherDesc(e.target.value)}
                placeholder={t("other_desc_placeholder")}
                className="w-full h-11 px-3 border border-slate-200 text-sm mt-2"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              {t("repair_description")}
            </label>
            <textarea
              value={repairDesc}
              onChange={(e) => setRepairDesc(e.target.value)}
              placeholder={t("repair_description_placeholder")}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 text-sm resize-none"
            />
          </div>
        </div>

        {/* Times + duration preview */}
        <div className="bg-white border border-slate-200 p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <TimePicker label={t("start_time")} onChange={setStartTime} />
            <TimePicker label={t("end_time")} onChange={setEndTime} />
          </div>
          {duration && (
            <div className="mt-4 flex items-center gap-2 bg-[#EDE0ED] px-4 py-2.5">
              <Timer size={16} weight="bold" className="text-[#6B2D6B]" />
              <span className="text-sm font-semibold text-[#6B2D6B]">
                {ar ? "مدة التوقف:" : "Downtime Duration:"}{" "}
                <span className="text-lg">{duration}</span>
              </span>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full h-12 bg-[#6B2D6B] text-white font-bold text-sm hover:bg-[#5a2559] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? t("submitting_breakdown") : t("submit_breakdown")}
        </button>
      </form>
    </div>
  );
}
