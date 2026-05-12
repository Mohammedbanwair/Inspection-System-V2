import { useEffect, useState } from "react";
import { api, formatApiError } from "../../lib/api";
import { toast } from "sonner";
import { useI18n } from "../../lib/i18n";
import { Plus, Trash, CalendarBlank } from "@phosphor-icons/react";
import ConfirmDialog from "../../components/ConfirmDialog";

export default function PreventivePlan() {
  const { t } = useI18n();
  const today = new Date().toISOString().slice(0, 10);

  const [plans, setPlans] = useState([]);
  const [machines, setMachines] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [filterDate, setFilterDate] = useState(today);
  const [form, setForm] = useState({ machine_id: "", scheduled_date: today });

  const loadPlans = async (date) => {
    try {
      const params = date ? { date } : {};
      const { data } = await api.get("/preventive-plans", { params });
      setPlans(data);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  useEffect(() => {
    api.get("/machines").then(({ data }) => setMachines(data)).catch(() => {});
  }, []);

  useEffect(() => {
    loadPlans(filterDate);
  }, [filterDate]);

  const save = async (e) => {
    e.preventDefault();
    if (!form.machine_id) return toast.error(t("plan_machine"));
    try {
      await api.post("/preventive-plans", form);
      toast.success(t("save"));
      setShowForm(false);
      setForm({ machine_id: "", scheduled_date: today });
      loadPlans(filterDate);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const del = async () => {
    try {
      await api.delete(`/preventive-plans/${confirmTarget.id}`);
      toast.success("✓");
      loadPlans(filterDate);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setConfirmTarget(null);
    }
  };

  return (
    <div data-testid="preventive-plan-panel">
      <ConfirmDialog
        open={!!confirmTarget}
        message={`${t("confirm_delete")} "${confirmTarget?.machine_number}"؟`}
        onConfirm={del}
        onCancel={() => setConfirmTarget(null)}
      />

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900">
          {t("tab_preventive_plan")} ({plans.length})
        </h3>
        <button
          onClick={() => setShowForm(true)}
          className="h-10 px-4 bg-slate-900 text-white font-semibold flex items-center gap-2 hover:bg-slate-800"
          data-testid="add-plan-button"
        >
          <Plus size={16} weight="bold" /> {t("add_plan")}
        </button>
      </div>

      {/* Date filter */}
      <div className="flex items-center gap-2 mb-4">
        <CalendarBlank size={16} className="text-slate-400" />
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="h-10 px-3 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#005CBE]"
        />
        <button
          onClick={() => setFilterDate("")}
          className="h-10 px-4 border border-slate-200 text-sm text-slate-600 hover:bg-slate-100"
        >
          {t("all")}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={save}
          className="bg-white border border-slate-200 p-5 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 fade-in"
          data-testid="plan-form"
        >
          <select
            required
            value={form.machine_id}
            onChange={(e) => setForm({ ...form, machine_id: e.target.value })}
            className="h-12 px-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005CBE]"
            data-testid="plan-machine-select"
          >
            <option value="">{t("plan_machine")}</option>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.number}{m.name ? ` — ${m.name}` : ""}
              </option>
            ))}
          </select>
          <input
            required
            type="date"
            value={form.scheduled_date}
            onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
            className="h-12 px-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005CBE]"
            data-testid="plan-date-input"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="h-12 px-5 bg-slate-900 text-white font-semibold hover:bg-slate-800"
              data-testid="save-plan-button"
            >
              {t("save")}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="h-12 px-5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-start px-4 py-3 font-semibold">{t("plan_date")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("machine_number")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("name_field")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("plan_created_by")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center text-slate-500 py-8">
                  {t("no_plans")}
                </td>
              </tr>
            )}
            {plans.map((p, i) => (
              <tr key={p.id} className={`border-t border-slate-100 ${i % 2 ? "bg-slate-50/40" : ""}`}>
                <td className="px-4 py-3 font-semibold">{p.scheduled_date}</td>
                <td className="px-4 py-3 font-mono tracking-wider font-semibold">{p.machine_number}</td>
                <td className="px-4 py-3 text-slate-600">{p.machine_name || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{p.created_by_name}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setConfirmTarget(p)}
                    className="h-9 w-9 border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center"
                    data-testid={`delete-plan-${p.id}`}
                  >
                    <Trash size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
