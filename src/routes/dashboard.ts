import express from "express";
import db from "../db";
import subdomain from "express-subdomain";
import Verification from "../util/email/Verification";
import { Image } from "../db/models";

const app = express.Router();

app
	.get("/", async (req, res) => res.status(200).render("dashboard"))

export default app;
