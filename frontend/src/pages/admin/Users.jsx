import { useEffect, useState } from "react";
import { api, formatApiError } from "../../lib/api";
import { toast } from "sonner";
import { Plus, PencilSimple, Trash } from "@phosphor-icons/react";

export default function Users() {
  const [list, setList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    email: "",
    name: "",
    password: "",
    role: "technician",
  });

  const load = async () => {
    try {
      const { data } = await api.get("/users");
      setList(data);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ email: "", name: "", password: "", role: "technician" });
    setShowForm(true);
  };
  const openEdit = (u) => {
    setEditing(u);
    setForm({ email: u.email, name: u.name, password: "", role: u.role });
    setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        const body = { name: form.name, role: form.role };
        if (form.password) body.password = form.password;
        await api.patch(`/users/${editing.id}`, body);
        toast.success("تم التحديث");
      } else {
        await api.post("/users", form);
        toast.success("تمت الإضافة");
      }
      setShowForm(false);
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const del = async (u) => {
    if (!window.confirm(`حذف المستخدم ${u.name}؟`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      toast.success("تم الحذف");
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  return (
    <div data-testid="users-panel">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900">المستخدمون ({list.length})</h3>
        <button
          onClick={openCreate}
          className="h-10 px-4 bg-slate-900 text-white font-semibold flex items-center gap-2 hover:bg-slate-800"
          data-testid="add-user-button"
        >
          <Plus size={16} weight="bold" /> إضافة مستخدم
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={save}
          className="bg-white border border-slate-200 p-5 mb-4 grid grid-cols-1 md:grid-cols-5 gap-3 fade-in"
          data-testid="user-form"
        >
          <input
            required
            type="email"
            placeholder="البريد الإلكتروني"
            value={form.email}
            disabled={!!editing}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="h-12 px-3 border border-slate-200 disabled:bg-slate-50"
            data-testid="user-email-input"
          />
          <input
            required
            placeholder="الاسم"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="h-12 px-3 border border-slate-200"
            data-testid="user-name-input"
          />
          <input
            type="password"
            placeholder={editing ? "كلمة مرور جديدة (اختياري)" : "كلمة المرور"}
            required={!editing}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="h-12 px-3 border border-slate-200"
            data-testid="user-password-input"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="h-12 px-3 border border-slate-200"
            data-testid="user-role-select"
          >
            <option value="technician">فني</option>
            <option value="admin">مدير</option>
          </select>
          <div className="flex gap-2">
            <button
              type="submit"
              className="h-12 px-4 bg-slate-900 text-white font-semibold hover:bg-slate-800 flex-1"
              data-testid="save-user-button"
            >
              حفظ
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="h-12 px-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-start px-4 py-3 font-semibold">الاسم</th>
              <th className="text-start px-4 py-3 font-semibold">البريد</th>
              <th className="text-start px-4 py-3 font-semibold">الدور</th>
              <th className="text-start px-4 py-3 font-semibold">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u, i) => (
              <tr
                key={u.id}
                className={`border-t border-slate-100 ${i % 2 ? "bg-slate-50/40" : ""}`}
              >
                <td className="px-4 py-3 font-semibold">{u.name}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 text-xs font-semibold ${
                      u.role === "admin"
                        ? "bg-[#005CBE] text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {u.role === "admin" ? "مدير" : "فني"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(u)}
                      className="h-9 w-9 border border-slate-200 hover:bg-slate-100 flex items-center justify-center"
                      data-testid={`edit-user-${u.id}`}
                    >
                      <PencilSimple size={14} />
                    </button>
                    <button
                      onClick={() => del(u)}
                      className="h-9 w-9 border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center"
                      data-testid={`delete-user-${u.id}`}
                    >
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
