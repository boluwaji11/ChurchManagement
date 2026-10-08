import { NextResponse } from "next/server";
import { t } from "@connectapp/i18n";
import { PermissionError, type PermissionAction, type TenantRole } from "@connectapp/db";

/**
 * R1.5. How an address refuses, in one place.
 *
 * A route handler answers a browser that asked for a file rather than a
 * screen, so it answers in the only language that path speaks: a status and
 * a sentence. Eight of these used to answer 403 with an empty body, which
 * downloads a zero-byte file and tells nobody anything.
 */
export function refused(role: TenantRole, action: PermissionAction): NextResponse {
  return NextResponse.json(
    { error: new PermissionError(role, action).message },
    { status: 403 },
  );
}

/** The same, where the reason is not a permission. */
export function denied(message?: string): NextResponse {
  return NextResponse.json({ error: message ?? t("forbidden.body") }, { status: 403 });
}

/** R1.5. Asked for, and not here. */
export function missing(): NextResponse {
  return NextResponse.json({ error: t("missing.title") }, { status: 404 });
}
