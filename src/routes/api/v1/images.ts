import express from "express";
import db from "../../../db";

const app = express.Router();

app
	.get("/:id", async (req, res) => {
		const v = await db.get("image", {
			id: req.params.id
		});

		if (v === null) return res.status(404).json({
			success: false,
			error: "Unknown Image."
		});

		return res.status(200).json({
			success: true,
			data: v.toJSON()
		});
	});

export default app;
