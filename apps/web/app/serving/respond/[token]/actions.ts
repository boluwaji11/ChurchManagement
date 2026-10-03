"use server";

import { answerServingRequest, type ServingRequest } from "@hearth/db";
import { explain } from "@/lib/explain";

export interface AnswerResult {
  request?: ServingRequest;
  error?: string;
}

/**
 * R10.6. The answer, with no sign-in.
 *
 * The token is the whole credential, so nothing here reads a session. It names
 * one assignment, and the repository will not let it touch anything else.
 */
export async function answer(
  token: string,
  accept: boolean,
  reason: string | null,
): Promise<AnswerResult> {
  try {
    return { request: await answerServingRequest(token, { accept, reason }) };
  } catch (error) {
    return { error: explain(error) };
  }
}
