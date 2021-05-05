import { Response } from "express";

export interface IResponseProperties {
    status: number;
    json: object;
}

export interface ErrorResponseBody {
    code: number;
    message?: string;
}

export type ResponseBody<T, Error = false> = Error extends true ? {
    success: false;
    error: ErrorResponseBody;
} : ({
    success: true;
} & T);

export interface BaseResponseProps {
    status: number;
}

export interface NormalResponseProps extends BaseResponseProps {
    json: object;
}

export abstract class BaseResponse<T extends BaseResponseProps = BaseResponseProps> {
    props: T;

    protected constructor(props: T) {
        Object.assign(this.props || (this.props = {} as unknown as T), props);
    }

    edited(props: Partial<T>): this {
        return new (this.constructor as unknown as any)(Object.assign(this.props, props));
    }
    
    status(status: number) {
        return this.edited({ status } as Partial<T>);
    }

    abstract resolvedJSON(): ResponseBody<any, true | false>;

    send(eRes: Response) {
        eRes.status(this.props.status).json(this.resolvedJSON());
    }

    static sender<ResponseImpl extends BaseResponse>(res: ResponseImpl) {
        return (eRes: Response) => res.send(eRes)
    }

    get [Symbol.toStringTag](): string {
        return JSON.stringify(this.resolvedJSON());
    }

    get sender(): (res: Response) => void {
        return BaseResponse.sender(this);
    }
}

export class APIResponse extends BaseResponse<NormalResponseProps> {
    static status(status: number) {
        return new this({ status, json: {} });
    }

    static json(json: object) {
        return new this({ status: 200, json });
    }

    json(json: object) {
        return this.edited({ json });
    }

    resolvedJSON() {
        return {
            success: true,
            ...this.props.json
        }
    }
}

export interface ErrorResponseProps extends BaseResponseProps {
    message?: string;
    extra?: object;
}

export class ErrorResponse extends BaseResponse<ErrorResponseProps> {
    static status(status: number) {
        return new this({ status });
    }

    static message(message?: string) {
        return new this({ status: 500, message });
    }

    static extra(extra?: object) {
        return new this({ status: 500, extra });
    }

    message(message?: string) {
        return this.edited({ message });
    }

    extra(extra?: object) {
        return this.edited({ extra });
    }

    resolvedJSON(): ResponseBody<null, true> {
        return {
            success: false,
            error: {
                code: this.props.status,
                message: this.props.message,
                ...(this.props.extra || {})
            }
        }
    }

    get error(): APIError {
        return new APIError(this);
    }
}

export class APIError extends Error {
    constructor(public response: ErrorResponse) {
        super();
        this.name = "APIError";
    }
}