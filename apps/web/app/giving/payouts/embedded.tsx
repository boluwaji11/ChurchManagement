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
        appearance: {
          variables: {
            colorPrimary: "#5a4fa3",
            colorText: "#1c1b22",
            colorBackground: "#ffffff",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            borderRadius: "12px",
          },
        },
      }),
    );
  }, [church, publishableKey]);

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
