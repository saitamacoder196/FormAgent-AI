#!/bin/bash

set -e

echo "🚀 Starting FormAgent AI application..."

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

echo "🎨 Step 4: Starting Frontend..."
cd /data/data/com.termux/files/home/FormAgent-AI
npm install
npm run dev &

echo "⏳ Waiting for Frontend to start..."
sleep 10

echo ""
echo "🎉 FormAgent AI is now running!"
echo ""
echo "📊 MongoDB: http://localhost:27017"
echo "🖥️  Mongo Express: http://localhost:8081"
echo "🔧 Backend API: http://localhost:5000"
echo "🎨 Frontend: http://localhost:3000"
echo ""
echo "ℹ️  Use 'docker-compose logs -f' to view container logs"
echo "ℹ️  Use 'docker-compose ps' to check container status"
echo ""