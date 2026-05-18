import { useState } from "react";
import { useI18n } from "../../lib/i18n";
import { UsersThree, UserPlus, ShieldCheck } from "@phosphor-icons/react";
import Users from "./Users";
import RegistrationRequests from "./RegistrationRequests";
import Permissions from "./Permissions";

export default function TeamManagement({ onCountChange, pendingCount = 0 }) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const [tab, setTab] = useState("users");

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {ar ? "إدارة الفريق" : "Team Management"}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {ar ? "المستخدمون وطلبات التسجيل والصلاحيات" : "Users, registration requests, and permissions"}
        </p>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-5 overflow-x-auto">
        <button
          onClick={() => setTab("users")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold shrink-0 border-b-2 transition-colors ${
            tab === "users"
              ? "border-slate-900 text-slate-900 dark:border-slate-300 dark:text-slate-100"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <UsersThree size={15} weight={tab === "users" ? "bold" : "regular"} />
          {ar ? "المستخدمون" : "Users"}
        </button>

        <button
          onClick={() => setTab("requests")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold shrink-0 border-b-2 transition-colors ${
            tab === "requests"
              ? "border-slate-900 text-slate-900 dark:border-slate-300 dark:text-slate-100"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <UserPlus size={15} weight={tab === "requests" ? "bold" : "regular"} />
          {ar ? "طلبات التسجيل" : "Registration Requests"}
          {pendingCount > 0 && (
            <span className="h-5 min-w-[20px] px-1 bg-red-500 text-white text-xs font-bold flex items-center justify-center rounded-full">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setTab("permissions")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold shrink-0 border-b-2 transition-colors ${
            tab === "permissions"
              ? "border-slate-900 text-slate-900 dark:border-slate-300 dark:text-slate-100"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <ShieldCheck size={15} weight={tab === "permissions" ? "bold" : "regular"} />
          {ar ? "الصلاحيات" : "Permissions"}
        </button>
      </div>

      <div className="fade-in">
        {tab === "users"       && <Users />}
        {tab === "requests"    && <RegistrationRequests onCountChange={onCountChange} />}
        {tab === "permissions" && <Permissions />}
      </div>
    </div>
  );
}
