import { useState } from "react";
import TopBar from "../components/TopBar";
import Overview from "./admin/Overview";
import Machines from "./admin/Machines";
import Questions from "./admin/Questions";
import Users from "./admin/Users";
import Inspections from "./admin/Inspections";
import {
  ChartBar,
  Wrench,
  Question,
  UsersThree,
  ClipboardText,
} from "@phosphor-icons/react";

const TABS = [
  { key: "overview", label: "نظرة عامة", Icon: ChartBar, Component: Overview },
  { key: "inspections", label: "الفحوصات", Icon: ClipboardText, Component: Inspections },
  { key: "machines", label: "المكائن", Icon: Wrench, Component: Machines },
  { key: "questions", label: "الأسئلة", Icon: Question, Component: Questions },
  { key: "users", label: "المستخدمون", Icon: UsersThree, Component: Users },
];

export default function AdminDashboard() {
  const [active, setActive] = useState("overview");
  const ActiveComp = TABS.find((t) => t.key === active).Component;

  return (
    <div className="min-h-screen" data-testid="admin-dashboard">
      <TopBar />
      <main className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            لوحة المدير
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mt-1">مركز التحكم</h1>
        </div>

        <div className="flex flex-wrap border-b border-slate-200 mb-6">
          {TABS.map(({ key, label, Icon }) => {
            const isActive = active === key;
            return (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={`px-5 py-4 border-b-4 flex items-center gap-2 font-semibold transition-all ${
                  isActive
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
                data-testid={`admin-tab-${key}`}
              >
                <Icon size={18} weight={isActive ? "bold" : "regular"} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <div className="fade-in">
          <ActiveComp />
        </div>
      </main>
    </div>
  );
}
