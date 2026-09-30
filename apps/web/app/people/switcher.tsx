import Link from "next/link";
import { cn, Badge } from "@hearth/ui";

/**
 * Demo-only controls. They exist so the isolation and the permission boundary
 * can be seen rather than taken on trust.
 */
export function Switcher({
  churches,
  slug,
  role,
  roles,
  basePath,
}: {
  churches: { slug: string; name: string }[];
  slug: string;
  role: string;
  roles: readonly string[];
  basePath: string;
}) {
  const href = (next: { church?: string; role?: string }) =>
    `${basePath}?church=${next.church ?? slug}&role=${next.role ?? role}`;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-line-strong bg-sunken/50 p-4">
      <p className="text-caption text-fg-muted">
        <Badge tone="warning" className="mr-2">demo</Badge>
        Standing in for authentication. Switch church and the data changes completely. Switch role and
        the confidential note stops being readable.
      </p>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Group label="Church">
          {churches.map((c) => (
            <Pill key={c.slug} href={href({ church: c.slug })} active={c.slug === slug}>
              {c.name}
            </Pill>
          ))}
        </Group>
        <Group label="Role">
          {roles.map((r) => (
            <Pill key={r} href={href({ role: r })} active={r === role}>
              {r}
            </Pill>
          ))}
        </Group>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-label text-fg-muted">{label}</span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function Pill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-label transition-colors duration-instant",
        active
          ? "border-primary bg-primary text-primary-fg"
          : "border-line-strong bg-surface text-fg-muted hover:bg-sunken hover:text-fg",
      )}
    >
      {children}
    </Link>
  );
}
