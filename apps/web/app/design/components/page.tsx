"use client";

import * as React from "react";
import { Plus, Search, Printer, Check, MoreHorizontal, Download } from "lucide-react";
import {
  Button, IconButton, Input, Textarea, Field, Badge, Chip, Avatar, Card, CardTitle,
  CardDescription, Separator, Skeleton, Spinner, Progress, Checkbox, Switch, RadioGroup,
  RadioItem, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Combobox, Tooltip,
  Dialog, DialogTrigger, DialogContent, DialogClose, Tabs, TabsList, TabsTrigger,
  TabsContent, Banner, EmptyState, Table, Thead, Th, Tr, Td, HueTag, HUES,
} from "@hearth/ui";
import { check, email } from "@/lib/validate";
import { PageTitle, Section, Row } from "@/components/section";

function ValidationDemo() {
  const [error, setError] = React.useState<string | undefined>();
  const ref = React.useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      noValidate
      className="flex max-w-sm flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const value = String(new FormData(e.currentTarget).get("demo-email") ?? "");
        const message = check(value, email);
        setError(message);
        if (message) (ref.current?.elements.namedItem("demo-email") as HTMLElement | null)?.focus();
      }}
      onInput={() => {
        if (!error || !ref.current) return;
        setError(check(String(new FormData(ref.current).get("demo-email") ?? ""), email));
      }}
    >
      <Field label="Email" htmlFor="demo-email" error={error} hint="Try submitting it empty." required>
        <Input name="demo-email" type="email" placeholder="you@church.org" />
      </Field>
      <Button type="submit">Submit</Button>
    </form>
  );
}

const PEOPLE = [
  ["Sarah Bennett", "Member", "teal", "5 Oct", "Monthly"],
  ["Daniel Ramirez", "Regular", "violet", "5 Oct", "One-off"],
  ["Ruth Whitfield", "Member", "rose", "28 Sep", "Monthly"],
  ["Tyler Carter", "Visitor", "amber", "5 Oct", "None"],
];

