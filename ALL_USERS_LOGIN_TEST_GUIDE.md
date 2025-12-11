# 🔐 All Users Login Test Guide

Quick reference for testing login with all seeded user roles.

---

## 📋 User Credentials (from creds.md & seedUsers.js)

| Role | Email | Password | cURL Command |
|------|-------|----------|--------------|
| **Admin** | promote-test@example.com | PromotePass123! | [See Below](#admin-login) |
| **Analyst** | analyst-test@example.com | AnalystPass123! | [See Below](#analyst-login) |
| **Reviewer** | reviewer-test@example.com | ReviewerPass123! | [See Below](#reviewer-login) |
| **User** | user-test@example.com | UserPass123! | [See Below](#user-login) |
| **Guest** | guest-test@example.com | GuestPass123! | [See Below](#guest-login) |

---

## 🔓 Admin Login

**Role:** `admin`  
**Access:** Full system access, all features

```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "promote-test@example.com",
    "password": "PromotePass123!"
  }' | jq .
```

**Expected Token Payload:**
```json
{
  "sub": "<user_id>",
  "role": "admin",
  "iat": 1765458455,
  "exp": 1765459355
}
```

**Frontend Access:** http://localhost:3000/dashboard/admin

---

## 🔬 Analyst Login

**Role:** `analyst`  
**Access:** Data analysis, reports, datasets, models

```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "analyst-test@example.com",
    "password": "AnalystPass123!"
  }' | jq .
```

**Expected Token Payload:**
```json
{
  "sub": "<user_id>",
  "role": "analyst",
  "iat": 1765458455,
  "exp": 1765459355
}
```

**Frontend Access:** http://localhost:3000/dashboard/analyst

---

## 👁️ Reviewer Login

**Role:** `reviewer`  
**Access:** Review and approve analyses

```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "reviewer-test@example.com",
    "password": "ReviewerPass123!"
  }' | jq .
```

**Expected Token Payload:**
```json
{
  "sub": "<user_id>",
  "role": "reviewer",
  "iat": 1765458455,
  "exp": 1765459355
}
```

**Frontend Access:** http://localhost:3000/dashboard/reviewer

---

## 👤 User Login

**Role:** `user`  
**Access:** Limited viewing access

```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user-test@example.com",
    "password": "UserPass123!"
  }' | jq .
```

**Expected Token Payload:**
```json
{
  "sub": "<user_id>",
  "role": "user",
  "iat": 1765458455,
  "exp": 1765459355
}
```

**Frontend Access:** http://localhost:3000/dashboard

---

## 👻 Guest Login

**Role:** `guest`  
**Access:** Public/read-only access

```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "guest-test@example.com",
    "password": "GuestPass123!"
  }' | jq .
```

**Expected Token Payload:**
```json
{
  "sub": "<user_id>",
  "role": "guest",
  "iat": 1765458455,
  "exp": 1765459355
}
```

**Frontend Access:** http://localhost:3000/dashboard/guest

---

## 🔄 Batch Test Script

Test all users at once:

```bash
#!/bin/bash

USERS=(
  "promote-test@example.com|PromotePass123!|admin"
  "analyst-test@example.com|AnalystPass123!|analyst"
  "reviewer-test@example.com|ReviewerPass123!|reviewer"
  "user-test@example.com|UserPass123!|user"
  "guest-test@example.com|GuestPass123!|guest"
)

for user in "${USERS[@]}"; do
  IFS='|' read -r email password role <<< "$user"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Testing $role ($email)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  curl -s -X POST http://localhost:5000/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}" | jq .
done
```

Save as `test_all_logins.sh`, make executable, and run:
```bash
chmod +x test_all_logins.sh
./test_all_logins.sh
```

---

## 🎯 Using Access Tokens

After logging in, use the `accessToken` for API calls:

```bash
# Extract token from login response
TOKEN=$(curl -s -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"analyst-test@example.com","password":"AnalystPass123!"}' | jq -r '.accessToken')

# Use token in API call
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/v1/datasets | jq .
```

---

## 🔐 Token Refresh

Access tokens expire in 15 minutes. Use the refresh token to get a new one:

```bash
# Extract refresh token from login response
REFRESH_TOKEN=$(curl -s -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"analyst-test@example.com","password":"AnalystPass123!"}' | jq -r '.refreshToken')

# Refresh the token
curl -X POST http://localhost:5000/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}" | jq .
```

---

## ⚠️ Invalid Login Tests

### Wrong Password
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"analyst-test@example.com","password":"WrongPassword"}' | jq .
```

**Expected Response:**
```json
{
  "error": "Invalid credentials"
}
```

### Non-existent User
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@example.com","password":"SomePass123!"}' | jq .
```

**Expected Response:**
```json
{
  "error": "Invalid credentials"
}
```

### Missing Email
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"AnalystPass123!"}' | jq .
```

**Expected Response:**
```json
{
  "error": "Email and password required"
}
```

---

## 📊 Expected API Behavior by Role

| Endpoint | Admin | Analyst | Reviewer | User | Guest |
|----------|-------|---------|----------|------|-------|
| `/v1/datasets` | ✅ | ✅ | ❓ | ✅ | ❌ |
| `/v1/models` | ✅ | ✅ | ❓ | ✅ | ❌ |
| `/v1/reports` | ✅ | ✅ | ✅ | ❓ | ❌ |
| `/v1/admin/users` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/v1/analyst/run` | ❌ | ✅ | ❌ | ❌ | ❌ |

*(✅ = full access, ❌ = forbidden, ❓ = role-specific)*

---

## 🎯 Frontend Login Testing

### 1. Admin Login
```
URL: http://localhost:3000/auth/login
Email: promote-test@example.com
Password: PromotePass123!
Expected Redirect: http://localhost:3000/dashboard/admin
```

### 2. Analyst Login
```
URL: http://localhost:3000/auth/login
Email: analyst-test@example.com
Password: AnalystPass123!
Expected Redirect: http://localhost:3000/dashboard/analyst
Expected Sidebar: [Analyst Dashboard, Run Analysis, Datasets, Models, Explainability, Fairness, Reports]
Expected Home: 4 KPI cards + Recent Runs table + Datasets table
```

### 3. Reviewer Login
```
URL: http://localhost:3000/auth/login
Email: reviewer-test@example.com
Password: ReviewerPass123!
Expected Redirect: http://localhost:3000/dashboard/reviewer
```

### 4. User Login
```
URL: http://localhost:3000/auth/login
Email: user-test@example.com
Password: UserPass123!
Expected Redirect: http://localhost:3000/dashboard
```

### 5. Guest Login
```
URL: http://localhost:3000/auth/login
Email: guest-test@example.com
Password: GuestPass123!
Expected Redirect: http://localhost:3000/dashboard/guest
```

---

## ✨ Quick Test Commands

### All Users (One-liner)
```bash
for email in promote-test@example.com analyst-test@example.com reviewer-test@example.com user-test@example.com guest-test@example.com; do curl -s -X POST http://localhost:5000/auth/login -H "Content-Type: application/json" -d "{\"email\":\"$email\",\"password\":\"${email%@*}Pass123!\"}" | jq '.accessToken | split(".")[1] | @base64d | fromjson'; done
```

### Just Check Analyst Token
```bash
curl -s -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"analyst-test@example.com","password":"AnalystPass123!"}' \
  | jq '.accessToken'
```

---

## 📚 Related Files

- **User Credentials:** [`creds.md`](./creds.md)
- **Seeding Script:** [`backend/scripts/seedUsers.js`](./backend/scripts/seedUsers.js)
- **Auth Service:** `backend/src/routes/auth.ts`
- **User Model:** `backend/src/models/User.ts`
- **Analyst Home Page:** [`ANALYST_UI_ACTUAL_POST_LOGIN.md`](./ANALYST_UI_ACTUAL_POST_LOGIN.md)
- **Login Test Report:** [`ANALYST_LOGIN_TEST_REPORT.md`](./ANALYST_LOGIN_TEST_REPORT.md)

---

**Last Updated:** December 11, 2025  
**Status:** ✅ All logins verified and working

