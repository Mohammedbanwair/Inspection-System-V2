import { useEffect, useState } from "react";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../lib/i18n";
import TopBar from "../components/TopBar";
import InspectionForm from "./InspectionForm";
import {
  Gear, Wrench, Snowflake, ListChecks, ClipboardText, ArrowRight, ArrowLeft,
} from "@phosphor-icons/react";

const BRANCH_GROUPS_BY_SPECIALTY = {
  electrical: [
    {
      key: "elec-machines",
      title_key: "branch_elec_machines",
      desc_key: "branch_elec_machines_desc",
      Icon: Gear,
      children: [
        { key: "elec-machines-a", category: "electrical", target_type: "machine", group: "A",
          title_key: "group_a", desc_key: "branch_elec_machines_desc", Icon: Gear },
        { key: "elec-machines-b", category: "electrical", target_type: "machine", group: "B",
          title_key: "group_b", desc_key: "branch_elec_machines_desc", Icon: Gear },
      ],
    },
    {
      key: "panels",
      title_key: "branch_panels",
      desc_key: "branch_panels_desc",
      Icon: ListChecks,
      children: [
        { key: "panels-main", category: "panels_main", target_type: "panel", panel_type: "main",
          title_key: "branch_panels_main", desc_key: "branch_panels_main_desc", Icon: ListChecks },
        { key: "panels-sub", category: "panels_sub", target_type: "panel", panel_type: "sub",
          title_key: "branch_panels_sub", desc_key: "branch_panels_sub_desc", Icon: ListChecks },
      ],
    },
  ],
  mechanical: [
    {
      key: "mech-machines",
      title_key: "branch_mech_machines",
      desc_key: "branch_mech_machines_desc",
      Icon: Wrench,
      children: [
        { key: "mech-machines-a", category: "mechanical", target_type: "machine", group: "A",
          title_key: "group_a", desc_key: "branch_mech_machines_desc", Icon: Wrench },
        { key: "mech-machines-b", category: "mechanical", target_type: "machine", group: "B",
          title_key: "group_b", desc_key: "branch_mech_machines_desc", Icon: Wrench },
      ],
    },
    {
      key: "chillers",
      title_key: "branch_chillers",
      desc_key: "branch_chillers_desc",
      Icon: Snowflake,
      branch: { category: "chiller", target_type: "chiller" },
    },
  ],
};

export default function TechDashboard() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [branch, setBranch] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [history, setHistory] = useState([]);

  const loadHistory = async () => {
    try {
      const { data } = await api.get("/inspections", { params: { limit: 10 } });
      setHistory(data);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  useEffect(() => { loadHistory(); }, []);

  const branchGroups = BRANCH_GROUPS_BY_SPECIALTY[user?.specialty] || [];
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen" data-testid="tech-dashboard">
      <TopBar />
      <main className="max-w-7xl mx-auto p-6">
        {!branch ? (
          <>
            <div className="mb-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                {t("tech_panel")}
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mt-1">
                {t("welcome")} {user?.name}
              </h1>
              <p className="text-sm text-slate-500 mt-1">{t("choose_section")}</p>
            </div>

            {selectedGroup ? (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => setSelectedGroup(null)}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    <Arrow size={18} weight="bold" />
                    {t("back")}
                  </button>
                  <span className="text-slate-300">|</span>
                  <span className="text-sm font-semibold text-slate-900">{t(selectedGroup.title_key)}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedGroup.children.map(({ key, title_key, desc_key, Icon, category, target_type, group, panel_type }) => (
                    <button key={key} onClick={() => setBranch({ category, target_type, group, panel_type })}
                            className="group bg-white border border-slate-200 p-7 text-start hover:bg-slate-900 hover:text-white transition-all duration-150"
                            data-testid={`branch-${key}`}>
                      <div className="flex items-start justify-between">
                        <div className="h-14 w-14 bg-slate-900 text-white flex items-center justify-center group-hover:bg-white group-hover:text-slate-900">
                          <Icon size={28} weight="bold" />
                        </div>
                        <Arrow size={22} className="text-slate-400 group-hover:text-white" weight="bold" />
                      </div>
                      <h3 className="text-2xl font-bold mt-5">{t(title_key)}</h3>
                      <p className="text-sm mt-2 leading-relaxed opacity-80">{t(desc_key)}</p>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {branchGroups.map((grp) => {
                  const { key, title_key, desc_key, Icon } = grp;
                  return (
                    <button key={key}
                            onClick={() => grp.children ? setSelectedGroup(grp) : setBranch(grp.branch)}
                            className="group bg-white border border-slate-200 p-7 text-start hover:bg-slate-900 hover:text-white transition-all duration-150"
                            data-testid={`branch-${key}`}>
                      <div className="flex items-start justify-between">
                        <div className="h-14 w-14 bg-slate-900 text-white flex items-center justify-center group-hover:bg-white group-hover:text-slate-900">
                          <Icon size={28} weight="bold" />
                        </div>
                        <Arrow size={22} className="text-slate-400 group-hover:text-white" weight="bold" />
                      </div>
                      <h3 className="text-2xl font-bold mt-5">{t(title_key)}</h3>
                      <p className="text-sm mt-2 leading-relaxed opacity-80">{t(desc_key)}</p>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-10">
              <h3 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                <ClipboardText size={20} /> {t("recent_inspections")}
              </h3>
              <div className="bg-white border border-slate-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-start px-4 py-3 font-semibold">{t("date")}</th>
                      <th className="text-start px-4 py-3 font-semibold">{t("section")}</th>
                      <th className="text-start px-4 py-3 font-semibold">{t("target_number")}</th>
                      <th className="text-start px-4 py-3 font-semibold">{t("status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 && (
                      <tr><td colSpan="4" className="text-center text-slate-500 py-6">
                        {t("no_inspections_yet")}
                      </td></tr>
                    )}
                    {history.map((h) => {
                      const fails = (h.answers || []).filter((a) => !a.answer).length;
                      const catKey = h.category === "panels" ? "tab_chillers" :
                        h.category === "electrical" ? "cat_electrical" :
                        h.category === "mechanical" ? "cat_mechanical" : "cat_chiller";
                      const catLabel = h.category === "panels" ? (lang === "ar" ? "لوحات" : "Panels") : t(catKey);
                      return (
                        <tr key={h.id} className="border-t border-slate-100">
                          <td className="px-4 py-3">
                            {new Date(h.created_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
                          </td>
                          <td className="px-4 py-3">{catLabel}</td>
                          <td className="px-4 py-3 font-semibold">{h.target_number}</td>
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
          </>
        ) : (
          <InspectionForm
            branch={branch}
            onBack={() => setBranch(null)}
            onSubmitted={() => { setBranch(null); loadHistory(); }}
          />
        )}
      </main>
    </div>
  );
}
