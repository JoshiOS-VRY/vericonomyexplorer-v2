#!/bin/bash

# Verium RPC Explorer Deployment Script
# This script helps deploy the Verium explorer using Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
}

# Check if .env file exists
check_env() {
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from template..."
        if [ -f env.example ]; then
            cp env.example .env
            print_status "Created .env file from template. Please edit it with your configuration."
        else
            print_error "env.example file not found. Please create a .env file manually."
            exit 1
        fi
    fi
}

# Build and deploy
deploy() {
    print_status "Building Verium RPC Explorer..."
    docker-compose build
    
    print_status "Starting Verium RPC Explorer..."
    docker-compose up -d
    
    print_status "Waiting for service to start..."
    sleep 10
    
    # Check if service is running
    if docker-compose ps | grep -q "Up"; then
        print_status "Verium RPC Explorer is running!"
        print_status "Access it at: http://localhost:3003"
    else
        print_error "Failed to start Verium RPC Explorer. Check logs with: docker-compose logs"
        exit 1
    fi
}

# Stop and cleanup
stop() {
    print_status "Stopping Verium RPC Explorer..."
    docker-compose down
}

# Show logs
logs() {
    docker-compose logs -f
}

# Show status
status() {
    docker-compose ps
}

# Update
update() {
    print_status "Pulling latest changes..."
    git pull
    
    print_status "Rebuilding and restarting..."
    docker-compose down
    docker-compose up -d --build
}

# Main script
case "${1:-deploy}" in
    "deploy")
        check_docker
        check_env
        deploy
        ;;
    "stop")
        stop
        ;;
    "restart")
        stop
        deploy
        ;;
    "logs")
        logs
        ;;
    "status")
        status
        ;;
    "update")
        update
        ;;
    "help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  deploy   - Build and start the explorer (default)"
        echo "  stop     - Stop the explorer"
        echo "  restart  - Restart the explorer"
        echo "  logs     - Show logs"
        echo "  status   - Show status"
        echo "  update   - Update and restart"
        echo "  help     - Show this help"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' for available commands"
        exit 1
        ;;
esac
