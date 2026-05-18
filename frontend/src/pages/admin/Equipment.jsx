import { useState } from "react";
import { useI18n } from "../../lib/i18n";
import { Wrench, Snowflake, Drop, ListChecks } from "@phosphor-icons/react";
import Machines from "./Machines";
import Chillers from "./Chillers";
import CoolingTowers from "./CoolingTowers";
import Panels from "./Panels";

const TABS = [
  { key: "machines",       Icon: Wrench,     Component: Machines,      label_ar: "المكائن",        label_en: "Machines" },
  { key: "chillers",       Icon: Snowflake,  Component: Chillers,      label_ar: "الشيلرات",       label_en: "Chillers" },
  { key: "cooling-towers", Icon: Drop,       Component: CoolingTowers, label_ar: "أبراج التبريد", label_en: "Cooling Towers" },
  { key: "panels",         Icon: ListChecks, Component: Panels,        label_ar: "اللوحات",        label_en: "Panels" },
];

export default function Equipment() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const [tab, setTab] = useState("machines");
  const ActiveComp = TABS.find((t) => t.key === tab)?.Component;

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {ar ? "المعدات والأصول" : "Equipment & Assets"}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {ar ? "إدارة جميع معدات المصنع في مكان واحد" : "Manage all factory equipment in one place"}
        </p>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-5 overflow-x-auto">
        {TABS.map(({ key, Icon, label_ar, label_en }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold shrink-0 border-b-2 transition-colors ${
              tab === key
                ? "border-slate-900 text-slate-900 dark:border-slate-300 dark:text-slate-100"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Icon size={15} weight={tab === key ? "bold" : "regular"} />
            {ar ? label_ar : label_en}
          </button>
        ))}
      </div>

      <div className="fade-in">
        {ActiveComp && <ActiveComp />}
      </div>
    </div>
  );
}
