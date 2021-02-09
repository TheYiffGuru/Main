import express from "express";
import db from "../db";
import subdomain from "express-subdomain";
import Verification from "../util/email/Verification";
import { Image } from "../db/models";

const app = express.Router();

app
	.get("/:id", async (req, res) => {
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

		if (a === null) return res.status(404).render("errors/404", {
			title: "Album Not Found",
			description: `An album with the id or vanity "${req.params.id}" was not found.`
		});

		const img = await a.getImages();
		let ar = await a.getArtist();
		if (ar === null) ar = await db.get("user", {
			handle: "anonymous"
		});
		res.status(200).render("albums/view", {
			...a.toJSON(),
			images: img.order().map(v => ({
				...v.toJSON(),
				viewURL: v.getViewURL(),
				fileURL: v.getFileURL()
			})),
			artist: ar
		});
	})

export default app;
