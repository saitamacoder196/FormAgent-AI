#!/bin/bash

set -e

echo "🔄 Rebuilding FormAgent AI Backend..."

echo "🛑 Step 1: Stopping backend container..."
docker-compose stop backend

echo "🗑️  Step 2: Removing backend container..."
docker-compose rm -f backend

echo "🧹 Step 3: Removing backend images..."
docker-compose down --rmi local backend 2>/dev/null || true
docker image prune -f

echo "🔨 Step 4: Rebuilding backend..."
docker-compose build --no-cache backend

echo "📊 Step 5: Ensuring MongoDB is running..."
docker-compose up -d mongodb

echo "⏳ Waiting for MongoDB to be healthy..."
until docker-compose ps mongodb | grep -q "healthy"; do
  echo "Waiting for MongoDB..."
  sleep 5
done
echo "✅ MongoDB is ready!"

echo "🚀 Step 6: Starting rebuilt backend..."
docker-compose up -d backend

echo "⏳ Waiting for Backend to be ready..."
sleep 15

echo "🔍 Checking backend status..."
docker-compose ps backend

echo ""
echo "✅ Backend rebuild completed!"
echo ""
echo "🔧 Backend API: http://localhost:5000"
echo "📊 Backend logs: docker-compose logs -f backend"
echo "🖥️  Backend status: docker-compose ps backend"
echo ""