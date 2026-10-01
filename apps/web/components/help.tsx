"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { CircleHelp, Search } from "lucide-react";
import {
  Button, Dialog, DialogTrigger, DialogContent, Input, Separator,
} from "@hearth/ui";
import { t } from "@hearth/i18n";

/**
 * R22.2. Help, where somebody is rather than where we filed it.
 *
 * Opening it shows the screen you are on first, and everything else under it.
 * It is behind a button because a product that explains itself on the page is a
 * product that shouts at the ninety-nine people who already knew.
 *
 * The articles are in the catalogue like every other string, so they are
 * translated with the rest of the product rather than forgotten in a wiki.
 */
const ARTICLES = [
  { key: "people", match: ["/people", "/duplicates"] },
  { key: "import", match: ["/import"] },
  { key: "services", match: ["/services"] },
  { key: "checkin", match: ["/checkin"] },
  { key: "rooms", match: ["/checkin/rooms"] },
  { key: "incidents", match: ["/incidents"] },
  { key: "groups", match: ["/groups"] },
  { key: "followups", match: ["/followups"] },
  { key: "setup", match: ["/setup"] },
  { key: "settings", match: ["/settings"] },
] as const;

const title = (key: string) => t(`help.${key}.title` as never);
const body = (key: string) => t(`help.${key}.body` as never);

export function Help() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  // The longest matching prefix wins, so /checkin/rooms is the class screen
  // rather than the station.
  const here = [...ARTICLES]
    .filter((article) => article.match.some((path) => pathname.startsWith(path)))
    .sort(
      (a, b) =>
        Math.max(...b.match.map((p) => p.length)) - Math.max(...a.match.map((p) => p.length)),
    )[0];

  const text = query.trim().toLowerCase();
  const found = ARTICLES.filter(
    (article) =>
      text === "" ||
      title(article.key).toLowerCase().includes(text) ||
      body(article.key).toLowerCase().includes(text),
  );
  const rest = found.filter((article) => article.key !== here?.key);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" aria-label={t("help.open")}>
          <CircleHelp />
        </Button>
      </DialogTrigger>
      <DialogContent title={t("help.title")} closeLabel={t("common.close")} className="max-w-xl">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 rounded-[var(--d-radius-control)] border border-line-strong bg-surface px-3 shadow-sm transition-colors has-[input:focus-visible]:border-fg has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-[var(--ring)]">
            <Search className="size-5 shrink-0 text-fg-muted" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t("help.search")}
              autoComplete="off"
              className="border-0 bg-transparent shadow-none outline-none focus-visible:outline-none"
            />
          </div>

          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
            {here && text === "" ? (
              <section className="flex flex-col gap-1">
                <span className="text-label text-fg-muted">{t("help.thisScreen")}</span>
                <h3 className="text-heading text-fg">{title(here.key)}</h3>
                <p className="text-[length:var(--d-text-body)] text-fg">{body(here.key)}</p>
              </section>
            ) : null}

            {found.length === 0 ? (
              <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("help.none")}</p>
            ) : null}

            {rest.length > 0 ? (
              <section className="flex flex-col gap-3">
                {text === "" && here ? (
                  <>
                    <Separator />
                    <span className="text-label text-fg-muted">{t("help.everything")}</span>
                  </>
                ) : null}

                {rest.map((article) => (
                  <div key={article.key} className="flex flex-col gap-1">
                    <h3 className="text-heading text-fg">{title(article.key)}</h3>
                    <p className="text-[length:var(--d-text-body)] text-fg">{body(article.key)}</p>
                  </div>
                ))}
              </section>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
