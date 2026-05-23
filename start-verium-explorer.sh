#!/bin/bash

# Verium RPC Explorer Startup Script
# This script helps you quickly start the Verium RPC Explorer with Docker

set -e

echo "🚀 Starting Verium RPC Explorer..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your Verium node configuration before running again."
    echo "   Required: BTCEXP_BITCOIND_URI with your Verium node RPC details"
    echo "   Default Verium RPC port: 36988"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Build the image
echo "🔨 Building Verium RPC Explorer Docker image..."
docker-compose build

# Start the container
echo "🏃 Starting Verium RPC Explorer container..."
docker-compose up -d

# Wait a moment for the container to start
sleep 3

# Check if container is running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Verium RPC Explorer is now running!"
    echo "🌐 Access it at: http://localhost:3002"
    echo "📊 View logs with: docker-compose logs -f"
    echo "🛑 Stop with: docker-compose down"
else
    echo "❌ Failed to start Verium RPC Explorer"
    echo "📋 Check logs with: docker-compose logs"
    exit 1
fi