import type { ReactNode } from "react";

/** R14.1, R24.6. The list, and the window that stands over it. */
export default function EventsLayout({
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
