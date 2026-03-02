#!/bin/bash

# Development startup script for bol-outreach
# This script provides easy commands for Docker development

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="bol-outreach"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to start development environment
start_dev() {
    print_status "Starting bol-outreach development environment..."
    
    # Check if Docker is running
    check_docker
    
    # Build and start the development container
    docker-compose -f docker-compose.dev.yml up --build -d
    
    print_success "Development environment started!"
    print_status "Application available at: http://localhost:3000"
    print_status "To view logs: docker-compose -f docker-compose.dev.yml logs -f bol-outreach-dev"
    print_status "To stop: docker-compose -f docker-compose.dev.yml down"
}

# Function to stop development environment
stop_dev() {
    print_status "Stopping bol-outreach development environment..."
    
    docker-compose -f docker-compose.dev.yml down
    
    print_success "Development environment stopped!"
}

# Function to view logs
view_logs() {
    print_status "Viewing logs from bol-outreach development container..."
    
    docker-compose -f docker-compose.dev.yml logs -f bol-outreach-dev
}

# Function to attach to container
attach_container() {
    print_status "Attaching to bol-outreach development container..."
    
    docker-compose -f docker-compose.dev.yml exec bol-outreach-dev sh
}

# Function to run tests in container
run_tests() {
    print_status "Running tests in development container..."
    
    docker-compose -f docker-compose.dev.yml exec bol-outreach-dev npm test
}

# Function to run build in container
run_build() {
    print_status "Building project in development container..."
    
    docker-compose -f docker-compose.dev.yml exec bol-outreach-dev npm run build
}

# Function to clean up volumes
clean_volumes() {
    print_warning "This will remove all persistent data (database, logs, etc.)"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Cleaning up development volumes..."
        docker-compose -f docker-compose.dev.yml down -v
        print_success "Volumes cleaned up!"
    else
        print_status "Cleanup cancelled."
    fi
}

# Function to show help
show_help() {
    echo "Bol.com Outreach Development Environment"
    echo "========================================"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start     Start the development environment"
    echo "  stop      Stop the development environment"
    echo "  restart   Restart the development environment"
    echo "  logs      View container logs"
    echo "  attach    Attach to the development container"
    echo "  test      Run tests in the container"
    echo "  build     Build the project in the container"
    echo "  clean     Clean up persistent volumes (WARNING: removes data)"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start    # Start development environment"
    echo "  $0 logs     # View logs"
    echo "  $0 attach   # Open shell in container"
    echo ""
    echo "Environment:"
    echo "  Application: http://localhost:3000"
    echo "  Database: /app/data/bol-outreach.db (persisted)"
    echo ""
}

# Main script logic
case "${1:-help}" in
    start)
        start_dev
        ;;
    stop)
        stop_dev
        ;;
    restart)
        stop_dev
        sleep 2
        start_dev
        ;;
    logs)
        view_logs
        ;;
    attach)
        attach_container
        ;;
    test)
        run_tests
        ;;
    build)
        run_build
        ;;
    clean)
        clean_volumes
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac