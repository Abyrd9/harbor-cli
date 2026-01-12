#!/bin/bash
# Test script for Harbor Inter-Pane Communication
# Run this AFTER starting harbor with: harbor launch -d

set -e

echo "========================================"
echo "Harbor Inter-Pane Communication Tests"
echo "========================================"
echo ""

# Give services time to start
sleep 2

echo "1. Testing 'harbor hail' - Send command to repl"
echo "   Command: harbor hail repl 'echo Hello from hail'"
bun dist/index.js hail repl "echo Hello from hail"
echo ""

sleep 1

echo "2. Testing 'harbor survey' - Capture repl output"
echo "   Command: harbor survey repl --lines 10"
echo "   Output:"
bun dist/index.js survey repl --lines 10
echo ""

sleep 1

echo "3. Testing 'harbor parley' - Execute and capture response"
echo "   Command: harbor parley repl 'time'"
echo "   Response:"
bun dist/index.js parley repl "time" --timeout 2000
echo ""

sleep 1

echo "4. Testing parley with JSON response"
echo "   Command: harbor parley repl 'users'"
echo "   Response:"
bun dist/index.js parley repl "users" --timeout 2000
echo ""

sleep 1

echo "5. Testing parley with arguments"
echo "   Command: harbor parley repl 'add 42 58'"
echo "   Response:"
bun dist/index.js parley repl "add 42 58" --timeout 2000
echo ""

sleep 1

echo "6. Testing parley with slow command (needs longer timeout)"
echo "   Command: harbor parley repl 'slow 1500' --timeout 3000"
echo "   Response:"
bun dist/index.js parley repl "slow 1500" --timeout 3000
echo ""

echo "========================================"
echo "All tests completed!"
echo "========================================"
echo ""
echo "To test access control, switch to the web pane and try:"
echo "  harbor hail repl 'echo from web'     # Should work (web can access repl)"
echo "  harbor hail go-api 'anything'        # Should fail (web cannot access go-api)"
