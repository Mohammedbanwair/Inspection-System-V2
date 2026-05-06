import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../lib/i18n";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import { Gear, ShieldCheck, Translate, UserPlus, ArrowLeft, ArrowRight } from "@phosphor-icons/react";

const BG_URL =
  "https://static.prod-images.emergentagent.com/jobs/94419418-cdef-4cb1-acaf-4ee89afc5a1d/images/b872454776c4dade8899e90da5ed958361877da59bd192f510a4681dc9bad1b2.png";

export default function Register() {
  const { t, lang, toggle } = useI18n();
  const navigate = useNavigate();
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const BackArrow = lang === "ar" ? ArrowRight : ArrowLeft;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(lang === "ar" ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error(lang === "ar" ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/auth/register", {
        employee_number: employeeNumber.trim().toUpperCase(),
        name: name.trim(),
        password,
      });
      setDone(true);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="register-page">
      {/* Left panel */}
      <div
        className="hidden lg:block relative"
        style={{ backgroundImage: `url(${BG_URL})`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-slate-900/55" />
        <div className="absolute inset-0 p-12 flex flex-col justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white text-slate-900 flex items-center justify-center">
              <Gear size={24} weight="bold" />
            </div>
            <span className="text-sm font-semibold uppercase tracking-widest">Inspection System</span>
          </div>
          <div>
            <h1 className="text-5xl font-bold leading-tight">
              {lang === "ar" ? "انضم إلى الفريق" : "Join the Team"}
            </h1>
            <p className="mt-4 text-lg text-slate-200 leading-relaxed max-w-md">
              {lang === "ar"
                ? "أرسل طلب تسجيلك وسيقوم المدير بمراجعته وتحديد تخصصك."
                : "Submit your registration request and the admin will review and assign your specialty."}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <ShieldCheck size={20} />
            <span>{t("secure_access")}</span>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center p-6 lg:p-12 grid-bg relative">
        {/* Language toggle */}
        <button
          onClick={toggle}
          className="absolute top-4 end-4 h-10 px-3 bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 flex items-center gap-2"
        >
          <Translate size={16} />
          <span className="text-sm">{lang === "ar" ? "EN" : "ع"}</span>
        </button>

        {/* Back to login */}
        <button
          onClick={() => navigate("/login")}
          className="absolute top-4 start-4 h-10 px-3 bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 flex items-center gap-2"
        >
          <BackArrow size={16} />
          <span className="text-sm">{t("login")}</span>
        </button>

        {done ? (
          /* ── Success state ── */
          <div className="w-full max-w-md bg-white border border-slate-200 p-8 fade-in text-center">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={36} weight="bold" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              {lang === "ar" ? "تم إرسال طلبك!" : "Request Submitted!"}
            </h2>
            <p className="text-slate-500 leading-relaxed mb-6">
              {lang === "ar"
                ? "سيقوم المدير بمراجعة طلبك وتحديد تخصصك. بعد الموافقة يمكنك تسجيل الدخول."
                : "The admin will review your request and assign your specialty. After approval you can sign in."}
            </p>
            <button
              onClick={() => navigate("/login")}
              className="w-full h-12 bg-slate-900 text-white font-semibold hover:bg-slate-800"
            >
              {lang === "ar" ? "العودة لتسجيل الدخول" : "Back to Login"}
            </button>
          </div>
        ) : (
          /* ── Form ── */
          <form
            onSubmit={onSubmit}
            className="w-full max-w-md bg-white border border-slate-200 p-8 fade-in"
            data-testid="register-form"
          >
            <div className="mb-8">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                <UserPlus size={14} />
                {lang === "ar" ? "طلب تسجيل" : "Registration Request"}
              </div>
              <h2 className="text-3xl font-bold text-slate-900">
                {lang === "ar" ? "حساب جديد" : "New Account"}
              </h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                {lang === "ar"
                  ? "بعد إرسال الطلب، ينتظر موافقة المدير."
                  : "After submitting, your request awaits admin approval."}
              </p>
            </div>

            {/* Employee Number */}
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {t("employee_number")}
            </label>
            <input
              type="text"
              required
              value={employeeNumber}
              onChange={(e) => setEmployeeNumber(e.target.value.toUpperCase())}
              className="w-full h-12 px-4 border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#005CBE] tracking-wider font-mono mb-5"
              placeholder="EMP-001"
              data-testid="register-employee-input"
            />

            {/* Name */}
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {lang === "ar" ? "الاسم الكامل" : "Full Name"}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-12 px-4 border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#005CBE] mb-5"
              data-testid="register-name-input"
            />

            {/* Password */}
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {t("password")}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-4 border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#005CBE] mb-5"
              placeholder="••••••••"
              data-testid="register-password-input"
            />

            {/* Confirm Password */}
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {lang === "ar" ? "تأكيد كلمة المرور" : "Confirm Password"}
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-12 px-4 border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#005CBE]"
              placeholder="••••••••"
              data-testid="register-confirm-input"
            />

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 mt-8 bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-60 flex items-center justify-center gap-2"
              data-testid="register-submit-button"
            >
              <UserPlus size={18} weight="bold" />
              {submitting
                ? (lang === "ar" ? "جارٍ الإرسال..." : "Submitting...")
                : (lang === "ar" ? "إرسال الطلب" : "Submit Request")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
