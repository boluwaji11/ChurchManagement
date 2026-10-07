/**
 * R13.17. What a statement is written on.
 *
 * The church's own mark, its name and where it is, at the head of the sheet.
 * A statement is a letter from the church before it is a tax document, and a
 * giver who files it in January should be able to tell whose it is at a
 * glance.
 *
 * A plain image rather than a background: a browser printing a page leaves
 * backgrounds out unless the reader goes looking for the setting.
 */
export function Letterhead({
  name,
  address,
  logoUrl,
}: {
  name: string;
  address?: string;
  /** The church's mark, signed for an hour, where it has uploaded one. */
  logoUrl?: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className="size-12 shrink-0 rounded-[8px] object-contain"
        />
      ) : null}

      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="text-[17px] font-semibold text-black">{name}</div>
        {address ? <div className="text-[13px] text-neutral-500">{address}</div> : null}
      </div>
    </div>
  );
}
