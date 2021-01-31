/// <reference path="./@types/Express.d.ts" />

import { User } from "../db/models";

interface SessionData {
	user: User | null;
}

class SessionStore {
	static entries: Map<string, Partial<SessionData>> = new Map();

	static get(id: string) {
		return this.entries.get(id) || {};
	}
	static set(id: string, d: Partial<SessionData>) {
		return this.entries.set(id, d);
	}
	static delete(id: string) {
		return this.entries.delete(id);
	}
}

export { SessionData };
export default SessionStore;
