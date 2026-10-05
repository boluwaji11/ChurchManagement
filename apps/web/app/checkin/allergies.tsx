"use client";

import { CriticalBanner, Button } from "@hearth/ui";
import { t } from "@hearth/i18n";
import type { FoundPerson } from "./actions";

/**
 * R8.10, R24.14. Allergies and medical notes, at the moment of check-in.
 *
 * Full width, above the button that finishes the flow, and the flow does not
 * finish until somebody has said they read it. A volunteer completing a
 * check-in for a child with a recorded peanut allergy without having seen it is
 * the failure this exists to stop.
 *
 * A child with nothing recorded shows nothing at all. Silence here means nobody
 * has written anything down, and a screen that said "no allergies" would be
 * claiming something the church has never actually been told.
 */
export function warnings(members: FoundPerson[]): string[] {
  const out: string[] = [];
  for (const person of members) {
    if (person.allergies) out.push(`${person.name}: ${person.allergies}`);
    if (person.medicalNote) out.push(`${person.name}: ${person.medicalNote}`);
  }
  return out;
}

export function Allergies({
  members,
  seen,
  onSeen,
}: {
  members: FoundPerson[];
  seen: boolean;
  onSeen: () => void;
}) {
  const items = warnings(members);
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <CriticalBanner heading={t("checkin.allergies")} items={items} />
      {seen ? null : (
        <div>
          <Button variant="secondary" onClick={onSeen}>{t("checkin.read")}</Button>
        </div>
      )}
    </div>
  );
}
