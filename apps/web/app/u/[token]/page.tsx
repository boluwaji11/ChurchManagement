import { withdrawByToken } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { publicTab } from "@/lib/page-metadata";
import { supabaseServer } from "@/lib/supabase/server";
import { WayBack } from "./way-out";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata() {
  return publicTab(t("wayOut.title"));
}

/**
 * HRT-143, R16.8. The way out of a church's mailing.
 *
 * No session and no question. Somebody who followed this link has already
 * decided, and a screen that asks them to sign in first, or to confirm that
 * they really meant it, is a screen that gets the church reported as spam
 * instead. The way back is offered afterwards, which costs them one press if
 * they meant it and saves the church a member if they did not.
 *
 * The token is the whole of the authorisation, which is why it is twenty-four
 * random bytes rather than a member id: this address is forwarded, pasted into
 * group chats and crawled, and a guessable one would let anybody take anybody
 * off a church's list.
 */
export default async function WayOutPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const gone = await withdrawByToken(token);

  /* R17.1. The church's own mark, so this reads as theirs rather than ours. */
  let logoUrl: string | null = null;
  if (gone?.logoKey) {
    const supabase = await supabaseServer();
    const signed = await supabase.storage.from("church").createSignedUrl(gone.logoKey, 3600);
    logoUrl = signed.data?.signedUrl ?? null;
  }

  return (
    <main className="site-wash flex min-h-dvh items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-[460px] flex-col gap-5 rounded-[20px] border border-line bg-surface p-8">
        {gone ? (
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="size-10 shrink-0 rounded-[10px] object-contain"
              />
            ) : null}
            <span className="min-w-0 truncate font-display text-[17px] text-fg">
              {gone.churchName}
            </span>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <h1 className="m-0 font-display text-[24px] leading-8 text-fg">
            {gone ? t("wayOut.title") : t("wayOut.gone")}
          </h1>
          {gone ? (
            <p className="m-0 text-fg-muted">
              {gone.address
                ? t("wayOut.body", { address: gone.address, church: gone.churchName })
                : t("wayOut.bodyPlain", { church: gone.churchName })}
            </p>
          ) : null}
        </div>

        {gone ? <WayBack token={token} church={gone.churchName} /> : null}
      </div>
    </main>
  );
}
