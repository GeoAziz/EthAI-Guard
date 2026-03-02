# Quick Validation & Testing Guide — Phase 1 Improvements

## 🧪 Testing Checklist (5 minutes per page)

### 1. HOME DASHBOARD (`/dashboard/analyst`)
**Test Duration:** ~3 min

- [ ] **Badge Colors:** Look for green (completed), blue (running), red (failed), gray (pending) status badges ✅
- [ ] **Mobile (375px):** Rotate phone to portrait — table shows only ID, Status columns
- [ ] **Tablet (768px):** Table now shows ID, Model, Status, Actions
- [ ] **Desktop:** All columns visible (ID, Model, Dataset, Created, Status, Actions)
- [ ] **KPI Cards:** Responsive — 1 column on mobile, 2 on tablet, should stack nicely
- [ ] **Hover Effects:** Hover over KPI cards — should see subtle shadow and scale (1.02x)
- [ ] **Links:** Click "View All Reports" button — should navigate smoothly

### 2. REPORTS LIST (`/reports`)
**Test Duration:** ~4 min

- [ ] **Badge Display:** Bias Severity column shows colored badges (high=red, medium=yellow, low=green) 🎨
- [ ] **Responsive Columns:** 
  - Mobile: Only Report ID, Bias Severity, Actions visible
  - Tablet: + Type column appears
  - Desktop: All columns visible
- [ ] **Export Button:** Click export — should download CSV, toast notification appears ✅
- [ ] **Table Rows:** Hover over rows — background should lighten slightly
- [ ] **Mobile Scroll:** On phone, can horizontal scroll? NO ✅ (smart columns prevent it)
- [ ] **Pagination:** Previous/Next buttons meet 44px minimum height and are easy to tap

### 3. REPORT DETAIL (`/reports/[id]`)
**Test Duration:** ~3 min

- [ ] **Badge:** Bias Severity shows as colored badge (high/medium/low) 🎨
- [ ] **Responsive Layout:** On mobile, export button stacks below report title ✓
- [ ] **Desktop:** Export button appears inline with title
- [ ] **Export Button:** Has proper styling, easy to click (44px+ height) ✅
- [ ] **Metric Cards:** Background color, nice padding, readable on all devices
- [ ] **Raw Payload:** Scrollable code section doesn't break layout

### 4. ANALYSIS HISTORY (`/history`)
**Test Duration:** ~4 min

- [ ] **Status Badges:** Shows colored badges matching the pattern from home page 🎨
- [ ] **Responsive Columns:**
  - Mobile: Run ID, Status always visible
  - Tablet: + Model appears
  - Desktop: All columns visible including dates
- [ ] **View Report Link:** Only shows when status is "completed" ✓
- [ ] **Pagination:** Buttons properly sized and styled
- [ ] **Page Size Selector:** Can change from 5/10/20/50 items per page
- [ ] **Hover States:** Rows have hover background color change

### 5. MODELS REGISTRY (`/models`)
**Test Duration:** ~3 min

- [ ] **Active Badge:** Shows green "yes" or gray "no" badges 🎨
- [ ] **Responsive:** Model name always visible, Version hides on mobile
- [ ] **Column Hiding:** Test at different screen sizes (375px, 768px, 1280px)
- [ ] **Pagination:** Previous/Next buttons work and are properly sized
- [ ] **Table Appearance:** Clean, rows have hover effect

### 6. DATASETS PAGE (`/datasets`)
**Test Duration:** ~3 min

- [ ] **Create Dataset Button:** Uses proper Button component styling ✅
- [ ] **Button Accessibility:** Button has 44px+ height, easy to tap on mobile
- [ ] **Responsive Table:**
  - Mobile: Name, Sensitivity visible
  - Tablet: + Version appears
  - Desktop: All columns visible
- [ ] **Upload/View Reports Buttons:** Styled consistently, proper spacing
- [ ] **Sensitivity Column:** Readable on all screen sizes
- [ ] **Hover States:** Rows highlight on hover

### 7. FAIRNESS DASHBOARD (`/fairness`)
**Test Duration:** ~5 min

- [ ] **Metrics Cards:**
  - Mobile: Stack vertically (1 card per row)
  - Tablet: 2 cards per row
  - Desktop: 3 cards per row ✓
- [ ] **Card Hover:** Cards show subtle shadow on hover
- [ ] **Bias Metrics Table:** Hide DI, EOD on smaller screens as configured
- [ ] **Fairness Events Table:**
  - Mobile: Timestamp, Severity visible
  - Tablet: + Model appears
  - Desktop: All columns visible
- [ ] **Severity Badges:** Show with color coding (high=red, medium=yellow, low=green) 🎨
- [ ] **Pagination:** Works smoothly with proper button styling

### 8. RUN ANALYSIS FORM (`/run`)
**Test Duration:** ~4 min

- [ ] **Form Fields:**
  - Model and Dataset are required fields (marked with *) ✅
  - Placeholder text shows examples
  - Focus ring visible when clicking input ✓
- [ ] **Validation:** 
  - Try clicking "Start run" without filling fields
  - Should show error toast: "Please enter a model ID"
