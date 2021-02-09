import express from "express";
import db from "../../../db";

const app = express.Router();

app
	.use("/albums", require("./albums").default)
	.use("/users", require("./users").default);

export default app;
