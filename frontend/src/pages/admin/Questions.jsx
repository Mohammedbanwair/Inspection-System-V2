import { useEffect, useState } from "react";
import { api, formatApiError } from "../../lib/api";
import { toast } from "sonner";
import { Plus, PencilSimple, Trash } from "@phosphor-icons/react";

const CATS = [
  { key: "electrical", label: "كهرباء" },
  { key: "mechanical", label: "ميكانيكا" },
  { key: "chiller", label: "شيلر" },
];

export default function Questions() {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [category, setCategory] = useState("electrical");
  const [text, setText] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get("/questions");
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
    setText("");
    setCategory("electrical");
    setShowForm(true);
  };
  const openEdit = (q) => {
    setEditing(q);
    setText(q.text);
    setCategory(q.category);
    setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.patch(`/questions/${editing.id}`, { text, category });
        toast.success("تم التحديث");
      } else {
        await api.post("/questions", { text, category, order: list.length });
        toast.success("تمت الإضافة");
      }
      setShowForm(false);
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const del = async (q) => {
    if (!window.confirm("حذف هذا السؤال؟")) return;
    try {
      await api.delete(`/questions/${q.id}`);
      toast.success("تم الحذف");
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const filtered = filter === "all" ? list : list.filter((q) => q.category === filter);

  return (
    <div data-testid="questions-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-bold text-slate-900">الأسئلة ({filtered.length})</h3>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-10 px-3 border border-slate-200 focus:outline-none"
            data-testid="question-filter"
          >
            <option value="all">جميع الأقسام</option>
            {CATS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            onClick={openCreate}
            className="h-10 px-4 bg-slate-900 text-white font-semibold flex items-center gap-2 hover:bg-slate-800"
            data-testid="add-question-button"
          >
            <Plus size={16} weight="bold" /> إضافة سؤال
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={save}
          className="bg-white border border-slate-200 p-5 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3 fade-in"
          data-testid="question-form"
        >
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-12 px-3 border border-slate-200"
            data-testid="question-category-select"
          >
            {CATS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            required
            placeholder="نص السؤال"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="h-12 px-3 border border-slate-200 md:col-span-2 focus:outline-none focus:ring-2 focus:ring-[#005CBE]"
            data-testid="question-text-input"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="h-12 px-5 bg-slate-900 text-white font-semibold hover:bg-slate-800 flex-1"
              data-testid="save-question-button"
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
              <th className="text-start px-4 py-3 font-semibold">القسم</th>
              <th className="text-start px-4 py-3 font-semibold">السؤال</th>
              <th className="text-start px-4 py-3 font-semibold">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((q, i) => (
              <tr
                key={q.id}
                className={`border-t border-slate-100 ${i % 2 ? "bg-slate-50/40" : ""}`}
              >
                <td className="px-4 py-3">
                  <span className="px-2 py-1 text-xs font-semibold bg-slate-100">
                    {CATS.find((c) => c.key === q.category)?.label}
                  </span>
                </td>
                <td className="px-4 py-3">{q.text}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(q)}
                      className="h-9 w-9 border border-slate-200 hover:bg-slate-100 flex items-center justify-center"
                      data-testid={`edit-question-${q.id}`}
                    >
                      <PencilSimple size={14} />
                    </button>
                    <button
                      onClick={() => del(q)}
                      className="h-9 w-9 border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center"
                      data-testid={`delete-question-${q.id}`}
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="3" className="text-center text-slate-500 py-8">
                  لا توجد أسئلة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
