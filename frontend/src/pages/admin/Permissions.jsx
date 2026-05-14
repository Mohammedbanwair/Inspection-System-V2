import { useState, useEffect } from "react";
import { api, formatApiError } from "../../lib/api";
import { toast } from "sonner";
import { useI18n } from "../../lib/i18n";

const FORMS = [
  { id: "inspection",  label_ar: "الفحوصات",           label_en: "Inspections" },
  { id: "breakdown",   label_ar: "تقرير توقف المكينة", label_en: "Breakdown Report" },
  { id: "mdb_reading", label_ar: "قراءات MDB",          label_en: "MDB Daily Reading" },
];

const DEFAULT_FORMS = { inspection: true, breakdown: true, mdb_reading: true };

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        checked ? "bg-[#6B2D6B]" : "bg-slate-200"
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        checked ? "translate-x-6" : "translate-x-1"
      }`} />
    </button>
  );
}

function PermissionCard({ title, subtitle, forms, onChange, onSave, saving }) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  return (
    <div className="bg-white border border-slate-200 p-5">
      <div className="mb-4">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="space-y-3 mb-5">
        {FORMS.map((f) => (
          <div key={f.id} className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
            <span className="text-sm font-semibold text-slate-700">
              {ar ? f.label_ar : f.label_en}
            </span>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold ${forms[f.id] ? "text-emerald-600" : "text-slate-400"}`}>
                {forms[f.id] ? (ar ? "مفعّل" : "Enabled") : (ar ? "مخفي" : "Hidden")}
              </span>
              <Toggle checked={!!forms[f.id]} onChange={(val) => onChange(f.id, val)} />
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={onSave}
        disabled={saving}
        className="w-full h-10 bg-[#6B2D6B] text-white font-semibold hover:bg-[#5a2559] disabled:opacity-50 text-sm"
      >
        {saving ? (ar ? "جارٍ الحفظ..." : "Saving...") : (ar ? "حفظ التغييرات" : "Save Changes")}
      </button>
    </div>
  );
}

