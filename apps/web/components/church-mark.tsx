"use client";

import * as React from "react";

/**
 * R1.1. The church's own logo, available anywhere under the shell.
 *
 * An empty state wears the church's mark rather than a drawing of ours, and an
 * empty state can sit six components deep inside a client tree, so the shell
 * puts the signed URL here once instead of every screen threading it down.
 */
const ChurchMark = React.createContext<string | null>(null);

export function ChurchMarkProvider({
  logoUrl,
  children,
}: {
  logoUrl: string | null;
  children: React.ReactNode;
}) {
  return <ChurchMark.Provider value={logoUrl}>{children}</ChurchMark.Provider>;
}

export const useChurchMark = () => React.useContext(ChurchMark);
