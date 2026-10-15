import { Skeleton } from "@connectapp/ui";

/**
 * R24.11, R24.12. What stands in a screen's place while it is read.
 *
 * The frame is a layout now (HRT-360), so this sits inside it: the sidebar,
 * the church's name and the bell stay where they are and only the screen's own
 * column is drawn as it arrives. Before that, every screen returned the frame
 * itself, a loading state would have taken the frame with it, and the product
 * blinked between two screens rather than moving between them.
 *
 * It is also what Next needs before it will prefetch a dynamic route at all:
 * a prefetch covers the route down to the nearest loading boundary, and this
 * product had one, under settings.
 *
 * A screen whose shape is worth drawing gives its own `loading.tsx` beside its
 * page. This is the one for everything else: a name, and the blocks under it.
 */
export default function Loading() {
  return (
    <div className="flex w-full max-w-[1280px] flex-col gap-7" aria-busy>
      <Skeleton className="h-[38px] w-64" />
      <Skeleton className="h-[120px] w-full rounded-[14px]" />
      <Skeleton className="h-[320px] w-full rounded-[14px]" />
    </div>
  );
}
