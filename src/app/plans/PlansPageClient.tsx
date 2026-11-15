"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { ActivationPlans } from "@/components/win/ActivationPlans";
import type { PlanKey } from "@/lib/license-plans";

export function PlansPageClient() {
  const [machineId, setMachineId] = useState("");
  const [plan, setPlan] = useState<PlanKey | null>(null);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/license")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        if (d.machineId) setMachineId(String(d.machineId));
        if (d.plan) setPlan(d.plan as PlanKey);
        if (typeof d.planDaysLeft === "number") setDaysLeft(d.planDaysLeft);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#eef3fa] py-4">
      <div className="mx-auto mb-3 flex w-full max-w-[1000px] items-center gap-2 px-3">
        <Link
          href="/"
          className="flex h-9 items-center gap-1.5 rounded-lg border border-[#c9d8ee] bg-white px-3 text-[12.5px] font-black text-[#0f2942] hover:bg-[#f4f8fd]"
        >
          <ArrowRight className="h-4 w-4" />
          رجوع للبرنامج
        </Link>
        <span className="text-[11.5px] font-bold text-slate-500">
          صفحة عامة يعرضها الدعم أو يفتحها العميل بنفسه
        </span>
      </div>

      {loading ? (
        <div className="mx-auto grid w-full max-w-[1000px] place-items-center py-20 text-slate-500">
          <RefreshCw className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[1000px] px-3">
          <ActivationPlans
            machineId={machineId}
            currentPlan={plan}
            currentDaysLeft={daysLeft}
            standalone
          />
        </div>
      )}
    </div>
  );
}
