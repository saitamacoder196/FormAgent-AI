#!/usr/bin/env bash

echo "🛑 Stopping FormAgent AI..."

echo "📋 Stopping frontend processes..."
pkill -f "npm run dev" || true
pkill -f "npm run preview" || true
pkill -f "vite" || true

echo "🐳 Stopping Docker containers..."
docker-compose down

echo "✅ All services stopped!"

echo ""
echo "📊 To check if any processes are still running:"
echo "   ps aux | grep -E 'npm|node|vite' | grep -v grep"
echo ""
echo "🚀 To restart:"
echo "   ./restart.sh        (Development mode)"
echo "   ./start-production.sh (Production mode)"
echo ""