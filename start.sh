#!/bin/bash
# Railway startup script - Ensures data directory exists

echo "🚀 Starting Bol.com Outreach Tool..."

# Create data directory if it doesn't exist
mkdir -p /app/data

echo "✅ Data directory ready: /app/data"

# Load environment variables from .env file
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
  echo "✅ Environment variables loaded from .env"
fi

# Start the application
echo "🌐 Starting server..."
node src/server.js
