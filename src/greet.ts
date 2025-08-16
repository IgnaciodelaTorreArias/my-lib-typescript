import { dylib, funcArgsResult } from "./foreign-functions.ts";

import * as g from "./generated/greetings.ts";
import * as r from "./generated/response.ts";

export function greet(name: string): string {
    return funcArgsResult<g.Greetings, r.Response>(
        dylib.symbols.rust_protos_greet,
        g.Greetings.create({ name }),
        g.Greetings,
        r.Response
    ).text;
}