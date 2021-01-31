import config from "../config";

class Snowflake {
	static readonly BITS = {
		EPOCH: 41,
		MACHINE_ID: 10,
		SEQUENCE: 12,
		UNUSED: 1
	};
	static readonly MAX_MACHINE_ID = Math.pow(2, Snowflake.BITS.MACHINE_ID);
	static readonly MAX_SEQUENCE = Math.pow(2, Snowflake.BITS.SEQUENCE);
	static epoch: number = config.snowflake.epoch * 1000;
	static machineId: number = config.snowflake.machineId;
	private static sequence: number = 0;

	static getSequence() { return Number(this.sequence); /*make uneditable */ }

	static generate(bigint: true, timestamp?: number): BigInt;
	static generate(bigint?: false, timestamp?: number): string;
	static generate(bigint?: boolean, timestamp?: number): BigInt | string {
		if (!timestamp) timestamp = Date.now();

		const bin = `${(timestamp - this.epoch).toString(2).padStart(Snowflake.BITS.EPOCH, "0")}${this.machineId.toString(2).padStart(Snowflake.BITS.MACHINE_ID, "0")}${(this.sequence++).toString(2).padStart(Snowflake.BITS.SEQUENCE, "0")}${"0".repeat(Snowflake.BITS.UNUSED)}`;

		return this.binaryToId(bin, bigint);
	}

	static decode(id: string | BigInt) {
		const bin = this.idToBinary(id).toString().padStart(64, "0").split("");

		return {
			timestamp: parseInt(bin.splice(0, Snowflake.BITS.EPOCH).join(""), 2) + this.epoch,
			machineId: parseInt(bin.splice(0, Snowflake.BITS.MACHINE_ID).join(""), 2),
			sequence: parseInt(bin.splice(0, Snowflake.BITS.SEQUENCE).join(""), 2),
			unused: parseInt(bin.splice(0, Snowflake.BITS.UNUSED).join(""), 2)
		};
	}

	private static binaryToId(bin: string, bigint?: boolean): BigInt | string {
		let dec = "";

		while (bin.length > 50) {
			const high = parseInt(bin.slice(0, -32), 2);
			const low = parseInt((high % 10).toString(2) + bin.slice(-32), 2);

			dec = (low % 10).toString() + dec;
			bin =
				Math.floor(high / 10).toString(2) +
				Math.floor(low / 10)
					.toString(2)
					.padStart(32, "0");
		}

		let b = parseInt(bin, 2);
		while (b > 0) {
			dec = (b % 10).toString() + dec;
			b = Math.floor(b / 10);
		}

		return !!bigint ? BigInt(dec) : dec;
	}

	private static idToBinary(id: string | BigInt) {
		// had to do everything except string for overrides to work properly
		if (typeof id !== "string") id = id.toString();
		let bin = "";
		let high = parseInt(id.slice(0, -10), 10) || 0;
		let low = parseInt(id.slice(-10), 10);
		while (low > 0 || high > 0) {
			bin = String(low & 1) + bin;
			low = Math.floor(low / 2);
			if (high > 0) {
				low += 5e9 * (high % 2);
				high = Math.floor(high / 2);
			}
		}

		return bin;
	}
}

export default Snowflake;
