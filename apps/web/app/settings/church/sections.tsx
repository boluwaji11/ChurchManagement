"use client";

import * as React from "react";
import { t } from "@hearth/i18n";
import { FormActions } from "@/components/form-actions";
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
  heading,
}: {
  church: string;
  values: ChurchValues;
  campus: Campus | null;
  canEdit: boolean;
  logo: React.ReactNode;
  /** The page's title, so the buttons that commit this form can sit beside it. */
  heading: React.ReactNode;
}) {
  const [editing, setEditing] = React.useState(false);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        {heading}
        {editing ? (
          <FormActions
            form="church-form"
            label={t("church.save")}
            onCancel={() => setEditing(false)}
          />
        ) : null}
      </div>

      <ChurchForm
        values={values}
        canEdit={canEdit}
        logo={logo}
        editing={editing}
        onEditing={setEditing}
      />

      <Places church={church} campus={campus} canEdit={canEdit} editing={editing} />


    </>
  );
}
