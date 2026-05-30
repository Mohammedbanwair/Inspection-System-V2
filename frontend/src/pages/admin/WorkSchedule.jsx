import { useEffect, useState } from "react";
import { api, formatApiError } from "../../lib/api";
import { toast } from "sonner";
import { useI18n } from "../../lib/i18n";
import { CheckSquare, Square, Plus, Trash } from "@phosphor-icons/react";

const DAYS_AR = ["الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];
const DAYS_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
// Python weekday: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun

export default function WorkSchedule() {
  const { t, lang } = useI18n();
  const ar = lang === "ar";

  const [hoursPerDay, setHoursPerDay] = useState(24);
  const [offDays, setOffDays]         = useState([4]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);

  // Holidays state
  const [holidays, setHolidays]       = useState([]);
  const [newHolDate, setNewHolDate]   = useState("");
  const [newHolName, setNewHolName]   = useState("");
  const [addingHol, setAddingHol]     = useState(false);

  const dayNames = ar ? DAYS_AR : DAYS_EN;

  useEffect(() => {
    Promise.all([
      api.get("/settings/work-schedule"),
      api.get("/settings/holidays"),
    ])
      .then(([ws, hol]) => {
        setHoursPerDay(ws.data.hours_per_day ?? 24);
        setOffDays(ws.data.off_days ?? [4]);
        setHolidays(hol.data);
      })
      .catch((e) => toast.error(formatApiError(e)))
      .finally(() => setLoading(false));
  }, []);

  const toggleDay = (idx) => {
    setOffDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
    );
  };

  const workingDays  = [0, 1, 2, 3, 4, 5, 6].filter((d) => !offDays.includes(d));
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

  const addHoliday = async () => {
    if (!newHolDate) {
      toast.error(ar ? "يجب تحديد التاريخ" : "Date required");
      return;
    }
    setAddingHol(true);
    try {
      await api.post("/settings/holidays", { date: newHolDate, name: newHolName });
      const { data } = await api.get("/settings/holidays");
      setHolidays(data);
      setNewHolDate("");
      setNewHolName("");
      toast.success(ar ? "تمت الإضافة ✓" : "Added ✓");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setAddingHol(false);
    }
  };

  const deleteHoliday = async (date) => {
    try {
      await api.delete(`/settings/holidays/${date}`);
      setHolidays((prev) => prev.filter((h) => h.date !== date));
      toast.success("✓");
    } catch (e) {
      toast.error(formatApiError(e));
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
    <div className="max-w-xl space-y-5">

      {/* ── Work Days & Hours ─────────────────────────────────── */}
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
            {ar ? "أيام الإجازة الأسبوعية" : "Weekly Days Off"}
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
                  {isOff ? <CheckSquare size={18} weight="fill" /> : <Square size={18} />}
                  <span>{name}</span>
                  <span className={`ms-auto text-xs font-normal ${isOff ? "text-red-400" : "text-emerald-500"}`}>
                    {isOff ? (ar ? "إجازة" : "Off") : (ar ? "عمل" : "Work")}
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

      {/* ── Official Holidays ─────────────────────────────────── */}
      <div className="bg-white border border-slate-200 p-5 space-y-4">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">
          {ar ? "العطل الرسمية" : "Official Holidays"}
        </label>
        <p className="text-xs text-slate-400 -mt-2">
          {ar
            ? "أيام العطل الرسمية ستظهر كـ N/A في تقارير Excel وPDF تلقائياً"
            : "Official holidays will automatically show as N/A in Excel & PDF reports"}
        </p>

        {/* Add new holiday */}
        <div className="flex gap-2">
          <input
            type="date"
            value={newHolDate}
            onChange={(e) => setNewHolDate(e.target.value)}
            dir="ltr"
            className="h-10 px-3 border border-slate-200 text-sm flex-shrink-0 w-40"
          />
          <input
            type="text"
            value={newHolName}
            onChange={(e) => setNewHolName(e.target.value)}
            placeholder={ar ? "اسم العطلة (اختياري)" : "Holiday name (optional)"}
            className="h-10 px-3 border border-slate-200 text-sm flex-1 min-w-0"
          />
          <button
            onClick={addHoliday}
            disabled={addingHol}
            className="h-10 px-4 bg-[#6B2D6B] text-white font-semibold flex items-center gap-1.5 hover:bg-[#5a2559] disabled:opacity-50 shrink-0"
          >
            <Plus size={15} weight="bold" />
            {ar ? "إضافة" : "Add"}
          </button>
        </div>

        {/* List of holidays */}
        {holidays.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-3">
            {ar ? "لا توجد عطل رسمية مضافة" : "No official holidays added"}
          </p>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200">
            {holidays.map((h) => (
              <div key={h.date} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span dir="ltr" className="font-mono text-sm font-semibold text-slate-700">
                    {h.date}
                  </span>
                  {h.name && (
                    <span className="text-sm text-slate-500">{h.name}</span>
                  )}
                </div>
                <button
                  onClick={() => deleteHoliday(h.date)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

