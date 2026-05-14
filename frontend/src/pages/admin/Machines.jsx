import { useEffect, useRef, useState } from "react";
import { api, formatApiError, API } from "../../lib/api";
import { toast } from "sonner";
import { useI18n } from "../../lib/i18n";
import { Plus, PencilSimple, Trash, DotsSixVertical, FileXls } from "@phosphor-icons/react";

export default function Machines() {
  const { t, lang } = useI18n();
  const ar = lang === "ar";
  const [list, setList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [group, setGroup] = useState("A");
  const [manufacturingYear, setManufacturingYear] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const dragItem = useRef(null);
  const dragOver = useRef(null);

  const load = async () => {
    try {
      const { data } = await api.get("/machines");
      setList(data);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setNumber(""); setName(""); setGroup("A");
    setManufacturingYear(""); setSerialNumber("");
    setShowForm(true);
  };

  const openEdit = (m) => {
    setEditing(m);
    setNumber(m.number); setName(m.name || ""); setGroup(m.group || "A");
    setManufacturingYear(m.manufacturing_year || "");
    setSerialNumber(m.serial_number || "");
    setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = { number, name, group, manufacturing_year: manufacturingYear, serial_number: serialNumber };
      if (editing) {
        await api.patch(`/machines/${editing.id}`, payload);
      } else {
        await api.post("/machines", payload);
      }
      toast.success(t("save"));
      setShowForm(false);
      load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const del = async (m) => {
    if (!window.confirm(t("confirm_delete"))) return;
    try { await api.delete(`/machines/${m.id}`); toast.success("✓"); load(); }
    catch (err) { toast.error(formatApiError(err)); }
  };

  const exportExcel = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/machines/export/excel`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "machines.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      toast.success(ar ? "تم التصدير ✓" : "Exported ✓");
    } catch (e) { toast.error(e.message); }
  };

  const onDragStart = (e, idx) => { dragItem.current = idx; e.dataTransfer.effectAllowed = "move"; };
  const onDragEnter = (e, idx) => { dragOver.current = idx; e.preventDefault(); };
  const onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const onDrop = async () => {
    const from = dragItem.current;
    const to = dragOver.current;
    if (from === null || to === null || from === to) return;
    const reordered = [...list];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setList(reordered);
    dragItem.current = null;
    dragOver.current = null;
    try { await api.patch("/machines/reorder", { ids: reordered.map((m) => m.id) }); }
    catch (e) { toast.error(formatApiError(e)); load(); }
  };

  const filtered = groupFilter === "all" ? list : list.filter((m) => m.group === groupFilter);

  return (
    <div data-testid="machine-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-bold text-slate-900">{t("tab_machines")} ({filtered.length})</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex border border-slate-200 overflow-hidden">
            {["all", "A", "B"].map((g) => (
              <button key={g} onClick={() => setGroupFilter(g)}
                      className={`h-10 px-4 text-sm font-semibold transition-all ${
                        groupFilter === g ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                      }`}>
                {g === "all" ? (ar ? "الكل" : "All") : `Group ${g}`}
              </button>
            ))}
          </div>
          <button onClick={exportExcel}
                  className="h-10 px-4 bg-[#1D6F42] text-white font-semibold flex items-center gap-2 hover:bg-[#155734] text-sm">
            <FileXls size={16} weight="bold" /> {t("export_excel_machines")}
          </button>
          <button onClick={openCreate}
                  className="h-10 px-4 bg-slate-900 text-white font-semibold flex items-center gap-2 hover:bg-slate-800"
                  data-testid="machine-add-button">
            <Plus size={16} weight="bold" /> {t("add_machine")}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={save}
              className="bg-white border border-slate-200 p-5 mb-4 space-y-3 fade-in"
              data-testid="machine-form">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input required placeholder={t("number")} value={number}
                   onChange={(e) => setNumber(e.target.value)}
                   className="h-12 px-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005CBE]"
                   data-testid="machine-number-input" />
            <input placeholder={t("model_optional")} value={name}
                   onChange={(e) => setName(e.target.value)}
                   className="h-12 px-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005CBE]"
                   data-testid="machine-name-input" />
            <div className="flex border border-slate-200 overflow-hidden h-12">
              {["A", "B"].map((g) => (
                <button key={g} type="button" onClick={() => setGroup(g)}
                        className={`flex-1 text-sm font-bold transition-all ${
                          group === g ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                        }`}>
                  Group {g}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input placeholder={t("serial_number")} value={serialNumber}
                   onChange={(e) => setSerialNumber(e.target.value)}
                   className="h-12 px-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005CBE]" />
            <input placeholder={t("manufacturing_year")} value={manufacturingYear}
                   onChange={(e) => setManufacturingYear(e.target.value)}
                   className="h-12 px-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005CBE]" />
            <div className="flex gap-2">
              <button type="submit"
                      className="h-12 px-5 bg-slate-900 text-white font-semibold hover:bg-slate-800 flex-1"
                      data-testid="machine-save-button">{t("save")}</button>
              <button type="button" onClick={() => setShowForm(false)}
                      className="h-12 px-5 bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100">
                {t("cancel")}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 overflow-x-auto">
        <div className="px-4 py-2 text-xs text-slate-400 flex items-center gap-1 border-b border-slate-100">
          <DotsSixVertical size={14} /> {t("drag_to_reorder")}
        </div>
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="w-10 px-4 py-3"></th>
              <th className="text-start px-4 py-3 font-semibold">{t("number")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("name_field")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("group")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("serial_number")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("manufacturing_year")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m, i) => (
              <tr key={m.id} draggable
                  onDragStart={(e) => onDragStart(e, list.indexOf(m))}
                  onDragEnter={(e) => onDragEnter(e, list.indexOf(m))}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  className={`border-t border-slate-100 cursor-grab active:cursor-grabbing hover:bg-blue-50/30 transition-colors ${i % 2 ? "bg-slate-50/40" : ""}`}>
                <td className="px-4 py-3 text-slate-300"><DotsSixVertical size={18} weight="bold" /></td>
                <td className="px-4 py-3 font-semibold font-mono">{m.number}</td>
                <td className="px-4 py-3 text-slate-600">{m.name || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-bold ${m.group === "A" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>
                    Group {m.group || "A"}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{m.serial_number || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{m.manufacturing_year || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(m)}
                            className="h-9 w-9 border border-slate-200 hover:bg-slate-100 flex items-center justify-center"
                            data-testid={`machine-edit-${m.id}`}>
                      <PencilSimple size={14} />
                    </button>
                    <button onClick={() => del(m)}
                            className="h-9 w-9 border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center"
                            data-testid={`machine-delete-${m.id}`}>
                      <Trash size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="7" className="text-center text-slate-500 py-8">{t("no_results")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
