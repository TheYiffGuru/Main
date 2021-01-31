import "node";

declare global {
	type ArrayOneOrMore<T> = T[] & {
		0: T;
	};
	type DeepPartial<T> = {
		[P in keyof T]?: DeepPartial<T[P]>;
	};
	type FilterFlags<Base, Condition> = {
		[Key in keyof Base]: Base[Key] extends Condition ? Key : never;
	};
	type AllowedNames<Base, Condition> = FilterFlags<Base, Condition>[keyof Base];
	type BetterFilter<Base, Condition> = Pick<Base, keyof Omit<Base, AllowedNames<Base, Condition>>>;
	// eslint-disable-next-line @typescript-eslint/ban-types
	type WithoutFunctions<T> = BetterFilter<T, Function>;
	type Writeable<T> = { -readonly [P in keyof T]: T[P] };


	type ConfigDataTypes<T, O extends (string | number) = ""> = Omit<WithoutFunctions<{ [K in keyof T]: T[K]; }>, O>;
	type ConfigEditTypes<T, O extends (string | number) = ""> = DeepPartial<ConfigDataTypes<T, O>>;
	type KnownKeys<T> = {
		[K in keyof T]: string extends K ? never : number extends K ? never : K
	} extends { [_ in keyof T]: infer U } ? U : never;
	type ThenReturnType<T extends (...args: any[]) => any> = ReturnType<T> extends Promise<infer U> ? U : never;

	type InvertedFilterFlags<Base, Condition> = {
		[Key in keyof Base]: Base[Key] extends Condition ? never : Key;
	};
	type FilterReturnType<Base, Condition> = {
		[Key in keyof Base]: Base[Key] extends (...args: any[]) => any ? ReturnType<Base[Key]> extends Condition ? Key : never : never;
	}
	type InvertedFilterReturnType<Base, Condition> = {
		[Key in keyof Base]: Base[Key] extends (...args: any[]) => any ? ReturnType<Base[Key]> extends Condition ? never : Key : never;
	};
	type Without<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
	type WithOptional<T, O extends keyof T> = Omit<T, O> & DeepPartial<Pick<T, O>>;
	type SomeOptional<T, R extends keyof T = never> = WithOptional<T, keyof Without<T, R>>;
	type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
	type OmitFirstArg<F> = F extends (x: any, ...args: infer P) => infer R ? (...args: P) => R : never;
	type valueof<T> = T[keyof T];
	type ArrayOrObject<T = any> = T[] | { [K in keyof T]: T[K]; };
	type Nullable<T, I = never, O extends string = never> = Omit<{ [K in keyof T]: K extends I ? T[K] : T[K] extends object ? Nullable<T[K]> : T[K] | null; }, O>;
	type AnyObject = {
		[K: string]: any;
	};
	type CallbackFunction<E = Error, R = unknown> = (err: E, res?: R) => void;

	type Plural<T extends string> = T | `${T}s`;
}
