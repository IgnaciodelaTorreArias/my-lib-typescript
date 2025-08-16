export  { greet } from "./greet.ts";
export { Person } from "./person.ts";

import { dylib } from "./foreign-functions.ts";

export function close(): void {
    dylib.close();
}