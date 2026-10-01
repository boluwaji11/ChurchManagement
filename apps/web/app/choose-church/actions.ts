"use server";

import { redirect } from "next/navigation";
import { churchForJoinCode, normaliseJoinCode } from "@hearth/db";
import { t } from "@hearth/i18n";

/** R1.7. A typed code goes to the same screen the church's link goes to. */
export async function goToCode(data: FormData): Promise<{ error?: string } | void> {
  const code = normaliseJoinCode(String(data.get("code") ?? ""));
  if (!code) return { error: t("join.error.code") };
  if (!(await churchForJoinCode(code))) return { error: t("join.error.code") };
  redirect(`/join/${code}`);
}
