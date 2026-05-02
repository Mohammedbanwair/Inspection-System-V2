import { useEffect, useMemo, useState } from "react";
import { api, formatApiError, API } from "../../lib/api";
import { toast } from "sonner";
import { Eye, DownloadSimple, FilePdf, Trash, X } from "@phosphor-icons/react";

export default function Inspections() {
  const [list, setList] = useState([]);
  const [techs, setTechs] = useState([]);
  const [filters, setFilters] = useState({
    machine_number: "",
    technician_id: "",
    date_from: "",
    date_to: "",
  });
  const [questions, setQuestions] = useState([]);
  const [viewing, setViewing] = useState(null);

  const load = async () => {
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params[k] = v;
      });
      const { data } = await api.get("/inspections", { params });
      setList(data);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [u, q] = await Promise.all([
          api.get("/users"),
          api.get("/questions"),
        ]);
        setTechs(u.data.filter((x) => x.role === "technician"));
        setQuestions(q.data);
      } catch (e) {
        toast.error(formatApiError(e));
      }
    })();
    load();
    // eslint-disable-next-line
  }, []);

  const qMap = useMemo(
    () => Object.fromEntries(questions.map((q) => [q.id, q])),
    [questions]
  );

  const applyFilters = (e) => {
    e.preventDefault();
    load();
  };

  const resetFilters = () => {
    setFilters({ machine_number: "", technician_id: "", date_from: "", date_to: "" });
    setTimeout(load, 0);
  };

  const exportCSV = async () => {
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v && k !== "technician_id") params.append(k, v);
      });
      const res = await fetch(`${API}/inspections/export/csv?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("فشل التصدير");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inspections-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("تم تصدير التقرير");
    } catch (e) {
      toast.error(e.message || "فشل التصدير");
    }
  };

  const exportPDF = async (id, number) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/inspections/${id}/export/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("فشل التصدير");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inspection_${number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const del = async (id) => {
    if (!window.confirm("حذف هذا الفحص؟")) return;
    try {
      await api.delete(`/inspections/${id}`);
      toast.success("تم الحذف");
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  return (
    <div data-testid="inspections-panel">
      <form
        onSubmit={applyFilters}
        className="bg-white border border-slate-200 p-5 mb-4 grid grid-cols-2 md:grid-cols-5 gap-3"
      >
        <input
          placeholder="رقم المكينة"
          value={filters.machine_number}
          onChange={(e) => setFilters({ ...filters, machine_number: e.target.value })}
          className="h-11 px-3 border border-slate-200"
          data-testid="filter-machine-input"
        />
        <select
          value={filters.technician_id}
          onChange={(e) => setFilters({ ...filters, technician_id: e.target.value })}
          className="h-11 px-3 border border-slate-200"
          data-testid="filter-tech-select"
        >
          <option value="">كل الفنيين</option>
          {techs.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={filters.date_from}
          onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
          className="h-11 px-3 border border-slate-200"
          data-testid="filter-date-from"
        />
        <input
          type="date"
          value={filters.date_to}
          onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
          className="h-11 px-3 border border-slate-200"
          data-testid="filter-date-to"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="h-11 px-4 bg-slate-900 text-white font-semibold hover:bg-slate-800 flex-1"
            data-testid="apply-filters-button"
          >
            بحث
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="h-11 px-4 border border-slate-200 hover:bg-slate-100"
          >
            إعادة
          </button>
        </div>
      </form>

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-slate-900">
          النتائج ({list.length})
        </h3>
        <button
          onClick={exportCSV}
          className="h-10 px-4 bg-[#005CBE] text-white font-semibold flex items-center gap-2 hover:bg-[#004a99]"
          data-testid="export-csv-button"
        >
          <DownloadSimple size={16} weight="bold" /> تصدير CSV
        </button>
      </div>

      <div className="bg-white border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-start px-4 py-3 font-semibold">التاريخ</th>
              <th className="text-start px-4 py-3 font-semibold">المكينة</th>
              <th className="text-start px-4 py-3 font-semibold">الفني</th>
              <th className="text-start px-4 py-3 font-semibold">الأعطال</th>
              <th className="text-start px-4 py-3 font-semibold">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center text-slate-500 py-8">
                  لا توجد فحوصات
                </td>
              </tr>
            )}
            {list.map((r, i) => {
              const fails = (r.answers || []).filter((a) => !a.answer).length;
              return (
                <tr
                  key={r.id}
                  className={`border-t border-slate-100 ${i % 2 ? "bg-slate-50/40" : ""}`}
                >
                  <td className="px-4 py-3">
                    {new Date(r.created_at).toLocaleString("ar-EG")}
                  </td>
                  <td className="px-4 py-3 font-semibold">{r.machine_number}</td>
                  <td className="px-4 py-3">{r.technician_name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 text-xs font-semibold ${
                        fails > 0
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {fails > 0 ? `${fails} أعطال` : "سليم"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewing(r)}
                        className="h-9 w-9 border border-slate-200 hover:bg-slate-100 flex items-center justify-center"
                        data-testid={`view-inspection-${r.id}`}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => exportPDF(r.id, r.machine_number)}
                        className="h-9 w-9 border border-slate-200 hover:bg-slate-100 flex items-center justify-center"
                        data-testid={`pdf-inspection-${r.id}`}
                      >
                        <FilePdf size={14} />
                      </button>
                      <button
                        onClick={() => del(r.id)}
                        className="h-9 w-9 border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center"
                        data-testid={`delete-inspection-${r.id}`}
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {viewing && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 flex items-center justify-center p-4"
          onClick={() => setViewing(null)}
          data-testid="inspection-detail-modal"
        >
          <div
            className="bg-white border border-slate-200 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  تفاصيل الفحص
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  مكينة #{viewing.machine_number}
                </h3>
              </div>
              <button
                onClick={() => setViewing(null)}
                className="h-9 w-9 border border-slate-200 hover:bg-slate-100 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-slate-500">التاريخ</div>
                  <div className="font-semibold">
                    {new Date(viewing.created_at).toLocaleString("ar-EG")}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">الفني</div>
                  <div className="font-semibold">{viewing.technician_name}</div>
                </div>
              </div>

              {["electrical", "mechanical", "chiller"].map((cat) => {
                const items = (viewing.answers || []).filter(
                  (a) => qMap[a.question_id]?.category === cat
                );
                if (!items.length) return null;
                const label =
                  cat === "electrical"
                    ? "كهرباء"
                    : cat === "mechanical"
                      ? "ميكانيكا"
                      : "شيلر";
                return (
                  <div key={cat}>
                    <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
                      {label}
                    </div>
                    <div className="border border-slate-200">
                      {items.map((a, i) => {
                        const q = qMap[a.question_id];
                        return (
                          <div
                            key={i}
                            className={`px-4 py-3 flex items-center gap-3 ${
                              i > 0 ? "border-t border-slate-100" : ""
                            }`}
                          >
                            <span
                              className={`h-7 min-w-[50px] px-2 text-xs font-bold flex items-center justify-center ${
                                a.answer
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {a.answer ? "صح" : "خطأ"}
                            </span>
                            <div className="flex-1">
                              <div className="text-sm">{q?.text || "—"}</div>
                              {a.note && (
                                <div className="text-xs text-slate-500 mt-1">
                                  ملاحظة: {a.note}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {viewing.notes && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
                    ملاحظات عامة
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 text-sm">
                    {viewing.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
