"use strict";

const fs = require("fs");
const dbModule = require("./db.js");

function getLockPath() {
	return `${dbModule.getDatabasePath()}.indexer-write.lock`;
}

function readLockMeta(lockPath) {
	try {
		const raw = fs.readFileSync(lockPath, "utf8").trim();
		const [owner] = raw.split("\n");
		return owner || "unknown";
	} catch {
		return null;
	}
}

function isStaleLock(lockPath, maxAgeMs) {
	try {
		return Date.now() - fs.statSync(lockPath).mtimeMs > maxAgeMs;
	} catch {
		return false;
	}
}

function resolveStaleMs(options = {}) {
	if (options.staleMs !== undefined) {
		return Number(options.staleMs);
	}

	return Number(process.env.VCEXP_INDEXER_WRITE_LOCK_STALE_MS ?? 120_000);
}

function tryAcquireWriteLock(owner, options = {}) {
	const lockPath = getLockPath();
	const staleMs = resolveStaleMs(options);

	try {
		const fd = fs.openSync(lockPath, "wx");
		fs.writeFileSync(fd, `${owner}\n${process.pid}\n${Date.now()}\n`);
		return { fd, lockPath, owner };
	} catch (err) {
		if (err && err.code !== "EEXIST") {
			throw err;
		}

		if (isStaleLock(lockPath, staleMs)) {
			try {
				fs.unlinkSync(lockPath);
			} catch {
				/* ignore stale lock cleanup failures */
			}
			return tryAcquireWriteLock(owner, options);
		}

		return {
			skipped: true,
			holder: readLockMeta(lockPath),
			lockPath
		};
	}
}

function releaseWriteLock(handle) {
	if (!handle || handle.skipped || handle.fd == null) {
		return;
	}

	fs.closeSync(handle.fd);
	try {
		fs.unlinkSync(handle.lockPath);
	} catch {
		/* ignore stale lock cleanup failures */
	}
}

module.exports = {
	getLockPath,
	tryAcquireWriteLock,
	releaseWriteLock
};
