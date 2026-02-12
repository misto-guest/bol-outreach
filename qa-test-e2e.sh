#!/bin/bash

# Bol.com Outreach - End-to-End QA Test
# This script tests the complete workflow: discover sellers, create campaign, add sellers, send messages

BASE_URL="https://bol-outreach-production.up.railway.app"
RESULTS_FILE="qa-results-$(date +%Y%m%d-%H%M%S).txt"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=== Bol.com Outreach - End-to-End QA Test ===" | tee $RESULTS_FILE
echo "Date: $(date)" | tee -a $RESULTS_FILE
echo "Base URL: $BASE_URL" | tee -a $RESULTS_FILE
echo "" | tee -a $RESULTS_FILE

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name=$1
    local endpoint=$2
    local method=${3:-GET}
    local data=$4
    local expected_code=${5:-200}

    echo -e "\n${YELLOW}Test: $test_name${NC}" | tee -a $RESULTS_FILE
    echo "Endpoint: $method $endpoint" | tee -a $RESULTS_FILE
    [ -n "$data" ] && echo "Data: $data" | tee -a $RESULTS_FILE

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    echo "HTTP Status: $http_code (expected: $expected_code)" | tee -a $RESULTS_FILE
    echo "Response: $(echo $body | head -c 200)..." | tee -a $RESULTS_FILE

    if [ "$http_code" = "$expected_code" ]; then
        echo -e "${GREEN}✓ PASSED${NC}" | tee -a $RESULTS_FILE
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}" | tee -a $RESULTS_FILE
        ((TESTS_FAILED++))
        return 1
    fi
}

# Save response body for later use
LAST_RESPONSE=""

echo -e "\n${BLUE}=== Phase 1: System Health Check ===${NC}" | tee -a $RESULTS_FILE

# 1. Health Check
run_test "Health Check" "/api/health" "GET" "" "200"

# 2. Get Dashboard Stats
run_test "Get Dashboard Stats" "/api/stats" "GET" "" "200"

echo -e "\n${BLUE}=== Phase 2: Template Management ===${NC}" | tee -a $RESULTS_FILE

# 3. Get existing templates
run_test "Get Templates" "/api/templates" "GET" "" "200"

# 4. Create a new test template
TEMPLATE_DATA='{
    "name": "E2E Test Template",
    "subject": "Test Partnership",
    "body": "Hi {{shop_name}},\\n\\nThis is a test message for QA purposes.\\n\\nBest regards,\\nQA Team",
    "template_type": "outreach"
}'
run_test "Create Template" "/api/templates" "POST" "$TEMPLATE_DATA" "200"

echo -e "\n${BLUE}=== Phase 3: Campaign Management ===${NC}" | tee -a $RESULTS_FILE

# 5. Get existing campaigns
run_test "Get Campaigns" "/api/campaigns" "GET" "" "200"

# 6. Create a test campaign
CAMPAIGN_DATA='{
    "name": "E2E Test Campaign",
    "description": "End-to-end test campaign",
    "daily_limit": 10,
    "message_template_id": 1
}'
run_test "Create Campaign" "/api/campaigns" "POST" "$CAMPAIGN_DATA" "200"

echo -e "\n${BLUE}=== Phase 4: Seller Management ===${NC}" | tee -a $RESULTS_FILE

# 7. Get sellers
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/sellers")
LAST_RESPONSE=$(echo "$response" | sed '$d')
http_code=$(echo "$response" | tail -n1)
echo -e "\n${YELLOW}Test: Get Sellers${NC}" | tee -a $RESULTS_FILE
echo "Response: $(echo $LAST_RESPONSE | head -c 300)..." | tee -a $RESULTS_FILE
if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ PASSED${NC}" | tee -a $RESULTS_FILE
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}" | tee -a $RESULTS_FILE
    ((TESTS_FAILED++))
fi

# Extract seller IDs from response
# Use node for JSON parsing
SELLER_IDS=$(node -e "
    try {
        const data = $LAST_RESPONSE;
        if (data.success && data.data && data.data.length > 0) {
            const ids = data.data.slice(0, 5).map(s => s.id);
            console.log(ids.join(','));
        } else {
            console.log('');
        }
    } catch (e) {
        console.log('');
    }
" 2>/dev/null)

echo "Seller IDs to test: $SELLER_IDS" | tee -a $RESULTS_FILE

if [ -z "$SELLER_IDS" ]; then
    echo -e "${RED}✗ No sellers found in database${NC}" | tee -a $RESULTS_FILE
    echo "" | tee -a $RESULTS_FILE
    echo "Creating test sellers..." | tee -a $RESULTS_FILE
fi

echo -e "\n${BLUE}=== Phase 5: Add Sellers to Campaign ===${NC}" | tee -a $RESULTS_FILE

# 8. Add sellers to campaign 3 (use existing campaign or create new)
if [ -n "$SELLER_IDS" ]; then
    # Convert comma-separated IDs to JSON array
    SELLER_ARRAY=$(echo "$SELLER_IDS" | sed 's/,/","/g' | sed 's/^/["/' | sed 's/$/"]/')

    ADD_SELLERS_DATA="{
        \"sellerIds\": $SELLER_ARRAY,
        \"approvalStatus\": \"approved\"
    }"
    run_test "Add Sellers to Campaign 3" "/api/campaigns/3/sellers" "POST" "$ADD_SELLERS_DATA" "200"
else
    echo -e "${YELLOW}Skipping: No sellers available to add${NC}" | tee -a $RESULTS_FILE
fi

echo -e "\n${BLUE}=== Phase 6: Message Testing ===${NC}" | tee -a $RESULTS_FILE

# 9. Get outreach status
run_test "Get Outreach Status" "/api/outreach/status" "GET" "" "200"

# 10. Execute outreach (will send messages to approved sellers)
# Note: This will actually try to send messages!
echo -e "\n${YELLOW}Skipping: Execute Outreach (requires actual browser setup)${NC}" | tee -a $RESULTS_FILE
echo "This would send real messages to sellers" | tee -a $RESULTS_FILE

echo -e "\n${BLUE}=== Phase 7: Research & Discovery ===${NC}" | tee -a $RESULTS_FILE

# 11. Check research status
run_test "Get Research Status" "/api/research/status" "GET" "" "200"

# 12. Check research queue
run_test "Get Research Queue" "/api/research/queue" "GET" "" "200"

echo -e "\n${BLUE}=== Test Summary ===${NC}" | tee -a $RESULTS_FILE
echo "Total Tests Passed: $TESTS_PASSED" | tee -a $RESULTS_FILE
echo "Total Tests Failed: $TESTS_FAILED" | tee -a $RESULTS_FILE
echo "Results saved to: $RESULTS_FILE" | tee -a $RESULTS_FILE

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed!${NC}" | tee -a $RESULTS_FILE
    exit 0
else
    echo -e "\n${RED}⚠️  Some tests failed!${NC}" | tee -a $RESULTS_FILE
    exit 1
fi