- [ ] **Successful Submit:**
  - Fill in Model: `loan-v3`, Dataset: `customer-churn`
  - Click "Start run"
  - Should show success toast with run ID
  - Should redirect to history page
- [ ] **Button Sizing:** Start run and Cancel buttons are 44px+ tall
- [ ] **Responsive Layout:** On mobile, buttons stack vertically; on desktop, inline
- [ ] **Loading State:** During submission, button shows "Starting…" + disabled state

### 9. RUN ANALYSIS ALT (`/run-analysis`)
**Test Duration:** ~3 min

- [ ] **Form Styling:** Proper padding, margins, field spacing
- [ ] **Loading State:** Submit button shows spinner when loading
- [ ] **Status Messages:** Success/error messages have colored backgrounds
- [ ] **Responsive:** Works on mobile and desktop
- [ ] **View Report Link:** Shows in success message when run completes

---

## 🎯 Key Things to Verify

### ✅ Badges Consistency
Across ALL pages where status/severity appears, should see:
- **Status:** Green (completed), Blue (running), Red (failed), Gray (pending)
- **Severity:** Red (high), Yellow (medium), Green (low), Gray (unknown)
- **Active:** Green (yes), Gray (no)

### ✅ Mobile Experience
At **375px width** (iPhone SE):
- [ ] No horizontal table scroll needed
- [ ] Text readable (14px+)
- [ ] Buttons tap-able (44px+)
- [ ] Forms not cramped
- [ ] Single column layout for cards

### ✅ Touch Targets
All clickable elements:
- [ ] Minimum 44px height
- [ ] Proper spacing (8-12px padding)
- [ ] Hover states visible
- [ ] Disabled states clear

### ✅ Form Interactions
On `/run` page:
- [ ] Validation errors show as red toasts
- [ ] Success shows as green toast
- [ ] Loading state visible
- [ ] Auto-redirect on success works
- [ ] Cancel button goes back

---

## 🔍 Testing Commands (No Backend NeededPhysical Testing)

### Test Mobile Widths:
```javascript
// In browser DevTools Console:
console.log('Phone (375px width) - should hide some columns');
console.log('Tablet (768px) - more columns visible');
console.log('Desktop (1280px+) - all columns visible');
```

### Test Toast Notifications:
```javascript
// Manually trigger (for testing):
// 1. Try submitting run form without model ID → See error toast
// 2. Click export → See success toast
// 3. Check that toasts disappear after 5 seconds
```

### Test Badge Rendering:
```html
<!-- Should see colored badges, not plain text -->
<!-- Example: <span style="background: #dcfce7; color: #166534">completed</span> -->
```

---

## 📊 Before/After Checklist

| Feature | Before | After | Status |
|---------|--------|-------|--------|
| Status badges | Plain gray text | Color-coded | ✅ |
| Mobile tables | Horizontal scroll | Smart columns | ✅ |
| Button sizing | Inconsistent | 44px+ standard | ✅ |
| Form validation | None | Field validation + toasts | ✅ |
| Touch targets | <36px some | 44px minimum | ✅ |
| Responsive grid | Fixed 3 cols | 1→2→3 responsive | ✅ |
| Hover effects | Limited | Smooth transitions | ✅ |

---

## 🤔 If Something Looks Wrong

### Table columns not hiding:
- [ ] Clear browser cache (Ctrl+Shift+Del)
- [ ] Hard refresh page (Ctrl+Shift+R)
- [ ] Check DevTools width (should be < 640px for hidden sm:)

### Badges not showing color:
- [ ] Check Badge component imports
- [ ] Verify badge variant prop passed correctly
- [ ] Check badge.tsx has all variants defined

### Form not submitting:
- [ ] Open DevTools Console for error messages
- [ ] Check Network tab to see API request
- [ ] Verify API endpoint `/v1/analysis` is accessible

### Pagination buttons too small:
- [ ] Check `.btn` class is defined in globals.css
- [ ] Verify `min-h-9` class is applied
- [ ] Check Tailwind is rebuilding (watch mode)

---

## 📱 Device Testing Recommendations

### Recommended Test Devices:
1. **Phone:** iPhone SE (375px) or Android equiv
2. **Tablet:** iPad (768px) or Android tablet
3. **Desktop:** 1280px+ for full feature testing
4. **Large:** 2560px+ if stakeholders use ultra-wide monitors

### Browser Testing:
- [ ] Chrome/Chromium (primary)
- [ ] Safari (iOS support)
- [ ] Firefox (Linux/Windows support)
- [ ] Edge (Enterprise support)

---

## ✅ Sign-Off Criteria

Phase 1 improvements are production-ready when:

- [ ] All 8 pages render correctly on mobile/tablet/desktop
- [ ] Status badges show consistent colors (green/blue/red/yellow/gray)
- [ ] No horizontal table scroll on phones
- [ ] All buttons are 44px+ and easy to tap
- [ ] Form validation and toasts work smoothly
- [ ] No TypeScript/build errors
- [ ] Page load time < 3 seconds
- [ ] No console errors or warnings
- [ ] Accessibility scan passes (WCAG 2.1 AA)

---

**Ready to Test:** ✅ YES  
**Estimated Time:** 30-45 minutes for complete validation  
**Stakeholder Review:** Recommended before Phase 2
