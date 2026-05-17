import { useEffect, useState } from "react";
import { api, formatApiError } from "../../lib/api";
import { toast } from "sonner";
import { useI18n } from "../../lib/i18n";
import { CheckSquare, Square } from "@phosphor-icons/react";

const DAYS_AR = ["الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];
const DAYS_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
// Python weekday: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun

export default function WorkSchedule() {
  const { t, lang } = useI18n();
  const ar = lang === "ar";

  const [hoursPerDay, setHoursPerDay] = useState(24);
  const [offDays, setOffDays] = useState([4]); // Friday off by default
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const dayNames = ar ? DAYS_AR : DAYS_EN;

  useEffect(() => {
    api.get("/settings/work-schedule")
      .then(({ data }) => {
        setHoursPerDay(data.hours_per_day ?? 24);
        setOffDays(data.off_days ?? [4]);
      })
      .catch((e) => toast.error(formatApiError(e)))
      .finally(() => setLoading(false));
  }, []);

  const toggleDay = (idx) => {
    setOffDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
    );
  };

  const workingDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !offDays.includes(d));
  const hoursPerWeek = workingDays.length * hoursPerDay;

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/settings/work-schedule", {
        hours_per_day: hoursPerDay,
        off_days: offDays,
      });
      toast.success(ar ? "تم الحفظ ✓" : "Saved ✓");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-[#6B2D6B] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <div className="bg-white border border-slate-200 p-5 space-y-6">

        {/* Hours per day */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
            {ar ? "ساعات العمل في اليوم" : "Working Hours per Day"}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={24}
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(Math.min(24, Math.max(1, Number(e.target.value))))}
              dir="ltr"
              className="w-24 h-11 px-3 border border-slate-200 text-sm text-center font-bold text-lg"
            />
            <span className="text-sm text-slate-500">{ar ? "ساعة / يوم" : "hours / day"}</span>
          </div>
        </div>

        {/* Days of the week */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
            {ar ? "أيام الإجازة (اختر أيام العطلة)" : "Days Off (tick the rest days)"}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {dayNames.map((name, idx) => {
              const isOff = offDays.includes(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleDay(idx)}
                  className={`flex items-center gap-3 px-4 py-3 border text-sm font-semibold transition-colors ${
                    isOff
                      ? "bg-red-50 border-red-300 text-red-700"
                      : "bg-emerald-50 border-emerald-300 text-emerald-700"
                  }`}
                >
                  {isOff
                    ? <CheckSquare size={18} weight="fill" />
                    : <Square size={18} />}
                  <span>{name}</span>
                  <span className={`ms-auto text-xs font-normal ${isOff ? "text-red-400" : "text-emerald-500"}`}>
                    {isOff
                      ? (ar ? "إجازة" : "Off")
                      : (ar ? "عمل" : "Work")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
          <div className="flex justify-between mb-1">
            <span>{ar ? "أيام العمل في الأسبوع" : "Working days / week"}</span>
            <span className="font-bold text-slate-900">{workingDays.length}</span>
          </div>
          <div className="flex justify-between">
            <span>{ar ? "ساعات العمل في الأسبوع" : "Working hours / week"}</span>
            <span className="font-bold text-slate-900">{hoursPerWeek}h</span>
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full h-11 bg-[#6B2D6B] text-white font-bold text-sm hover:bg-[#5a2559] disabled:opacity-50"
        >
          {saving ? (ar ? "جارٍ الحفظ..." : "Saving...") : t("save")}
        </button>
      </div>
    </div>
  );
}
