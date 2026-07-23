#!/usr/bin/env bash
# ==============================================================================
# Shreeji Facility Services - EMS & AI Workforce Intelligence Quick Start Script
# Backend: Node.js (Express) | Frontend: React (Vite) | Database: PostgreSQL
# ==============================================================================
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "===================================================================="
echo " 🏢 Shreeji Facility Services - EMS & AI Platform (Node.js + React)"
echo "===================================================================="

# Determine container engine (podman or docker) for PostgreSQL
CONTAINER_CMD=""
if command -v podman &> /dev/null; then
    CONTAINER_CMD="podman"
elif command -v docker &> /dev/null; then
    CONTAINER_CMD="docker"
fi

if [ -n "$CONTAINER_CMD" ]; then
    # 1. Start PostgreSQL container if not running
    if ! $CONTAINER_CMD ps --format '{{.Names}}' | grep -q "ems_postgres"; then
        if $CONTAINER_CMD ps -a --format '{{.Names}}' | grep -q "ems_postgres"; then
            echo "🚀 Starting existing PostgreSQL container (ems_postgres)..."
            $CONTAINER_CMD start ems_postgres
        else
            echo "📦 Launching PostgreSQL container (ems_postgres)..."
            $CONTAINER_CMD run -d \
                --name ems_postgres \
                -e POSTGRES_DB=ems_db \
                -e POSTGRES_USER=ems_user \
                -e POSTGRES_PASSWORD=ems_password \
                -p 5432:5432 \
                postgres:16-alpine
        fi
    else
        echo "✅ PostgreSQL is running on port 5432."
    fi
fi

# 2. Start Node.js Express Backend
echo "🚀 Starting Node.js Express Backend on http://localhost:8080..."
cd "$DIR/backend"
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend npm packages..."
    npm install
fi

# Ensure port 8080 is clear
fuser -k 8080/tcp 2>/dev/null || true

node src/server.js &
BACKEND_PID=$!

# Ensure backend terminates when script exits
cleanup() {
    echo ""
    echo "🛑 Shutting down backend (PID: $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null || true
}
trap cleanup EXIT INT TERM

sleep 2
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Failed to start backend server. Please check database connectivity."
    exit 1
fi
echo "✅ Backend is healthy and running on http://localhost:8080."

# 3. Start React Frontend
echo "🌐 Starting React Frontend Dev Server on http://localhost:5173..."
cd "$DIR/frontend"
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend npm packages..."
    npm install
fi

echo ""
echo "===================================================================="
echo "🎉 DEMO PLATFORM IS READY!"
echo "===================================================================="
echo "👉 Frontend App:  http://localhost:5173"
echo "👉 Backend API:   http://localhost:8080"
echo ""
echo "🔑 DEFAULT LOGIN CREDENTIALS:"
echo "   - Super Admin:       admin       / admin123"
echo "   - HR Manager:        hr_manager  / hr123"
echo "   - HR Staff:          hr_staff    / staff123"
echo "   - Accounts User:     accounts    / acc123"
echo "   - Self-Service Staff: suresh     / suresh123"
echo ""
echo "🧠 4-PILLAR APPLIED AI ARCHITECTURE TO DEMONSTRATE:"
echo "   - Click 'Insights' in the left sidebar"
echo "   - Tab 1: Manager Decision Co-pilot (Autonomous Re-Act Tool Calling Loop)"
echo "   - Tab 2: Grievance Intelligence Desk (Instant triage & on-demand AI memo)"
echo "   - Tab 3: Workforce Attrition Radar (5-Factor XAI Attribution & Anomaly Alerts)"
echo "   - Tab 4: What-If Simulation Sandbox (Adjust live parameters with 0-token math)"
echo "   - Top Banner: Click 'Generate AI Operations Briefing' for Gemini 2.5 Flash synthesis!"
echo "   NOTE: Page load runs 100% locally with 0 API tokens to preserve free quota!"
echo "===================================================================="
echo ""

npm run dev
