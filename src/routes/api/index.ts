import express from "express";
import db from "../../db";
import { User } from "../../db/models";
import { EMAIL, HANDLE } from "../../util/Constants";
import Mailer from "../../util/email/Mailer";
import WebhookHandler from "../../util/WebhookHandler";
import { Colors } from "@uwu-codes/core";

const app = express.Router();

app
	.get("/versions", async (req, res) => res.status(200).json({
		success: true,
		data: {
			V1: "active"
		}
	}))
	.post("/login", async (req, res) => {
		if (!req.body.email && !req.body.handle) return res.status(400).json({
			success: false,
			error: "Handle or email is required."
		});

		if (!req.body.password) return res.status(400).json({
			success: false,
			error: "Password is required."
		});

		if (req.body.handle && !HANDLE.test(req.body.handle)) return res.status(400).json({
			success: false,
			error: "Handle failed internal validation."
		});

		if (req.body.email && !EMAIL.test(req.body.email)) return res.status(400).json({
			success: false,
			error: "Email failed internal validation."
		});

		let u: User | null;

		if (req.body.handle) u = await db.collection("users").findOne({
			handle: req.body.handle
		}).then(v => v === null ? null : new User(v.id, v));
		else if (req.body.email) u = await db.collection("users").findOne({
			email: req.body.email
		}).then(v => v === null ? null : new User(v.id, v));
		else u = null;

		if (u === null) return res.status(400).json({
			success: false,
			error: "Invalid handle or email."
		});

		if (u.password === null) return res.status(400).json({
			success: false,
			error: "User does not have a password set."
		});

		const p = await u.checkPassword(req.body.password);

		if (!p) return res.status(400).json({
			success: false,
			error: "Incorrect password."
		});

		req.data.user = u;

		return res.status(200).json({
			success: true,
			data: u.toJSON(true)
		});
	})
	.post("/register", async (req, res) => {
		if (!req.body.handle) return res.status(400).json({
			success: false,
			error: "Handle is required."
		});

		if (!req.body.email) return res.status(400).json({
			success: false,
			error: "Email is required."
		});

		if (!req.body.password) return res.status(400).json({
			success: false,
			error: "Password is required."
		});

		if (!HANDLE.test(req.body.handle)) return res.status(400).json({
			success: false,
			error: "Handle failed internal validation."
		});

		if (!EMAIL.test(req.body.email)) return res.status(400).json({
			success: false,
			error: "Email failed internal validation."
		});

		const a = await db.collection("users").findOne({
			handle: req.body.handle
		});
		const b = await db.collection("users").findOne({
			email: req.body.email
		});

		if (a !== null) return res.status(400).json({
			success: false,
			error: "That handle is already in use."
		});
		if (b !== null) return res.status(400).json({
			success: false,
			error: "That email is already in use."
		});

		const u = await db.create("user", {
			email: req.body.email,
			handle: req.body.handle.toLowerCase(),
			name: req.body.handle.toLowerCase()
		}).then(v => v === null ? null : new User(v.id, v));

		if (u === null) return res.status(500).json({
			success: false,
			error: "Unknown internal server error."
		});

		await u.setPassword(req.body.password);

		await Mailer.sendConfirmation(u);

		req.data.user = u;

		await WebhookHandler.executeDiscord("user", {
			title: "User Registered",
			color: Colors.green,
			description: [
				`User: @${u?.handle} (${u?.id})`,
				`Email: \`${u?.email}\``
			].join("\n"),
			timestamp: new Date().toISOString()
		});

		return res.status(201).json({
			success: true,
			data: u.toJSON(true)
		});
	})
	.use("/v1", require("./v1").default)
	.use(async (req, res) => res.status(404).json({
		success: false,
		error: "Not Found."
	}));

export default app;
