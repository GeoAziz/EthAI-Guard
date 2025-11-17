#!/bin/bash
# Firebase Backend Configuration Checker

echo "=========================================="
echo "🔍 FIREBASE BACKEND DIAGNOSTICS"
echo "=========================================="
echo ""

echo "📋 Checking Current Backend Configuration"
echo "==========================================="
echo ""

# Check if backend is responding
echo "1. Backend Health Check:"
HEALTH=$(curl -s "https://ethai-guard.onrender.com/health")
if echo "$HEALTH" | grep -q "backend ok"; then
    echo "   ✅ Backend is responding"
else
    echo "   ❌ Backend health check failed"
    echo "   Response: $HEALTH"
fi
echo ""

# Test Firebase auth
echo "2. Firebase Authentication Test:"
echo "   Creating test user..."
FIREBASE_RESPONSE=$(curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyDfap3xPVkzDdT8Wt6Vf3oDX5-9xcOCD0A" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"diag-test-$(date +%s)@ethixai.test\",\"password\":\"Test123456!Secure\",\"returnSecureToken\":true}")

TOKEN=$(echo "$FIREBASE_RESPONSE" | jq -r '.idToken' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "   ❌ Failed to create Firebase user"
    echo "   Response: $FIREBASE_RESPONSE" | head -5
else
    echo "   ✅ Firebase user created successfully"
    echo "   Token length: ${#TOKEN}"
    echo ""
    echo "   Testing backend with token..."
    BACKEND_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "https://ethai-guard.onrender.com/auth/devices")
    
    if echo "$BACKEND_RESPONSE" | grep -q '"devices"'; then
        echo "   ✅ Backend accepted Firebase token!"
    elif echo "$BACKEND_RESPONSE" | grep -q '"error"'; then
        echo "   ❌ Backend rejected Firebase token"
        echo "   Error: $BACKEND_RESPONSE"
    else
        echo "   ⚠️  Unexpected response: $BACKEND_RESPONSE"
    fi
fi
echo ""

echo "=========================================="
echo "📊 DIAGNOSIS SUMMARY"
echo "=========================================="
echo ""

if echo "$BACKEND_RESPONSE" | grep -q '"devices"'; then
    echo "🎉 Status: WORKING"
    echo ""
    echo "Firebase authentication is fully functional!"
    echo "You can proceed with end-to-end testing."
else
    echo "❌ Status: NOT WORKING"
    echo ""
    echo "Issue: Backend is rejecting Firebase tokens"
    echo ""
    echo "Most likely causes:"
    echo "1. Secret file not created or wrong path"
    echo "2. GOOGLE_APPLICATION_CREDENTIALS not set"
    echo "3. Old env vars (FIREBASE_PRIVATE_KEY) still present"
    echo ""
    echo "Required Render Configuration:"
    echo "================================"
    echo ""
    echo "Secret Files:"
    echo "  ✓ Path: /etc/secrets/serviceAccountKey.json"
    echo "  ✓ Content: Full JSON from serviceAccountKey.json"
    echo ""
    echo "Environment Variables:"
    echo "  ✓ GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/serviceAccountKey.json"
    echo "  ✓ FIREBASE_PROJECT_ID=studio-8429244671-dd548"
    echo "  ✓ AUTH_PROVIDER=firebase"
    echo ""
    echo "MUST DELETE these if they exist:"
    echo "  ✗ FIREBASE_PRIVATE_KEY"
    echo "  ✗ FIREBASE_CLIENT_EMAIL"
    echo "  ✗ FIREBASE_PRIVATE_KEY_FILE"
    echo ""
    echo "After making changes:"
    echo "  1. Save changes in Render"
    echo "  2. Wait for redeploy (2-3 minutes)"
    echo "  3. Check logs for: firebase_admin_initialized"
    echo "  4. Run this script again"
fi
echo ""
