"use strict";

function decimalToAtomicUnits(value, decimalPlaces = 8) {
	if (value === null || value === undefined || value === "") {
		return 0n;
	}

	const valueString = String(value).trim();
	if (!valueString || valueString.toLowerCase() === "nan") {
		return 0n;
	}

	const negative = valueString.startsWith("-");
	const unsigned = negative ? valueString.substring(1) : valueString;
	const exponentParts = unsigned.toLowerCase().split("e");
	const coefficient = exponentParts[0];
	const exponent = exponentParts[1] === undefined ? 0 : Number(exponentParts[1]);
	const parts = coefficient.split(".");
	const whole = parts[0] || "0";
	const fractionalRaw = parts[1] || "";
	const digits = `${whole}${fractionalRaw}`.replace(/^0+/, "") || "0";

	if (!Number.isInteger(exponent) || !/^\d+$/.test(digits)) {
		throw new Error(`Invalid decimal value: ${valueString}`);
	}

	const scale = fractionalRaw.length - exponent;
	const atomicShift = decimalPlaces - scale;
	const atomic = atomicShift >= 0
		? BigInt(digits) * (10n ** BigInt(atomicShift))
		: BigInt(digits) / (10n ** BigInt(-atomicShift));

	return negative ? -atomic : atomic;
}

function getVoutAddresses(vout) {
	if (!vout || !vout.scriptPubKey) {
		return [];
	}

	if (vout.scriptPubKey.address) {
		return [vout.scriptPubKey.address];
	}

	if (Array.isArray(vout.scriptPubKey.addresses)) {
		return vout.scriptPubKey.addresses.filter(Boolean);
	}

	return [];
}

function isCoinbaseTx(tx) {
	return !!(tx && Array.isArray(tx.vin) && tx.vin[0] && tx.vin[0].coinbase);
}

function hasPrevoutInputs(tx) {
	return tx.vin.some((input) => {
		if (!input || input.coinbase != null) {
			return false;
		}

		return input.txid != null || input.txhash != null;
	});
}

/** VeriCoin / Peercoin PoS: coinstake spends UTXOs; kernel is usually a 0-value first vout. */
function isCoinstakeTx(tx) {
	if (!tx || !Array.isArray(tx.vin) || !Array.isArray(tx.vout)) {
		return false;
	}

	if (isCoinbaseTx(tx) || tx.vin.length === 0 || !hasPrevoutInputs(tx)) {
		return false;
	}

	const firstValue = decimalToAtomicUnits(tx.vout[0]?.value || 0);
	if (firstValue === 0n) {
		return true;
	}

	// Compact stake blocks: one prevout-funded tx with a single positive reward output.
	if (tx.vout.length <= 2 && tx.vin.length >= 1) {
		const rewardOutputs = tx.vout.filter(
			(vout) => decimalToAtomicUnits(vout?.value || 0) > 0n,
		);

		return rewardOutputs.length === 1;
	}

	return false;
}

function atomicUnitsToDecimal(value, decimalPlaces = 8) {
	if (value === null || value === undefined) {
		return null;
	}

	const atomic = typeof value === "bigint" ? value : BigInt(value);
	const negative = atomic < 0n;
	const absolute = negative ? -atomic : atomic;
	const divisor = 10n ** BigInt(decimalPlaces);
	const whole = absolute / divisor;
	const fractional = absolute % divisor;
	const fractionalString = fractional.toString().padStart(decimalPlaces, "0").replace(/0+$/, "");
	const decimal = fractionalString ? `${whole.toString()}.${fractionalString}` : whole.toString();

	return negative ? `-${decimal}` : decimal;
}

module.exports = {
	decimalToAtomicUnits,
	atomicUnitsToDecimal,
	getVoutAddresses,
	isCoinbaseTx,
	isCoinstakeTx
};
