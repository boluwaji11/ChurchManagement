"use client";

import * as React from "react";
import { find, type FoundMatch } from "./actions";

/**
 * R8.3. The station's search, as fast as a lobby makes it.
 *
 * Three things keep it quick. Keystrokes settle for a moment so a five letter
 * name is one lookup rather than five. A reply that arrives after a newer one
 * was asked for is dropped, so a slow answer to "mi" cannot land on top of the
 * answer to "mia". And an answer already seen is shown at once while the fresh
 * one is fetched behind it, which is what makes a backspace instant.
 */
const SETTLE_MS = 120;

export function useFind(
  query: string,
  service: string,
  church: string,
  /** R8.20. What the station holds, for when the server cannot be reached. */
  offline?: { ready: boolean; online: boolean; search: (query: string) => FoundMatch[] },
) {
  const [matches, setMatches] = React.useState<FoundMatch[]>([]);
  const [error, setError] = React.useState<string>();
  const [searching, setSearching] = React.useState(false);
  const ticket = React.useRef(0);
  const seen = React.useRef(new Map<string, FoundMatch[]>());

  const run = React.useCallback(
    async (text: string) => {
      const key = `${service}:${text.trim().toLowerCase()}`;
      const known = seen.current.get(key);
      if (known) setMatches(known);

      const mine = ++ticket.current;
      setSearching(true);

      // A station that knows it has no network does not wait for a request to
      // time out with a queue in front of it.
      if (offline?.ready && !offline.online) {
        setSearching(false);
        setError(undefined);
        setMatches(offline.search(text));
        return;
      }

      let result;
      try {
        result = await find(text, service, church);
      } catch {
        if (mine !== ticket.current) return;
        setSearching(false);
        if (offline?.ready) {
          setError(undefined);
          setMatches(offline.search(text));
          return;
        }
        setError(undefined);
        return;
      }
      if (mine !== ticket.current) return;

      setSearching(false);
      setError(result.error);
      if (result.error) return;
      const found = result.matches ?? [];
      seen.current.set(key, found);
      setMatches(found);
    },
    [service, church, offline],
  );

  React.useEffect(() => {
    if (query.trim().length < 2) {
      ticket.current++;
      setMatches([]);
      return;
    }
    const timer = setTimeout(() => void run(query), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [query, run]);

  /** After a check-in, because who is already in has just changed. */
  const again = React.useCallback(() => {
    seen.current.clear();
    if (query.trim().length < 2) return Promise.resolve();
    return run(query);
  }, [query, run]);

  return { matches, error, searching, again };
}
