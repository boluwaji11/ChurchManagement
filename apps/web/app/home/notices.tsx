"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Megaphone, X } from "lucide-react";
import { Banner, IconButton } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Block } from "./timeline";
import { Confirm } from "@/components/confirm";
import { putNoticeAway } from "./notice-actions";

export interface Notice {
  id: string;
  title: string;
  body: string;
  hue: string;
}

/**
 * R16.11. What the church has told everybody.
 *
 * On the same thread as everything else on this screen, and each one can be
 * put away by the member reading it. Theirs alone: the notice stays on the
 * board and on everybody else's feed.
 */
export function Notices({ church, notices }: { church: string; notices: Notice[] }) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [working, start] = React.useTransition();

  if (notices.length === 0) return null;

  return (
    <Block icon={<Megaphone />} title={t("announce.title")}>
      {error ? (
        <div className="px-5 pt-4">
          <Banner tone="danger" title={t("announce.failed")}>{error}</Banner>
        </div>
      ) : null}

      <ol className="m-0 flex list-none flex-col p-0" aria-busy={working}>
        {notices.map((one, at) => {
          const last = at === notices.length - 1;

          return (
            <li key={one.id} className="flex min-w-0 flex-col">
              <span className="flex gap-3.5 px-5">
                {/* The thread, in two pieces, so the line crosses the gap
                    between one notice and the next. */}
                <span
                  aria-hidden
                  className="flex w-9 shrink-0 flex-col items-center self-stretch"
                >
                  <span className={`h-4 w-px ${at === 0 ? "" : "bg-line"}`} />
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-[10px] [&_svg]:size-[18px]"
                    style={{
                      background: `var(--hue-${one.hue}-tint)`,
                      color: `var(--hue-${one.hue}-key)`,
                    }}
                  >
                    <Megaphone />
                  </span>
                  <span className={`w-px flex-1 ${last ? "" : "bg-line"}`} />
                </span>

                <span className="flex min-w-0 flex-1 flex-col gap-1 py-4 leading-5">
                  <span className="font-semibold text-fg">{one.title}</span>
                  <span className="whitespace-pre-wrap text-[length:var(--d-text-body)] text-fg-muted">
                    {one.body}
                  </span>
                </span>

                {/* R24.x. Taking it off their own screen asks first, the same
                    as every other x in the product. */}
                <Confirm
                  title={t("announce.putAwayTitle", { title: one.title })}
                  confirmLabel={t("announce.putAway")}
                  disabled={working}
                  onConfirm={() => new Promise<void>((done) => {
                    start(async () => {
                      const back = await putNoticeAway(one.id, church);
                      setError(back.error);
                      router.refresh();
                      done();
                    });
                  })}
                  trigger={
                    <IconButton
                      label={t("announce.putAway")}
                      variant="ghost"
                      disabled={working}
                      className="mt-3 shrink-0"
                    >
                      <X />
                    </IconButton>
                  }
                />
              </span>
            </li>
          );
        })}
      </ol>
    </Block>
  );
}
