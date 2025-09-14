#!/bin/bash

# replace-frontend.sh - Replace legacy frontend with React version

set -e

echo "🔄 Replacing legacy frontend with React version..."

# Step 1: Create backup of legacy files
echo "📦 Creating backup of legacy files..."
mkdir -p backup/legacy-frontend
cp index.html backup/legacy-frontend/ 2>/dev/null || true
cp main.js backup/legacy-frontend/ 2>/dev/null || true
cp -r styles/ backup/legacy-frontend/ 2>/dev/null || true
cp *.js backup/legacy-frontend/ 2>/dev/null || true
cp *.css backup/legacy-frontend/ 2>/dev/null || true

echo "✅ Backup created in backup/legacy-frontend/"

# Step 2: Build React frontend
echo "🏗️ Building React frontend..."
cd frontend
npm install
npm run build
cd ..

echo "✅ React build completed"

# Step 3: Remove legacy files (but keep important ones)
echo "🗑️ Removing legacy files..."

# Remove legacy HTML/JS frontend files
rm -f index.html
rm -f main.js

# Remove legacy UI modules (already backed up)
rm -f auth-ui-manager.js 2>/dev/null || true
rm -f slide-manager.js 2>/dev/null || true
rm -f text-manager.js 2>/dev/null || true
rm -f event-handlers.js 2>/dev/null || true
rm -f collapsible-groups.js 2>/dev/null || true

# Keep these files (important):
# - api-client.js (React needs this)
# - package.json
# - wrangler.toml  
# - worker/ directory
# - server/ directory
# - All config files

echo "🗑️ Legacy files removed"

# Step 4: Move React build to root
echo "📂 Moving React build to root level..."

# Copy React build files to root
cp frontend/dist/index.html .
cp -r frontend/dist/assets . 2>/dev/null || true
cp -r frontend/dist/static . 2>/dev/null || true

# Copy other static files if they exist
cp frontend/dist/* . 2>/dev/null || true

echo "✅ React files moved to root"

# Step 5: Update paths in index.html for root deployment
echo "🔧 Updating paths in index.html..."

# Update asset paths to work from root
sed -i.bak 's|="/assets/|="./assets/|g' index.html 2>/dev/null || \
sed -i.bak 's|="/assets/|="./assets/|g' index.html

# Remove backup file created by sed
rm -f index.html.bak

echo "✅ Paths updated"

# Step 6: Copy necessary static files
echo "📄 Copying necessary static files..."

# Copy styles.css if your React app needs it
if [ -f "frontend/public/styles.css" ]; then
    cp frontend/public/styles.css .
    echo "✅ Copied styles.css"
fi

# Copy other public assets
if [ -d "frontend/public" ]; then
    cp -r frontend/public/* . 2>/dev/null || true
    echo "✅ Copied public assets"
fi

echo ""
echo "🎉 Frontend replacement complete!"
echo ""
echo "✅ What was done:"
echo "  - Legacy files backed up to backup/legacy-frontend/"
echo "  - React app built and moved to root level"
echo "  - Legacy HTML/JS files removed"
echo "  - Asset paths updated for root deployment"
echo ""
echo "🚀 Your React app is now the main frontend!"
echo ""
echo "Next steps:"
echo "1. Test your app locally: npx http-server -p 3000"
echo "2. If working, deploy to Cloudflare: ./deploy-react.sh"
echo "3. If issues, restore from backup: ./restore-frontend.sh"