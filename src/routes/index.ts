import express from "express";
import subdomain from "express-subdomain";
import config from "../config";

const app = express.Router();

app
	.use(subdomain("api", require("./api").default))
	.use(subdomain("styles", express.Router().use(express.static(`${config.dir.static}/styles`), async (req, res) => res.status(404).end())))
	.use(subdomain("scripts", express.Router().use(express.static(`${config.dir.static}/scripts`), async (req, res) => res.status(404).end())))
	.use(subdomain("i", express.Router().use(express.static(`${config.dir.static}/images`), async (req, res) => res.status(404).end())))
	.use(subdomain("a", express.Router().use(express.static(config.dir.albums), async (req, res) => res.status(404).end())));
if (config.beta) app.use("/api", require("./api").default)
export default app;
