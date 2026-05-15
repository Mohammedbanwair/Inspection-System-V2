import { useEffect, useState } from "react";
import { api, formatApiError } from "../../lib/api";
import { toast } from "sonner";
import { useI18n } from "../../lib/i18n";
import { ClockCounterClockwise, Funnel } from "@phosphor-icons/react";

const RESOURCE_TYPES = [
  { value: "", label_ar: "جميع الأنواع", label_en: "All types" },
  { value: "user", label_ar: "مستخدم", label_en: "User" },
  { value: "machine", label_ar: "مكينة", label_en: "Machine" },
  { value: "breakdown", label_ar: "عطل", label_en: "Breakdown" },
  { value: "question", label_ar: "سؤال", label_en: "Question" },
  { value: "registration", label_ar: "تسجيل", label_en: "Registration" },
];

const ACTION_COLORS = {
  create:  "bg-emerald-100 text-emerald-700",
  delete:  "bg-red-100 text-red-700",
  update:  "bg-blue-100 text-blue-700",
  resolve: "bg-purple-100 text-purple-700",
  approve: "bg-amber-100 text-amber-700",
};

const ACTION_LABELS_AR = {
  create: "إنشاء", delete: "حذف", update: "تعديل",
  resolve: "حل", approve: "موافقة",
};

export default function AuditLog() {
  const { t, lang } = useI18n();
  const ar = lang === "ar";

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [resourceType, setResourceType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const LIMIT = 50;

  const fetchLogs = async (pg = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: LIMIT });
      if (resourceType) params.append("resource_type", resourceType);
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);
      const { data } = await api.get(`/audit-logs?${params}`);
      setItems(data.items);
      setTotal(data.total);
      setPage(pg);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(1); }, []);

  const formatDate = (iso) => {
    try { return new Date(iso).toLocaleString(ar ? "ar-EG" : "en-US", { dateStyle: "short", timeStyle: "short" }); }
    catch { return iso; }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClockCounterClockwise size={20} weight="bold" className="text-[#6B2D6B]" />
        <h2 className="text-lg font-bold text-slate-900">{t("tab_audit_log")}</h2>
        <span className="text-xs text-slate-400 font-mono">({total})</span>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
        <Funnel size={16} className="text-slate-400 mb-1" />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">{t("audit_resource_type")}</label>
          <select
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            className="h-9 px-2 border border-slate-200 text-sm bg-white text-slate-700 min-w-[140px]"
          >
            {RESOURCE_TYPES.map((r) => (
              <option key={r.value} value={r.value}>{ar ? r.label_ar : r.label_en}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">{t("date_from")}</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 px-2 border border-slate-200 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">{t("date_to")}</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="h-9 px-2 border border-slate-200 text-sm" />
        </div>
        <button
          onClick={() => fetchLogs(1)}
          className="h-9 px-4 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
        >
          {t("search")}
        </button>
        <button
          onClick={() => { setResourceType(""); setDateFrom(""); setDateTo(""); setTimeout(() => fetchLogs(1), 0); }}
          className="h-9 px-4 border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100"
        >
          {t("reset")}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-start px-4 py-3 font-semibold">{t("audit_time")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("audit_actor")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("audit_action")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("audit_resource")}</th>
              <th className="text-start px-4 py-3 font-semibold">{t("audit_details")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan="5" className="text-center py-12">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin mx-auto" />
              </td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan="5" className="text-center py-10 text-slate-400 text-sm">
                {t("audit_empty")}
              </td></tr>
            )}
            {!loading && items.map((log, i) => (
              <tr key={log.id} className={`border-t border-slate-100 ${i % 2 ? "bg-slate-50/40" : ""}`}>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(log.created_at)}</td>
                <td className="px-4 py-3 font-semibold text-slate-800">{log.actor_name}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block text-xs font-bold px-2 py-0.5 ${ACTION_COLORS[log.action] || "bg-slate-100 text-slate-600"}`}>
                    {ar ? (ACTION_LABELS_AR[log.action] || log.action) : log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {ar
                    ? (RESOURCE_TYPES.find((r) => r.value === log.resource_type)?.label_ar || log.resource_type)
                    : (RESOURCE_TYPES.find((r) => r.value === log.resource_type)?.label_en || log.resource_type)}
                </td>
                <td className="px-4 py-3 text-slate-500 max-w-[260px] truncate" title={log.details}>
                  {log.details || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">
            {ar ? `صفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}
          </span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => fetchLogs(page - 1)}
              className="px-3 py-1.5 border border-slate-200 disabled:opacity-40 hover:bg-slate-100 font-semibold">
              {ar ? "السابق" : "Prev"}
            </button>
            <button disabled={page >= totalPages} onClick={() => fetchLogs(page + 1)}
              className="px-3 py-1.5 border border-slate-200 disabled:opacity-40 hover:bg-slate-100 font-semibold">
              {ar ? "التالي" : "Next"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
