#!/bin/bash

echo "🚀 Clockit API Setup Test Script"
echo "=================================="
echo ""

echo "1️⃣ Checking Node.js version..."
node_version=$(node -v)
echo "   Node.js version: $node_version"
if [[ ! "$node_version" =~ ^v(1[8-9]|[2-9][0-9]) ]]; then
  echo "   ❌ Node.js 18+ required"
  exit 1
fi
echo "   ✅ Node.js version OK"
echo ""

echo "2️⃣ Checking environment variables..."
if [ ! -f ".env.local" ]; then
  echo "   ❌ .env.local not found"
  echo "   Please create .env.local from .env.example"
  exit 1
fi
echo "   ✅ .env.local exists"

if grep -q "your_base64_encoded_service_account_json" .env.local; then
  echo "   ⚠️  Warning: FIREBASE_SERVICE_ACCOUNT_B64 appears to be placeholder"
fi
echo ""

echo "3️⃣ Installing dependencies..."
npm install --silent
if [ $? -eq 0 ]; then
  echo "   ✅ Dependencies installed"
else
  echo "   ❌ Failed to install dependencies"
  exit 1
fi
echo ""

echo "4️⃣ TypeScript compilation check..."
npx tsc --noEmit
if [ $? -eq 0 ]; then
  echo "   ✅ TypeScript compiles successfully"
else
  echo "   ❌ TypeScript errors found"
  exit 1
fi
echo ""

echo "5️⃣ Starting server (will run for 5 seconds)..."
timeout 5s npm run dev > /dev/null 2>&1 &
SERVER_PID=$!
sleep 3

echo "6️⃣ Testing health endpoint..."
response=$(curl -s http://localhost:3001/api/v1/health)
if [[ "$response" == *"ok"* ]]; then
  echo "   ✅ Health endpoint responding"
  echo "   Response: $response"
else
  echo "   ❌ Health endpoint not responding"
  kill $SERVER_PID 2>/dev/null
  exit 1
fi

kill $SERVER_PID 2>/dev/null
echo ""

echo "=================================="
echo "✅ All checks passed!"
echo ""
echo "Next steps:"
echo "  1. Start backend: npm run dev"
echo "  2. Start frontend: cd ../clockit_website && npm run dev"
echo "  3. Test token creation at http://localhost:3000/profile"
