#!/bin/bash

# Verium RPC Explorer - Native Setup Script
# This script sets up the Verium explorer to run natively without Docker

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
PORT="3003"
APP_DIR="verium-explorer"
PM2_APP_NAME="verium-explorer"

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

# Detect operating system
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/debian_version ]; then
            OS="debian"
        elif [ -f /etc/redhat-release ]; then
            OS="redhat"
        else
            OS="linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        OS="windows"
    else
        OS="unknown"
    fi
    print_info "Detected OS: $OS"
}

# Check if Node.js is installed
check_nodejs() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        print_info "Visit: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version $NODE_VERSION is too old. Please install Node.js 18+ first."
        exit 1
    fi
    
    print_status "Node.js version: $(node --version)"
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    print_status "npm version: $(npm --version)"
}

# Install system dependencies
install_dependencies() {
    print_status "Installing system dependencies..."
    
    case $OS in
        "debian")
            sudo apt-get update
            sudo apt-get install -y build-essential python3 git curl
            ;;
        "redhat")
            sudo yum groupinstall -y "Development Tools"
            sudo yum install -y python3 git curl
            ;;
        "macos")
            if ! command -v brew &> /dev/null; then
                print_warning "Homebrew not found. Please install Homebrew first."
                print_info "Visit: https://brew.sh/"
                exit 1
            fi
            brew install git
            ;;
        "windows")
            print_info "Please ensure Git and build tools are installed on Windows."
            ;;
        *)
            print_warning "Unknown OS. Please install build tools manually."
            ;;
    esac
}

# Clone repository
clone_repo() {
    if [ -d "$APP_DIR" ]; then
        print_status "Updating existing repository..."
        cd "$APP_DIR"
        git fetch origin
        git checkout "$BRANCH"
        git pull origin "$BRANCH"
    else
        print_status "Cloning repository..."
        git clone -b "$BRANCH" "$GIT_REPO_URL" "$APP_DIR"
        cd "$APP_DIR"
    fi
}

# Install Node.js dependencies
install_node_deps() {
    print_status "Installing Node.js dependencies..."
    npm install
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

# Create logs directory
setup_logs() {
    mkdir -p logs
    print_status "Created logs directory."
}

# Install PM2
install_pm2() {
    if ! command -v pm2 &> /dev/null; then
        print_status "Installing PM2..."
        npm install -g pm2
    else
        print_status "PM2 is already installed."
    fi
}

# Create PM2 ecosystem file
create_pm2_config() {
    print_status "Creating PM2 ecosystem configuration..."
    
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$PM2_APP_NAME',
    script: 'bin/www',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      BTCEXP_COIN: 'VRM',
      BTCEXP_HOST: '0.0.0.0',
      BTCEXP_PORT: '$PORT',
      BTCEXP_DISPLAY_CURRENCY: 'vrm',
      BTCEXP_UI_THEME: 'dark'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF
}

# Start with PM2
start_pm2() {
    print_status "Starting Verium RPC Explorer with PM2..."
    pm2 start ecosystem.config.js --env production
    
    print_status "Saving PM2 configuration..."
    pm2 save
    
    print_status "Setting up PM2 startup..."
    pm2 startup
}

# Test the application
test_app() {
    print_status "Testing application..."
    sleep 5
    
    if curl -f http://localhost:$PORT/ > /dev/null 2>&1; then
        print_status "Verium RPC Explorer is running!"
        print_status "Access it at: http://localhost:$PORT"
    else
        print_warning "Application may not be ready yet. Check logs with: pm2 logs $PM2_APP_NAME"
    fi
}

# Show status
show_status() {
    print_status "PM2 Status:"
    pm2 status
    
    print_info "Useful commands:"
    print_info "  pm2 logs $PM2_APP_NAME    - View logs"
    print_info "  pm2 restart $PM2_APP_NAME - Restart application"
    print_info "  pm2 stop $PM2_APP_NAME    - Stop application"
    print_info "  pm2 monit                  - Monitor resources"
}

# Main setup function
setup() {
    print_status "Setting up Verium RPC Explorer (Native)"
    print_info "Repository: $GIT_REPO_URL"
    print_info "Branch: $BRANCH"
    print_info "Port: $PORT"
    
    detect_os
    check_nodejs
    check_npm
    install_dependencies
    clone_repo
    install_node_deps
    setup_env
    setup_logs
    install_pm2
    create_pm2_config
    start_pm2
    test_app
    show_status
}

# Stop application
stop() {
    print_status "Stopping Verium RPC Explorer..."
    pm2 stop $PM2_APP_NAME
}

# Restart application
restart() {
    print_status "Restarting Verium RPC Explorer..."
    pm2 restart $PM2_APP_NAME
}

# Show logs
logs() {
    pm2 logs $PM2_APP_NAME
}

# Show status
status() {
    pm2 status
}

# Update from Git
update() {
    print_status "Updating from Git repository..."
    git pull origin $BRANCH
    npm install
    pm2 restart $PM2_APP_NAME
}

# Cleanup
cleanup() {
    print_status "Stopping and removing application..."
    pm2 stop $PM2_APP_NAME
    pm2 delete $PM2_APP_NAME
    pm2 save
}

# Main script
case "${1:-setup}" in
    "setup")
        setup
        ;;
    "stop")
        stop
        ;;
    "restart")
        restart
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
    "cleanup")
        cleanup
        ;;
    "help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  setup    - Complete setup (default)"
        echo "  stop     - Stop the application"
        echo "  restart  - Restart the application"
        echo "  logs     - Show logs"
        echo "  status   - Show status"
        echo "  update   - Update from Git and restart"
        echo "  cleanup  - Stop and remove application"
        echo "  help     - Show this help"
        echo ""
        echo "Repository: $GIT_REPO_URL"
        echo "Branch: $BRANCH"
        echo "Port: $PORT"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' for available commands"
        exit 1
        ;;
esac
