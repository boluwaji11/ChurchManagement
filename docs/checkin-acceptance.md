# Check-in acceptance criteria (F8)

Written before any check-in code, because a defect here can cause physical harm to a child. Every
criterion below is a test, and a story is refused if its criteria are not met, whatever else works.

The design case is one moment: **09:58 on a Sunday, forty families queuing, the church wifi down, and
the volunteer running the station has done this twice before.** Every rule here serves that moment.

## The rules that cannot be traded away

1. **A child is never released without the code or a recorded override.** No exception, no setting.
2. **The station keeps working with no network.** Check-in, checkout, codes and labels.
3. **Allergies are on the screen at the moment of check-in**, before the label prints.
4. **A custody restriction blocks a pickup.** It is a stop, and a person has to decide to pass it.
5. **Nothing is decided silently.** Every override names who authorised it and why.

## R8.6, R8.11. The label pair and the code

- Checking in a child prints two labels, and the same code is on both.
- Two children in the same service occurrence never receive the same code, across every station,
  online or off.
- A code is not reused for 12 months.
- Codes are hard to guess by hand: they do not count up, and a code from one family says nothing
  about the next.
- The child label carries: child name, room, service, code, allergy flag, church name.
- The guardian label carries: child name, room, and the same code.
- A label that cannot print stops the check-in and says so. A child is never marked present with no
  label in a parent's hand.

## R8.7 to R8.9. Checkout

- Checkout asks for the code. A wrong code releases nobody.
- A person not on the child's authorised pickup list cannot collect, code or no code, without an
  override.
- A do-not-contact or custody restriction from R2.4 is shown as a blocking warning that has to be
  passed deliberately. It is never a line of text beside the name.
- Every override records: who authorised it, which child, which reason, and the time. Overrides are
  in the audit log and cannot be edited.
- Checking a child out twice is refused, and says who collected them and when.

## R8.10. Allergies and medical notes

- Shown full size on the check-in screen before the label prints, and printed on the child label.
- A child with no allergy recorded shows nothing. Silence means nothing recorded, so the screen
  never implies a child is clear when nobody has asked.
- Editing a medical note is audited.

## R8.14 to R8.17. Rooms and ratios

- A room suggestion comes from the child's date of birth, and is always overridable.
- At capacity the station warns. Above capacity it blocks, and only a supervisor passes it.
- A room below its configured volunteer ratio raises a visible warning.
- A room with fewer than two checked-in volunteers raises the two-adult-rule alert on the
  supervisor dashboard, and it stays raised until a second volunteer is checked in.

## R8.20 to R8.24. Offline

- Before the service, the station holds locally: the household roster, room configuration, and
  medical notes.
- With the network cut mid-queue, check-in and checkout continue, and labels print.
- Codes generated offline come from a range reserved for that station, so two stations offline at
  once cannot collide.
- Connection state is shown plainly at all times. The station never looks online when it is not.
- On reconnect, everything recorded offline is sent. Conflicts are shown to a person to resolve.
  Nothing is merged automatically.
- Label printing does not depend on the server.

## R8.13. Incident reports

- Date, child, room, volunteers present, description, action taken, and whether the guardian was
  told.
- Readable by Pastoral and Admin only, at the query layer.
- Never deleted, including by the DSAR path, which is the one exception to R21.7 and is recorded
  here so the decision is deliberate.

## What is out of scope for 0.2

Barcode and QR household cards (R8.27, 1.0). Everything else in R8 ships in 0.2 or check-in does
not ship.
