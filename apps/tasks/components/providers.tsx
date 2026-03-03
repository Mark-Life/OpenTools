"use client";

import type { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

/** Minimal providers wrapper for the tasks app */
export function Providers({ children }: ProvidersProps) {
  return <>{children}</>;
}
