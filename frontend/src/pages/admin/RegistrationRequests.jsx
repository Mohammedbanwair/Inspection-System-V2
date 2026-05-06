import { useEffect, useState } from "react";
import { api, formatApiError } from "../../lib/api";
import { toast } from "sonner";
import { useI18n } from "../../lib/i18n";
import { CheckCircle, XCircle, UserPlus } from "@phosphor-icons/react";

export default function RegistrationRequests({ onCountChange }) {
  const { t, lang } = useI18n();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(null); // id being approved
  const [specialty, setSpecialty] = useState({}); // {id: "electrical"|"mechanical"}

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/registration-requests");
      setList(data);
      onCountChange?.(data.length);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const approve = async (req) => {
    const sp = specialty[req.id];
    if (!sp) {
      toast.error(lang === "ar" ? "يجب تحديد التخصص أولاً" : "Please select specialty first");
      return;
    }
    setApproving(req.id);
    try {
      await api.post(`/registration-requests/${req.id}/approve`, { specialty: sp });
      toast.success(lang === "ar" ? `تمت الموافقة على ${req.name} ✓` : `Approved ${req.name} ✓`);
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setApproving(null);
    }
  };

  const reject = async (req) => {
    if (!window.confirm(
      lang === "ar" ? `رفض طلب ${req.name}؟` : `Reject ${req.name}'s request?`
    )) return;
    try {
      await api.delete(`/registration-requests/${req.id}`);
      toast.success(lang === "ar" ? "تم الرفض" : "Rejected");
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const setReqSpecialty = (id, val) =>
    setSpecialty((p) => ({ ...p, [id]: val }));

  return (
    <div data-testid="registration-requests-panel">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            {lang === "ar" ? "طلبات التسجيل" : "Registration Requests"}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {lang === "ar"
              ? "راجع الطلبات المعلقة وحدد تخصص كل فني قبل الموافقة"
              : "Review pending requests and assign specialty before approving"}
          </p>
        </div>
        {list.length > 0 && (
          <span className="h-8 px-3 bg-amber-100 text-amber-800 text-sm font-bold flex items-center gap-1">
            <UserPlus size={14} weight="bold" />
            {list.length} {lang === "ar" ? "معلق" : "pending"}
          </span>
        )}
      </div>

      <div className="bg-white border border-slate-200 overflow-x-auto">
        {loading ? (
          <div className="text-center text-slate-400 py-12">{t("loading")}</div>
        ) : list.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle size={48} className="mx-auto text-emerald-400 mb-3" weight="light" />
            <p className="text-slate-500 font-semibold">
              {lang === "ar" ? "لا توجد طلبات معلقة" : "No pending requests"}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-start px-4 py-3 font-semibold">{t("date")}</th>
                <th className="text-start px-4 py-3 font-semibold">{t("employee_number")}</th>
                <th className="text-start px-4 py-3 font-semibold">
                  {lang === "ar" ? "الاسم" : "Name"}
                </th>
                <th className="text-start px-4 py-3 font-semibold">{t("specialty")}</th>
                <th className="text-start px-4 py-3 font-semibold">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((req, i) => (
                <tr
                  key={req.id}
                  className={`border-t border-slate-100 ${i % 2 ? "bg-slate-50/40" : ""}`}
                >
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(req.created_at).toLocaleString(
                      lang === "ar" ? "ar-EG" : "en-US"
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold">
                    {req.employee_number}
                  </td>
                  <td className="px-4 py-3 font-semibold">{req.name}</td>
                  <td className="px-4 py-3">
                    <select
                      value={specialty[req.id] || ""}
                      onChange={(e) => setReqSpecialty(req.id, e.target.value)}
                      className="h-9 px-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005CBE] text-sm"
                      data-testid={`specialty-select-${req.id}`}
                    >
                      <option value="">
                        {lang === "ar" ? "— اختر التخصص —" : "— Select specialty —"}
                      </option>
                      <option value="electrical">
                        {lang === "ar" ? "كهرباء" : "Electrical"}
                      </option>
                      <option value="mechanical">
                        {lang === "ar" ? "ميكانيكا" : "Mechanical"}
                      </option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {/* Approve */}
                      <button
                        onClick={() => approve(req)}
                        disabled={approving === req.id || !specialty[req.id]}
                        className="h-9 px-4 bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-40 flex items-center gap-1"
                        data-testid={`approve-${req.id}`}
                      >
                        <CheckCircle size={14} weight="bold" />
                        {lang === "ar" ? "موافقة" : "Approve"}
                      </button>
                      {/* Reject */}
                      <button
                        onClick={() => reject(req)}
                        className="h-9 px-4 border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 flex items-center gap-1"
                        data-testid={`reject-${req.id}`}
                      >
                        <XCircle size={14} weight="bold" />
                        {lang === "ar" ? "رفض" : "Reject"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
