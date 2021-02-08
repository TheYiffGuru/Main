import express from "express";
import db from "../../db";

const app = express.Router();

app
	.get("resend-confirmation", async(req,res) => {});

export default app;
