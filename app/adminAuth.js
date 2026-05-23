"use strict";

const basicAuth = require('basic-auth');

// Admin authentication middleware
// Uses username/password authentication via environment variables

module.exports = function(req, res, next) {
	// Get admin credentials from environment
	const adminUsername = process.env.BTCEXP_ADMIN_USERNAME || process.env.BTCEXP_ADMIN_USER;
	const adminPassword = process.env.BTCEXP_ADMIN_PASSWORD || process.env.BTCEXP_ADMIN_PASS;

	// If no credentials configured, allow localhost only (fallback)
	if (!adminUsername || !adminPassword) {
		const clientIp = req.headers['x-forwarded-for'] 
			? req.headers['x-forwarded-for'].split(',')[0].trim()
			: req.connection.remoteAddress 
			|| req.socket.remoteAddress
			|| (req.connection.socket ? req.connection.socket.remoteAddress : null);

		const allowedIps = ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'];
		const isAllowed = allowedIps.some(ip => {
			if (clientIp === ip) return true;
			if (clientIp && clientIp.includes(ip)) return true;
			return false;
		});

		if (isAllowed) {
			req.isAdmin = true;
			return next();
		}

		return res.status(403).send(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>Access Denied</title>
				<style>
					body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
					h1 { color: #d32f2f; }
				</style>
			</head>
			<body>
				<h1>403 - Access Denied</h1>
				<p>Admin credentials not configured. Please set BTCEXP_ADMIN_USERNAME and BTCEXP_ADMIN_PASSWORD.</p>
			</body>
			</html>
		`);
	}

	// Check basic auth credentials
	const credentials = basicAuth(req);

	if (credentials && 
		credentials.name === adminUsername && 
		credentials.pass === adminPassword) {
		req.isAdmin = true;
		return next();
	}

	// Require authentication
	res.set('WWW-Authenticate', 'Basic realm="Admin Dashboard"');
	res.status(401).send(`
		<!DOCTYPE html>
		<html>
		<head>
			<title>Authentication Required</title>
			<style>
				body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
				h1 { color: #d32f2f; }
			</style>
		</head>
		<body>
			<h1>401 - Authentication Required</h1>
			<p>Please enter your admin credentials to access this page.</p>
		</body>
		</html>
	`);
};

