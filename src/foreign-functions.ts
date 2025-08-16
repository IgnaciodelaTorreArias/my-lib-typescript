import { fileURLToPath } from "node:url";
import * as e from "./generated/error.ts";

const libNames: Record<string, [string, string]> = {
    windows: ["my-lib-win32", "my_rust_protos.dll"],
    linux: ["my-lib-linux", "libmy_rust_protos.so"],
    darwin: ["my-lib-darwin", "libmy_rust_protos.dylib"],
};
if (!(Deno.build.os in libNames)) {
    throw new Error(`Unsupported platform: ${Deno.build.os}`);
}
let [packageName, libName] = libNames[Deno.build.os];
packageName += {
    x86_64: "-x64",
    aarch64: "-arm64",
}[Deno.build.arch];

export const dylib = Deno.dlopen(
    fileURLToPath(import.meta.resolve(`@lazy_engineer/${packageName}/${libName}`)),
    {
        free_buffer: { parameters: ["usize", "usize"], result: "void" },
        rust_protos_greet: { parameters: ["buffer", "usize", "buffer", "buffer"], result: "u32" },
        create_new_person: { parameters: ["buffer", "buffer", "usize"], result: "u32" },
        person_greet: { parameters: ["u64", "buffer", "usize", "buffer", "buffer"], result: "u32" },
        free_person: { parameters: ["u64"], result: "void" },
    } as const
);

class InvalidProtocolBuffer extends Error { }
class InvalidArguments extends Error { }
class EmptyParams extends Error { }

function throwErrors(status: number, buf: Uint8Array): void {
    if (status === 0) {
        return;
    }
    let details = "";
    if (status > 0) {
        details = e.Error.decode(buf).details;
    }
    switch (e.callStatusFromJSON(status)) {
        case e.CallStatus.DECODE_ERROR:
            throw new InvalidProtocolBuffer();
        case e.CallStatus.INVALID_ARGUMENTS_DETAILS:
            throw new InvalidArguments(details);
        case e.CallStatus.INVALID_ARGUMENTS:
            throw new InvalidArguments();
        case e.CallStatus.UNKNOWN_ENUM_VALUE:
            throw new RangeError("Unknown enum value");
        case e.CallStatus.EMPTY_PARAMS:
            throw new EmptyParams("A required field is not present");
    }
    if (status > 0)
        throw new Error(`Unknown error occurred, code: ${status}, details: ${details}`);
    else
        throw new Error(`Unknown error occurred, code: ${status}`);
}

type FuncArgsResultCallback = (ptr: Uint8Array, len: bigint, outPtr: BigUint64Array, outLen: BigUint64Array) => number;
export function funcArgsResult<I,R>(
    func: FuncArgsResultCallback,
    input: I,
    inputParser: e.MessageFns<I>,
    resultParser: e.MessageFns<R>
): R {
    const buf = inputParser.encode(input).finish();
    const outPtr = new BigUint64Array(1);
    const outLen = new BigUint64Array(1);
    const status = func(buf, BigInt(buf.length), outPtr, outLen);
    const outBuf = new Uint8Array(Number(outLen[0]));
    Deno.UnsafePointerView.copyInto(
        Deno.UnsafePointer.create(outPtr[0]) as Deno.PointerObject,
        outBuf
    );
    dylib.symbols.free_buffer(outPtr[0], outLen[0]);
    throwErrors(status, outBuf);
    return resultParser.decode(outBuf);
}

type CreateNewArgsCallback = (instancePtr: BigUint64Array, ptr: Uint8Array, len: bigint) => number;
export function createNewArgs<I>(
    func: CreateNewArgsCallback,
    input: I,
    inputParser: e.MessageFns<I>
): bigint {
    const buf = inputParser.encode(input).finish();
    const instancePtr = new BigUint64Array(1);
    func(instancePtr, buf, BigInt(buf.length));
    return instancePtr[0];
}

type MethodArgsResultCallback = (instancePtr: bigint, ptr: Uint8Array, len: bigint, outPtr: BigUint64Array, outLen: BigUint64Array) => number;
export function methodArgsResult<I, R>(
    func: MethodArgsResultCallback,
    instancePtr: bigint,
    input: I,
    inputParser: e.MessageFns<I>,
    resultParser: e.MessageFns<R>
): R {
    const buf = inputParser.encode(input).finish();
    const outPtr = new BigUint64Array(1);
    const outLen = new BigUint64Array(1);
    const status = func(instancePtr, buf, BigInt(buf.length), outPtr, outLen);
    const outBuf = new Uint8Array(Number(outLen[0]));
    Deno.UnsafePointerView.copyInto(
        Deno.UnsafePointer.create(outPtr[0]) as Deno.PointerObject,
        outBuf
    );
    dylib.symbols.free_buffer(outPtr[0], outLen[0]);
    throwErrors(status, outBuf);
    return resultParser.decode(outBuf);
}

export abstract class ForeignInstance {
    protected instancePtr: bigint;
    constructor(instancePtr: bigint) {
        this.instancePtr = instancePtr;
    }
    public abstract dispose(): void;
}