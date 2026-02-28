# Phase 3A - Actual UI Selector Map

## DOM Selectors Found in Codebase

### Login Page
- Email input: `input[name="email"]` ✅ VERIFIED
- Password input: `input[name="password"]` ✅ VERIFIED
- Submit button: `button[type="submit"]` ✅ VERIFIED

### Dashboard Layout
- Header: `header` (sticky, z-40)
- User avatar button: `header button` (last button, variant="ghost")
- Logout text: `//*[contains(text(), "Log out")]` ✅ VERIFIED (found in UserNav component)
- Theme toggle: `header button` (near avatar)

### Dashboard Upload Page (/dashboard)
- Upload area: `div.border-dashed` (drag-and-drop zone)
- File input: `input#file-upload` (hidden, type="file")
- Load Example Dataset button: `button:has-text("Load Example Dataset")`
- Run Fairness Analysis button: `button:has-text("Run Fairness Analysis")`
- **NOTE:** No `data-testid="upload-dataset-button"` exists

### Mode Banners (ExplainBoard)
- **Status:** NOT FOUND IN CURRENT IMPLEMENTATION
- Need to check ExplainBoard component for actual banner structure

### Export Modal
- **Status:** NOT FOUND IN CURRENT IMPLEMENTATION
- Need to check report pages for export functionality

---

## Issues Found

### 1. Reviewer/Auditor Login Timeout
**Issue:** TC-AUTH-002 times out when logging in as `reviewer-test@example.com`  
**Cause:** Unknown - could be:
- Login takes >30 seconds
- Reviewer role redirect goes to different page (`/dashboard/reviewer` instead of `/dashboard`)
- Backend auth issue

**Solution:** Need to check:
1. What page reviewer redirects to after login
2. If redirect is different, update test assertion

###2. Upload Button Selector
**Issue:** Tests look for `[data-testid="upload-dataset-button"]` which doesn't exist  
**Actual Selectors:**
- Load Example: `button:has-text("Load Example Dataset")`
- Run Analysis: `button:has-text("Run Fairness Analysis")`

### 3. Mode Banners Not Found
**Issue:** ExplainBoard page not checked for mode banner implementation  
**Status:** Needs source code review

###4. Export Modal Not Found
**Issue:** Export modal selector unknown  
**Status:** Needs source code review

---

## Next Steps

1. Check ExplainBoard component for banner implementation
2. Check report pages for export modal implementation
3. Determine reviewer login redirect path
4. Update test file with correct selectors or skip NotImplemented features
