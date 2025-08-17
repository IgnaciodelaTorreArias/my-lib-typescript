import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __dirname = dirname(fileURLToPath(import.meta.url));
export const path = join(__dirname, "libmy_rust_protos.dylib");