#!/bin/bash
# Hydra-Wall Phase 1 API Test Script
# Tests all endpoints per PRD acceptance criteria

BASE_URL="http://localhost:8080"
PASS=0
FAIL=0
RESULTS=""

log_test() {
    local test_name="$1"
    local status="$2"
    local detail="$3"
    if [ "$status" == "PASS" ]; then
        PASS=$((PASS+1))
        RESULTS="${RESULTS}✅ PASS: ${test_name}\n"
    else
        FAIL=$((FAIL+1))
        RESULTS="${RESULTS}❌ FAIL: ${test_name} — ${detail}\n"
    fi
}

echo "========================================="
echo "  Hydra-Wall Phase 1 API Test Suite"
echo "========================================="
echo ""

# =============================================
# T1: Health Check
# =============================================
echo "--- T1: Health Check ---"
RESP=$(curl -s -w "\n%{http_code}" ${BASE_URL}/health)
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
if [ "$HTTP_CODE" == "200" ]; then
    log_test "GET /health returns 200" "PASS"
else
    log_test "GET /health returns 200" "FAIL" "HTTP $HTTP_CODE, body: $BODY"
fi

# =============================================
# T2: Metrics Endpoint
# =============================================
echo "--- T2: Metrics ---"
RESP=$(curl -s -w "\n%{http_code}" ${BASE_URL}/metrics)
HTTP_CODE=$(echo "$RESP" | tail -1)
if [ "$HTTP_CODE" == "200" ]; then
    log_test "GET /metrics returns 200" "PASS"
else
    log_test "GET /metrics returns 200" "FAIL" "HTTP $HTTP_CODE"
fi

# =============================================
# T3: Auth — No JWT → 401
# =============================================
echo "--- T3: Auth (JWT missing) ---"
RESP=$(curl -s -w "\n%{http_code}" ${BASE_URL}/api/v1/apps)
HTTP_CODE=$(echo "$RESP" | tail -1)
if [ "$HTTP_CODE" == "401" ]; then
    log_test "GET /api/v1/apps without JWT → 401" "PASS"
else
    log_test "GET /api/v1/apps without JWT → 401" "FAIL" "HTTP $HTTP_CODE"
fi

# =============================================
# T4: Auth — Invalid JWT → 401
# =============================================
echo "--- T4: Auth (JWT invalid) ---"
RESP=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer invalidtoken123" ${BASE_URL}/api/v1/apps)
HTTP_CODE=$(echo "$RESP" | tail -1)
if [ "$HTTP_CODE" == "401" ]; then
    log_test "GET /api/v1/apps with invalid JWT → 401" "PASS"
else
    log_test "GET /api/v1/apps with invalid JWT → 401" "FAIL" "HTTP $HTTP_CODE"
fi

# =============================================
# T5: Auth — Login
# =============================================
echo "--- T5: Auth Login ---"
RESP=$(curl -s -w "\n%{http_code}" -X POST ${BASE_URL}/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}')
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
echo "Login response: $BODY (HTTP $HTTP_CODE)"

TOKEN=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('token',''))" 2>/dev/null)

AUTH_HEADER="Authorization: Bearer ${TOKEN}"

