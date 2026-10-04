"use client";

import * as React from "react";
import { Button } from "@hearth/ui";
import { t } from "@hearth/i18n";
import type { Campus } from "@hearth/db";
import { ChurchForm, type ChurchValues } from "../church-form";
import { Places } from "./places";

/**
 * R1.1. The church profile, which reads until somebody asks to change it.
 *
 * One pencil, on Details, puts every section on this page into editing at once.
 * A church correcting its address is usually correcting its campus name in the
 * same minute, and two pencils on one screen is two decisions about the same
 * thing.
 */
export function ChurchSections({
  church,
  values,
  campus,
  canEdit,
  logo,
}: {
  church: string;
  values: ChurchValues;
  campus: Campus | null;
  canEdit: boolean;
  logo: React.ReactNode;
}) {
  const [editing, setEditing] = React.useState(false);

  return (
    <>
      <ChurchForm
        values={values}
        canEdit={canEdit}
        logo={logo}
        editing={editing}
        onEditing={setEditing}
      />

      <Places church={church} campus={campus} canEdit={canEdit} editing={editing} />

      {editing ? (
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
            {t("action.cancel")}
          </Button>
          <Button type="submit" form="church-form">{t("church.save")}</Button>
        </div>
      ) : null}
    </>
  );
}
