import { dylib, createNewArgs, methodArgsResult, ForeignInstance } from "./foreign-functions.ts";
import * as p from "./generated/person.ts";
import * as g from "./generated/greetings.ts";
import * as r from "./generated/response.ts";

export class Person extends ForeignInstance {
    constructor(name: string, age: number) {
        super(createNewArgs<p.PersonParams>(
            dylib.symbols.create_new_person,
            p.PersonParams.create({ name, age }),
            p.PersonParams
        ));
    }
    public greet(name: string): string {
        return methodArgsResult<g.Greetings, r.Response>(
            dylib.symbols.person_greet,
            this.instancePtr,
            g.Greetings.create({ name }),
            g.Greetings,
            r.Response
        ).text;
    }
    public dispose(): void {
        dylib.symbols.free_person(this.instancePtr);
    }
}