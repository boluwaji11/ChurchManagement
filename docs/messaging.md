# In-app messages

R16.9, R17.1. The part of communication a church can run with no provider,
no credentials and nothing resold: a message written here and read here.

## Why this and not email

F16 is deferred because email, SMTP and SMS all mean holding somebody's
credentials and paying for delivery. A message that never leaves the product
costs nothing to deliver, so it is the one kind this platform can give a church
outright. It is also the one a church asks for first: a member replies to a
serving request, a group leader asks the office a question, the office answers
a prayer request without putting a phone number in a group chat.

It is deliberately not a chat app. A church of 50 to 500 is not going to run
its life here, and a product that tries becomes a worse WhatsApp. What it has
to do is carry a short exchange between a member and the office, keep it
against the member's record, and make sure neither side has to remember where
it was.

## What a thread is

One thread between the church office and one member. The office is not a
person: whoever is on staff this month answers, and the thread stays with the
church rather than with whoever happened to reply. A member who writes in
August and again in March is writing into the same thread.

Groups and teams come later, on the same tables, by giving a conversation a
group rather than a member. Nothing in the first build may make that harder.

## The tables

**`conversations`** carries the church, the member it is with, when it was last
written to, and two read marks: one for the member and one for the office.
Archived rather than deleted, like everything else a church made.

**`messages`** carries the conversation, which side wrote it, who wrote it, the
words as markdown, and when. A message is never edited after it is sent and
never hard deleted.

Two read marks rather than a row per reader, because one side of this is "the
office", which is a role rather than a person. A church where a question
disappeared off the unread list because a volunteer opened it by accident on a
phone is a church that stops using it.

## Unread

For the member: messages from the church since their read mark.
For the office: messages from members since the office read mark.

The bell carries one line per thread with something unread, pointing at that
thread, under the rule already in force: one unread line per thing, rather than
one per message.

## The screens

**The portal.** A Messages tab. The list is threads, newest first, with the
church's mark, the last line, and when. Opening one is the thread itself: the
church's words on the left against the canvas, the member's on the right in the
church's own hue, down a vertical rail with the date breaking it up the way the
portal's timeline already does. The box to write in is pinned at the bottom.

**The platform.** `/messages`, the same thread list with the member's photo and
name, their unread count, and the thread beside it on a wide screen. A staff
member answering ten of these in a sitting should never leave the screen.

## What this is not, in the first build

No attachments, no read receipts beyond the unread mark, no typing indicator,
no group threads, no message to several members at once. Each of those is a
line on the board rather than a thing left out quietly.

## The order it is built in

1. The tables, the repo and its tests.
2. The portal inbox: list, thread, write.
3. The platform inbox: list, thread, reply.
4. The bell line, and the portal's own unread badge.
5. Group and team threads, on the same tables.
