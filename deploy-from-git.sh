#!/bin/bash

# Verium RPC Explorer - Git Deployment Script
# This script deploys the Verium explorer from your Git repository

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GIT_REPO_URL="http://192.168.1.186:3000/jayhines91/btc-rpc-explorer.git"
BRANCH="verium-explorer"
CONTAINER_NAME="verium-rpc-explorer"
IMAGE_NAME="verium-rpc-explorer:latest"
PORT="3003"

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

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
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

# Clone or update repository
setup_repo() {
    local repo_dir="verium-explorer-deploy"
    
    if [ -d "$repo_dir" ]; then
        print_status "Updating existing repository..."
        cd "$repo_dir"
        git fetch origin
        git checkout "$BRANCH"
        git pull origin "$BRANCH"
    else
        print_status "Cloning repository..."
        git clone -b "$BRANCH" "$GIT_REPO_URL" "$repo_dir"
        cd "$repo_dir"
    fi
}

# Create environment file
setup_env() {
    if [ ! -f .env ]; then
        print_warning "Creating .env file from template..."
        if [ -f env.example ]; then
            cp env.example .env
            print_status "Created .env file from template."
            print_warning "Please edit .env file with your Verium node configuration:"
            print_info "  BTCEXP_BITCOIND_URI=bitcoin://rpcuser:rpcpassword@127.0.0.1:36988/"
            print_info "  BTCEXP_ADDRESS_API=electrum"
            print_info "  BTCEXP_ELECTRUM_SERVERS=tcp://127.0.0.1:50001"
        else
            print_error "env.example file not found. Please create a .env file manually."
            exit 1
        fi
    fi
}

# Build and deploy
deploy() {
    print_status "Building Verium RPC Explorer from Git repository..."
    docker-compose build --no-cache
    
    print_status "Starting Verium RPC Explorer..."
    docker-compose up -d
    
    print_status "Waiting for service to start..."
    sleep 15
    
    # Check if service is running
    if docker-compose ps | grep -q "Up"; then
        print_status "Verium RPC Explorer is running!"
        print_status "Access it at: http://localhost:$PORT"
        print_info "Container name: $CONTAINER_NAME"
        print_info "Image: $IMAGE_NAME"
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

# Update from Git
update() {
    print_status "Pulling latest changes from Git..."
    git pull origin "$BRANCH"
    
    print_status "Rebuilding and restarting..."
    docker-compose down
    docker-compose up -d --build
}

# Clean up everything
cleanup() {
    print_status "Stopping and removing containers..."
    docker-compose down -v
    
    print_status "Removing images..."
    docker rmi "$IMAGE_NAME" 2>/dev/null || true
    
    print_status "Cleanup complete."
}

# Main script
case "${1:-deploy}" in
    "deploy")
        check_docker
        setup_repo
        setup_env
        deploy
        ;;
    "stop")
        setup_repo
        stop
        ;;
    "restart")
        setup_repo
        stop
        deploy
        ;;
    "logs")
        setup_repo
        logs
        ;;
    "status")
        setup_repo
        status
        ;;
    "update")
        setup_repo
        update
        ;;
    "cleanup")
        setup_repo
        cleanup
        ;;
    "help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  deploy   - Clone from Git and start the explorer (default)"
        echo "  stop     - Stop the explorer"
        echo "  restart  - Restart the explorer"
        echo "  logs     - Show logs"
        echo "  status   - Show status"
        echo "  update   - Update from Git and restart"
        echo "  cleanup  - Stop, remove containers and images"
        echo "  help     - Show this help"
        echo ""
        echo "Git Repository: $GIT_REPO_URL"
        echo "Branch: $BRANCH"
        echo "Port: $PORT"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' for available commands"
        exit 1
        ;;
esac
