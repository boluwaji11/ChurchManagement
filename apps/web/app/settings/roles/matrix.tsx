"use client";

import { Check } from "lucide-react";
import { t } from "@hearth/i18n";

/**
 * R1.6. The permission matrix, every permission against every role.
 *
 * The grid is the honest shape of the thing: a role is the row of ticks beside
 * its name and nothing else, so reading across one tells an administrator
 * exactly what they are handing somebody.
 *
 * Read-only in this pass. The matrix moved out of the code and became the one
 * source every check reads; making it per-church data a church can edit is the
 * next step.
 */
export function Matrix({
  roles,
  permissions,
  held,
}: {
  roles: string[];
  permissions: string[];
  /** Role to the permissions it holds. */
  held: Record<string, string[]>;
}) {
  return (
    <section className="overflow-x-auto rounded-[14px] border border-line bg-surface">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-line">
            <th className="sticky left-0 bg-surface px-5 py-3 text-[12px] font-medium text-fg-subtle">
              {t("roles.permission")}
            </th>
            {roles.map((role) => (
              <th
                key={role}
                className="px-2 py-3 text-center text-[12px] font-medium text-fg-subtle"
              >
                {/* Upright, because nine role names across a table is a column
                    width problem every product solves by turning the words. */}
                <span className="block [writing-mode:vertical-rl] [text-orientation:mixed] whitespace-nowrap rotate-180">
                  {t(`role.${role}` as never)}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {permissions.map((permission) => (
            <tr key={permission} className="border-b border-sunken last:border-0">
              <td className="sticky left-0 bg-surface px-5 py-2.5 text-[length:var(--d-text-body)] text-fg">
                {t(`permission.${permission}` as never)}
              </td>

              {roles.map((role) => {
                const yes = held[role]?.includes(permission) ?? false;
                return (
                  <td key={role} className="px-2 py-2.5 text-center">
                    {yes ? (
                      <Check className="mx-auto size-4 text-primary" aria-label={t("common.yes")} />
                    ) : (
                      <span className="text-fg-subtle" aria-label={t("common.no")}>
                        &middot;
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