if [ -n "$TOKEN" ]; then
    echo "Got JWT token: ${TOKEN:0:20}..."

    # Create App
    RESP=$(curl -s -w "\n%{http_code}" -X POST ${BASE_URL}/api/v1/apps \
        -H "$AUTH_HEADER" \
        -H "Content-Type: application/json" \
        -d '{"name":"TestApp","platform":"ios","description":"Test app for QA"}')
    HTTP_CODE=$(echo "$RESP" | tail -1)
    BODY=$(echo "$RESP" | head -n -1)
    if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "201" ]; then
        log_test "POST /api/v1/apps creates app" "PASS"
        APP_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null)
        API_KEY=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('api_key',''))" 2>/dev/null)
    else
        log_test "POST /api/v1/apps creates app" "FAIL" "HTTP $HTTP_CODE, body: $BODY"
    fi

    # List Apps
    if [ -n "$APP_ID" ]; then
        RESP=$(curl -s -w "\n%{http_code}" ${BASE_URL}/api/v1/apps -H "$AUTH_HEADER")
        HTTP_CODE=$(echo "$RESP" | tail -1)
        if [ "$HTTP_CODE" == "200" ]; then
            log_test "GET /api/v1/apps lists apps" "PASS"
        else
            log_test "GET /api/v1/apps lists apps" "FAIL" "HTTP $HTTP_CODE"
        fi

        # Get App
        RESP=$(curl -s -w "\n%{http_code}" ${BASE_URL}/api/v1/apps/$APP_ID -H "$AUTH_HEADER")
        HTTP_CODE=$(echo "$RESP" | tail -1)
        if [ "$HTTP_CODE" == "200" ]; then
            log_test "GET /api/v1/apps/:id returns app" "PASS"
        else
            log_test "GET /api/v1/apps/:id returns app" "FAIL" "HTTP $HTTP_CODE"
        fi

        # Update App
        RESP=$(curl -s -w "\n%{http_code}" -X PUT ${BASE_URL}/api/v1/apps/$APP_ID \
            -H "$AUTH_HEADER" \
            -H "Content-Type: application/json" \
            -d '{"name":"UpdatedTestApp"}')
        HTTP_CODE=$(echo "$RESP" | tail -1)
        if [ "$HTTP_CODE" == "200" ]; then
            log_test "PUT /api/v1/apps/:id updates app" "PASS"
        else
            log_test "PUT /api/v1/apps/:id updates app" "FAIL" "HTTP $HTTP_CODE"
        fi
    fi
else
    log_test "App CRUD (create/list/get/update)" "FAIL" "Could not obtain valid JWT token for auth"
fi

# =============================================
# T7: API Key Auth — No Key → 401
# =============================================
echo "--- T7: API Key Auth (public endpoints) ---"
RESP=$(curl -s -w "\n%{http_code}" -X POST ${BASE_URL}/api/v1/evaluate \
    -H "Content-Type: application/json" \
    -d '{"placement":"test","user_id":"u1"}')
HTTP_CODE=$(echo "$RESP" | tail -1)
if [ "$HTTP_CODE" == "401" ]; then
    log_test "POST /api/v1/evaluate without API key → 401" "PASS"
else
    log_test "POST /api/v1/evaluate without API key → 401" "FAIL" "HTTP $HTTP_CODE"
fi

# =============================================
# T8: API Key Auth — Invalid Key → 403
# =============================================
RESP=$(curl -s -w "\n%{http_code}" -X POST ${BASE_URL}/api/v1/evaluate \
    -H "Content-Type: application/json" \
    -H "X-API-Key: invalid-key-12345" \
    -d '{"placement":"test","user_id":"u1"}')
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
if [ "$HTTP_CODE" == "401" ] || [ "$HTTP_CODE" == "403" ]; then
    log_test "POST /api/v1/evaluate with invalid API key → 401/403" "PASS"
else
    log_test "POST /api/v1/evaluate with invalid API key → 401/403" "FAIL" "HTTP $HTTP_CODE, body: $BODY"
fi

# =============================================
# T9: Full Happy Path (if we have API key)
# =============================================
echo "--- T9: Full Happy Path ---"