export default function Components() {
  const [checked, setChecked] = React.useState(true);
  const [on, setOn] = React.useState(true);
  const [loading, setLoading] = React.useState(false);

  return (
    <>
      <PageTitle
        title="Components"
        lede="Every component in every state. Sizing comes from density, so nothing here has a size prop and nothing branches on which mode it is in."
      />

      <Section title="Buttons" note="One primary per view. If there are two, neither is primary.">
        <Row>
          <Button>Save household</Button>
          <Button variant="secondary">Cancel</Button>
          <Button variant="accent">Check in</Button>
          <Button variant="quiet">Add note</Button>
          <Button variant="ghost">Skip</Button>
          <Button variant="danger">Archive person</Button>
        </Row>
        <Row>
          <Button><Plus /> With an icon</Button>
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
          <Button
            variant="secondary"
            loading={loading}
            onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1400); }}
          >
            Click to load
          </Button>
        </Row>
        <Row>
          <Tooltip content="Print the room roster">
            <IconButton label="Print the room roster"><Printer /></IconButton>
          </Tooltip>
          <IconButton label="Search" variant="secondary"><Search /></IconButton>
          <IconButton label="More actions" variant="primary"><MoreHorizontal /></IconButton>
        </Row>
      </Section>

      <Section title="Form controls" note="The label is always a label. Placeholder text disappears exactly when it is needed.">
        <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
          <Field label="Preferred name" htmlFor="c-name" hint="What people actually call them.">
            <Input placeholder="Sarah" />
          </Field>
          <Field label="Phone" htmlFor="c-phone" error="That number needs an area code." required>
            <Input defaultValue="555 0148" />
          </Field>
          <Field label="Lifecycle status" htmlFor="c-status">
            <Select defaultValue="member">
              <SelectTrigger id="c-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="visitor">Visitor</SelectItem>
                <SelectItem value="regular">Regular attender</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Person" htmlFor="c-person">
            <ComboboxDemo />
          </Field>
          <Field label="Disabled" htmlFor="c-dis">
            <Input defaultValue="Locked" disabled />
          </Field>
          <Field label="Pastoral note" htmlFor="c-note" className="sm:col-span-2" hint="General notes are visible to staff. Confidential notes are a separate tier.">
            <Textarea placeholder="Visited on Tuesday. Recovering well." />
          </Field>
        </div>

        <Row>
          <label className="flex items-center gap-2.5 text-[length:var(--d-text-body)]">
            <Checkbox checked={checked} onCheckedChange={(v) => setChecked(Boolean(v))} />
            Include in the printed directory
          </label>
          <label className="flex items-center gap-2.5 text-[length:var(--d-text-body)]">
            <Checkbox checked="indeterminate" />
            Some children selected
          </label>
          <label className="flex items-center gap-2.5 text-[length:var(--d-text-body)]">
            <Checkbox disabled />
            Disabled
          </label>
        </Row>

        <Row>
          <label className="flex items-center gap-2.5 text-[length:var(--d-text-body)]">
            <Switch checked={on} onCheckedChange={setOn} />
            Send serving reminders
          </label>
          <label className="flex items-center gap-2.5 text-[length:var(--d-text-body)] opacity-60">
            <Switch disabled />
            Disabled
          </label>
        </Row>

        <fieldset className="max-w-sm">
          <legend className="mb-2 text-label text-fg">Statement delivery</legend>
          <RadioGroup defaultValue="email">
            <RadioItem value="email" id="r-email">Email, with a download link</RadioItem>
            <RadioItem value="print" id="r-print">Add to the print batch</RadioItem>
            <RadioItem value="both" id="r-both">Both</RadioItem>
          </RadioGroup>
        </fieldset>
      </Section>

      <Section
        title="Validation is ours, not the browser's"
        note="Submit this empty. No native bubble appears: the message renders in the field, the control is marked invalid for assistive technology, and focus moves to the problem."
      >
        <ValidationDemo />
      </Section>

      <Section title="Badges, chips, avatars" note="Avatars fall back to initials on a tinted chip, hue derived from the id, so a roster is colourful and people are recognisable before you read a name.">
        <Row>
          <Badge tone="success">Accepted</Badge>
          <Badge tone="warning">Check expires in 30 days</Badge>
          <Badge tone="danger">Declined</Badge>
          <Badge tone="critical">Allergy</Badge>
          <Badge tone="primary">Member</Badge>
          <Badge tone="accent">First visit</Badge>
        </Row>
        <Row>
          <Chip selected><Check /> Under fives</Chip>
          <Chip>Primary</Chip>
          <Chip>Youth</Chip>
          <Chip>Worship team</Chip>
        </Row>
        <Row>
          {["Sarah Bennett", "Daniel Ramirez", "Ruth Whitfield", "Tyler Carter", "Grace Nguyen"].map((n, i) => (
            <Avatar key={n} name={n} id={String(i)} size="lg" />
          ))}
        </Row>
        <Row>
          {HUES.slice(0, 6).map((h) => (
            <HueTag key={h} hue={h}>{h} room</HueTag>
          ))}
        </Row>
      </Section>

      <Section title="Banners" note="Errors persist near their cause. A toast that vanishes is not error reporting. Every tone carries its own icon, because colour is never the only signal.">
        <div className="flex max-w-2xl flex-col gap-3">
          <Banner tone="info" title="Three services this Sunday">Check-in stations are configured for all three.</Banner>
          <Banner tone="success" title="Statements sent">218 households, 4 bounced and are in the print batch.</Banner>
          <Banner tone="warning" title="Two background checks expire this month">Both volunteers serve in the under-fives room.</Banner>
          <Banner tone="danger" title="A batch will not close">The entered total is $40 under the declared total. Add a variance note or recount.</Banner>
        </div>
      </Section>

      <Section title="Cards, tabs, dialog">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardTitle>Under fives</CardTitle>
            <CardDescription>Room capacity 24. Four volunteers checked in.</CardDescription>
            <Separator className="my-4" />
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-[length:var(--d-text-body)]">
                <span className="text-fg-muted">Children present</span>
                <span data-numeric className="font-medium">18 of 24</span>
              </div>
              <Progress value={18} max={24} label="Room capacity" />
            </div>
          </Card>

          <Card>
            <Tabs defaultValue="plan">
              <TabsList>
                <TabsTrigger value="plan">Plan</TabsTrigger>
                <TabsTrigger value="team">Team</TabsTrigger>
                <TabsTrigger value="songs">Songs</TabsTrigger>
              </TabsList>
              <TabsContent value="plan">
                <ol className="flex flex-col gap-2 text-[length:var(--d-text-body)]">
                  {[["Welcome", "3 min"], ["Two songs", "11 min"], ["Baptism", "8 min"], ["Sermon", "32 min"]].map(([item, len]) => (
                    <li key={item} className="flex items-baseline justify-between gap-4 border-b border-line pb-1.5 last:border-0">
                      <span>{item}</span>
                      <span data-numeric className="text-caption text-fg-muted">{len}</span>
                    </li>
                  ))}
                </ol>
              </TabsContent>
              <TabsContent value="team"><p className="text-[length:var(--d-text-body)] text-fg-muted">Six accepted, one pending, one gap on sound.</p></TabsContent>
              <TabsContent value="songs"><p className="text-[length:var(--d-text-body)] text-fg-muted">Four songs, two in a new key from last time.</p></TabsContent>
            </Tabs>
          </Card>
        </div>

        <Row>
          <Dialog>
            <DialogTrigger asChild><Button variant="secondary">Open a dialog</Button></DialogTrigger>
            <DialogContent
              title="Archive Tyler Carter?"
              description="Archiving removes someone from lists and counts. Giving and attendance history is kept."
            >
              <Banner tone="info">Hearth archives rather than deletes. This is reversible.</Banner>
              <div className="mt-5 flex justify-end gap-2">
                <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
                <DialogClose asChild><Button variant="danger">Archive</Button></DialogClose>
              </div>
            </DialogContent>
          </Dialog>
          <Spinner />
          <Skeleton className="h-9 w-40" />
        </Row>
      </Section>

      <Section title="Table" note="Row height comes from density. Tabular figures so numbers line up and compare.">
        <Table>
          <Thead>
            <Tr>
              <Th>Person</Th><Th>Status</Th><Th>Room</Th><Th>Last attended</Th><Th>Giving</Th>
            </Tr>
          </Thead>
          <tbody>
            {PEOPLE.map(([name, status, hue, last, giving]) => (
              <Tr key={name as string}>
                <Td>
                  <span className="flex items-center gap-2.5">
                    <Avatar name={name as string} id={name as string} size="sm" />
                    {name}
                  </span>
                </Td>
                <Td><Badge tone={status === "Member" ? "primary" : status === "Visitor" ? "accent" : "neutral"}>{status}</Badge></Td>
                <Td><HueTag hue={hue as never}>{hue} room</HueTag></Td>
                <Td data-numeric className="text-fg-muted">{last}</Td>
                <Td className="text-fg-muted">{giving}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <Section title="Empty state" note="An illustration, not a grey icon and an apology. A church's first week should feel like an invitation.">
        <EmptyState
          title="No one here yet"
          body="Import your directory from a spreadsheet, or from Planning Center, Breeze, or ChurchTrac. It takes about ten minutes and you can undo all of it."
          action={<Row><Button><Download /> Import a directory</Button><Button variant="secondary">Add one person</Button></Row>}
        />
      </Section>
    </>
  );
}

/** A combobox holds its own answer, so the gallery needs somewhere to keep it. */
function ComboboxDemo() {
  const [value, setValue] = React.useState("");
  return (
    <Combobox
      id="c-person"
      aria-label="Person"
      options={[
        { value: "1", label: "Emma Bennett", keywords: "emma.bennett@example.org" },
        { value: "2", label: "Michael Bennett", keywords: "michael.bennett@example.org" },
        { value: "3", label: "Sophie Carter" },
        { value: "4", label: "Gregory Hall" },
        { value: "5", label: "Rachel Nguyen" },
      ]}
      value={value}
      onChange={setValue}
      placeholder="Search for someone"
      emptyLabel="No one by that name"
      clearLabel="Clear"
    />
  );
}
