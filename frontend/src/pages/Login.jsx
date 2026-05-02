import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../lib/api";
import { toast } from "sonner";
import { Gear, ShieldCheck } from "@phosphor-icons/react";

const BG_URL =
  "https://static.prod-images.emergentagent.com/jobs/94419418-cdef-4cb1-acaf-4ee89afc5a1d/images/b872454776c4dade8899e90da5ed958361877da59bd192f510a4681dc9bad1b2.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const u = await login(email, password);
      toast.success(`مرحباً ${u.name}`);
      navigate(u.role === "admin" ? "/admin" : "/tech");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="login-page">
      {/* Left image */}
      <div
        className="hidden lg:block relative"
        style={{
          backgroundImage: `url(${BG_URL})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-slate-900/55" />
        <div className="absolute inset-0 p-12 flex flex-col justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white text-slate-900 flex items-center justify-center">
              <Gear size={24} weight="bold" />
            </div>
            <span className="text-sm font-semibold uppercase tracking-widest">
              Inspection System
            </span>
          </div>
          <div>
            <h1 className="text-5xl font-bold leading-tight">نظام الفحص الرقمي</h1>
            <p className="mt-4 text-lg text-slate-200 leading-relaxed max-w-md">
              حوّل فحوصات المكائن الورقية إلى بيانات رقمية منظّمة قابلة للبحث والتصدير في أي وقت.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <ShieldCheck size={20} />
            <span>وصول آمن وصلاحيات مقسّمة</span>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 lg:p-12 grid-bg">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-md bg-white border border-slate-200 p-8 fade-in"
          data-testid="login-form"
        >
          <div className="mb-8">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
              تسجيل الدخول
            </div>
            <h2 className="text-3xl font-bold text-slate-900">أهلاً بك</h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              أدخل بياناتك للوصول إلى لوحة الفحص.
            </p>
          </div>

          <label className="block text-sm font-semibold text-slate-700 mb-2">
            البريد الإلكتروني
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-12 px-4 border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#005CBE] focus:border-transparent"
            placeholder="admin@inspection.app"
            data-testid="login-email-input"
          />

          <label className="block text-sm font-semibold text-slate-700 mb-2 mt-5">
            كلمة المرور
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-12 px-4 border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#005CBE] focus:border-transparent"
            placeholder="••••••••"
            data-testid="login-password-input"
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 mt-8 bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-60 transition-all duration-150"
            data-testid="login-submit-button"
          >
            {submitting ? "جاري الدخول..." : "دخول"}
          </button>

          <div className="mt-8 text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-5">
            حسابات تجريبية:
            <div className="mt-2 space-y-1 font-mono">
              <div>مدير: admin@inspection.app / admin123</div>
              <div>فني: tech1@inspection.app / tech123</div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
