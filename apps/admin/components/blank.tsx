/**
 * Nothing recorded, drawn the way the product draws it everywhere else.
 *
 * A short rule rather than a dash. It reads as an empty slot instead of as a
 * value somebody typed, and it keeps the em dash out of a codebase that does
 * not use one.
 */
export function Blank() {
  return <span aria-hidden className="inline-block h-px w-3 bg-line-strong align-middle" />;
}
