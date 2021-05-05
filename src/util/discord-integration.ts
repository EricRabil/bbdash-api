import { DPlugin, BaseDPlugin, DPluginLoaded, embed, field, title, footer, DEvent } from "discord-botkit";
import { FeedbackData } from "./types";
import { v4 as uuid } from "uuid";
import { MessageReaction, TextChannel } from "discord.js";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

const APPROVE_EMOJI = "✅";
const REJECT_EMOJI = "💢";

const makeEmbed = ({ email, title: feedbackTitle, feedback }: FeedbackData) => embed(
    title("Feedback Received!"),
    field("Title", feedbackTitle, true),
    field("E-Mail", email, true),
    field("Feedback", feedback),
    footer(`React with ${APPROVE_EMOJI} to approve, and ${REJECT_EMOJI} to reject`)
)

const feedbackKey = (id: string) => `feedback-${id}`
const feedbackEmailKey = (id: string) => `feedback-email-${id}`
const feedbackMessageJoinKey = (id: string) => `feedback-message-join-${id}`

@DPlugin("com.ericrabil.bbdash-api")
export class DiscordIntegration extends BaseDPlugin {
    static shared: DiscordIntegration;

    octokit: Octokit;

    @DPluginLoaded
    async pluginLoaded() {
        DiscordIntegration.shared = this;

        this.octokit = new Octokit({
            authStrategy: createAppAuth,
            auth: {
                appId: process.env.GITHUB_APP_ID,
                privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
                installationId: +process.env.GITHUB_INSTALLATION_ID!
            }
        });
    }

    @DEvent("messageReactionAdd")
    async onReactionAdd(reaction: MessageReaction) {
        if (![APPROVE_EMOJI, REJECT_EMOJI].includes(reaction.emoji.name)) return;
        if (reaction.me) return;

        const { feedback, id } = await this.resolveFeedbackData(reaction.message.id, true) || {};

        if (!feedback || !id) return;
        if (reaction.emoji.name !== APPROVE_EMOJI) return;

        // send it to github!
        await this.octokit.issues.create({
            title: feedback.title,
            owner: process.env.GITHUB_REPO_OWNER!,
            repo: process.env.GITHUB_REPO_NAME!,
            body: `Feedback ID \`${id}\`\n---\n${feedback.feedback}`
        });
    }

    async resolveFeedbackData(messageID: string, clear: boolean = false): Promise<{ feedback: FeedbackData | null; id: string | null; } | null> {
        const rawFeedbackID = await this.get(feedbackMessageJoinKey(messageID));

        if (!rawFeedbackID) return null;

        const rawFeedback = await this.get(feedbackKey(rawFeedbackID)) as FeedbackData | undefined;

        if (!rawFeedback) return null;
        
        if (clear) {
            await Promise.all([
                this.unset(feedbackMessageJoinKey(messageID)),
                this.unset(feedbackKey(rawFeedbackID)),
                this.set(feedbackEmailKey(rawFeedbackID), rawFeedback.email),
                this.ticketChannel.bulkDelete([messageID])
            ]);
        }

        return {
            feedback: rawFeedback,
            id: rawFeedbackID
        };
    }

    async sendFeedback(feedback: FeedbackData) {
        const id = uuid();

        await this.set(feedbackKey(id), feedback);
        
        const message = await this.ticketChannel.send(makeEmbed(feedback));

        await Promise.all([
            this.set(feedbackMessageJoinKey(message.id), id),
            message.react(APPROVE_EMOJI),
            message.react(REJECT_EMOJI)
        ]);
    }

    get ticketChannel(): TextChannel {
        const channelID = process.env.BB_TICKET_CHANNEL;
        if (!channelID) throw new Error("Missing text channel ID");

        const channel = this.client.channels.resolve(channelID);
        if (!channel || !(channel instanceof TextChannel)) throw new Error("Channel missing or malformed");

        return channel;
    }
}