import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * R24.6. The way back to the list this record belongs to.
 *
 * A plain link to that list rather than the browser's history. Answering with
 * history sent somebody who had arrived from a service plan back to the service
 * plan, which reads as the press having done nothing: the word beside the arrow
 * names a screen, and it has to be the screen it opens.
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      /* R24.6. The row of text is 20px tall, which is not a target. The
         padding raises the hit box to 32px and the negative margin takes it
         back out of the layout, so nothing on the screen moves. */
      className="-my-1.5 inline-flex items-center gap-1.5 py-1.5 font-medium text-primary"
    >
      <ArrowLeft className="size-4" aria-hidden /> {label}
    </Link>
  );
}
