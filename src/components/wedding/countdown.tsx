"use client";
import { useEffect, useState } from "react";
import { countdownLabel, daysUntilWedding } from "@/modules/weddings/dates";

export function WeddingCountdown({ date, timeZone, initialDays }: { date: string; timeZone: string; initialDays: number }) {
  const [days, setDays] = useState(initialDays);
  useEffect(() => {
    const update = () => setDays(daysUntilWedding(date, timeZone));
    const timer = window.setInterval(update, 60000);
    window.addEventListener("focus", update);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update); };
  }, [date, timeZone]);
  return <span>{countdownLabel(days)}</span>;
}
