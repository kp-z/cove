#!/bin/bash

BASE_URL="http://localhost:3001/trpc"
ADAPTER_ID="5d6822ff-43a4-443b-a5eb-65d5015a445c"

echo "=== Testing Adapter API ==="
echo ""

echo "1. Get Adapter by ID:"
curl -s "${BASE_URL}/adapter.getById?input=%7B%22adapterId%22%3A%22${ADAPTER_ID}%22%2C%22actorId%22%3A%22kp%22%7D" | jq '.'
echo ""

echo "2. List all adapters:"
curl -s "${BASE_URL}/adapter.list?input=%7B%22actorId%22%3A%22kp%22%7D" | jq '.'
echo ""

echo "3. Get agent with adapter info:"
AGENT_ID="agent-1778995920870-uvd53im"
curl -s "${BASE_URL}/agent.getById?input=%7B%22agentId%22%3A%22${AGENT_ID}%22%7D" | jq '.result.data | {agent_id, name, runtime: {adapter_id}, adapter}'
