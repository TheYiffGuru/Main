import express from "express";
import db from "../db";
import subdomain from "express-subdomain";
import Verification from "../util/email/Verification";
import config from "../config";

const app = express.Router();

app
	.use(subdomain("api", require("./api").default))
	.use(subdomain("i", express.static(`${config.dir.public}/images`)))
	.use("/api", require("./api").default)
	.use("/albums", require("./albums").default)
	.use("/dashboard", require("./dashboard").default)
	.get("/", async (req, res) => {
		return res.status(200).render("index");
	})
	.get("/login", async (req, res) => {
		if (req.data.user !== null) return res.redirect("/dashboard");
		return res.status(200).render("login");
	})
	.get("/register", async (req, res) => {
		if (req.data.user !== null) return res.redirect("/dashboard");
		return res.status(200).render("register");
	})
	.get("/confirm-email", async (req, res) => {
		const t = req.query.token?.toString();
		if (t === undefined) return res.status(404).end("Missing confirmation token.");

		const e = Verification.getEmailFromToken(t);
		const v = Verification.get(e!);

		if (e === undefined || v === undefined) return res.status(404).end("Unknown confirmation token.");

		const u = await db.get("user", {
			id: v.user
		});

		if (u === null) return res.status(404).end("Unknown user.");

		await u.edit({
			emailVerified: true
		});

		Verification.remove(e, "USED");

		return res.status(200).end("Your email has been confirmed. You can now close this page.");
	})
	.get("/test", async (req, res) => res.status(200).json({
		success: true,
		data: {
			session: {
				id: req.sessionID,
				sess: req.session,
				data: req.data
			}
		}
	}));

export default app;
