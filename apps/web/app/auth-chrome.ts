/**
 * R24.6. The shape a field and a button wear on the way in.
 *
 * Plain constants in a module of their own, because the forms that use them
 * are client components and the shell they used to live in reads the cookie
 * that decides the theme. A client importing that shell dragged `next/headers`
 * into the browser bundle and the build refused it.
 */
export const AUTH_INPUT = "min-h-[52px] rounded-xl text-[16px]";
export const AUTH_BUTTON = "min-h-[52px] rounded-xl text-[16px]";
