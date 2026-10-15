import type { ReactNode } from "react";

/** R4.1, R24.6. The list, and the window that stands over it. */
export default function FormsLayout({
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
