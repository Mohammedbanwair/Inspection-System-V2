import { useEffect, useState } from "react";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import { useI18n } from "../lib/i18n";
import { useAuth } from "../context/AuthContext";
import { ArrowLeft, ArrowRight, CheckCircle, Timer } from "@phosphor-icons/react";

function calcDuration(start, end) {
  if (!start || !end) return null;
  const diff = Math.round((new Date(end) - new Date(start)) / 60000);
  if (diff <= 0) return null;
  return `${Math.floor(diff / 60)}h ${String(diff % 60).padStart(2, "0")}m`;
}

function localISONow() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
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
  const [startTime, setStartTime] = useState(localISONow);
  const [endTime, setEndTime] = useState(localISONow);
  const [isPlanned, setIsPlanned] = useState(false);
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

  const PLANNED_RE = /PREVENTIVE|PM\b|PLANNED|SCHEDULED|صيانة\s*دورية|وقائية|مجدولة/i;

  const handleProblemChange = (val) => {
    setProblem(val);
    if (val && val !== t("other_problem")) setIsPlanned(PLANNED_RE.test(val));
  };

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
        is_planned: isPlanned,
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
            <select value={problem} onChange={(e) => handleProblemChange(e.target.value)}
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

        {/* Planned / Unplanned toggle */}
        <div className="bg-white border border-slate-200 p-4 sm:p-5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            {ar ? "نوع التوقف" : "Breakdown Type"}
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setIsPlanned(false)}
                    className={`flex-1 h-11 font-semibold text-sm transition-all ${
                      !isPlanned
                        ? "bg-red-700 text-white"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-red-50"
                    }`}>
              {ar ? "غير مخطط" : "Unplanned"}
            </button>
            <button type="button" onClick={() => setIsPlanned(true)}
                    className={`flex-1 h-11 font-semibold text-sm transition-all ${
                      isPlanned
                        ? "bg-emerald-600 text-white"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50"
                    }`}>
              {ar ? "مخطط (صيانة دورية)" : "Planned (PM)"}
            </button>
          </div>
        </div>

        {/* Times + duration preview */}
        <div className="bg-white border border-slate-200 p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                {t("start_time")}
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                dir="ltr"
                className="w-full h-11 px-3 border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                {t("end_time")}
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                dir="ltr"
                className="w-full h-11 px-3 border border-slate-200 text-sm"
              />
            </div>
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
