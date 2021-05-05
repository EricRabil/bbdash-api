import { validate, validateSync, ValidationError } from "class-validator";
import { ErrorResponse } from "./express";

export abstract class Validatable<Schema extends object> {
    constructor(props: Schema, keys: (keyof Schema)[]) {
        Object.assign(this, Object.fromEntries(Object.entries(props).filter(([ key ]) => keys.includes(key as keyof Schema))));
    }

    validate(): Promise<ValidationError[]> {
        return validate(this);
    }

    get asserted(): this {
        const errors = validateSync(this);

        if (errors.length > 0) {
            throw ErrorResponse.status(400).message("Invalid Feedback").extra({
                errors: errors.flatMap(({ property, constraints }) => Object.values(constraints || {}).map(error => ({ field: property, error })))
            }).error;
        }

        return this;
    }

    get isValid(): boolean {
        return validateSync(this).length === 0;
    }
}