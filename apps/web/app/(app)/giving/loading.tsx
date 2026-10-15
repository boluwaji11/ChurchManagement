import { Skeleton } from "@connectapp/ui";

/** R13.21, R24.11. The two totals and the gifts under them, while they are read. */
export default function Loading() {
  return (
    <div className="flex w-full flex-col gap-7" aria-busy>
      <Skeleton className="h-[38px] w-48" />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {[0, 1, 2, 3].map((one) => (
          <Skeleton key={one} className="h-[104px] rounded-[14px]" />
        ))}
      </div>

      <Skeleton className="h-[420px] w-full rounded-[14px]" />
    </div>
  );
}
