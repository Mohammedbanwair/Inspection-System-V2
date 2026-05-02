import { useEffect, useState } from "react";
import { api, formatApiError } from "../../lib/api";
import { toast } from "sonner";
import { Plus, PencilSimple, Trash } from "@phosphor-icons/react";

export default function Machines() {
  const [list, setList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get("/machines");
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
    setNumber("");
    setName("");
    setShowForm(true);
  };

  const openEdit = (m) => {
    setEditing(m);
    setNumber(m.number);
    setName(m.name || "");
    setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.patch(`/machines/${editing.id}`, { number, name });
        toast.success("تم التحديث");
      } else {
        await api.post("/machines", { number, name });
        toast.success("تمت الإضافة");
      }
      setShowForm(false);
      await load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const del = async (m) => {
    if (!window.confirm(`حذف المكينة ${m.number}؟`)) return;
    try {
      await api.delete(`/machines/${m.id}`);
      toast.success("تم الحذف");
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  return (
    <div data-testid="machines-panel">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900">المكائن ({list.length})</h3>
        <button
          onClick={openCreate}
          className="h-10 px-4 bg-slate-900 text-white font-semibold flex items-center gap-2 hover:bg-slate-800"
          data-testid="add-machine-button"
        >
          <Plus size={16} weight="bold" /> إضافة مكينة
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={save}
          className="bg-white border border-slate-200 p-5 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 fade-in"
          data-testid="machine-form"
        >
          <input
            required
            placeholder="رقم المكينة"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="h-12 px-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005CBE]"
            data-testid="machine-number-input"
          />
          <input
            placeholder="الاسم / الموديل (اختياري)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 px-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005CBE]"
            data-testid="machine-name-input"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="h-12 px-5 bg-slate-900 text-white font-semibold hover:bg-slate-800 flex-1"
              data-testid="save-machine-button"
            >
              حفظ
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="h-12 px-5 bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100"
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
              <th className="text-start px-4 py-3 font-semibold">رقم المكينة</th>
              <th className="text-start px-4 py-3 font-semibold">الاسم</th>
              <th className="text-start px-4 py-3 font-semibold">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {list.map((m, i) => (
              <tr
                key={m.id}
                className={`border-t border-slate-100 ${i % 2 ? "bg-slate-50/40" : ""}`}
              >
                <td className="px-4 py-3 font-semibold">{m.number}</td>
                <td className="px-4 py-3">{m.name || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(m)}
                      className="h-9 w-9 border border-slate-200 hover:bg-slate-100 flex items-center justify-center"
                      data-testid={`edit-machine-${m.id}`}
                    >
                      <PencilSimple size={14} />
                    </button>
                    <button
                      onClick={() => del(m)}
                      className="h-9 w-9 border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center"
                      data-testid={`delete-machine-${m.id}`}
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan="3" className="text-center text-slate-500 py-8">
                  لا توجد مكائن
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
