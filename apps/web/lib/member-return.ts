export function memberDirectoryReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/members";
  }

  const origin = "https://connectapp.local";
  try {
    const destination = new URL(value, origin);
    if (destination.origin !== origin || destination.pathname !== "/members") {
      return "/members";
    }
    return `${destination.pathname}${destination.search}`;
  } catch {
    return "/members";
  }
}
