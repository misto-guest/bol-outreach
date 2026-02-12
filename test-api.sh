#!/bin/bash

# Bol.com Outreach Tool - API Test Script
# Tests all major functionality for QA

BASE_URL="https://bol-outreach-production.up.railway.app"
RESULTS_FILE="test-results-$(date +%Y%m%d-%H%M%S).txt"

echo "=== Bol.com Outreach API Test ===" | tee $RESULTS_FILE
echo "Date: $(date)" | tee -a $RESULTS_FILE
echo "Base URL: $BASE_URL" | tee -a $RESULTS_FILE
echo "" | tee -a $RESULTS_FILE

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name=$1
    local endpoint=$2
    local method=${3:-GET}
    local data=$4

    echo -e "\n${YELLOW}Testing: $test_name${NC}" | tee -a $RESULTS_FILE
    echo "Endpoint: $method $endpoint" | tee -a $RESULTS_FILE

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    echo "HTTP Status: $http_code" | tee -a $RESULTS_FILE
    echo "Response: $body" | tee -a $RESULTS_FILE

    if [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ PASSED${NC}" | tee -a $RESULTS_FILE
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}" | tee -a $RESULTS_FILE
        ((TESTS_FAILED++))
    fi
}

# 1. Health Check
run_test "Health Check" "/api/health"

# 2. Get Dashboard Stats
run_test "Dashboard Stats" "/api/stats"

# 3. Get Sellers
run_test "Get All Sellers" "/api/sellers"

# 4. Get Campaigns
run_test "Get All Campaigns" "/api/campaigns"

# 5. Get Templates
run_test "Get All Templates" "/api/templates"

# 6. Create Test Template
echo -e "\n${YELLOW}Testing: Create Test Template${NC}" | tee -a $RESULTS_FILE
template_data='{
    "name": "QA Test Template",
    "subject": "Test Subject",
    "body": "Hello {{seller_name}}, this is a test message."
}'
run_test "Create Template" "/api/templates" "POST" "$template_data"

# 7. Create Test Campaign
echo -e "\n${YELLOW}Testing: Create Test Campaign${NC}" | tee -a $RESULTS_FILE
campaign_data='{
    "name": "QA Test Campaign",
    "description": "Test campaign for QA"
}'
run_test "Create Campaign" "/api/campaigns" "POST" "$campaign_data"

# 8. Test Seller Discovery Trigger
echo -e "\n${YELLOW}Testing: Seller Discovery Trigger${NC}" | tee -a $RESULTS_FILE
discovery_data='{
    "keyword": "powerbank",
    "max_sellers": 5
}'
run_test "Trigger Seller Discovery" "/api/research/discover" "POST" "$discovery_data"

# Summary
echo -e "\n${YELLOW}=== Test Summary ===${NC}" | tee -a $RESULTS_FILE
echo "Tests Passed: $TESTS_PASSED" | tee -a $RESULTS_FILE
echo "Tests Failed: $TESTS_FAILED" | tee -a $RESULTS_FILE
echo "Results saved to: $RESULTS_FILE" | tee -a $RESULTS_FILE

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed!${NC}" | tee -a $RESULTS_FILE
    exit 0
else
    echo -e "\n${RED}Some tests failed!${NC}" | tee -a $RESULTS_FILE
    exit 1
fi
