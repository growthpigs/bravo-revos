#!/bin/bash
# Run Python unit tests for Holy Grail Chat

set -e

echo "🧪 Running Holy Grail Chat Phase 2 Python Tests"
echo "================================================"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
HGC_ROOT="$SCRIPT_DIR/.."

# Activate virtual environment if it exists
if [ -d "$HGC_ROOT/venv" ]; then
  echo "📦 Activating virtual environment..."
  source "$HGC_ROOT/venv/bin/activate"
fi

# Install test dependencies if needed
echo "📦 Checking dependencies..."
python3.11 -c "import unittest" 2>/dev/null || {
  echo "⚠️  unittest not available (should be standard library)"
  exit 1
}

echo ""
echo "🔍 Running unit tests..."
echo ""

# Run all tests
cd "$SCRIPT_DIR"
/opt/homebrew/bin/python3.11 -m unittest discover -s . -p "test_*.py" -v

echo ""
echo "✅ All Python tests completed!"
