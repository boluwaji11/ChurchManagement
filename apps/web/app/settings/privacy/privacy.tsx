"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Banner, Button, Card, CardTitle, Checkbox, Separator } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { savePrivacy } from "./actions";

export interface PrivacyValues {
  listed: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showAddress: boolean;
  showBirthday: boolean;
  showPhoto: boolean;
  showChildren: boolean;
}

const FIELDS = [
  ["showEmail", "privacy.email"],
  ["showPhone", "privacy.phone"],
  ["showAddress", "privacy.address"],
  ["showBirthday", "privacy.birthday"],
  ["showPhoto", "privacy.photo"],
] as const;

/**
 * R3.2, R3.3. What the church may print about me.
 *
 * Everything starts off. A church that imported this person's phone number has
 * not been given permission to publish it, and this is where that permission is
 * given, one field at a time.
 *
 * Its one reader is the printed directory (R3.5). There is no directory of the
 * congregation inside the product: a member looking the church up is not
 * something this product does.
 */
export function Privacy({
  church,
  values,
  isHead,
}: {
  church: string;
  values: PrivacyValues;
  isHead: boolean;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [listed, setListed] = React.useState(values.listed);
  const [pending, startTransition] = React.useTransition();

  return (
    <Card>
      <CardTitle>{t("privacy.title")}</CardTitle>
      <Separator className="my-4" />

      {error ? <Banner tone="danger" title={t("privacy.failed")} className="mb-4">{error}</Banner> : null}

      <form
        noValidate
        action={(data) => {
          data.set("church", church);
          startTransition(async () => {
            const result = await savePrivacy(data);
            setError(result.error);
            if (!result.error) router.refresh();
          });
        }}
        className="flex flex-col gap-4"
      >
        <label className="flex cursor-pointer items-center gap-3">
          <Checkbox
            name="listed"
            checked={listed}
            onCheckedChange={(on) => setListed(on === true)}
          />
          <span className="text-[length:var(--d-text-body)] text-fg">{t("privacy.listed")}</span>
        </label>

        <Separator />

        <div className={listed ? "flex flex-col gap-3" : "flex flex-col gap-3 opacity-50"}>
          {FIELDS.map(([name, label]) => (
            <label key={name} className="flex cursor-pointer items-center gap-3">
              <Checkbox name={name} defaultChecked={values[name]} disabled={!listed} />
              <span className="text-[length:var(--d-text-body)] text-fg">
                {t(label as never)}
              </span>
            </label>
          ))}

          {isHead ? (
            <label className="flex cursor-pointer items-center gap-3">
              <Checkbox name="showChildren" defaultChecked={values.showChildren} disabled={!listed} />
              <span className="text-[length:var(--d-text-body)] text-fg">
                {t("privacy.children")}
              </span>
            </label>
          ) : null}
        </div>

        <div>
          <Button type="submit" disabled={pending}>{t("action.save")}</Button>
        </div>
      </form>
    </Card>
  );
}
