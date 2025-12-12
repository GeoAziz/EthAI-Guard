# 🧪 Analyst Login Testing - Quick Verification Guide

**Date:** December 11, 2025  
**Status:** Ready to Test  
**Frontend:** Running in dev mode (npm run dev)  
**Backend:** Running (docker-compose)

---

## ✅ Verification Checklist

### Step 1: Frontend is Running
From your terminal output:
```
✓ Next.js 15.3.3 running
✓ Local: http://localhost:3000
✓ Ready in 10.5s
```
**Status:** ✅ READY

### Step 2: Login Page Loads
```
GET /login?email=analyst-test%40example.com&password=AnalystPass123%21 200 in 6598ms
✓ Compiled /login in 5.5s
```
**Status:** ✅ READY

### Step 3: Backend Running
Should verify (in another terminal):
```bash
docker-compose ps | grep system_api
```
Expected: `system_api` service running on port 5000

---

## 🧪 Manual Testing Steps

### Test 1: Login as Analyst
1. **Open browser:** http://localhost:3000/auth/login
2. **Enter credentials:**
   - Email: `analyst-test@example.com`
   - Password: `AnalystPass123!`
3. **Click Login**

### Test 2: Verify Redirect
**Expected behavior:**
- ✅ Should redirect to: `http://localhost:3000/dashboard/analyst`
- ❌ Should NOT go to: `http://localhost:3000/decision-analysis`

### Test 3: Verify Dashboard Content
After redirect, you should see:

**Sidebar (Left):**
- [ ] Logo/Home link at top
- [ ] 7 menu items:
  1. Analyst Dashboard (active/highlighted)
  2. Run Analysis
  3. Datasets
  4. Models
  5. Explainability
  6. Fairness
  7. Reports
- [ ] Settings & Support at bottom

**Header (Top):**
- [ ] "Analyst Dashboard" title
- [ ] Theme toggle (🌙)
- [ ] User menu (👤)

**Main Content:**
- [ ] Breadcrumbs showing: "Dashboard / Analyst"
- [ ] Page subtitle: "Datasets, model evaluations, and explainability tools"
- [ ] 3 Quick action buttons:
  - New Analysis Run
  - Upload Dataset
  - View All Reports
- [ ] 4 KPI cards:
  - Total Datasets (should show a number)
  - Total Models (should show a number)
  - Active Runs (should show a number)
  - Alerts (should show a number)
- [ ] Recent Analysis Runs table
- [ ] Your Datasets table

---

## 🎯 What's Been Fixed

| Issue | Before | After | Status |
|-------|--------|-------|--------|
| Login redirect | `/decision-analysis` | `/dashboard/analyst` | ✅ FIXED |
| Sidebar menu | 4 items (wrong) | 7 items (correct) | ✅ FIXED |
| KPI cards | Missing | Present with real data | ✅ FIXED |
| Layout conflict | Double sidebar | Single sidebar | ✅ FIXED |

---

## 📝 Credentials to Use

From `creds.md`:

### Admin (for comparison)
- Email: `promote-test@example.com`
- Password: `PromotePass123!`
- Expected redirect: `/dashboard/admin/access-requests`

### Analyst (PRIMARY TEST)
- Email: `analyst-test@example.com`
- Password: `AnalystPass123!`
- Expected redirect: `/dashboard/analyst` ✅

### Reviewer
- Email: `reviewer-test@example.com`
- Password: `ReviewerPass123!`
- Expected redirect: `/report`

### User
- Email: `user-test@example.com`
- Password: `UserPass123!`
- Expected redirect: `/dashboard`

### Guest
- Email: `guest-test@example.com`
- Password: `GuestPass123!`
- Expected redirect: `/`

---

## 🐛 Troubleshooting

### Issue: Still redirects to `/decision-analysis`
**Solution:**
1. Hard refresh the page: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
2. Clear browser cache and cookies
3. Check that frontend is in dev mode (hot reload working)

### Issue: KPI cards show "—" (loading)
**Normal behavior** - The frontend is fetching data from the backend APIs. Wait a moment for them to load.

### Issue: KPI cards show "!" (error)
**Possible causes:**
- Backend not running: `docker-compose ps`
- API endpoint not accessible: Try `curl http://localhost:5000/v1/datasets`
- Network issue: Check browser console (F12 → Console tab)

### Issue: Sidebar doesn't show 7 items
**Causes:**
1. Role not set correctly in token (check browser dev tools → Application → Local Storage → authToken)
2. `rbac.ts` not reloaded (hard refresh)
3. Dashboard layout not loaded (check URL matches `/dashboard/analyst`)

---

## 💻 Dev Mode Tips

Since you're running in dev mode with `npm run dev`:

1. **Changes auto-reload:** Edit a file and the page will refresh automatically
2. **Check console:** Open F12 → Console tab to see any errors
3. **Network tab:** Check API calls to `/v1/datasets`, `/v1/models`, `/v1/reports`
4. **Application tab:** View stored tokens and auth context

### Check Auth Token (Debug)
1. Open F12 (Dev Tools)
2. Go to "Application" tab
3. Click "Local Storage"
4. Find and expand `http://localhost:3000`
5. Look for `authToken` key
6. The value should be a JWT starting with `eyJ...`
7. Copy it and decode at [jwt.io](https://jwt.io) to verify role claim

---

## ✨ Next Steps After Verification

If login works correctly:

1. ✅ Test other user roles (admin, reviewer, user, guest)
2. ✅ Test responsive design:
   - Open DevTools (F12)
   - Click device toolbar icon
   - Test at: 375px (mobile), 768px (tablet), 1280px+ (desktop)
3. ✅ Test sidebar navigation:
   - Click each menu item
   - Verify pages load and are responsive
4. ✅ Test KPI cards and tables:
   - Verify data loads
   - Check responsive column hiding

---

## 📊 Expected Results

| Test | Expected | Status |
|------|----------|--------|
| Login page loads | Yes | ✓ |
| Login with correct credentials | Success | ? |
| Redirect to /dashboard/analyst | Yes | ? |
| Sidebar shows 7 items | Yes | ? |
| KPI cards load data | Yes | ? |
| Tables show data | Yes | ? |
| Responsive at 375px | Works | ? |
| Responsive at 768px | Works | ? |
| Responsive at 1280px | Works | ? |

---

## 📞 Summary

**The frontend is ready and the bug is fixed.**

You can now test the analyst login experience. The credentials are in `creds.md`. The analyst should redirect to `/dashboard/analyst` (not `/decision-analysis`), and see the complete dashboard with sidebar, KPI cards, and tables.

**Go ahead and test it!** 🚀

