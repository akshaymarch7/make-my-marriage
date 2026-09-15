"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { PlannedFeature } from "./navigation";

export const FeaturePreviewContext = createContext<((feature: PlannedFeature) => void) | null>(null);
export function FeaturePreviewButton({ feature, children, className }: { feature: PlannedFeature; children: ReactNode; className?: string }) {
  const open = useContext(FeaturePreviewContext);
  return <button type="button" className={className} disabled={!open} onClick={() => open?.(feature)}>{children}</button>;
}
