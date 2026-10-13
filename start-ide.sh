#!/usr/bin/env bash
# Start Plain Language React IDE with Rust backend
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

# Ensure PATH has cargo and node
export PATH="$HOME/.cargo/bin:$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -n 1)/bin:$PATH:/usr/local/bin:/usr/bin"

echo "🦀 Compiling Plain Rust binary..."
cargo build

echo "⚡ Starting Plain IDE on http://localhost:5173..."
cd ide
npm run dev
