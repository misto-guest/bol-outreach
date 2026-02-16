#!/bin/bash
# Test bol.com Outreach API Endpoints

BASE_URL="https://bol-outreach-production.up.railway.app"

echo "🧪 Testing Bol.com Outreach API Endpoints"
echo "=========================================="
echo ""

# Test 1: Health Check
echo "Test 1: Health Check"
echo "GET /api/health"
curl -s "$BASE_URL/api/health" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/health"
echo ""
echo ""

# Test 2: Get Stats
echo "Test 2: Get Stats"
echo "GET /api/stats"
curl -s "$BASE_URL/api/stats" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/stats"
echo ""
echo ""

# Test 3: Get Sellers
echo "Test 3: Get Sellers"
echo "GET /api/sellers"
curl -s "$BASE_URL/api/sellers" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/sellers"
echo ""
echo ""

# Test 4: Get Campaigns
echo "Test 4: Get Campaigns"
echo "GET /api/campaigns"
curl -s "$BASE_URL/api/campaigns" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/campaigns"
echo ""
echo ""

# Test 5: Get Templates
echo "Test 5: Get Templates"
echo "GET /api/templates"
curl -s "$BASE_URL/api/templates" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/templates"
echo ""
echo ""

# Test 6: CRITICAL - Add Sellers to Campaign
echo "Test 6: CRITICAL - Add Sellers to Campaign"
echo "POST /api/campaigns/3/sellers"
echo "Expected: 200 OK with created records"
echo "Actual:"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/campaigns/3/sellers" \
  -H "Content-Type: application/json" \
  -d '{"sellerIds":[4,5],"approvalStatus":"approved"}')
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if response contains HTML (error) or JSON (success)
if echo "$RESPONSE" | grep -q "Cannot POST"; then
    echo "❌ FAILED: Endpoint returns 404"
    echo "🔧 Fix needed: Trigger Railway redeploy"
else
    echo "✅ PASSED: Endpoint is working"
fi
echo ""

# Test 7: Research Status
echo "Test 7: Research Status"
echo "GET /api/research/status"
curl -s "$BASE_URL/api/research/status" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/research/status"
echo ""
echo ""

# Test 8: Outreach Status
echo "Test 8: Outreach Status"
echo "GET /api/outreach/status"
curl -s "$BASE_URL/api/outreach/status" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/outreach/status"
echo ""
echo ""

echo "=========================================="
echo "✅ Testing complete"
echo ""
echo "Summary:"
echo "- If Test 6 shows 404: Latest code not deployed"
echo "- Solution: Trigger Railway redeploy or push empty commit"