if [ -n "$API_KEY" ] && [ -n "$APP_ID" ]; then
    API_KEY_HEADER="X-API-Key: $API_KEY"

    # Create Campaign
    RESP=$(curl -s -w "\n%{http_code}" -X POST ${BASE_URL}/api/v1/campaigns \
        -H "$AUTH_HEADER" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"Test Campaign\",\"app_id\":\"$APP_ID\",\"status\":\"draft\"}")
    HTTP_CODE=$(echo "$RESP" | tail -1)
    BODY=$(echo "$RESP" | head -n -1)
    if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "201" ]; then
        log_test "POST /api/v1/campaigns creates campaign" "PASS"
        CAMPAIGN_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null)
    else
        log_test "POST /api/v1/campaigns creates campaign" "FAIL" "HTTP $HTTP_CODE, body: $BODY"
    fi

    # Create Placement
    if [ -n "$CAMPAIGN_ID" ]; then
        RESP=$(curl -s -w "\n%{http_code}" -X POST ${BASE_URL}/api/v1/campaigns/$CAMPAIGN_ID/placements \
            -H "$AUTH_HEADER" \
            -H "Content-Type: application/json" \
            -d '{"event_name":"premium_feature","description":"Premium feature gate"}')
        HTTP_CODE=$(echo "$RESP" | tail -1)
        BODY=$(echo "$RESP" | head -n -1)
        if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "201" ]; then
            log_test "POST /api/v1/campaigns/:id/placements creates placement" "PASS"
        else
            log_test "POST /api/v1/campaigns/:id/placements creates placement" "FAIL" "HTTP $HTTP_CODE, body: $BODY"
        fi
    fi

    # Create Audience
    if [ -n "$CAMPAIGN_ID" ]; then
        RESP=$(curl -s -w "\n%{http_code}" -X POST ${BASE_URL}/api/v1/campaigns/$CAMPAIGN_ID/audiences \
            -H "$AUTH_HEADER" \
            -H "Content-Type: application/json" \
            -d '{"name":"Free Users","conditions":[{"field":"plan","operator":"equals","value":"free"}],"sort_order":1}')
        HTTP_CODE=$(echo "$RESP" | tail -1)
        BODY=$(echo "$RESP" | head -n -1)
        if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "201" ]; then
            log_test "POST /api/v1/campaigns/:id/audiences creates audience" "PASS"
            AUDIENCE_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null)
        else
            log_test "POST /api/v1/campaigns/:id/audiences creates audience" "FAIL" "HTTP $HTTP_CODE, body: $BODY"
        fi
    fi

    # Create Paywall
    RESP=$(curl -s -w "\n%{http_code}" -X POST ${BASE_URL}/api/v1/paywalls \
        -H "$AUTH_HEADER" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"Premium Paywall\",\"app_id\":\"$APP_ID\",\"template\":\"standard\",\"config\":{\"title\":\"Upgrade\",\"description\":\"Go premium\"},\"feature_gating\":\"gated\"}")
    HTTP_CODE=$(echo "$RESP" | tail -1)
    BODY=$(echo "$RESP" | head -n -1)
    if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "201" ]; then
        log_test "POST /api/v1/paywalls creates paywall" "PASS"
        PAYWALL_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null)
    else
        log_test "POST /api/v1/paywalls creates paywall" "FAIL" "HTTP $HTTP_CODE, body: $BODY"
    fi

    # Associate Audience-Paywall
    if [ -n "$AUDIENCE_ID" ] && [ -n "$PAYWALL_ID" ]; then
        RESP=$(curl -s -w "\n%{http_code}" -X POST ${BASE_URL}/api/v1/audiences/$AUDIENCE_ID/paywalls \
            -H "$AUTH_HEADER" \
            -H "Content-Type: application/json" \
            -d "{\"paywall_id\":\"$PAYWALL_ID\",\"percentage\":100}")
        HTTP_CODE=$(echo "$RESP" | tail -1)
        BODY=$(echo "$RESP" | head -n -1)
        if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "201" ]; then
            log_test "POST /api/v1/audiences/:id/paywalls associates paywall" "PASS"
        else
            log_test "POST /api/v1/audiences/:id/paywalls associates paywall" "FAIL" "HTTP $HTTP_CODE, body: $BODY"
        fi
    fi

    # Activate Campaign
    if [ -n "$CAMPAIGN_ID" ]; then
        RESP=$(curl -s -w "\n%{http_code}" -X POST ${BASE_URL}/api/v1/campaigns/$CAMPAIGN_ID/activate \
            -H "$AUTH_HEADER")
        HTTP_CODE=$(echo "$RESP" | tail -1)
        if [ "$HTTP_CODE" == "200" ]; then
            log_test "POST /api/v1/campaigns/:id/activate activates campaign" "PASS"
        else
            log_test "POST /api/v1/campaigns/:id/activate activates campaign" "FAIL" "HTTP $HTTP_CODE"
        fi
    fi

    # Evaluate (with matching attributes)
    if [ -n "$CAMPAIGN_ID" ]; then
        RESP=$(curl -s -w "\n%{http_code}" -X POST ${BASE_URL}/api/v1/evaluate \
            -H "$API_KEY_HEADER" \
            -H "Content-Type: application/json" \
            -d '{"placement":"premium_feature","user_id":"user_123","attributes":{"plan":"free","session_count":5}}')
        HTTP_CODE=$(echo "$RESP" | tail -1)
        BODY=$(echo "$RESP" | head -n -1)
        ACTION=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('action',''))" 2>/dev/null)
        if [ "$HTTP_CODE" == "200" ] && [ "$ACTION" == "show_paywall" ]; then
            log_test "POST /api/v1/evaluate returns show_paywall (matching audience)" "PASS"
        else
            log_test "POST /api/v1/evaluate returns show_paywall (matching audience)" "FAIL" "HTTP $HTTP_CODE, action=$ACTION, body=$BODY"
        fi
    fi

    # Evaluate (no matching audience)
    RESP=$(curl -s -w "\n%{http_code}" -X POST ${BASE_URL}/api/v1/evaluate \
        -H "$API_KEY_HEADER" \
        -H "Content-Type: application/json" \
        -d '{"placement":"premium_feature","user_id":"user_456","attributes":{"plan":"premium","session_count":100}}')
    HTTP_CODE=$(echo "$RESP" | tail -1)
    BODY=$(echo "$RESP" | head -n -1)
    ACTION=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('action',''))" 2>/dev/null)
    if [ "$HTTP_CODE" == "200" ] && [ "$ACTION" == "execute_feature" ]; then
        log_test "POST /api/v1/evaluate returns execute_feature (no match)" "PASS"
    else
        log_test "POST /api/v1/evaluate returns execute_feature (no match)" "FAIL" "HTTP $HTTP_CODE, action=$ACTION, body=$BODY"
    fi

    # Event ingestion
    RESP=$(curl -s -w "\n%{http_code}" -X POST ${BASE_URL}/api/v1/events \
        -H "$API_KEY_HEADER" \
        -H "Content-Type: application/json" \
        -d '{"events":[{"event_type":"paywall_impression","user_id":"user_123","properties":{"paywall_id":"test"}}]}')
    HTTP_CODE=$(echo "$RESP" | tail -1)
    if [ "$HTTP_CODE" == "200" ]; then
        log_test "POST /api/v1/events ingests events" "PASS"
    else
        log_test "POST /api/v1/events ingests events" "FAIL" "HTTP $HTTP_CODE"
    fi

    # Event validation — invalid type
    RESP=$(curl -s -w "\n%{http_code}" -X POST ${BASE_URL}/api/v1/events \
        -H "$API_KEY_HEADER" \
        -H "Content-Type: application/json" \
        -d '{"events":[{"event_type":"invalid_type","user_id":"user_123"}]}')
    HTTP_CODE=$(echo "$RESP" | tail -1)
    if [ "$HTTP_CODE" == "400" ]; then
        log_test "POST /api/v1/events rejects invalid event_type → 400" "PASS"
    else
        log_test "POST /api/v1/events rejects invalid event_type → 400" "FAIL" "HTTP $HTTP_CODE"
    fi

    # Event batch limit (>50)
    EVENTS='[]'
    for i in $(seq 1 51); do
        EVENTS=$(echo "$EVENTS" | python3 -c "import sys,json; l=json.load(sys.stdin); l.append({'event_type':'paywall_impression','user_id':'u'}); print(json.dumps(l))")
    done
    RESP=$(curl -s -w "\n%{http_code}" -X POST ${BASE_URL}/api/v1/events \
        -H "$API_KEY_HEADER" \
        -H "Content-Type: application/json" \
        -d "{\"events\":$EVENTS}")
    HTTP_CODE=$(echo "$RESP" | tail -1)
    if [ "$HTTP_CODE" == "400" ]; then
        log_test "POST /api/v1/events rejects batch >50 → 400" "PASS"
    else
        log_test "POST /api/v1/events rejects batch >50 → 400" "FAIL" "HTTP $HTTP_CODE"
    fi

    # Duplicate placement
    if [ -n "$CAMPAIGN_ID" ]; then
        RESP=$(curl -s -w "\n%{http_code}" -X POST ${BASE_URL}/api/v1/campaigns/$CAMPAIGN_ID/placements \
            -H "$AUTH_HEADER" \
            -H "Content-Type: application/json" \
            -d '{"event_name":"premium_feature","description":"Duplicate"}')
        HTTP_CODE=$(echo "$RESP" | tail -1)
        if [ "$HTTP_CODE" == "409" ]; then
            log_test "Duplicate placement event_name → 409" "PASS"
        else
            log_test "Duplicate placement event_name → 409" "FAIL" "HTTP $HTTP_CODE"
        fi
    fi

    # Invalid audience conditions JSON
    if [ -n "$CAMPAIGN_ID" ]; then
        RESP=$(curl -s -w "\n%{http_code}" -X POST ${BASE_URL}/api/v1/campaigns/$CAMPAIGN_ID/audiences \
            -H "$AUTH_HEADER" \
            -H "Content-Type: application/json" \
            -d '{"name":"Bad Audience","conditions":"not_json","sort_order":2}')
        HTTP_CODE=$(echo "$RESP" | tail -1)
        if [ "$HTTP_CODE" == "400" ]; then
            log_test "Invalid audience conditions → 400" "PASS"
        else
            log_test "Invalid audience conditions → 400" "FAIL" "HTTP $HTTP_CODE"
        fi
    fi

    # Percentage mismatch
    if [ -n "$AUDIENCE_ID" ] && [ -n "$PAYWALL_ID" ]; then
        # First create another paywall
        RESP=$(curl -s -X POST ${BASE_URL}/api/v1/paywalls \
            -H "$AUTH_HEADER" \
            -H "Content-Type: application/json" \
            -d "{\"name\":\"Paywall 2\",\"app_id\":\"$APP_ID\",\"template\":\"minimal\",\"config\":{\"title\":\"Test\"},\"feature_gating\":\"gated\"}")
        PAYWALL_2_ID=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null)

        # Try to add with wrong percentage (already has 100%)
        RESP=$(curl -s -w "\n%{http_code}" -X POST ${BASE_URL}/api/v1/audiences/$AUDIENCE_ID/paywalls \
            -H "$AUTH_HEADER" \
            -H "Content-Type: application/json" \
            -d "{\"paywall_id\":\"$PAYWALL_2_ID\",\"percentage\":50}")
        HTTP_CODE=$(echo "$RESP" | tail -1)
        if [ "$HTTP_CODE" == "400" ]; then
            log_test "Percentage sum != 100 → 400" "PASS"
        else
            log_test "Percentage sum != 100 → 400" "FAIL" "HTTP $HTTP_CODE"
        fi
    fi

    # Delete App (should fail if resources exist)
    if [ -n "$APP_ID" ]; then
        RESP=$(curl -s -w "\n%{http_code}" -X DELETE ${BASE_URL}/api/v1/apps/$APP_ID \
            -H "$AUTH_HEADER")
        HTTP_CODE=$(echo "$RESP" | tail -1)
        # Should be 200 (soft delete) or 409 (resources exist) — both acceptable
        if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "409" ]; then
            log_test "DELETE /api/v1/apps/:id handles cascade" "PASS"
        else
            log_test "DELETE /api/v1/apps/:id handles cascade" "FAIL" "HTTP $HTTP_CODE"
        fi
    fi

    # Analytics endpoints
    RESP=$(curl -s -w "\n%{http_code}" ${BASE_URL}/api/v1/analytics/overview -H "$AUTH_HEADER")
    HTTP_CODE=$(echo "$RESP" | tail -1)
    if [ "$HTTP_CODE" == "200" ]; then
        log_test "GET /api/v1/analytics/overview returns 200" "PASS"
    else
        log_test "GET /api/v1/analytics/overview returns 200" "FAIL" "HTTP $HTTP_CODE"
    fi

    RESP=$(curl -s -w "\n%{http_code}" ${BASE_URL}/api/v1/transactions -H "$AUTH_HEADER")
    HTTP_CODE=$(echo "$RESP" | tail -1)
    if [ "$HTTP_CODE" == "200" ]; then
        log_test "GET /api/v1/transactions returns 200" "PASS"
    else
        log_test "GET /api/v1/transactions returns 200" "FAIL" "HTTP $HTTP_CODE"
    fi

else
    log_test "Full Happy Path (Campaign→Placement→Audience→Paywall→Evaluate→Events)" "FAIL" "No API key available (App creation failed)"
fi

# =============================================
# Summary
# =============================================
echo ""
echo "========================================="
echo "  Test Results Summary"
echo "========================================="
echo -e "$RESULTS"
echo "Total: $((PASS+FAIL)) | Passed: $PASS | Failed: $FAIL"
echo "========================================="
