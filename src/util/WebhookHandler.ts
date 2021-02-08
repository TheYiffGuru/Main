import Eris from "eris";
import config from "../config";

export default class WebhookHandler {
	static client = new Eris.Client("OWO_WHATS_THIS");

	static async executeDiscord(type: keyof typeof config["discordWebhooks"], content: Eris.EmbedOptions) {
		return this.client.executeWebhook(config.discordWebhooks[type].id, config.discordWebhooks[type].token, {
			embeds: [
				content
			]
		});
	}
}
