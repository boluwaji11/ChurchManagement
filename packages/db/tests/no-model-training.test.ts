/**
 * HRT-122. No model training on church data (R21.12).
 *
 * A guard, not a unit test. The promise on the trust page is that there is
 * nothing in the product that could send a record to a model, and that is a
 * property of the code rather than of anybody's intentions. This makes it a
 * build failure instead of a review habit, the same way the owner connection
 * is kept out of request paths.
 *
 * It fails loudly and it is meant to. If a model genuinely belongs in Hearth
 * one day, that is a decision taken in the open, with the trust page and the
 * terms changed in the same commit as this list.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../..");

/** Packages whose whole purpose is to send text to a model. */
const MODEL_PACKAGES = [
  "openai", "@anthropic-ai/sdk", "@google/generative-ai", "@google-cloud/aiplatform",
  "cohere-ai", "replicate", "@huggingface/inference", "langchain", "@langchain/core",
  "llamaindex", "@mistralai/mistralai", "ai", "@ai-sdk/openai", "@ai-sdk/anthropic",
  "openai-edge", "gpt-3-encoder", "@azure/openai", "aws-sdk-bedrock",
  "@aws-sdk/client-bedrock-runtime",
];

/** Endpoints that are a model, whoever is calling them. */
const MODEL_HOSTS = [
  "api.openai.com",
  "api.anthropic.com",
  "generativelanguage.googleapis.com",
  "api.cohere.ai",
  "api.replicate.com",
  "api-inference.huggingface.co",
  "api.mistral.ai",
  "bedrock-runtime.",
];

function packageFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === "dist") continue;
    if (entry.startsWith(".")) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) packageFiles(path, out);
    else if (entry === "package.json") out.push(path);
  }
  return out;
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === "dist") continue;
    if (entry.startsWith(".")) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.(ts|tsx|js|mjs)$/.test(entry)) out.push(path);
  }
  return out;
}

describe("church data never reaches a model", () => {
  it("depends on nothing whose purpose is to call one", () => {
    const offenders: string[] = [];

    for (const file of packageFiles(root)) {
      const manifest = JSON.parse(readFileSync(file, "utf8")) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const named = [
        ...Object.keys(manifest.dependencies ?? {}),
        ...Object.keys(manifest.devDependencies ?? {}),
      ];
      for (const dependency of named) {
        if (MODEL_PACKAGES.includes(dependency)) {
          offenders.push(`${file.replace(root, ".")}: ${dependency}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("calls no model endpoint from anywhere in the source", () => {
    const offenders: string[] = [];
    const places = ["apps/web/app", "apps/web/lib", "apps/web/components", "packages"];

    for (const place of places) {
      for (const file of sourceFiles(join(root, place))) {
        // This file names the hosts in order to forbid them.
        if (file.endsWith("no-model-training.test.ts")) continue;

        const source = readFileSync(file, "utf8");
        for (const host of MODEL_HOSTS) {
          if (source.includes(host)) offenders.push(`${file.replace(root, ".")}: ${host}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("says so where a church can read it before signing up", () => {
    const page = join(root, "apps/web/app/trust/page.tsx");
    expect(existsSync(page), "the trust page exists").toBe(true);

    // The promise lives in the catalogue, so the page cannot drift from it.
    const catalogue = readFileSync(
      join(root, "packages/i18n/src/messages/en.ts"),
      "utf8",
    );
    expect(catalogue).toContain('"trust.training.title"');
    expect(catalogue).toContain('"trust.training.body"');
    expect(catalogue).toContain('"trust.who.title"');
  });
});
