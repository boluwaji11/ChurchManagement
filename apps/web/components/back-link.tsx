"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * R24.6. The way back to the page this one was opened from.
 *
 * A link rather than a button, so it opens in a new tab, shows its address on
 * hover and works before the JavaScript lands. The press is then taken over and
 * answered with the browser's own history, because the page somebody came from
 * is a fact and a rebuilt address is a guess: a group reached from the home
 * screen and a group reached from a list are the same page with two different
 * ways back.
 *
 * The href stays the fallback, and it is what a reader gets when they opened
 * this page directly, refreshed it, or followed a link into it from elsewhere.
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  const mine = React.useRef(false);

  React.useEffect(() => {
    /*
     * Whether the entry behind this one is ours. Next writes its own key into
     * history state on every client navigation, so a page that was reached
     * through the app has one and a page somebody landed on cold does not.
     */
    mine.current =
      window.history.length > 1
      && Boolean((window.history.state as { key?: string } | null)?.key)
      && (document.referrer === "" || document.referrer.startsWith(window.location.origin));
  }, []);

  return (
    <Link
      href={href}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        if (!mine.current) return;
        e.preventDefault();
        router.back();
      }}
      className="inline-flex items-center gap-1.5 font-medium text-primary"
    >
      <ArrowLeft className="size-4" aria-hidden /> {label}
    </Link>
  );
}
