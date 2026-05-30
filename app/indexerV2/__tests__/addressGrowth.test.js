"use strict";

const assert = require("assert");
const {
	countAddressesFirstSeenBefore,
	addressCountAtBucketEnd
} = require("../addressGrowth.js");

const times = [1000, 5000, 9000, 20000];

assert.strictEqual(countAddressesFirstSeenBefore(times, 1000), 0);
assert.strictEqual(countAddressesFirstSeenBefore(times, 1001), 1);
assert.strictEqual(countAddressesFirstSeenBefore(times, 5001), 2);
assert.strictEqual(countAddressesFirstSeenBefore(times, 9001), 3);
assert.strictEqual(countAddressesFirstSeenBefore(times, 50000), 4);

assert.strictEqual(addressCountAtBucketEnd(times, 0), countAddressesFirstSeenBefore(times, 3600));

console.log("addressGrowth.test.js ok");
