"use client";

import * as React from "react";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import {
  ConnectComponentsProvider, ConnectPayouts, ConnectPayments,
} from "@stripe/react-connect-js";
import { Banner, Skeleton } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { accountSession } from "./session";

/**
 * R24.5. Our own palette, in the few words Stripe's appearance takes.
 *
 * The values are the tokens, written out: Stripe reads hex rather than the
 * custom properties, and the panels sit inside our cards, so a white panel in
 * a dark product is the one place the embed stops looking like the page it is
 * on.
 */
const paint = (dark: boolean) => (dark
  ? {
      colorPrimary: "#8986cf",
      colorText: "#f4f4fb",
      colorBackground: "#29283b",
      colorSecondaryText: "#b9b8cb",
      colorBorder: "#3b3a50",
      colorDanger: "#ed756e",
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
      borderRadius: "12px",
    }
  : {
      colorPrimary: "#5a4fa3",
      colorText: "#1c1b22",
      colorBackground: "#ffffff",
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
      borderRadius: "12px",
    });

/**
 * R13.1. The church's own Stripe, read inside ConnectApp.
 *
 * Stripe draws these against a session this server asked for, with every
 * acting feature switched off. The money and the risk stay where they are:
 * what changes is that a treasurer sees the balance and the payouts without
 * leaving the product.
 */
export function EmbeddedPayouts({
  church,
  publishableKey,
}: {
  church: string;
  /** The platform's own publishable key. It identifies, it does not authorise. */
  publishableKey: string;
}) {
  const [error, setError] = React.useState<string>();
  const [connect, setConnect] =
    React.useState<ReturnType<typeof loadConnectAndInitialize> | null>(null);
  /*
   * R24.5. Stripe draws these panels, so they take our palette through the
   * appearance it accepts rather than through our stylesheet. Dark is read
   * the way the rest of the product reads it: the attribute the person's own
   * choice sets, and the system setting where they have not chosen.
   */
  const [dark, setDark] = React.useState(false);

  React.useEffect(() => {
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    const read = () => {
      const chosen = document.documentElement.dataset.theme;
      setDark(chosen === "dark" || (chosen !== "light" && system.matches));
    };

    read();
    system.addEventListener("change", read);
    /* A theme switched in the product changes the attribute rather than the
       system setting, so the attribute is watched as well. */
    const watch = new MutationObserver(read);
    watch.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => {
      system.removeEventListener("change", read);
      watch.disconnect();
    };
  }, []);

  /*
   * Stripe asks for the session the moment it is initialised, and that ask is
   * a server action, so initialising during the render queues a router update
   * while React is still rendering. It happens after mount instead.
   */
  React.useEffect(() => {
    if (!publishableKey) return;

    setConnect(
      loadConnectAndInitialize({
        publishableKey,
        fetchClientSecret: async () => {
          const answer = await accountSession(church);
          if (answer.error || !answer.secret) {
            setError(t("stripe.failed"));
            throw new Error(answer.error ?? "no session");
          }
          return answer.secret;
        },
        appearance: { variables: paint(dark) },
      }),
    );
    // The palette is handed to a live instance below rather than rebuilding it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [church, publishableKey]);

  /* R24.5. A theme changed while the page is open is handed to Stripe, which
     redraws its panels rather than needing the page reloaded. */
  React.useEffect(() => {
    connect?.update({ appearance: { variables: paint(dark) } });
  }, [connect, dark]);

  if (!publishableKey) {
    return <Banner tone="info" title={t("stripe.title")}>{t("stripe.unconfigured")}</Banner>;
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? <Banner tone="danger" title={t("stripe.title")}>{error}</Banner> : null}

      {connect === null ? (
        <>
          <Skeleton className="h-[220px] rounded-[14px]" />
          <Skeleton className="h-[320px] rounded-[14px]" />
        </>
      ) : (
      <ConnectComponentsProvider connectInstance={connect}>
        <section className="rounded-[14px] border border-line bg-surface p-5">
          <ConnectPayouts />
        </section>
        <section className="rounded-[14px] border border-line bg-surface p-5">
          <ConnectPayments />
        </section>
      </ConnectComponentsProvider>
      )}
    </div>
  );
}
