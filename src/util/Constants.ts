export const BCRYPT_ROUNDS = 12;
export const RATINGS = {
	UNKNOWN: -1,
	SAFE: 0,
	QUESTIONABLE: 1,
	NON_SEXUAL_NUDITY: 2,
	NSFW: 3,
	NSFL: 4
} as const;
export const USER_FLAGS = {
	STAFF: 1 << 0,
	ADMIN: 1 << 1,
	ARTIST: 1 << 2,
	PLACEHOLDER: 1 << 3
} as const;
export const EMAIL = /^[a-zA-Z0-9\.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
// probably not final
export const PASSWORD = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,64}$/;
export const HANDLE = /^[a-z\d_\-]{2,16}$/i; // Max 64^16 handles
// this NEEDS to be narrowed
export const NAME = /^.{2,}$/i;
