import { mdb } from "../src/db";
import { User } from "../src/db/models";
import { USER_FLAGS } from "../src/util/Constants";

const drop = true;

async function setupAlbums() {
	const col = mdb.collection("albums");
	if (!drop) await col.dropIndexes().then(() => console.log(`Dropped all of the indexes on \`${mdb.databaseName}\`.\`albums\`.`));
	await col.createIndexes([
		{
			name: "id",
			key: {
				id: 1
			},
			unique: true
		},
		{
			name: "title",
			key: {
				title: 1
			},
			unique: false
		},
		{
			name: "vanity",
			key: {
				vanity: 1
			},
			unique: true,
			partialFilterExpression: {
				vanity: {
					$type: "string"
				}
			}
		},
		{
			name: "tags",
			key: {
				tags: 1
			},
			unique: false
		}
	]);
}

async function setupImages() {
	const col = mdb.collection("images");
	if (!drop) await col.dropIndexes().then(() => console.log(`Dropped all of the indexes on \`${mdb.databaseName}\`.\`images\`.`));
	await col.createIndexes([
		{
			name: "id",
			key: {
				id: 1
			},
			unique: true
		},
		{
			name: "file.md5",
			key: {
				"file.md5": 1
			},
			unique: true
		},
		{
			name: "tags",
			key: {
				tags: 1
			},
			unique: false
		},
		{
			name: "uploader",
			key: {
				uploader: 1
			},
			unique: false
		},
		{
			name: "album",
			key: {
				album: 1
			},
			unique: false
		},
		{
			name: "rating",
			key: {
				rating: 1
			},
			unique: false
		}
	]);
}

async function setupUsers() {
	const col = mdb.collection("users");
	if (!drop) await col.dropIndexes().then(() => console.log(`Dropped all of the indexes on \`${mdb.databaseName}\`.\`users\`.`));
	await col.createIndexes([
		{
			name: "id",
			key: {
				id: 1
			},
			unique: true
		},
		{
			name: "handle",
			key: {
				handle: 1
			},
			unique: true
		},
		{
			name: "email",
			key: {
				email: 1
			},
			unique: true,
			partialFilterExpression: {
				email: {
					$type: "string"
				}
			}
		},
		{
			name: "apiKey",
			key: {
				apiKey: 1
			},
			unique: true,
			partialFilterExpression: {
				apiKey: {
					$type: "string"
				}
			}
		},
		{
			name: "authTokens.token",
			key: {
				"authTokens.token": 1
			},
			unique: true,
			partialFilterExpression: {
				"authTokens.token": {
					$type: "string"
				}
			}
		},
		{
			name: "name",
			key: {
				name: 1
			},
			unique: false
		}
	]);
}

process.nextTick(async () => {
	if (drop) {
		console.log(`This WILL drop the \`${mdb.databaseName}\` database, exit within 5 seconds to cancel!`);
		await new Promise((a, b) => setTimeout(a, 5e3));
		console.log("Continuing..");
		await mdb.dropDatabase();
	}


	await setupAlbums().then(() => console.log(`\`${mdb.databaseName}\`.\`albums\` setup successfully.`));
	await setupImages().then(() => console.log(`\`${mdb.databaseName}\`.\`images\` setup successfully.`));
	await setupUsers().then(() => console.log(`\`${mdb.databaseName}\`.\`users\` setup successfully.`));

	await User.create({
		flags: USER_FLAGS.STAFF + USER_FLAGS.ADMIN,
		handle: "admin",
		name: "Administrator",
		email: "admin@yiff.guru",
		emailVerified: true
	}).then(async (u) => {
		await u.setPassword("P@ssw0rd");
		console.log(`Added admin user (id: ${u.id})`);
	});

	await User.create({
		flags: USER_FLAGS.ARTIST,
		handle: "anonymous",
		name: "Anonymous",
		email: "anonymous@yiff.guru",
		emailVerified: true
	}).then(u => console.log(`Added anonymous user (id: ${u.id})`));

	process.exit(0);
});
