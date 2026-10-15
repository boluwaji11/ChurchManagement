import { Skeleton } from "@connectapp/ui";

/** R2.1, R24.11. The directory's own shape, while the church is read. */
export default function Loading() {
  return (
    <div className="flex w-full max-w-[1280px] flex-col gap-7" aria-busy>
      <Skeleton className="h-[38px] w-56" />

      {/* The toolbar: what narrows the list, and the press that adds to it. */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-[280px]" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="ml-auto h-9 w-32" />
      </div>

      <Skeleton className="h-[520px] w-full rounded-[14px]" />
    </div>
  );
}
