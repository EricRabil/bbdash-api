import { IsEmail, MaxLength, MinLength } from "class-validator";
import { FeedbackData } from "../util/types";
import { Validatable } from "../util/validation";

export class Feedback extends Validatable<FeedbackData> {
    @IsEmail()
    email: string;

    @MaxLength(256)
    @MinLength(1)
    title: string;

    @MaxLength(65536)
    @MinLength(1)
    feedback: string;

    static assert(data: any): FeedbackData {
        return new Feedback(data, ["email", "title", "feedback"]).asserted;
    }
}