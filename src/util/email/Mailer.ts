import NodeMailer from "nodemailer";
import config from "../../config";
import { User } from "../../db/models";
import Logger from "../Logger";
import Templater from "./Templater";
import Verification from "./Verification";

interface SendResponse {
	accepted: string[];
	rejected: string[];
	envelopeTime: number;
	messageTime: number;
	messageSize: number;
	response: string;
	envelope: {
		from: string;
		to: string[];
	};
	messageId: string;
}

export default class Mailer {
	static transport = NodeMailer.createTransport(config.services.smtp.url);

	static async send(to: string, subject: string, html: string) {
		return new Promise<SendResponse>((a, b) =>
			this.transport.sendMail({
				from: config.services.smtp.from,
				to,
				subject,
				html
			}, (err, res) => err ? b(err) : a(res))
		)
			.then(res => {
				Logger.debug("Mailer->send", `${res.rejected.length === 0 ? "Successful" : "Unsuccessful"} send attempt to "${res.envelope.to.join("\", \"")}", from "${res.envelope.from}". Message ID: ${res.messageId}`);
				return res;
			});
	}

	static async sendConfirmation(user: User) {
		const t = Templater.get("confirm");
		if (t === undefined) throw new TypeError("Faled to fetch email confirmation template.");
		if (user.email === null) throw new TypeError(`[Mailer->sendConfirmation] User does not have an email address saved. (U-${user.id})`);
		const { token } = Verification.add(user.email, user.id);
		const s = await this.send(
			user.email,
			Templater.parseString(t.content.subject, {
				NAME: user.name,
				HANDLE: user.handle,
				EMAIL: user.email,
				TOKEN: token,
				URL: `https://yiff.guru/confirm-email?token=${token}`
			}),
			Templater.parseString(t.content.body, {
				NAME: user.name,
				HANDLE: user.handle,
				EMAIL: user.email,
				TOKEN: token,
				URL: `https://yiff.guru/confirm-email?token=${token}`
			})
		);
		return s.rejected.length === 0;
	}
}
