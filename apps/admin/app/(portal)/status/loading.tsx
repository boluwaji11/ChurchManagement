import { Skeleton } from "@connectapp/ui";
import { Screen, Block } from "@/components/screen";
import { SHAPE } from "@/lib/probes";

/**
 * HRT-394. What the screen looks like while it is asking.
 *
 * This screen is deliberately not prefetched, because pressing it calls seven
 * other people's APIs. The cost of that is the press doing nothing visible
 * until every one of them has answered, which reads as a link that did not
 * work and gets pressed again. A route with no Suspense boundary has no
 * fallback to stream, so this is the boundary.
 */
export default function StatusLoading() {
  return (
    <Screen title="Status" lede="Every integration and every API, asked just now.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[104px] rounded-[16px]" />
        ))}
      </div>

      <Block title="Asking">
        <div className="flex flex-col gap-2">
          {SHAPE.map((one) => (
            <Skeleton key={one.service} className="h-[68px] rounded-[16px]" />
          ))}
        </div>
      </Block>
    </Screen>
  );
}
