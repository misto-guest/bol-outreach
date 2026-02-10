#!/bin/bash

# Bol.com Seller Intelligence Platform - Quick Start Script
# This script starts the platform on an available port

echo "🎯 Bol.com Seller Intelligence Platform"
echo "======================================="
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Find available port (try 3000-3005)
PORT=3000
while netstat -an | grep -q ":$PORT.*LISTEN"; do
    PORT=$((PORT + 1))
    if [ $PORT -gt 3005 ]; then
        echo "❌ Error: No available port found (tried 3000-3005)"
        echo "Please kill a process or specify a port: PORT=3006 node src/server.js"
        exit 1
    fi
done

echo "🚀 Starting platform on port $PORT..."
echo ""
echo "Dashboard: http://localhost:$PORT"
echo "API: http://localhost:$PORT/api/stats"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
PORT=$PORT node src/server.js
