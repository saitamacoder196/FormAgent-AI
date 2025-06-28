#!/usr/bin/env bash

set -e

echo "🚀 Starting FormAgent AI in PRODUCTION mode..."

echo "🐳 Checking Docker status..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    echo "💡 Please start Docker Desktop and try again."
    exit 1
fi
echo "✅ Docker is running!"

echo "🛑 Stopping any existing processes..."
pkill -f "npm run" || true
docker-compose down

echo "📊 Step 1: Starting MongoDB..."
docker-compose up -d mongodb

echo "⏳ Waiting for MongoDB to be healthy..."
until docker-compose ps mongodb | grep -q "healthy"; do
  echo "Waiting for MongoDB..."
  sleep 5
done
echo "✅ MongoDB is ready!"

echo "🖥️  Step 2: Starting Mongo Express..."
docker-compose up -d mongo-express

echo "⏳ Waiting for Mongo Express to be ready..."
sleep 10
echo "✅ Mongo Express is ready!"

echo "🔧 Step 3: Building and starting Backend..."
docker-compose build backend
docker-compose up -d backend

echo "⏳ Waiting for Backend to be ready..."
sleep 15
echo "✅ Backend is ready!"

echo "🎨 Step 4: Building Frontend for Production..."
npm install
npm run build

echo "🚀 Step 5: Starting Frontend Production Server..."
npm run preview &

echo "⏳ Waiting for Frontend to start..."
sleep 10

echo ""
echo "🎉 FormAgent AI is running in PRODUCTION mode!"
echo ""
echo "📊 MongoDB: http://localhost:27017"
echo "🖥️  Mongo Express: http://localhost:8081"
echo "🔧 Backend API: http://localhost:5000"
echo "🎨 Frontend: http://localhost:4173 (Production build)"
echo ""
echo "ℹ️  To stop frontend: pkill -f 'npm run preview'"
echo ""