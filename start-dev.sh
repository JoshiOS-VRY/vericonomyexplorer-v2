#!/bin/bash

# Verium RPC Explorer - Development Start Script
# Simple script to start the explorer in development mode

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if .env exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from template..."
    if [ -f env.example ]; then
        cp env.example .env
        print_warning "Please edit .env file with your Verium node configuration:"
        echo "  BTCEXP_BITCOIND_URI=bitcoin://rpcuser:rpcpassword@127.0.0.1:36988/"
        echo "  BTCEXP_ADDRESS_API=electrum"
        echo "  BTCEXP_ELECTRUM_SERVERS=tcp://127.0.0.1:50001"
        echo ""
        read -p "Press Enter to continue after editing .env file..."
    else
        echo "Error: env.example file not found. Please create a .env file manually."
        exit 1
    fi
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Set environment variables for development
export NODE_ENV=development
export BTCEXP_COIN=VRM
export BTCEXP_HOST=0.0.0.0
export BTCEXP_PORT=3003
export BTCEXP_DISPLAY_CURRENCY=vrm
export BTCEXP_UI_THEME=dark
export DEBUG=btcexp:app,btcexp:error

print_status "Starting Verium RPC Explorer in development mode..."
print_status "Access it at: http://localhost:3003"
print_status "Press Ctrl+C to stop"

# Start the application
npm start
