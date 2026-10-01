"use client";

import type { Roster } from "@hearth/db";
import type { OfflineEvent } from "@hearth/db";

/**
 * R8.20, R8.21. What the station is holding.
 *
 * IndexedDB rather than localStorage: the roster for a church of five hundred
 * is larger than localStorage is willing to be, and the event log has to
 * survive the tab being closed and the tablet being locked. Nothing here is
 * worth a dependency, so it is written against the browser API directly.
 *
 * Every read is wrapped, because a station in a private window, or one whose
 * storage was cleared, has to fall back to being an online-only station rather
 * than failing to load.
 */

const DB_NAME = "hearth-station";
const DB_VERSION = 1;
const KV = "kv";
const EVENTS = "events";

export interface StationSnapshot {
  /** Which station and which service this was pulled for. */
  stationId: string;
  occurrenceId: string;
  roster: Roster;
  rooms: SnapshotRoom[];
  services: SnapshotService[];
  /** R8.21. Codes this station may print with no network. */
  codes: string[];
  churchName: string;
  /** R8.7. Who was already in when the station last had a network. */
  visits: { personId: string; visitId: string; roomId: string | null; code: string | null }[];
}

export interface SnapshotRoom {
  id: string;
  name: string;
  hue: string;
  capacity: number | null;
  minAgeMonths: number | null;
  maxAgeMonths: number | null;
  position: number;
}

export interface SnapshotService {
  id: string;
  name: string;
  startsAt: string;
  readableTime: string;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(KV)) db.createObjectStore(KV);
      if (!db.objectStoreNames.contains(EVENTS)) {
        db.createObjectStore(EVENTS, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function run<T>(store: string, mode: IDBTransactionMode, work: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const request = work(tx.objectStore(store));
        request.onsuccess = () => resolve(request.result as T);
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
      }),
  );
}

export async function putSnapshot(snapshot: StationSnapshot): Promise<void> {
  try {
    await run(KV, "readwrite", (s) => s.put(snapshot, "snapshot"));
  } catch {
    // A station that cannot write is an online-only station, and it says so.
  }
}

export async function readSnapshot(): Promise<StationSnapshot | null> {
  try {
    return (await run<StationSnapshot | undefined>(KV, "readonly", (s) => s.get("snapshot"))) ?? null;
  } catch {
    return null;
  }
}

/** R8.21. Takes the next unused code, and does not hand it out again. */
export async function takeCode(): Promise<string | null> {
  const snapshot = await readSnapshot();
  if (!snapshot || snapshot.codes.length === 0) return null;
  const [code, ...rest] = snapshot.codes;
  await putSnapshot({ ...snapshot, codes: rest });
  return code ?? null;
}

export async function appendEvent(event: OfflineEvent): Promise<void> {
  await run(EVENTS, "readwrite", (s) => s.put(event));
}

export async function pendingEvents(): Promise<OfflineEvent[]> {
  try {
    const all = await run<OfflineEvent[]>(EVENTS, "readonly", (s) => s.getAll());
    return [...all].sort((a, b) => a.at.localeCompare(b.at));
  } catch {
    return [];
  }
}

export async function forgetEvents(ids: string[]): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(EVENTS, "readwrite");
    for (const id of ids) tx.objectStore(EVENTS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** Labels print from what the station holds, so a print survives the network. */
export async function keepLabels(labels: unknown[]): Promise<void> {
  try {
    await run(KV, "readwrite", (s) => s.put(labels, "labels"));
  } catch {
    // Nothing to do: the labels window falls back to asking the server.
  }
}

export async function readLabels<T>(): Promise<T[]> {
  try {
    return (await run<T[] | undefined>(KV, "readonly", (s) => s.get("labels"))) ?? [];
  } catch {
    return [];
  }
}
