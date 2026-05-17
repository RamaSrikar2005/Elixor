#!/bin/bash
# ═══════════════════════════════════════════
# ELIXOR OS — Setup Script
# Run: bash scripts/setup.sh
# ═══════════════════════════════════════════
set -e

echo "⚡ Setting up Elixor OS..."

# Backend
echo "→ Installing backend dependencies..."
cd backend
cp -n .env.example .env 2>/dev/null || true
npm install
echo "✓ Backend ready"

# Frontend
echo "→ Installing frontend dependencies..."
cd ../frontend
cp -n .env.example .env 2>/dev/null || true
npm install
echo "✓ Frontend ready"

cd ..
echo ""
echo "══════════════════════════════════════════"
echo "✅  Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit backend/.env  — set MONGO_URI, JWT_SECRET, OPENAI_API_KEY"
echo "  2. Edit frontend/.env — set VITE_API_URL if not localhost"
echo "  3. cd backend && npm run seed  (optional: loads demo data)"
echo "  4. cd backend && npm run dev   (Terminal 1)"
echo "  5. cd frontend && npm run dev  (Terminal 2)"
echo ""
echo "  OR run everything with Docker:"
echo "  docker-compose up --build"
echo "══════════════════════════════════════════"
