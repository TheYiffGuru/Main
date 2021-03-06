import express from "express";
import db from "../../../db";
import { User } from "../../../db/models";

const app = express.Router();

app
	.get("/:id", async (req, res) => {
		if (req.params.id.toLowerCase() === "@me") return res.status(200).json({
			success: true,
			data: req.data.user!.toJSON(true)
		});

		const v = await User.getUser(req.params.id);

		if (v === null) return res.status(404).json({
			success: false,
			error: "Unknown user."
		});

		return res.status(200).json({
			success: true,
			data: v.toJSON(false)
		});
	});

export default app;
