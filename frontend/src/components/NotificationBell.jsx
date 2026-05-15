import { useState, useEffect, useRef } from "react";
import { Bell, X, Check, CheckCircle } from "@phosphor-icons/react";
import { api } from "../lib/api";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ items: [], unread: 0 });
  const ref = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications");
      setData(res.data);
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markRead = async (nid) => {
    await api.patch(`/notifications/${nid}/read`);
    setData((d) => ({
      ...d,
      unread: Math.max(0, d.unread - (d.items.find((n) => n.id === nid)?.is_read ? 0 : 1)),
      items: d.items.map((n) => n.id === nid ? { ...n, is_read: true } : n),
    }));
  };

  const markAll = async () => {
    await api.patch("/notifications/read-all");
    setData((d) => ({ ...d, unread: 0, items: d.items.map((n) => ({ ...n, is_read: true })) }));
  };

  const remove = async (e, nid) => {
    e.stopPropagation();
    await api.delete(`/notifications/${nid}`);
    setData((d) => ({
      ...d,
      unread: Math.max(0, d.unread - (d.items.find((n) => n.id === nid)?.is_read ? 0 : 1)),
      items: d.items.filter((n) => n.id !== nid),
    }));
  };

  const typeColor = (type) => {
    if (type === "new_breakdown") return "bg-red-100 text-red-600";
    if (type === "breakdown_resolved") return "bg-emerald-100 text-emerald-600";
    if (type === "new_registration") return "bg-blue-100 text-blue-600";
    return "bg-slate-100 text-slate-600";
  };

  const formatTime = (iso) => {
    try { return new Date(iso).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" }); }
    catch { return iso; }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen((o) => !o); if (!open) fetchNotifications(); }}
        className="relative h-9 w-9 sm:h-10 sm:w-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center"
        title="التنبيهات"
      >
        <Bell size={17} weight={data.unread > 0 ? "fill" : "regular"} />
        {data.unread > 0 && (
          <span className="absolute -top-1 -end-1 h-4 min-w-[16px] px-0.5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
            {data.unread > 9 ? "9+" : data.unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-50 flex flex-col max-h-[480px]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
              التنبيهات {data.unread > 0 && <span className="ms-1 text-red-500">({data.unread})</span>}
            </span>
            {data.unread > 0 && (
              <button onClick={markAll} className="flex items-center gap-1 text-xs text-[#6B2D6B] hover:underline font-semibold">
                <CheckCircle size={13} /> تحديد الكل كمقروء
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {data.items.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">لا توجد تنبيهات</div>
            ) : (
              data.items.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  className={`flex gap-3 px-4 py-3 border-b border-slate-50 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${!n.is_read ? "bg-blue-50/40 dark:bg-blue-900/10" : ""}`}
                >
                  <div className={`mt-0.5 shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${typeColor(n.type)}`}>
                    {n.type === "new_breakdown" ? "!" : n.type === "breakdown_resolved" ? "✓" : "•"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold truncate ${!n.is_read ? "text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-400"}`}>
                      {n.title_ar}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.body_ar}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{formatTime(n.created_at)}</div>
                  </div>
                  <button
                    onClick={(e) => remove(e, n.id)}
                    className="shrink-0 text-slate-300 hover:text-red-400 transition-colors mt-0.5"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
