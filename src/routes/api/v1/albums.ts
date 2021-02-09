/// <reference path="../../../util/@types/Express.d.ts" />
import express from "express";
import db from "../../../db";
import { Album, User } from "../../../db/models";
import AuthHandler from "../../../util/AuthHandler";
import { ORIGINAL_NAME_MAX, ALBUM_TITLE_MAX, Colors, EXTERNAL_LINK_INFO_MAX, EXTERNAL_LINK_TYPES, RATINGS } from "../../../util/Constants";
import WebhookHandler from "../../../util/WebhookHandler";
import crypto from "crypto";
import config from "../../../config";
import * as fs from "fs-extra";
import FileType from "file-type";
import Functions from "../../../util/Functions";

const app = express.Router();

app
	.get("/:id", async (req, res) => {
		const v = await db.get("album", {
			$or: [
				{
					id: req.params.id
				},
				{
					vanity: req.params.id
				}
			]
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
	.post("/", AuthHandler.handle(undefined, "verifiedEmail"), async (req, res) => {
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

		const ar = req.body.artist ? await db.collection("users").findOne({
			$or: [
				{
					id: req.body.artist
				},
				{
					handle: req.body.artist
				}
			]
		}) : null;

		if (!req.body.artist && !ar) return res.status(400).json({
			success: false,
			error: "Unknown artist."
		});

		const a = await db.create("album", {
			title: req.body.title,
			tags: !req.body.tags || !Array.isArray(req.body.tags) ? req.body.tags : [],
			creator: req.data.user!.id,
			artist: ar?.id || null,
			vanity: null,
			images: [],
			externalLinks: e
		});

		if (a === null) return res.status(500).json({
			success: false,
			error: "Unknown internal server error."
		});

		let at: Exclude<typeof ar, null>;
		if (ar === null) at = await db.collection("users").findOne({ handle: "anonymoys" }) as typeof at;
		else at = ar;

		await WebhookHandler.executeDiscord("album", {
			title: "Album Created",
			color: Colors.green,
			description: [
				`Title: ${a.title}`,
				`Tags: ${a.tags.length === 0 ? "**NONE**" : `\`${a.tags.join("`, `")}\``}`,
				`Creator: **@${req.data.user!.handle}** (${a.creator})`,
				`Artist: **@${at.handle}** (${at.id})`
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
	})
	.put("/:id/images", AuthHandler.handle(undefined, "verifiedEmail"), async (req, res) => {
		const a = await db.get("album", {
			$or: [
				{
					id: req.params.id
				},
				{
					vanity: req.params.id
				}
			]
		});

		if (a === null) return res.status(404).json({
			success: false,
			error: "Unknown album."
		});

		if (!req.body.file) return res.status(400).json({
			success: false,
			error: "File is required."
		});

		const rating = req.body.rating || RATINGS.UNKNOWN;
		if (!Object.values(RATINGS).includes(rating)) return res.status(400).json({
			success: false,
			error: `Invalid rating level "${rating}".`
		});

		// there should probably be some security measures here?
		const n = crypto.randomBytes(16).toString("hex");
		const name = req.body.name || n;
		if (name.length > ORIGINAL_NAME_MAX) return res.status(400).json({
			success: false,
			error: "Original file name is too long."
		});
		const tmp = `${config.dir.tmp}/${n}`;
		fs.writeFileSync(tmp, Buffer.from(req.body.file.split("base64,").slice(-1)[0], "base64"));
		const t = await FileType.fromFile(tmp);
		if (t === undefined) return res.status(400).json({
			success: false,
			error: "We were unable to determine the type of that file."
		});
		const m = Object.keys(config.mimes);

		if (!m.includes(t.mime)) {
			fs.unlinkSync(tmp);
			return res.status(400).json({
				success: false,
				error: `We do not accept the file type "${t.mime}".`
			});
		}

		const md5 = Functions.md5File(tmp);

		const d = await db.collection("images").findOne({
			"file.md5": md5
		});

		if (d !== null) return res.status(409).json({
			success: false,
			error: "An image already exists with the same md5."
		});

		const img = await db.create("image", {
			uploader: req.data.user!.id,
			album: a.id,
			rating,
			file: {
				originalName: name,
				md5,
				type: t.mime as keyof typeof config["mimes"]
			}
		});

		if (img === null) return res.status(500).json({
			success: false,
			error: "Unknown internal error."
		});

		await a.mongoEdit({
			$push: {
				images: {
					id: img.id,
					pos: a.images.length,
					addedBy: req.data.user!.id
				}
			}
		});

		fs.mkdirpSync(`${config.dir.albums}/${a.id}`);
		fs.moveSync(tmp, `${config.dir.albums}/${a.id}/${img.id}.${config.mimes[t.mime as keyof typeof config["mimes"]]}`);

		await WebhookHandler.executeDiscord("image", {
			title: "Image Added to Album",
			color: Colors.green,
			description: [
				`Image ID: **${img.id}**`,
				`Image Size: **${Functions.formatBytes(req.body.file.length)}**`,
				`Rating: **${Object.entries(RATINGS).find(r => r[1] === rating)![0]}**`,
				`Album: **${a.title}** (${a.id}${a.vanity ? `/${a.vanity}` : ""})`,
				`Creator: **@${req.data.user!.handle}** (${req.data.user!.id})`,
				`URL: [${config.web.baseURL("a")}/${a.id}/${img.id}.${config.mimes[t.mime as keyof typeof config["mimes"]]}](${config.web.baseURL("a")}/${a.id}/${img.id}..${config.mimes[t.mime as keyof typeof config["mimes"]]})`,
			].join("\n"),
			thumbnail: {
				url: `${config.web.baseURL("a")}/${a.id}/${img.id}.${config.mimes[t.mime as keyof typeof config["mimes"]]}`
			},
			timestamp: new Date().toISOString(),
			fields: a.externalLinks.map(({ type: name, info: value }) => ({
				name,
				value,
				inline: true
			}))
		});

		return res.status(200).json({
			success: true,
			data: img.toJSON()
		});
	});

export default app;
