import { Skeleton } from "@connectapp/ui";

/**
 * R24.6. The settings screen's own shape, while it is built.
 *
 * Settings keeps its own because its sections are drawn by its layout: the
 * tabs and the church's name stay put and only the panel under them is drawn
 * as it arrives. The one beside `(app)/layout.tsx` covers every other screen.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      <Skeleton className="h-7 w-44" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-px w-full" />
      <Skeleton className="h-[120px] w-full rounded-[14px]" />
      <Skeleton className="h-[120px] w-full rounded-[14px]" />
    </div>
  );
}
