import { Skeleton } from "@connectapp/ui";

/** R16.9, R24.11. The inbox is two columns, so it waits as two columns. */
export default function Loading() {
  return (
    <div className="flex w-full flex-col gap-7" aria-busy>
      <Skeleton className="h-[38px] w-40" />

      <div className="flex min-h-[520px] gap-4">
        <Skeleton className="h-[520px] w-[320px] shrink-0 rounded-[14px]" />
        <Skeleton className="h-[520px] min-w-0 flex-1 rounded-[14px]" />
      </div>
    </div>
  );
}
