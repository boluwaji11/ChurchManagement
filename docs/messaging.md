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

**The mark in the bar.** Messages sit beside the bell on the platform and
beside the account in the portal, because a message is the same kind of thing
as a notification: something waiting, read where it is noticed. Pressing it
opens the whole inbox in a panel: Inbox, Sent, Drafts, and the way to write a
new one.

**The screen.** `/messages` and `/home/messages` are the same three pieces with
room: conversations down the left, the one being read beside them.

**The conversation itself** is a list of blocks, each with who wrote it, when,
and the words. That is the shape every mail client and support inbox settled
on, because it stays legible when a line runs to five sentences and it does not
lean on colour to say who is speaking. Two columns of coloured bubbles is a
phone chat, and this is a church writing to somebody about a hall booking.

## Addresses

A conversation is addressed by who it is with: `/messages/jane-smith`, or
`office` from the member's side. A row id never appears in a link.

## Keeping current

The panel asks the server what the inbox says every few seconds while it is
open, and on every return to the window, so a reply lands on the other side
without anybody reloading. Realtime is not in this version and a church of 50
to 500 does not need it.

## A group's own thread

R9.7. A group and a team each have one, named on the conversation rather than
copied into a roster. Who is in it is whoever is in the group at the moment
they open it, so a leader who adds somebody on Tuesday has added them to the
conversation too, and somebody who leaves stops seeing it.

A read mark is still per person, written the first time that person reads it,
so a group of thirty does not carry thirty rows nobody has used.

Its address is the group's own: `/messages/group/tuesday-night`.

## What this is not, in this build

No attachments, no read receipts beyond the unread mark, no typing indicator,
and no message to several people who are not already a group. Each of those is
a line on the board rather than a thing left out quietly.
