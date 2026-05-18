import { useState } from "react";
import { useI18n } from "../../lib/i18n";
import { Clipboard, CalendarCheck } from "@phosphor-icons/react";
import Preventive from "./Preventive";
import PreventivePlan from "./PreventivePlan";

export default function PreventivePage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const [tab, setTab] = useState("records");

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {ar ? "الصيانة الوقائية" : "Preventive Maintenance"}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {ar ? "سجل الصيانة المنجزة وخطط الصيانة المجدولة" : "Completed maintenance records and scheduled plans"}
        </p>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-5">
        <button
          onClick={() => setTab("records")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold shrink-0 border-b-2 transition-colors ${
            tab === "records"
              ? "border-slate-900 text-slate-900 dark:border-slate-300 dark:text-slate-100"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Clipboard size={15} weight={tab === "records" ? "bold" : "regular"} />
          {ar ? "سجل الصيانة" : "Maintenance Records"}
        </button>

        <button
          onClick={() => setTab("plans")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold shrink-0 border-b-2 transition-colors ${
            tab === "plans"
              ? "border-slate-900 text-slate-900 dark:border-slate-300 dark:text-slate-100"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <CalendarCheck size={15} weight={tab === "plans" ? "bold" : "regular"} />
          {ar ? "خطط الصيانة" : "Maintenance Plans"}
        </button>
      </div>

      <div className="fade-in">
        {tab === "records" && <Preventive />}
        {tab === "plans"   && <PreventivePlan />}
      </div>
    </div>
  );
}
