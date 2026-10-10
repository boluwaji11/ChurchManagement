/**
 * R24.6. What the pointer carries while something is being dragged.
 *
 * A card that holds a link is dragged by the link, and the browser's own
 * answer to that is a grey chip with the address in it: dragging a person on
 * the follow-up board showed `localhost:4488/members/bella-castro`. The thing
 * being moved should look like the thing on screen, so the card itself is
 * handed to the drag, held at the point it was picked up.
 */
export function dragShape(event: React.DragEvent<HTMLElement>): void {
  const el = event.currentTarget;
  const box = el.getBoundingClientRect();
  event.dataTransfer.setDragImage(el, event.clientX - box.left, event.clientY - box.top);
}

/** The same, for a card that has nothing of its own to put on the drag. */
export function dragShadow(event: React.DragEvent<HTMLElement>): void {
  event.dataTransfer.effectAllowed = "move";
  /* Some browsers start no drag at all with nothing on the clipboard, and a
     link would otherwise put its address there for anything watching. */
  event.dataTransfer.setData("text/plain", "");
  dragShape(event);
}
