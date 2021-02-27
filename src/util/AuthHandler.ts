/// <reference path="./@types/Express.d.ts" />
import express from "express";
import { User } from "../db/models";
import Functions from "./Functions";

export type AuthLevel = "none" | "verifiedEmail" | "staff" | "admin";

// this has to be separated from normal functions because of circular imports with Logger & db
export default class AuthHandler {
	static handle(type?: "token" | "key", level?: AuthLevel | AuthLevel[]) {
		return async function (req: express.Request, res: express.Response, next: express.NextFunction) {
			switch (type) {
				// I could have done a direct lookup for tokens via "authTokens.token": "" but I wanted to easilt distinguish
				// api keys & site users 
				// auth is Basic Authentication with handle:token 
				case "token": {
					if (!req.headers.authorization) return res.status(401).json({
						success: false,
						error: "Missing Authorization."
					});

					const [type, auth] = req.headers.authorization.toString().split(" ") ?? [];
					if (type.toLowerCase() !== "basic") return res.status(400).json({
						success: false,
						error: "Unknown authentication scheme."
					});

					const [handle, token] = Buffer.from(auth, "base64").toString("ascii").split(":") ?? [];

					if (handle === undefined || token === undefined) return res.status(400).json({
						success: false,
						error: "Badly formed authentication."
					});

					const u = await User.getUser({
						handle
					});

					if (u === null) return res.status(400).json({
						success: false,
						error: "Invalid user in authentication."
					});

					if (!u.authTokens.map(({ token: t }) => t).includes(token)) return res.status(401).json({
						success: false,
						error: "Invalid authentication."
					});

					req.data.user = u;

					break;
				}

				case "key": {
					if (!req.headers.authorization) return res.status(401).json({
						success: false,
						error: "Missing authorization."
					});

					const u = await User.getUser({
						apiKey: req.headers.authorization
					});

					if (u === null || u.apiKey === null) return res.status(401).json({
						success: false,
						error: "Invalid authorization."
					});

					req.data.user = u;
				}

				default: {
					if (!req.headers.authorization) return res.status(401).json({
						success: false,
						error: "Missing authorization."
					});

					// try api key first
					let u: User | null;
					u = await User.getUser({
						apiKey: req.headers.authorization
					});

					if (u === null || u.apiKey === null) {
						const [type, auth] = req.headers.authorization.toString().split(" ") ?? [];
						if (type.toLowerCase() !== "basic") return res.status(400).json({
							success: false,
							error: "Unknown authentication scheme."
						});

						const [handle, token] = Buffer.from(auth, "base64").toString("ascii").split(":") ?? [];

						if (handle === undefined || token === undefined) return res.status(400).json({
							success: false,
							error: "Badly formed authentication."
						});

						u = await User.getUser({
							handle
						});

						if (u === null) return res.status(400).json({
							success: false,
							error: "Invalid user in authentication."
						});

						if (!u.authTokens.map(({ token: t }) => t).includes(token)) return res.status(401).json({
							success: false,
							error: "Invalid authentication."
						});
					}

					req.data.user = u;
				}
			}

			const c = await AuthHandler.checkLevel(level, req, res);
			// don't pass control to further down handlers if we've already ended the request
			if (c !== undefined) return;
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
