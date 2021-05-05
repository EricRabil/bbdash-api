import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { setup } from "discord-botkit";
import { APIResponse, ErrorResponse } from "./util/express";
import { DiscordIntegration } from "./util/discord-integration";

dotenv.config();

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
        const { email, title, feedback } = req.body;

        await DiscordIntegration.shared.sendFeedback({ email, title, feedback });

        OK(res);
    });

    app.use((req, res) => {
        ErrorResponse.status(404).message("Unknown route.").send(res);
    });

    app.listen(+process.env.BBA_PORT! || 9222, () => {
        console.log("alive")
    });
});