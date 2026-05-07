import { useEffect, useRef, useState } from "react";
import { api, formatApiError } from "../../lib/api";
import { toast } from "sonner";
import { useI18n } from "../../lib/i18n";
import { Plus, PencilSimple, Trash, DotsSixVertical } from "@phosphor-icons/react";
import ConfirmDialog from "../../components/ConfirmDialog";

export default function Panels() {
  const { t, lang } = useI18n();
  const [list, setList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [panelType, setPanelType] = useState("sub");
  const [typeFilter, setTypeFilter] = useState("all");
  const dragItem = useRef(null);
  const dragOver = useRef(null);

  const load = async () => {
    try {
      const { data } = await api.get("/panels");
      setList(data);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setNumber(""); setName(""); setPanelType("sub"); setShowForm(true); };
  const openEdit = (p) => { setEditing(p); setNumber(p.number); setName(p.name || ""); setPanelType(p.panel_type || "sub"); setShowForm(true); };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.patch(`/panels/${editing.id}`, { number, name, panel_type: panelType });
      } else {
        await api.post("/panels", { number, name, panel_type: panelType });
      }
      toast.success(t("save"));
      setShowForm(false);
      load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const del = async () => {
    try { await api.delete(`/panels/${confirmTarget.id}`); toast.success("✓"); load(); }
    catch (err) { toast.error(formatApiError(err)); }
    finally { setConfirmTarget(null); }
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
    try { await api.patch("/panels/reorder", { ids: reordered.map((p) => p.id) }); }
    catch (e) { toast.error(formatApiError(e)); load(); }
  };

  const filtered = typeFilter === "all" ? list : list.filter((p) => p.panel_type === typeFilter);

  return (
    <div data-testid="panel-panel">
      <ConfirmDialog
        open={!!confirmTarget}
        message={`${t("confirm_delete")} "${confirmTarget?.number}"؟`}
        onConfirm={del}
        onCancel={() => setConfirmTarget(null)}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-bold text-slate-900">{t("tab_panels")} ({filtered.length})</h3>
        <div className="flex items-center gap-2">
          <div className="flex border border-slate-200 overflow-hidden">
            {["all", "main", "sub"].map((tp) => (
              <button key={tp} onClick={() => setTypeFilter(tp)}
                      className={`h-10 px-4 text-sm font-semibold transition-all ${
                        typeFilter === tp ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                      }`}>
                {tp === "all"
                  ? (lang === "ar" ? "الكل" : "All")
                  : tp === "main" ? t("panel_type_main") : t("panel_type_sub")}
              </button>
            ))}
          </div>
          <button onClick={openCreate}
                  className="h-10 px-4 bg-slate-900 text-white font-semibold flex items-center gap-2 hover:bg-slate-800"
                  data-testid="panel-add-button">
            <Plus size={16} weight="bold" /> {t("add_panel")}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={save}
              className="bg-white border border-slate-200 p-5 mb-4 fade-in"
              data-testid="panel-form">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input required placeholder={t("number")} value={number} maxLength={20}
                   onChange={(e) => setNumber(e.target.value)}
                   className="h-12 px-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005CBE]"
                   data-testid="panel-number-input" />
            <input placeholder={t("model_optional")} value={name} maxLength={80}
                   onChange={(e) => setName(e.target.value)}
                   className="h-12 px-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005CBE]"
                   data-testid="panel-name-input" />
            <div className="flex gap-2">
              <button type="submit"
                      className="h-12 px-5 bg-slate-900 text-white font-semibold hover:bg-slate-800 flex-1"
                      data-testid="panel-save-button">{t("save")}</button>
              <button type="button" onClick={() => setShowForm(false)}
                      className="h-12 px-5 bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100">
                {t("cancel")}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-600">{t("panel_type")}:</span>
            <div className="flex border border-slate-200 overflow-hidden">
              {["main", "sub"].map((tp) => (
                <button key={tp} type="button" onClick={() => setPanelType(tp)}
                        className={`h-10 px-5 text-sm font-semibold transition-all ${
                          panelType === tp ? "bg-[#6B2D6B] text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                        }`}>
                  {tp === "main" ? t("panel_type_main") : t("panel_type_sub")}
                </button>
              ))}
            </div>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 overflow-x-auto">
        <div className="px-4 py-2 text-xs text-slate-400 flex items-center gap-1 border-b border-slate-100">
          <DotsSixVertical size={14} /> {t("drag_to_reorder")}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="w-10 px-4 py-3"></th>
              <th className="text-start px-4 py-3 font-semibold">{t("number")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("name_field")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("panel_type")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={p.id} draggable
                  onDragStart={(e) => onDragStart(e, list.indexOf(p))}
                  onDragEnter={(e) => onDragEnter(e, list.indexOf(p))}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  className={`border-t border-slate-100 cursor-grab active:cursor-grabbing hover:bg-blue-50/30 transition-colors ${i % 2 ? "bg-slate-50/40" : ""}`}>
                <td className="px-4 py-3 text-slate-300"><DotsSixVertical size={18} weight="bold" /></td>
                <td className="px-4 py-3 font-semibold font-mono">{p.number}</td>
                <td className="px-4 py-3 text-slate-600">{p.name || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-bold ${
                    p.panel_type === "main"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-slate-100 text-slate-600"
                  }`}>
                    {p.panel_type === "main" ? t("panel_type_main") : t("panel_type_sub")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(p)}
                            className="h-9 w-9 border border-slate-200 hover:bg-slate-100 flex items-center justify-center"
                            data-testid={`panel-edit-${p.id}`}>
                      <PencilSimple size={14} />
                    </button>
                    <button onClick={() => setConfirmTarget(p)}
                            className="h-9 w-9 border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center"
                            data-testid={`panel-delete-${p.id}`}>
                      <Trash size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="5" className="text-center text-slate-500 py-8">{t("no_results")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
