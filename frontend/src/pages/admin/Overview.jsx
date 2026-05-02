import { useEffect, useState } from "react";
import { api, formatApiError } from "../../lib/api";
import { toast } from "sonner";
import { useI18n } from "../../lib/i18n";
import {
  ClipboardText, Wrench, UsersThree, Question, Warning, CalendarCheck,
  Snowflake, ListChecks,
} from "@phosphor-icons/react";

function Stat({ icon: Icon, label, value, accent, testid }) {
  return (
    <div className="bg-white border border-slate-200 p-5 flex flex-col gap-3" data-testid={testid}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</span>
        <div className={`h-9 w-9 flex items-center justify-center ${accent || "bg-slate-900 text-white"}`}>
          <Icon size={18} weight="bold" />
        </div>
      </div>
      <div className="text-4xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

export default function Overview() {
  const { t, lang } = useI18n();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [s, r] = await Promise.all([
          api.get("/stats/overview"),
          api.get("/inspections", { params: { limit: 10 } }),
        ]);
        setStats(s.data);
        setRecent(r.data);
      } catch (e) { toast.error(formatApiError(e)); }
    })();
  }, []);

  const catLabel = (c) => t(
    c === "electrical" ? "cat_electrical" :
    c === "mechanical" ? "cat_mechanical" :
    c === "chiller" ? "cat_chiller" : "cat_panels",
  );
  const typeLabel = (t1) => t(t1 === "machine" ? "machine" : t1 === "chiller" ? "chiller" : "panel");

  return (
    <div className="space-y-6" data-testid="admin-overview">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Stat icon={ClipboardText} label={t("total_inspections")} value={stats?.total_inspections ?? "—"} testid="stat-total-inspections" />
        <Stat icon={CalendarCheck} label={t("today_inspections")} value={stats?.today_inspections ?? "—"} accent="bg-[#005CBE] text-white" testid="stat-today-inspections" />
        <Stat icon={Warning} label={t("total_fails")} value={stats?.total_fails ?? "—"} accent="bg-red-500 text-white" testid="stat-fails" />
        <Stat icon={Wrench} label={t("machines_label")} value={stats?.total_machines ?? "—"} testid="stat-machines" />
        <Stat icon={Snowflake} label={t("chillers_label")} value={stats?.total_chillers ?? "—"} testid="stat-chillers" />
        <Stat icon={ListChecks} label={t("panels_label")} value={stats?.total_panels ?? "—"} testid="stat-panels" />
        <Stat icon={UsersThree} label={t("technicians_label")} value={stats?.total_technicians ?? "—"} testid="stat-techs" />
      </div>

      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-3">{t("latest_inspections")}</h3>
        <div className="bg-white border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-start px-4 py-3 font-semibold">{t("date")}</th>
                <th className="text-start px-4 py-3 font-semibold">{t("type")}</th>
                <th className="text-start px-4 py-3 font-semibold">{t("target_number")}</th>
                <th className="text-start px-4 py-3 font-semibold">{t("section")}</th>
                <th className="text-start px-4 py-3 font-semibold">{t("technician")}</th>
                <th className="text-start px-4 py-3 font-semibold">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr><td colSpan="6" className="text-center text-slate-500 py-8">{t("no_inspections_yet")}</td></tr>
              )}
              {recent.map((r, i) => {
                const fails = (r.answers || []).filter((a) => !a.answer).length;
                return (
                  <tr key={r.id} className={`border-t border-slate-100 ${i % 2 ? "bg-slate-50/40" : ""}`}>
                    <td className="px-4 py-3">{new Date(r.created_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}</td>
                    <td className="px-4 py-3">{typeLabel(r.target_type)}</td>
                    <td className="px-4 py-3 font-semibold">{r.target_number}</td>
                    <td className="px-4 py-3">{catLabel(r.category)}</td>
                    <td className="px-4 py-3">{r.technician_name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold ${
                        fails > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {fails > 0 ? `${fails} ${t("fails_label")}` : t("healthy")}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
