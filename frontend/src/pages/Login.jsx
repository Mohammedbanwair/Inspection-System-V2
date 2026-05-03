import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../lib/i18n";
import { formatApiError } from "../lib/api";
import { toast } from "sonner";
import { Gear, ShieldCheck, Translate } from "@phosphor-icons/react";

const BG_URL =
  "https://static.prod-images.emergentagent.com/jobs/94419418-cdef-4cb1-acaf-4ee89afc5a1d/images/b872454776c4dade8899e90da5ed958361877da59bd192f510a4681dc9bad1b2.png";

export default function Login() {
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t, lang, toggle } = useI18n();

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const u = await login(employeeNumber, password);
      toast.success(`${t("welcome")} ${u.name}`);
      navigate(u.role === "admin" ? "/admin" : "/tech");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="login-page">
      <div className="hidden lg:block relative"
           style={{ backgroundImage: `url(${BG_URL})`, backgroundSize: "cover", backgroundPosition: "center" }}>
        <div className="absolute inset-0 bg-slate-900/55" />
        <div className="absolute inset-0 p-12 flex flex-col justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white text-slate-900 flex items-center justify-center">
              <Gear size={24} weight="bold" />
            </div>
            <span className="text-sm font-semibold uppercase tracking-widest">Inspection System</span>
          </div>
          <div>
            <h1 className="text-5xl font-bold leading-tight">{t("login_hero_title")}</h1>
            <p className="mt-4 text-lg text-slate-200 leading-relaxed max-w-md">{t("login_hero_sub")}</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <ShieldCheck size={20} />
            <span>{t("secure_access")}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12 grid-bg relative">
        <button onClick={toggle}
                className="absolute top-4 end-4 h-10 px-3 bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 flex items-center gap-2"
                data-testid="lang-toggle-login">
          <Translate size={16} />
          <span className="text-sm">{lang === "ar" ? "EN" : "ع"}</span>
        </button>

        <form onSubmit={onSubmit}
              className="w-full max-w-md bg-white border border-slate-200 p-8 fade-in"
              data-testid="login-form">
          <div className="mb-8">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
              {t("login")}
            </div>
            <h2 className="text-3xl font-bold text-slate-900">{t("login_title")}</h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">{t("login_sub")}</p>
          </div>

          <label className="block text-sm font-semibold text-slate-700 mb-2">{t("employee_number")}</label>
          <input type="text" required value={employeeNumber}
                 onChange={(e) => setEmployeeNumber(e.target.value.toUpperCase())}
                 className="w-full h-12 px-4 border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#005CBE] tracking-wider font-mono"
                 data-testid="login-employee-input" />

          <label className="block text-sm font-semibold text-slate-700 mb-2 mt-5">{t("password")}</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                 className="w-full h-12 px-4 border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#005CBE]"
                 placeholder="••••••••" data-testid="login-password-input" />

          <button type="submit" disabled={submitting}
                  className="w-full h-12 mt-8 bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-60 transition-all duration-150"
                  data-testid="login-submit-button">
            {submitting ? t("login_submitting") : t("login_submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
