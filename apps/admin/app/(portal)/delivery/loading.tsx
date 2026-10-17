import { Skeleton } from "@connectapp/ui";
import { Screen, Block } from "@/components/screen";

/**
 * HRT-395. The same reason as the status screen: this one goes out to GitHub
 * before it can draw anything, and a press that shows nothing for two seconds
 * reads as a press that missed.
 */
export default function DeliveryLoading() {
  return (
    <Screen title="Delivery" lede="What is built, what is live, and what the board says.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[104px] rounded-[16px]" />
        ))}
      </div>

      <Block title="Reading the repository">
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[56px] rounded-[16px]" />
          ))}
        </div>
      </Block>
    </Screen>
  );
}
