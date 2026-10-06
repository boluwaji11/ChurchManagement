/**
 * R24.6. How long ago, in the words a person uses.
 *
 * Rendered on the server from a fixed clock, so the markup the browser gets
 * matches what the server sent. An operator reading "4 minutes ago" wants the
 * shape of it rather than the second.
 */
export function Since({ at }: { at: Date | string | null }) {
  if (!at) return <>never</>;

  const when = typeof at === "string" ? new Date(at) : at;
  const seconds = Math.max(0, Math.round((Date.now() - when.getTime()) / 1000));

  const steps: [number, string][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.35, "week"],
    [12, "month"],
  ];

  let count = seconds;
  let unit = "second";
  for (const [size, name] of steps) {
    if (count < size) break;
    count = count / size;
    unit = name === "second" ? "minute"
      : name === "minute" ? "hour"
        : name === "hour" ? "day"
          : name === "day" ? "week"
            : name === "week" ? "month" : "year";
  }

  const whole = Math.floor(count);
  if (unit === "second" && whole < 30) return <>just now</>;
  return <>{whole} {unit}{whole === 1 ? "" : "s"} ago</>;
}

/** The date itself, for a column where the exact day is the point. */
export function On({ at }: { at: Date | string | null }) {
  if (!at) return <>—</>;
  const when = typeof at === "string" ? new Date(at) : at;
  return (
    <>
      {when.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
    </>
  );
}
