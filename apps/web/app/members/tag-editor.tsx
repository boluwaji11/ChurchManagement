"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Plus, X } from "lucide-react";
import { Button, Input, Banner, HueTag, HueDot, cn, type Hue } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { togglePersonTag, addTagToPerson } from "../tags/actions";

export interface TagOption {
  id: string;
  name: string;
  hue: string;
}

/**
 * Tagging by toggle rather than by combobox.
 *
 * A church has tens of tags, not thousands, and a volunteer under time pressure
 * reads faster than they type. Every tag is visible and one press away, with a
 * filter for when the list outgrows a glance. A combobox would hide the answer
 * behind knowing what to search for.
 */
export function TagEditor({
  church,
  memberId,
  all,
  assigned,
  canEdit,
}: {
  church: string;
  memberId: string;
  all: TagOption[];
  assigned: string[];
  canEdit: boolean;
}) {
  const [on, setOn] = React.useState<string[]>(assigned);
  const [filter, setFilter] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();
  const [options, setOptions] = React.useState(all);

  const byId = React.useMemo(() => new Map(options.map((t) => [t.id, t])), [options]);

  if (!canEdit) {
    return (
      <div className="flex flex-wrap gap-2">
        {on.length === 0 ? <span className="text-[length:var(--d-text-body)] text-fg-muted">{t("common.none")}</span> : null}
        {on.map((id) => {
          const tag = byId.get(id);
          return tag ? <HueTag key={id} hue={tag.hue as Hue}>{tag.name}</HueTag> : null;
        })}
      </div>
    );
  }

  const toggle = (tagId: string) => {
    const next = on.includes(tagId);
    setOn((prev) => (next ? prev.filter((t) => t !== tagId) : [...prev, tagId]));
    setError(undefined);

    const data = new FormData();
    data.set("church", church);
    data.set("memberId", memberId);
    data.set("tagId", tagId);
    data.set("on", next ? "0" : "1");

    startTransition(async () => {
      const result = await togglePersonTag(data);
      if (result.error) {
        // Put the chip back. Showing it applied when it is not is worse than a slow press.
        setOn((prev) => (next ? [...prev, tagId] : prev.filter((t) => t !== tagId)));
        setError(result.error);
      }
    });
  };

  const create = async (data: FormData) => {
    setError(undefined);
    data.set("church", church);
    data.set("memberId", memberId);
    const name = String(data.get("name") ?? "").trim();
    const result = await addTagToPerson(data);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.id) {
      setOptions((prev) => [...prev, { id: result.id!, name, hue: "teal" }].sort((a, b) => a.name.localeCompare(b.name)));
      setOn((prev) => [...prev, result.id!]);
      setCreating(false);
    }
  };

  const shown = filter
    ? options.filter((t) => t.name.toLowerCase().includes(filter.toLowerCase()))
    : options;

  return (
    <div className="flex flex-col gap-3">
      {error ? <Banner tone="danger" title={t("tags.failed")}>{error}</Banner> : null}

      <div className="flex flex-wrap gap-1.5" aria-busy={pending}>
        {shown.map((tag) => {
          const selected = on.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              aria-pressed={selected}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-label",
                "transition-colors duration-instant ease-out",
                selected
                  ? "border-transparent"
                  : "border-line-strong bg-surface text-fg-muted hover:bg-sunken hover:text-fg",
              )}
              style={
                selected
                  ? {
                      background: `var(--hue-${tag.hue}-tint)`,
                      color: `var(--hue-${tag.hue}-key)`,
                      borderColor: `var(--hue-${tag.hue}-500)`,
                    }
                  : undefined
              }
            >
              <HueDot hue={tag.hue as Hue} />
              {tag.name}
              {selected ? <X className="size-3.5" aria-hidden /> : null}
            </button>
          );
        })}

        {options.length > 0 && shown.length === 0 ? (
          <span className="text-[length:var(--d-text-body)] text-fg-muted">{t("tags.noMatch")}</span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {options.length > 8 ? (
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t("tags.filter")}
            aria-label={t("tags.filter")}
            className="max-w-48"
          />
        ) : null}

        {creating ? (
          <form noValidate action={create} className="flex items-center gap-2">
            <Input name="name" autoFocus autoComplete="off" placeholder={t("tags.new")} aria-label={t("tags.new")} className="max-w-48" />
            <CreateActions onCancel={() => setCreating(false)} />
          </form>
        ) : (
          <Button type="button" variant="ghost" onClick={() => setCreating(true)}>
            <Plus /> {t("tags.new")}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * R24.6. The two controls on the new tag form.
 *
 * Rendered inside the form, because that is where `useFormStatus` can see the
 * submit it belongs to.
 */
function CreateActions({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();

  return (
    <>
      <Button type="submit" variant="secondary" loading={pending}>
        {t("action.add")}
      </Button>
      <Button type="button" variant="ghost" disabled={pending} onClick={onCancel}>
        {t("action.cancel")}
      </Button>
    </>
  );
}
