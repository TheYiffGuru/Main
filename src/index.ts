import express from "express";
import morgan from "morgan";
import * as http from "http";
import * as https from "https";
import dns from "dns";
import config from "./config";
import WebhookHandler from "./util/WebhookHandler";
import * as fs from "fs-extra";

const app = express();

app
	.use(morgan("dev"))
	.use(express.json({
		limit: "30MB"
	}))
	.use(express.urlencoded({
		extended: true
	}))
	.use(async (req, res, next) => {
		// we don't store this anymore, since that would be insecure for api access,
		// but we still need to set the data object
		req.data = {};
		return next();
	})
	.use(require("./routes").default)
	.use(async (err: Error & { [k: string]: any; }, req: express.Request, res: express.Response, next: express.NextFunction) => {
		if (err.type) {
			switch (err.type) {
				case "entity.too.large": return res.status(413).json({
					success: false,
					error: `Whatever you tried to upload was too large. You sent ${err.length.toLocaleString()} bytes. Keep it under ${err.limit.toLocaleString()} bytes.`
				});
			}
		}
		console.log(err);
		return res.status(500).json({
			success: false,
			error: "We had an unknown internal error."
		});
	});

(config.web.ssl ? https : http)
	.createServer(config.web.opt, app)
	.listen(config.web.port, config.web.host, async () => {
		let ip: string;
		if (!/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(config.web.host)) {
			ip = await new Promise((a, b) => dns.lookup(config.web.host, (err, addr) => err ? b(err) : a(addr)));
		}

		console.log(`Listening on http${config.web.ssl ? "s" : ""}://${config.web.host}${[80, 443].includes(config.web.port) ? "" : `:${config.web.port}`} (${ip! === undefined ? "" : `ip: ${ip}, `}publicDomain: ${config.web.domains.current})`);

		// only in prod
		if (config.currentHostname === config.prodHostname) await WebhookHandler.executeDiscord("status", {
			title: "Website Is Online",
			color: 0x00A000,
			timestamp: new Date().toISOString()
		});

		// make sure temp dir exists
		fs.mkdirpSync(config.dir.tmp);
	});


let ran = false;
async function exitHandler() {
	// make sure we only run once
	if (ran === true) return;
	ran = true;

	// only in prod
	if (config.currentHostname === config.prodHostname) await WebhookHandler.executeDiscord("status", {
		title: "Website Is Offline",
		color: 0xF02C00,
		timestamp: new Date().toISOString()
	});
	process.exit();
}

process
	.on("SIGTERM", exitHandler)
	.on("SIGINT", exitHandler);
