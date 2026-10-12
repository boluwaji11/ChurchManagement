import js from "@eslint/js";
import tseslint from "typescript-eslint";
import hooks from "eslint-plugin-react-hooks";
import next from "@next/eslint-plugin-next";

/*
 * The rules that catch a bug, and nothing that argues about style.
 *
 * Why this file exists: `pnpm lint` ran turbo's lint task in six packages and
 * executed nothing, because no package defined one and there was no config
 * here. So `react-hooks/rules-of-hooks` had never been checked, and the setup
 * dock called a hook after an early return for as long as it had existed. It
 * threw on every render it reached, and because it sits in the app shell a
 * brand-new church met "That screen did not load" on the Website editor.
 *
 * Formatting is not linted. Prettier is not wired in and a lint run that
 * reports indentation is a lint run people learn to ignore.
 */
export default tseslint.config(
  {
    ignores: [
      "**/.next/**",
      "**/dist/**",
      "**/out/**",
      "**/node_modules/**",
      "**/.turbo/**",
      "**/drizzle/**",
      "**/migrations/**",
      "packages/ui/tokens/**/*.css",
      /* Hearth Stage is its own repository, checked out inside this one and
         ignored by git. Its board, its CI and its lint are its own. */
      "Stage/**",
      /* The design pass's prototypes. They are drawings, not shipped code. */
      "docs/redesign/**",
      /* Written by Next on every build. */
      "**/next-env.d.ts",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    /*
     * TypeScript already refuses an undefined name, and it knows the DOM and
     * node globals this rule would have to be handed a list for. Left on, it
     * reported `console` 698 times and hid everything worth reading.
     */
    files: ["**/*.{ts,tsx,mts,cts}"],
    rules: { "no-undef": "off" },
  },

  {
    /* The handful of plain .js we ship is a service worker and some loaders,
       each with its own globals. A globals table per file earns nothing when
       every screen and every query is TypeScript. */
    files: ["**/*.{js,mjs,cjs}"],
    rules: { "no-undef": "off" },
  },

  {
    files: ["**/*.{ts,tsx,mts,mjs,js}"],
    plugins: { "react-hooks": hooks, "@next/next": next },
    rules: {
      /* The reason this config exists. A hook behind a condition or after an
         early return is a crash, not a preference, so it is an error. */
      ...hooks.configs.recommended.rules,
      "react-hooks/rules-of-hooks": "error",
      /* A missing dependency is usually a stale read rather than a crash, and
         there are three files already carrying a disable for it. */
      "react-hooks/exhaustive-deps": "warn",

      ...next.configs.recommended.rules,
      /* App Router. There is no pages directory for this rule to check. */
      "@next/next/no-html-link-for-pages": "off",

      /* Noise on a codebase that uses `any` deliberately at a few query
         boundaries and names unused parameters for documentation. */
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      /* `const {} = await searchParams` is how a route that takes no search
         parameter satisfies Next 15's await, and it is written that way in
         well over a hundred places. */
      "no-empty-pattern": "off",
      /* The CSV reader strips Excel's byte order mark by matching it, so the
         character is the point. Everywhere else an odd space is a mistake. */
      "no-irregular-whitespace": ["error", { skipRegExps: true }],
      /*
       * A warning, not an error, because the first run found 67 and about
       * forty-five of them are one thing: a `church` prop destructured and
       * never read, threaded through component after component. Taking it out
       * is a sweep across forty-five files and its own story, HRT-340. Left as
       * a warning the count stays visible and CI still goes green on what
       * actually breaks a screen.
       */
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
    },
  },

  {
    /* Scripts and tests run in node and say so. */
    files: ["**/scripts/**", "**/tests/**", "*.mjs", "*.config.*"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
);
