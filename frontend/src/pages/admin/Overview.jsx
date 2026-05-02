import { useEffect, useState } from "react";
import { api, formatApiError } from "../../lib/api";
import { toast } from "sonner";
import {
  ClipboardText,
  Wrench,
  UsersThree,
  Question,
  Warning,
  CalendarCheck,
} from "@phosphor-icons/react";

function Stat({ icon: Icon, label, value, accent, testid }) {
  return (
    <div
      className="bg-white border border-slate-200 p-5 flex flex-col gap-3"
      data-testid={testid}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          {label}
        </span>
        <div
          className={`h-9 w-9 flex items-center justify-center ${accent || "bg-slate-900 text-white"}`}
        >
          <Icon size={18} weight="bold" />
        </div>
      </div>
      <div className="text-4xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [s, r] = await Promise.all([
          api.get("/stats/overview"),
          api.get("/inspections", { params: { limit: 10 } }),
        ]);
        setStats(s.data);
        setRecent(r.data);
      } catch (e) {
        toast.error(formatApiError(e));
      }
    })();
  }, []);

  return (
    <div className="space-y-6" data-testid="admin-overview">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Stat
          icon={ClipboardText}
          label="إجمالي الفحوصات"
          value={stats?.total_inspections ?? "—"}
          testid="stat-total-inspections"
        />
        <Stat
          icon={CalendarCheck}
          label="فحوصات اليوم"
          value={stats?.today_inspections ?? "—"}
          accent="bg-[#005CBE] text-white"
          testid="stat-today-inspections"
        />
        <Stat
          icon={Warning}
          label="إجمالي الأعطال"
          value={stats?.total_fails ?? "—"}
          accent="bg-red-500 text-white"
          testid="stat-fails"
        />
        <Stat
          icon={Wrench}
          label="المكائن"
          value={stats?.total_machines ?? "—"}
          testid="stat-machines"
        />
        <Stat
          icon={UsersThree}
          label="الفنيون"
          value={stats?.total_technicians ?? "—"}
          testid="stat-techs"
        />
        <Stat
          icon={Question}
          label="الأسئلة"
          value={stats?.total_questions ?? "—"}
          testid="stat-questions"
        />
      </div>

      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-3">أحدث الفحوصات</h3>
        <div className="bg-white border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-start px-4 py-3 font-semibold">التاريخ</th>
                <th className="text-start px-4 py-3 font-semibold">رقم المكينة</th>
                <th className="text-start px-4 py-3 font-semibold">الفني</th>
                <th className="text-start px-4 py-3 font-semibold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center text-slate-500 py-8">
                    لا توجد فحوصات بعد
                  </td>
                </tr>
              )}
              {recent.map((r, i) => {
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
