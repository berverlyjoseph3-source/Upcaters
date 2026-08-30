#!/bin/bash
# scripts/setup.sh - Run this to set up the entire platform

#!/bin/bash
# scripts/setup.sh - Run this to set up the entire platform

echo "🚀 AI Agent Platform Setup Script"
echo "================================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 20+"
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm"
    exit 1
fi

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL not found. Installing via Docker..."
    docker run --name aiagent-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=aiagent_dev -p 5432:5432 -d pgvector/pgvector:pg16
fi

# Check Redis
if ! command -v redis-cli &> /dev/null; then
    echo "⚠️  Redis not found. Installing via Docker..."
    docker run --name aiagent-redis -p 6379:6379 -d redis:7-alpine
fi

# Check MongoDB
if ! command -v mongosh &> /dev/null; then
    echo "⚠️  MongoDB not found. Installing via Docker..."
    docker run --name aiagent-mongodb -p 27017:27017 -d mongo:7
fi

echo "✅ Prerequisites satisfied"
echo ""

# Create environment files
echo "📝 Creating environment files..."

if [ ! -f "apps/api/.env" ]; then
    cp apps/api/.env.example apps/api/.env 2>/dev/null || echo "Creating apps/api/.env..."
    cat > apps/api/.env << 'EOF'
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aiagent_dev
REDIS_URL=redis://localhost:6379
MONGODB_URL=mongodb://localhost:27017/aiagent_dev
JWT_SECRET=dev_jwt_secret_32_chars_long_123456
JWT_REFRESH_SECRET=dev_refresh_secret_32_chars_long_789012
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef
EOF
fi

if [ ! -f "apps/frontend/.env" ]; then
    cp apps/frontend/.env.example apps/frontend/.env 2>/dev/null || echo "Creating apps/frontend/.env..."
    cat > apps/frontend/.env << 'EOF'
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
EOF
fi

echo "✅ Environment files created"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."

echo "  - API dependencies..."
cd apps/api
npm install

echo "  - Frontend dependencies..."
cd ../frontend
npm install

cd ../..

echo "✅ Dependencies installed"
echo ""

# Setup database
echo "🗄️  Setting up database..."

cd apps/api

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed database
npx prisma db seed

cd ../..

echo "✅ Database setup complete"
echo ""

# Build the application
echo "🔨 Building application..."

echo "  - Building API..."
cd apps/api
npm run build

echo "  - Building Frontend..."
cd ../frontend
npm run build

cd ../..

echo "✅ Build complete"
echo ""

# Create start script
echo "📜 Creating start script..."

cat > start-dev.sh << 'EOF'
#!/bin/bash

echo "Starting AI Agent Platform in development mode..."
echo ""

# Start API in background
cd apps/api
npm run dev &
API_PID=$!

# Start Frontend
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=================================================="
echo "✨ AI Agent Platform is starting!"
echo "=================================================="
echo ""
echo "📍 API: http://localhost:3000"
echo "📍 Frontend: http://localhost:3001"
echo "📍 Prisma Studio: http://localhost:5555"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for Ctrl+C
trap 'kill $API_PID $FRONTEND_PID; exit' INT
wait
EOF

chmod +x start-dev.sh

echo "✅ Start script created (./start-dev.sh)"
echo ""

echo "=================================================="
echo "🎉 Setup complete!"
echo "=================================================="
echo ""
echo "To start the platform:"
echo "  ./start-dev.sh"
echo ""
echo "Or start manually:"
echo "  Terminal 1: cd apps/api && npm run dev"
echo "  Terminal 2: cd apps/frontend && npm run dev"
echo ""
echo "To run database migrations:"
echo "  cd apps/api && npx prisma migrate dev"
echo ""
echo "To open Prisma Studio:"
echo "  cd apps/api && npx prisma studio"
echo ""