export default function Permissions() {
  const { t, lang } = useI18n();
  const ar = lang === "ar";

  const [tab, setTab] = useState("specialty");
  const [elecForms,  setElecForms]  = useState({ ...DEFAULT_FORMS });
  const [mechForms,  setMechForms]  = useState({ ...DEFAULT_FORMS });
  const [savingElec, setSavingElec] = useState(false);
  const [savingMech, setSavingMech] = useState(false);

  // User tab
  const [users,       setUsers]       = useState([]);
  const [selUserId,   setSelUserId]   = useState("");
  const [userForms,   setUserForms]   = useState({ ...DEFAULT_FORMS });
  const [hasOverride, setHasOverride] = useState(false);
  const [savingUser,  setSavingUser]  = useState(false);

  // Load specialty permissions + users
  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: perms }, { data: userList }] = await Promise.all([
          api.get("/form-permissions"),
          api.get("/users"),
        ]);
        const elec = perms.find((p) => p.scope === "specialty" && p.target === "electrical");
        const mech = perms.find((p) => p.scope === "specialty" && p.target === "mechanical");
        if (elec) setElecForms({ ...DEFAULT_FORMS, ...elec.forms });
        if (mech) setMechForms({ ...DEFAULT_FORMS, ...mech.forms });
        setUsers(userList.filter((u) => u.role === "technician"));
      } catch (e) { toast.error(formatApiError(e)); }
    };
    load();
  }, []);

  // Load user-specific override when user changes
  useEffect(() => {
    if (!selUserId) return;
    const load = async () => {
      try {
        const { data: perms } = await api.get("/form-permissions");
        const doc = perms.find((p) => p.scope === "user" && p.target === selUserId);
        if (doc) {
          setUserForms({ ...DEFAULT_FORMS, ...doc.forms });
          setHasOverride(true);
        } else {
          // Show specialty defaults
          const selUser = users.find((u) => u.id === selUserId);
          const spec = selUser?.specialty;
          const specDoc = perms.find((p) => p.scope === "specialty" && p.target === spec);
          setUserForms(specDoc ? { ...DEFAULT_FORMS, ...specDoc.forms } : { ...DEFAULT_FORMS });
          setHasOverride(false);
        }
      } catch (e) { toast.error(formatApiError(e)); }
    };
    load();
  }, [selUserId]); // eslint-disable-line

  const saveSpecialty = async (specialty, forms, setSaving) => {
    setSaving(true);
    try {
      await api.put(`/form-permissions/specialty/${specialty}`, { forms });
      toast.success(ar ? "تم الحفظ ✓" : "Saved ✓");
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };

  const saveUserOverride = async () => {
    if (!selUserId) return;
    setSavingUser(true);
    try {
      await api.put(`/form-permissions/user/${selUserId}`, { forms: userForms });
      setHasOverride(true);
      toast.success(ar ? "تم حفظ الصلاحيات الخاصة ✓" : "User override saved ✓");
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSavingUser(false); }
  };

  const removeUserOverride = async () => {
    if (!selUserId) return;
    try {
      await api.delete(`/form-permissions/user/${selUserId}`);
      setHasOverride(false);
      toast.success(ar ? "تم حذف الصلاحيات الخاصة" : "Override removed");
      // Reload specialty default
      const selUser = users.find((u) => u.id === selUserId);
      const spec = selUser?.specialty;
      const { data: perms } = await api.get("/form-permissions");
      const specDoc = perms.find((p) => p.scope === "specialty" && p.target === spec);
      setUserForms(specDoc ? { ...DEFAULT_FORMS, ...specDoc.forms } : { ...DEFAULT_FORMS });
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const selUser = users.find((u) => u.id === selUserId);

  return (
    <div data-testid="permissions-panel">
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-900">{ar ? "صلاحيات النماذج" : "Form Permissions"}</h2>
        <p className="text-sm text-slate-500 mt-1">
          {ar ? "تحكم في النماذج التي تظهر لكل فني عند تسجيل الدخول"
               : "Control which forms each technician sees after login"}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 w-fit">
        {[
          { key: "specialty", ar: "حسب التخصص",    en: "By Specialty" },
          { key: "user",      ar: "حسب المستخدم",  en: "By User" },
        ].map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${
              tab === tb.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {ar ? tb.ar : tb.en}
          </button>
        ))}
      </div>

      {tab === "specialty" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PermissionCard
            title={ar ? "⚡ الفنيون الكهربائيون" : "⚡ Electrical Technicians"}
            subtitle={ar ? "تطبق على جميع فنيي الكهرباء بشكل افتراضي"
                         : "Applied to all electrical technicians by default"}
            forms={elecForms}
            onChange={(id, val) => setElecForms((p) => ({ ...p, [id]: val }))}
            onSave={() => saveSpecialty("electrical", elecForms, setSavingElec)}
            saving={savingElec}
          />
          <PermissionCard
            title={ar ? "🔧 الفنيون الميكانيكيون" : "🔧 Mechanical Technicians"}
            subtitle={ar ? "تطبق على جميع فنيي الميكانيكا بشكل افتراضي"
                         : "Applied to all mechanical technicians by default"}
            forms={mechForms}
            onChange={(id, val) => setMechForms((p) => ({ ...p, [id]: val }))}
            onSave={() => saveSpecialty("mechanical", mechForms, setSavingMech)}
            saving={savingMech}
          />
        </div>
      )}

      {tab === "user" && (
        <div className="max-w-lg">
          {/* User selector */}
          <div className="mb-4">
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5 block">
              {ar ? "اختر الفني" : "Select Technician"}
            </label>
            <select
              value={selUserId}
              onChange={(e) => setSelUserId(e.target.value)}
              className="w-full h-11 px-3 border border-slate-200 bg-white text-sm"
            >
              <option value="">{ar ? "— اختر فنياً —" : "— Choose a technician —"}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.employee_id}) — {u.specialty === "electrical"
                    ? (ar ? "كهربائي" : "Electrical")
                    : (ar ? "ميكانيكي" : "Mechanical")}
                </option>
              ))}
            </select>
          </div>

          {selUserId && (
            <>
              {/* Override badge */}
              <div className={`mb-4 px-3 py-2 text-xs font-semibold ${
                hasOverride
                  ? "bg-amber-50 border border-amber-200 text-amber-700"
                  : "bg-slate-50 border border-slate-200 text-slate-500"
              }`}>
                {hasOverride
                  ? (ar ? "⚠ هذا الفني لديه صلاحيات خاصة (override)" : "⚠ This user has a custom override")
                  : (ar ? "يرث الصلاحيات من التخصص" : "Inheriting from specialty defaults")}
              </div>

              <PermissionCard
                title={selUser?.name || ""}
                subtitle={ar ? "صلاحيات مخصصة لهذا الفني تتغلب على إعدادات التخصص"
                             : "Custom permissions for this technician, overrides specialty settings"}
                forms={userForms}
                onChange={(id, val) => setUserForms((p) => ({ ...p, [id]: val }))}
                onSave={saveUserOverride}
                saving={savingUser}
              />

              {hasOverride && (
                <button
                  onClick={removeUserOverride}
                  className="mt-3 w-full h-10 border border-red-200 text-red-600 font-semibold hover:bg-red-50 text-sm"
                >
                  {ar ? "حذف الصلاحيات الخاصة والرجوع للتخصص" : "Remove override — revert to specialty defaults"}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
