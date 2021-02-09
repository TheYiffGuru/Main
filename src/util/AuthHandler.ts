/// <reference path="./@types/Express.d.ts" />
import express from "express";
import db from "../db";
import Functions from "./Functions";

export type AuthLevel = "none" | "verifiedEmail" | "staff" | "admin";

// this has to be separated from normal functions because of circular imports with Logger & db
export default class AuthHandler {
	static handle(type?: "session" | "key", level?: AuthLevel | AuthLevel[]) {
		return async function (req: express.Request, res: express.Response, next: express.NextFunction) {
			switch (type) {
				case "session": {
					if (req.data.user === null) return res.status(401).render("errors/401");
					break;
				}

				case "key": {
					if (!req.headers.authorization) return res.status(401).json({
						success: false,
						error: "Missing authorization."
					});

					const u = await db.get("user", {
						apiKey: req.headers.authorization
					});

					if (u === null || u.apiKey === null) return res.status(401).json({
						success: false,
						error: "Invalid authorization."
					});

					req.data.user = u;
				}

				default: {
					if (req.data.user === null) {
						if (!req.headers.authorization) return res.status(401).json({
							success: false,
							error: "Missing authorization."
						});

						const u = await db.get("user", {
							apiKey: req.headers.authorization
						});

						if (u === null || u.apiKey === null) return res.status(401).json({
							success: false,
							error: "Invalid authorization."
						});

						req.data.user = u;
					}
				}
			}

			await AuthHandler.checkLevel(level, req, res);

			return next();
		}
	}

	// must be used with the above so data.user is guaranteed 
	private static async checkLevel(level: AuthLevel | AuthLevel[] | undefined, req: express.Request, res: express.Response) {
		if (level === undefined || (Array.isArray(level) && level.length === 0)) level = ["none"];
		if (!Array.isArray(level)) level = [level];
		const u = req.data.user!;
		const f = Functions.calcUserFlags(u.flags);

		for (const l of level) {
			switch (l) {
				case "none": continue;

				// staff/admin bypass?
				case "verifiedEmail": {
					if (u.emailVerified === false) return res.status(403).json({
						success: false,
						error: "A verified email is required to use this."
					});
					else continue;
				}

				case "staff": {
					if (f.STAFF || f.ADMIN) continue;
					else return res.status(403).json({
						success: false,
						error: "You must be a staff member to use this."
					});
				}

				case "admin": {
					if (f.ADMIN) continue;
					else return res.status(403).json({
						success: false,
						error: "You must be an admin to use this."
					});
				}
			}
		}
	}
}
