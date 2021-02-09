/// <reference path="../../../util/@types/Express.d.ts" />

import { Colors } from "@uwu-codes/core";
import express from "express";
import db from "../../../db";
import { Album } from "../../../db/models";
import { ALBUM_TITLE_MAX, EXTERNAL_LINK_INFO_MAX, EXTERNAL_LINK_TYPES } from "../../../util/Constants";
import WebhookHandler from "../../../util/WebhookHandler";

const app = express.Router();

app
	.get("/:id", async (req, res) => {
		const v = await db.get("album", {
			id: req.params.id
		});

		if (v === null) return res.status(404).json({
			success: false,
			error: "Album user."
		});

		return res.status(200).json({
			success: true,
			data: v.toJSON()
		});
	})
	// @TODO creation limits
	.post("/", async (req, res) => {
		if (!req.body.title) return res.status(400).json({
			success: false,
			error: "Missing album title."
		});

		if (req.body.title.length > ALBUM_TITLE_MAX) return res.status(400).json({
			success: false,
			error: "Album title is too long."
		});

		let e: Album["externalLinks"] = [];
		if (req.body.externalLinks) {
			if (!Array.isArray(req.body.externalLinks)) return res.status(400).json({
				success: false,
				error: "Invalid content for externalLinks."
			});

			e = (req.body.externalLinks as Album["externalLinks"]).map((l, i) => {
				if (!l.type) return res.status(400).json({
					success: false,
					error: `externalLinks[${i}].type is missing.`
				});

				if (!EXTERNAL_LINK_TYPES.includes(l.type)) return res.status(400).json({
					success: false,
					error: `externalLinks[${i}].type is invalid.`
				});

				if (!l.info) return res.status(400).json({
					success: false,
					error: `externalLinks[${i}].info is missing.`
				});

				if (l.info.length > EXTERNAL_LINK_INFO_MAX) return res.status(400).json({
					success: false,
					error: `externalLinks[${i}].info is too long.`
				});

				return {
					type: l.type,
					info: l.info
				};
			}) as Album["externalLinks"];
		}

		const a = await db.create("album", {
			title: req.body.title,
			tags: !req.body.tags || !Array.isArray(req.body.tags) ? req.body.tags : [],
			creator: req.data.user!.id,
			artist: null,
			vanity: null,
			images: [],
			externalLinks: e
		});

		if (a === null) return res.status(500).json({
			success: false,
			error: "Unknown internal server error."
		});

		await WebhookHandler.executeDiscord("album", {
			title: "Album Created",
			color: Colors.green,
			description: [
				`Title: ${a.title}`,
				`Tags: ${a.tags.length === 0 ? "**NONE**" : `\`${a.tags.join("`, `")}\``}`,
				`Creator: **@${req.data.user!.handle}** (${a.creator})`
			].join("\n"),
			timestamp: new Date().toISOString(),
			fields: a.externalLinks.map(({ type: name, info: value }) => ({
				name,
				value,
				inline: true
			}))
		});

		return res.status(201).json({
			success: true,
			data: a.toJSON()
		})
	});

export default app;
