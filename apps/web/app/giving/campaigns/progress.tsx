/**
 * R13.16. How far along a campaign is, as one bar.
 *
 * The bar stops at the target. A campaign that has passed it says so in the
 * figures above it rather than by drawing a bar wider than its own track.
 */
export function Progress({ received, target }: { received: number; target: number }) {
  const share = target > 0 ? Math.min(1, received / target) : 0;

  return (
    <span
      aria-hidden
      className="block h-2 w-full overflow-hidden rounded-full bg-sunken"
    >
      <span
        className="block h-full rounded-full bg-primary"
        style={{ width: `${Math.round(share * 100)}%` }}
      />
    </span>
  );
}
