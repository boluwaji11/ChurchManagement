import { returnToList } from "./return-to";

export function memberDirectoryReturnTo(value: unknown): string {
  return returnToList(value, "/members");
}
