import express from "express";
import morgan from "morgan";
import onFinished from "on-finished";
import session from "express-session";
import * as http from "http";
import * as https from "https";
import dns from "dns";
import config from "./config";
import SessionStore from "./util/SessionStore";

const app = express();

app

	.use(session({
		name: "yiff",
		secret: config.web.cookieSecret,
		cookie: {
			domain: "yiff.guru",
			secure: true,
			httpOnly: true,
			maxAge: 8.64e7,
		},
		resave: false,
		saveUninitialized: true
	}))
	.set("view engine", "ejs")
	.set("views", `${config.dir.base}/src/views/templates`)
	.use(morgan("dev"))
	.use(express.json())
	.use(express.urlencoded({
		extended: true
	}))
	.use(async (req, res, next) => {
		if (req.session.id) {
			req.data = SessionStore.get(req.session.id);
			onFinished(res, () =>
				SessionStore.set(req.sessionID, req.data)
			);
		}

		if (req.data.user === undefined) req.data.user = null;

		res.locals.user = req.data.user;

		return next();
	})
	.use(express.static(`${config.dir.base}/src/public`))
	.use(require("./routes").default);

(config.web.ssl ? https : http)
	.createServer(config.web.opt, app)
	.listen(config.web.port, config.web.host, async () => {
		let ip: string;
		if (!/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(config.web.host)) {
			ip = await new Promise((a, b) => dns.lookup(config.web.host, (err, addr) => err ? b(err) : a(addr)));
		}
		console.log(`Listening on http${config.web.ssl ? "s" : ""}://${config.web.host}${[80, 443].includes(config.web.port) ? "" : `:${config.web.port}`}${ip! === undefined ? "" : ` (${ip})`}`);
	});
