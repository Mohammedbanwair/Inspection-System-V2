import { useEffect, useState } from "react";
import { api, formatApiError } from "../../lib/api";
import { toast } from "sonner";
import { useI18n } from "../../lib/i18n";
import { Plus, PencilSimple, Trash } from "@phosphor-icons/react";
import ConfirmDialog from "../../components/ConfirmDialog";

export default function Users() {
  const { t } = useI18n();
  const [list, setList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [form, setForm] = useState({
    employee_number: "", name: "", password: "", role: "technician", specialty: "electrical",
  });

  const load = async () => {
    try {
      const { data } = await api.get("/users");
      setList(data);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ employee_number: "", name: "", password: "", role: "technician", specialty: "electrical" });
    setShowForm(true);
  };
  const openEdit = (u) => {
    setEditing(u);
    setForm({
      employee_number: u.employee_number || "", name: u.name, password: "",
      role: u.role, specialty: u.specialty || "electrical",
    });
    setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        const body = { name: form.name, role: form.role };
        if (form.role === "technician") body.specialty = form.specialty;
        if (form.password) body.password = form.password;
        await api.patch(`/users/${editing.id}`, body);
      } else {
        const body = {
          employee_number: form.employee_number, name: form.name,
          password: form.password, role: form.role,
        };
        if (form.role === "technician") body.specialty = form.specialty;
        await api.post("/users", body);
      }
      toast.success(t("save"));
      setShowForm(false);
      load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const del = async () => {
    try { await api.delete(`/users/${confirmTarget.id}`); toast.success("✓"); load(); }
    catch (err) { toast.error(formatApiError(err)); }
    finally { setConfirmTarget(null); }
  };

  const isTech = form.role === "technician";

  return (
    <div data-testid="users-panel">
      <ConfirmDialog
        open={!!confirmTarget}
        message={`${t("confirm_delete")} "${confirmTarget?.name}"؟`}
        onConfirm={del}
        onCancel={() => setConfirmTarget(null)}
      />
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900">{t("tab_users")} ({list.length})</h3>
        <button onClick={openCreate}
                className="h-10 px-4 bg-slate-900 text-white font-semibold flex items-center gap-2 hover:bg-slate-800"
                data-testid="add-user-button">
          <Plus size={16} weight="bold" /> {t("add_user")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={save}
              className="bg-white border border-slate-200 p-5 mb-4 grid grid-cols-1 md:grid-cols-6 gap-3 fade-in"
              data-testid="user-form">
          <input required type="text" placeholder={t("employee_number")} value={form.employee_number}
                 disabled={!!editing} maxLength={20}
                 onChange={(e) => setForm({ ...form, employee_number: e.target.value.toUpperCase() })}
                 className="h-12 px-3 border border-slate-200 disabled:bg-slate-50 md:col-span-2 font-mono tracking-wider"
                 data-testid="user-employee-input" />
          <input required placeholder={t("name_field")} value={form.name} maxLength={60}
                 onChange={(e) => setForm({ ...form, name: e.target.value })}
                 className="h-12 px-3 border border-slate-200"
                 data-testid="user-name-input" />
          <input type="password" placeholder={editing ? t("new_password_optional") : t("password")}
                 required={!editing} value={form.password} maxLength={128}
                 onChange={(e) => setForm({ ...form, password: e.target.value })}
                 className="h-12 px-3 border border-slate-200"
                 data-testid="user-password-input" />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="h-12 px-3 border border-slate-200" data-testid="user-role-select">
            <option value="technician">{t("tech_role")}</option>
            <option value="admin">{t("admin_role")}</option>
          </select>
          {isTech ? (
            <select value={form.specialty}
                    onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                    className="h-12 px-3 border border-slate-200" data-testid="user-specialty-select">
              <option value="electrical">{t("cat_electrical")}</option>
              <option value="mechanical">{t("cat_mechanical")}</option>
            </select>
          ) : (
            <div className="h-12" />
          )}
          <div className="flex gap-2 md:col-span-6">
            <button type="submit"
                    className="h-12 px-5 bg-slate-900 text-white font-semibold hover:bg-slate-800"
                    data-testid="save-user-button">{t("save")}</button>
            <button type="button" onClick={() => setShowForm(false)}
                    className="h-12 px-5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100">
              {t("cancel")}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-start px-4 py-3 font-semibold">{t("employee_number")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("name_field")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("role")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("specialty")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u, i) => (
              <tr key={u.id} className={`border-t border-slate-100 ${i % 2 ? "bg-slate-50/40" : ""}`}>
                <td className="px-4 py-3 font-mono tracking-wider font-semibold">{u.employee_number}</td>
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-semibold ${
                    u.role === "admin" ? "bg-[#005CBE] text-white" : "bg-slate-100 text-slate-700"}`}>
                    {u.role === "admin" ? t("admin_role") : t("tech_role")}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {u.specialty
                    ? t(u.specialty === "electrical" ? "cat_electrical" : "cat_mechanical")
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(u)}
                            className="h-9 w-9 border border-slate-200 hover:bg-slate-100 flex items-center justify-center"
                            data-testid={`edit-user-${u.id}`}>
                      <PencilSimple size={14} />
                    </button>
                    <button onClick={() => setConfirmTarget(u)}
                            className="h-9 w-9 border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center"
                            data-testid={`delete-user-${u.id}`}>
                      <Trash size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
