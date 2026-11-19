"use client";

import { useState } from "react";
import { Database, Laptop, ServerCog } from "lucide-react";
import { Window } from "@/components/win/Window";
import { DatabaseSetupWizard } from "./DatabaseSetupWizard";
import { DesktopSettingsView } from "./DesktopSettingsPanel";

/**
 * مركز الاتصال: تبويبين
 * 1) ربط قاعدة البيانات (مبسّط للعميل — رابط واحد وخلاص)
 * 2) إعدادات نسخة الويندوز التفصيلية (لو شغّال داخل برنامج سطح المكتب)
 */
export function ConnectionHub() {
  const [tab, setTab] = useState<"db" | "desktop">("db");

  return (
    <Window
      title="مركز الاتصال والإعداد"
      icon={<ServerCog className="h-8 w-8 text-[#2fb3a6]" />}
      statusBar={
        <>
          <span>اختر التبويب المناسب لطريقة التشغيل</span>
          <span className="ms-auto">دعم فني: م/ وائل الجمال — 01222355769</span>
        </>
      }
    >
      <div className="flex h-full w-full flex-col">
        <div className="flex shrink-0 items-end gap-1 border-b-2 border-[#0f2942] bg-white/60 px-2">
          <TabBtn active={tab === "db"} onClick={() => setTab("db")} icon={<Database className="h-4 w-4" />}>
            ربط قاعدة البيانات
          </TabBtn>
          <TabBtn active={tab === "desktop"} onClick={() => setTab("desktop")} icon={<Laptop className="h-4 w-4" />}>
            إعدادات نسخة الويندوز
          </TabBtn>
        </div>

        <div className="min-h-0 flex-1">
          {tab === "db" ? <DatabaseSetupWizard embedded /> : <DesktopSettingsView />}
        </div>
      </div>
    </Window>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-t-lg border-2 border-b-0 px-3 py-1.5 text-[13px] font-black transition ${
        active
          ? "border-[#0f2942] bg-[#0f2942] text-white"
          : "border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
