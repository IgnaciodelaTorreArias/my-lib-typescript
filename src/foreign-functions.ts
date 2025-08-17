import { Buffer } from "node:buffer";
import * as e from "./generated/error.ts";

// Import native build packages for each supported platform

let ffi: typeof import("bun:ffi") 
const isDeno = typeof Deno !== "undefined" && typeof Deno.version !== "undefined";
const isBun = typeof Bun !== "undefined" && typeof Bun.version !== "undefined";
if (isBun){
    ffi = await import("bun:ffi");
}

if (!(isDeno || isBun)){
    throw new Error("Unsupported runtime")
}

const os = isDeno? Deno.build.os : process.platform;
const arch = isDeno? Deno.build.arch : process.arch;
const platforms = ['windows', 'win32', 'linux', 'darwin'];
const archs = ['x64', 'x86_64', 'arm64', 'aarch64']
if (!(os == 'windows' || os == 'win32' || os == 'linux' || os == 'darwin')) {
    throw new Error(`Unsupported platform: ${os}`);
}
if (!(arch == 'x64' || arch == 'x86_64' || arch == 'arm64' || arch == 'aarch64')) {
    throw new Error(`Unsupported architecture: ${arch}`);
}
let path: string = "";
if (os == 'windows' || os == 'win32'){
    if (arch == 'x64' || arch == 'x86_64'){
        const win32_x64 = await import("@lazy_engineer/my-lib-win32-x64");
        path = win32_x64.path
    }else{
        const win32_arm64 = await import("@lazy_engineer/my-lib-win32-arm64");
        path = win32_arm64.path
    }
}else if (os == 'linux'){
    if (arch == 'x64' || arch == 'x86_64'){
        const linux_x64 = await import("@lazy_engineer/my-lib-linux-x64");
        path = linux_x64.path
    }else{
        const linux_arm64 = await import("@lazy_engineer/my-lib-linux-arm64");
        path = linux_arm64.path
    }
}else{
    if (arch == 'x64' || arch == 'x86_64'){
        const darwin_x64 = await import("@lazy_engineer/my-lib-darwin-x64");
        path = darwin_x64.path
    }else{
        const darwin_arm64 = await import("@lazy_engineer/my-lib-darwin-arm64");
        path = darwin_arm64.path
    }
}

export const dylib = isDeno?
Deno.dlopen(
    path,
    {
        free_buffer: { parameters: ["u64", "u64"], result: "void" },
        rust_protos_greet: { parameters: ["buffer", "u64", "buffer", "buffer"], result: "u32" },
        create_new_person: { parameters: ["buffer", "buffer", "u64"], result: "u32" },
        person_greet: { parameters: ["u64", "buffer", "u64", "buffer", "buffer"], result: "u32" },
        free_person: { parameters: ["u64"], result: "void" },
    } as const
)
:
ffi.dlopen(
    path,
    {
        free_buffer: { args: ["u64", "u64"], returns: "void" },
        rust_protos_greet: { args: ["buffer", "u64", "buffer", "buffer"], returns: "u32" },
        create_new_person: { args: ["buffer", "buffer", "u64"], returns: "u32" },
        person_greet: { args: ["u64", "buffer", "u64", "buffer", "buffer"], returns: "u32" },
        free_person: { args: ["u64"], returns: "void" },
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
    const outBufArray = isDeno?
    Deno.UnsafePointerView.getArrayBuffer(
        Deno.UnsafePointer.create(outPtr[0]) as Deno.PointerObject, Number(outLen[0])
    )
    :
    ffi.toArrayBuffer(
        Number(outPtr[0]) as ffi.Pointer
    );
    const outBuf = new Uint8Array(Buffer.from(outBufArray, 0, Number(outLen[0])));
    dylib.symbols.free_buffer(outPtr[0] as bigint, outLen[0] as bigint);
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
    return instancePtr[0] as bigint;
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
    const outBufArray = isDeno?
    Deno.UnsafePointerView.getArrayBuffer(
        Deno.UnsafePointer.create(outPtr[0]) as Deno.PointerObject, Number(outLen[0])
    )
    :
    ffi.toArrayBuffer(
        Number(outPtr[0]) as ffi.Pointer
    );
    const outBuf = new Uint8Array(Buffer.from(outBufArray, 0, Number(outLen[0])));
    dylib.symbols.free_buffer(outPtr[0] as bigint, outLen[0] as bigint);
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

export function close(): void {
    if (isDeno){
        dylib.close()
    };
}