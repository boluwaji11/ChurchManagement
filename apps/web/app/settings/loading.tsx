import { Skeleton } from "@connectapp/ui";

/**
 * R24.6. The settings frame, while the screen inside it is built.
 *
 * Settings is the one part of the product whose shell is a layout, so a
 * loading state can sit inside it: the tabs and the church's name stay put
 * and only the panel is drawn as it arrives. Everywhere else the shell is
 * rendered by the screen itself, and a loading state would take the frame
 * away with it, which reads as the product blinking.
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
