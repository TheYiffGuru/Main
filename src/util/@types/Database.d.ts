/// <reference path="./Utilities.d.ts" />
import {
	AlbumProperties,
	ImageProperties,
	UserProperties
} from "../../db/models";

declare namespace Database {
	type GetAlbumOptions = DeepPartial<AlbumProperties>;
	type GetImageOptions = DeepPartial<ImageProperties>;
	type GetUserOptions = DeepPartial<UserProperties>;

	type CreateAlbumOptions = Omit<Nullable<SomeOptional<AlbumProperties, "creator" | "title" | "artist">>, "id">;
	type CreateImageOptions = Omit<Nullable<SomeOptional<ImageProperties, "album" | "uploader" | "file">>, "id">;
	type CreateUserOptions = Omit<Nullable<SomeOptional<UserProperties, "name" | "handle">>, "id">;
}

export = Database;
