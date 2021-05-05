import express from "express";
import "express-async-errors";
import cors from "cors";
import { setup } from "discord-botkit";
import { APIResponse, APIError, ErrorResponse } from "./util/express";
import { DiscordIntegration } from "./util/discord-integration";
import { Feedback } from "./schema/Feedback";

setup({
    dotenv: true,
    plugins: [new DiscordIntegration]
}).then(async () => {
    const app = express();

    const OK = APIResponse.status(200).sender;

    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    app.use(cors());

    app.post("/api/v1/feedback", async (req, res) => {
        const { email, title, feedback } = Feedback.assert(req.body);

        await DiscordIntegration.shared.sendFeedback({ email, title, feedback });

        OK(res);
    });

    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (err instanceof APIError) {
            err.response.send(res);
        } else {
            ErrorResponse.status(500).message("Internal server error").send(res);
        }
    });

    app.use((req, res) => {
        ErrorResponse.status(404).message("Unknown route.").send(res);
    });

    app.listen(+process.env.BBA_PORT! || 9222, () => {
        console.log("alive")
    });
});