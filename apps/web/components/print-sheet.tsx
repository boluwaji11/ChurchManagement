import type { ReactNode } from "react";
import { AutoPrint } from "@/app/checkin/rooms/print/auto-print";

/**
 * R24.6, R2.14. One sheet of paper, the same on every screen that prints one.
 *
 * Seven of these were written separately and no two agreed: three page widths,
 * three paddings, a white ground on some and the screen's own colours on
 * others. A church that prints its directory and its giving statements in the
 * same week was handed two different documents from one product.
 *
 * The margin is zero because the browser prints its own date, title, address
 * and page number into the margin it keeps, and no church wants
 * "localhost:4488/members/print" across the foot of the thing it hands out.
 * The padding here puts the white space back where it belongs.
 *
 * Labels are not these. A label is geometry against a sheet of stock, checked
 * on the printer it comes out of, and it keeps its own page.
 */
export function PrintSheet({
  landscape = false,
  children,
}: {
  /** R18.2. A table wider than it is tall, which reads across the page. */
  landscape?: boolean;
  children: ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-white text-black">
      <AutoPrint />
      <style>{`@page { size: ${landscape ? "landscape" : "auto"}; margin: 0; }`}</style>
      {children}
    </main>
  );
}

/**
 * R24.6. One page of it.
 *
 * A document that prints a sheet per person, such as the giving statements,
 * repeats this and each one starts a new page. Everything else holds a single
 * one, where the break at the end falls away.
 */
export function PrintPage({
  wide = false,
  className,
  children,
}: {
  /** A landscape page has room for more across it. */
  wide?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={[
        "mx-auto px-10 py-9 print:max-w-none",
        wide ? "max-w-5xl" : "max-w-4xl",
        "break-after-page last:break-after-auto",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </section>
  );
}
