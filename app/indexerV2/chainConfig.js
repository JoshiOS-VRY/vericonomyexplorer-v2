'use strict';

const fs = require('fs');
const path = require('path');

const defaultConfigPath = path.join(process.cwd(), 'configs', 'chains.json');
const exampleConfigPath = path.join(process.cwd(), 'configs', 'chains.example.json');

function getConfigPath() {
  return process.env.VCEXP_CHAINS_CONFIG || process.env.BTCEXP_CHAINS_CONFIG || defaultConfigPath;
}

function loadChainsConfig(configPath = getConfigPath()) {
  const resolvedPath = path.resolve(configPath);
  const fallbackPath = path.resolve(exampleConfigPath);
  const sourcePath = fs.existsSync(resolvedPath) ? resolvedPath : fallbackPath;
  const config = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

  if (!config.chains || !Array.isArray(config.chains)) {
    throw new Error(`Invalid chains config at ${sourcePath}: missing chains array`);
  }

  return {
    path: sourcePath,
    chains: config.chains,
  };
}

function getChainConfig(chainId, configPath) {
  const config = loadChainsConfig(configPath);
  const normalized = chainId.toLowerCase();
  const chain = config.chains.find(
    (item) => item.id.toLowerCase() === normalized || item.ticker.toLowerCase() === normalized
  );

  if (!chain) {
    throw new Error(`Chain not found in ${config.path}: ${chainId}`);
  }

  return chain;
}

function resolveRpcHost(rpc) {
  if (rpc.hostEnv && process.env[rpc.hostEnv]) {
    return process.env[rpc.hostEnv];
  }
  return rpc.host || '127.0.0.1';
}

function getRpcCredentials(chain) {
  const rpc = chain.rpc || {};
  const host = resolveRpcHost(rpc);
  const cookiePath = rpc.cookiePathEnv ? process.env[rpc.cookiePathEnv] : null;

  if (cookiePath && fs.existsSync(cookiePath)) {
    const cookie = fs.readFileSync(cookiePath, 'utf8').trim().split(':', 2);
    return {
      host,
      port: rpc.port,
      username: cookie[0],
      password: cookie[1],
      timeout: rpc.timeout || 30000,
    };
  }

  return {
    host,
    port: rpc.port,
    username: rpc.usernameEnv ? process.env[rpc.usernameEnv] : rpc.username,
    password: rpc.passwordEnv ? process.env[rpc.passwordEnv] : rpc.password,
    timeout: rpc.timeout || 30000,
  };
}

module.exports = {
  getConfigPath,
  loadChainsConfig,
  getChainConfig,
  resolveRpcHost,
  getRpcCredentials,
};
