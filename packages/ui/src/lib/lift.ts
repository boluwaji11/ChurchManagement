/**
 * R24.6, R24.13. What a tile does under the pointer.
 *
 * A card that opens something answers the pointer by rising, with its shadow
 * deepening under it. Darkening its border was the other way of saying the same
 * thing, and it drew a hard line around every card on a screen full of them.
 *
 * Reduced motion keeps the shadow and drops the rise, because the shadow alone
 * still says the thing is pressable.
 */
export const LIFT =
  "transition-[transform,box-shadow] duration-fast ease-out "
  + "hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0";
