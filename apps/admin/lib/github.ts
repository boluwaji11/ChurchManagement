import "server-only";

/**
 * HRT-395. What the repository says has been built and shipped.
 *
 * The repository is public and these are its public facts, so the calls are
 * unauthenticated. GitHub allows sixty of those an hour per address, which is
 * why everything here is held for five minutes: a screen refreshed a few times
 * while somebody reads it must not spend the allowance.
 *
 * A token is used where one is set, which raises the allowance to five
 * thousand. Nothing here needs one.
 */

const REPO = process.env["GITHUB_REPO"] ?? "boluwaji11/Church-Management";
const API = "https://api.github.com";
const HOLD_MS = 5 * 60 * 1000;
const BUDGET_MS = 6_000;

const held = new Map<string, { at: number; value: unknown }>();

async function get<T>(path: string): Promise<T | null> {
  const now = Date.now();
  const have = held.get(path);
  if (have && now - have.at < HOLD_MS) return have.value as T;

  const token = process.env["GITHUB_TOKEN"];
  try {
    const answer = await fetch(`${API}${path}`, {
      signal: AbortSignal.timeout(BUDGET_MS),
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!answer.ok) {
      /* A refusal is held too, briefly, so a rate limit is not hammered. */
      held.set(path, { at: now, value: null });
      return null;
    }
    const value = (await answer.json()) as T;
    held.set(path, { at: now, value });
    return value;
  } catch {
    held.set(path, { at: now, value: null });
    return null;
  }
}

export interface Commit {
  sha: string;
  message: string;
  author: string;
  at: Date;
  url: string;
}

const asCommit = (one: {
  sha: string;
  html_url: string;
  commit: { message: string; author: { name: string; date: string } };
}): Commit => ({
  sha: one.sha.slice(0, 8),
  /* The subject only. A body is four paragraphs and this is a list. */
  message: one.commit.message.split("\n")[0] ?? "",
  author: one.commit.author.name,
  at: new Date(one.commit.author.date),
  url: one.html_url,
});

export async function commits(branch = "main", limit = 10): Promise<Commit[]> {
  const rows = await get<Parameters<typeof asCommit>[0][]>(
    `/repos/${REPO}/commits?sha=${encodeURIComponent(branch)}&per_page=${limit}`,
  );
  return rows?.map(asCommit) ?? [];
}

export interface Ahead {
  /** How many commits main holds that production does not. */
  ahead: number;
  behind: number;
  commits: Commit[];
}

/**
 * HRT-395. What is written and not yet live.
 *
 * `production` is moved forward to whatever `main` is holding, so the gap
 * between them is exactly the list of things built and not shipped. It is the
 * number this platform is actually run on.
 */
export async function waitingToShip(): Promise<Ahead | null> {
  const answer = await get<{
    ahead_by: number;
    behind_by: number;
    commits: Parameters<typeof asCommit>[0][];
  }>(`/repos/${REPO}/compare/production...main`);
  if (!answer) return null;

  return {
    ahead: answer.ahead_by,
    behind: answer.behind_by,
    /* Newest first, which is the order everything else on the screen is in. */
    commits: answer.commits.map(asCommit).reverse().slice(0, 15),
  };
}

export interface Run {
  name: string;
  branch: string;
  /** "success", "failure", "cancelled", or null while it is still going. */
  conclusion: string | null;
  status: string;
  at: Date;
  url: string;
}

/** HRT-395. What the workflows last did. */
export async function runs(limit = 15): Promise<Run[]> {
  const answer = await get<{
    workflow_runs: {
      name: string;
      head_branch: string;
      conclusion: string | null;
      status: string;
      created_at: string;
      html_url: string;
    }[];
  }>(`/repos/${REPO}/actions/runs?per_page=${limit}`);

  return (
    answer?.workflow_runs.map((one) => ({
      name: one.name,
      branch: one.head_branch,
      conclusion: one.conclusion,
      status: one.status,
      at: new Date(one.created_at),
      url: one.html_url,
    })) ?? []
  );
}

/** Where to send somebody who wants the repository itself. */
export const repoUrl = (): string => `https://github.com/${REPO}`;
