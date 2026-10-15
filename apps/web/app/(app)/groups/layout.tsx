import type { ReactNode } from "react";

/**
 * R9.5, R24.6. The list, and the window that stands over it.
 */
export default function GroupsLayout({
  children,
  panel,
}: {
  children: ReactNode;
  panel: ReactNode;
}) {
  return (
    <>
      {children}
      {panel}
    </>
  );
}
