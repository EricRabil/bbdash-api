import express from "express";
import "express-async-errors";
import cors from "cors";
import { setup } from "discord-botkit";
import { APIResponse, APIError, ErrorResponse } from "./util/express";
import { DiscordIntegration } from "./util/discord-integration";
import { Feedback } from "./schema/Feedback";
import rateLimit from "express-rate-limit";
import makeDebug from "debug";

const MAX_REQUESTS_PER_MINUTE = +process.env.MAX_REQUESTS_PER_MINUTE! || 1;
const APP_PORT = +process.env.BBA_PORT! || 9222;

const debug = makeDebug("bbdash-api");

debug("Setting up Discord");

setup({
    dotenv: true,
    plugins: [new DiscordIntegration]
}).then(async () => {
    debug("Setting up API");

    const app = express();

    const OK = APIResponse.status(200).sender;
    const SLOW_DOWN = ErrorResponse.status(429).message("Too many requests, please try again later.").sender;

    app.enable("trust proxy");

    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    app.use(cors());

    app.post("/api/v1/feedback", rateLimit({
        windowMs: 1 * 60 * 1000,
        max: MAX_REQUESTS_PER_MINUTE,
        handler: (_, res) => SLOW_DOWN(res),
        keyGenerator: (req) => req.headers['cf-connecting-ip']?.[0] || req.ip
    }), async (req, res) => {
        const { email, title, feedback } = Feedback.assert(req.body);

        await DiscordIntegration.shared.sendFeedback({ email, title, feedback });

        OK(res);
    });

    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (err instanceof APIError) {
            err.response.send(res);
        } else {
            ErrorResponse.status(500).message("Internal server error").send(res);
            console.error(err);
        }
    });

    app.use((req, res) => {
        ErrorResponse.status(404).message("Unknown route.").send(res);
    });

    app.listen(APP_PORT, () => {
        debug(`Listening on port ${APP_PORT}`)
    });
});