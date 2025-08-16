export { greet } from "./greet.ts";
export { Person } from "./person.ts";
export { close } from "./foreign-functions.ts"

// Import native build packages for each supported platform
import * as _darwin_arm64 from "@lazy_engineer/my-lib-darwin-arm64";
import * as _darwin_x64 from "@lazy_engineer/my-lib-darwin-x64";
import * as _linux_arm64 from "@lazy_engineer/my-lib-linux-arm64";
import * as _linux_x64 from "@lazy_engineer/my-lib-linux-x64";
import * as _win32_arm64 from "@lazy_engineer/my-lib-win32-arm64";
import * as _win32_x64 from "@lazy_engineer/my-lib-win32-x64";

import { greet } from "./greet.ts";
import { Person } from "./person.ts";

console.log(greet("Mike"));
const p = new Person("Alice", 30);
console.log(p.greet("Mike"));