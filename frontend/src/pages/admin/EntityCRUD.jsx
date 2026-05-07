import { useEffect, useState } from "react";
import { api, formatApiError } from "../../lib/api";
import { toast } from "sonner";
import { useI18n } from "../../lib/i18n";
import { Plus, PencilSimple, Trash } from "@phosphor-icons/react";
import ConfirmDialog from "../../components/ConfirmDialog";

/**
 * Generic CRUD panel for entities with {id, number, name}.
 * Used for machines, chillers, panels.
 */
export default function EntityCRUD({ resource, addLabelKey, testidPrefix }) {
  const { t } = useI18n();
  const [list, setList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get(`/${resource}`);
      setList(data);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [resource]);

  const openCreate = () => { setEditing(null); setNumber(""); setName(""); setShowForm(true); };
  const openEdit = (m) => { setEditing(m); setNumber(m.number); setName(m.name || ""); setShowForm(true); };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.patch(`/${resource}/${editing.id}`, { number, name });
      } else {
        await api.post(`/${resource}`, { number, name });
      }
      toast.success(t("save"));
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const del = async () => {
    try {
      await api.delete(`/${resource}/${confirmTarget.id}`);
      toast.success("✓");
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setConfirmTarget(null);
    }
  };

  return (
    <div data-testid={`${testidPrefix}-panel`}>
      <ConfirmDialog
        open={!!confirmTarget}
        message={`${t("confirm_delete")} "${confirmTarget?.number}"؟`}
        onConfirm={del}
        onCancel={() => setConfirmTarget(null)}
      />
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900">{t(addLabelKey).replace(/^إضافة |^Add /, "")} ({list.length})</h3>
        <button onClick={openCreate}
                className="h-10 px-4 bg-slate-900 text-white font-semibold flex items-center gap-2 hover:bg-slate-800"
                data-testid={`${testidPrefix}-add-button`}>
          <Plus size={16} weight="bold" /> {t(addLabelKey)}
        </button>
      </div>

      {showForm && (
        <form onSubmit={save}
              className="bg-white border border-slate-200 p-5 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 fade-in"
              data-testid={`${testidPrefix}-form`}>
          <input required placeholder={t("number")} value={number} maxLength={20}
                 onChange={(e) => setNumber(e.target.value)}
                 className="h-12 px-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005CBE]"
                 data-testid={`${testidPrefix}-number-input`} />
          <input placeholder={t("model_optional")} value={name} maxLength={80}
                 onChange={(e) => setName(e.target.value)}
                 className="h-12 px-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005CBE]"
                 data-testid={`${testidPrefix}-name-input`} />
          <div className="flex gap-2">
            <button type="submit"
                    className="h-12 px-5 bg-slate-900 text-white font-semibold hover:bg-slate-800 flex-1"
                    data-testid={`${testidPrefix}-save-button`}>
              {t("save")}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
                    className="h-12 px-5 bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100">
              {t("cancel")}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-start px-4 py-3 font-semibold">{t("number")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("name_field")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {list.map((m, i) => (
              <tr key={m.id} className={`border-t border-slate-100 ${i % 2 ? "bg-slate-50/40" : ""}`}>
                <td className="px-4 py-3 font-semibold">{m.number}</td>
                <td className="px-4 py-3">{m.name || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(m)}
                            className="h-9 w-9 border border-slate-200 hover:bg-slate-100 flex items-center justify-center"
                            data-testid={`${testidPrefix}-edit-${m.id}`}>
                      <PencilSimple size={14} />
                    </button>
                    <button onClick={() => setConfirmTarget(m)}
                            className="h-9 w-9 border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center"
                            data-testid={`${testidPrefix}-delete-${m.id}`}>
                      <Trash size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan="3" className="text-center text-slate-500 py-8">{t("no_results")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
