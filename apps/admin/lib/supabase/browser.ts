"use client";
import { createBrowserClient } from "@supabase/ssr";

/** Used only for sign-in and sign-out. Never for reading church data. */
export const supabaseBrowser = () =>
  createBrowserClient(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]!,
  );
