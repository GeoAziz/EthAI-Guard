# History UI Design - Day 18

## Overview

The History UI provides users with an accessible, visually engaging interface to review past ethical evaluations, filter audit records, and drill into detailed decision analysis. This document captures the UI/UX decisions, rationale, and implementation details for the `/history` and `/history/[id]` pages.

## Page Structure

### 1. History List Page (`/history`)

**URL**: `/history`

**Purpose**: Display chronological list of past evaluations with filtering and pagination

**Target Users**: 
- End users reviewing their decision history
- Compliance officers auditing ethical AI usage (future)
- Data scientists analyzing model behavior patterns

#### Layout Components

```
┌────────────────────────────────────────────────────┐
│  Evaluation History                                │
│  Review past ethical evaluations and audit trail   │
├────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────┐   │
│  │ Filters                                    │   │
│  │ [Risk Level ▼] [Model ID    ] [Limit ▼]   │   │
│  └────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────┐   │
│  │ Model: modelA           Score: 85  [HIGH]  │   │
│  │ 2025-01-18 14:30:15                        │   │
│  │ Risk level: high (score=85). Bias threshold│   │
│  │ exceeded...                                │   │
│  │ [fairness_imbalance] [extreme_output_bias] │   │
│  │ [View Details →]                           │   │
│  └────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────┐   │
│  │ Model: modelB           Score: 42  [MEDIUM]│   │
│  │ ...                                        │   │
│  └────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────┤
│  [← Previous]   Showing 1-20   [Next →]          │
└────────────────────────────────────────────────────┘
```

#### Visual Design Decisions

**Color Palette**:
- **Background**: Gradient from gray-50 to gray-100 (subtle, professional)
- **Cards**: White with shadow-md (elevation for emphasis)
- **Risk Badges**:
  - High: Red-100 background, red-800 text, red-300 border
  - Medium: Yellow-100 background, yellow-800 text, yellow-300 border
  - Low: Green-100 background, green-800 text, green-300 border

**Typography**:
- **Page Title**: 4xl font-bold (clear hierarchy)
- **Card Titles**: lg font-semibold (model ID prominent)
- **Timestamps**: sm text-gray-500 (secondary information)
- **Risk Score**: 2xl font-bold (primary metric)

**Spacing**:
- Page padding: 6 (p-6) for breathing room
- Card spacing: space-y-4 (consistent vertical rhythm)
- Internal card padding: 4 (p-4) for compact but readable content

**Why These Choices**:
- Gradient background: Modern, aligns with decision-analysis page (visual consistency)
- Shadow elevations: Cards feel interactive, hover effects reinforce clickability
- Badge colors: Industry-standard red/yellow/green aligns with user mental models (traffic light metaphor)
- Large risk score: Most critical metric for quick scanning

#### Filters Panel

**Filter Options**:
1. **Risk Level** (dropdown): All Levels, High, Medium, Low
2. **Model ID** (text input): Free-form string (e.g., "modelA")
3. **Results per page** (dropdown): 10, 20, 50

**Why These Filters**:
- **Risk Level**: Primary audit concern (compliance officers want to see high-risk)
- **Model ID**: Multi-model deployments need per-model analysis
- **Results per page**: Balance between overview (10) and bulk review (50)

**Not Included** (but discussed):
- Date Range Picker: Deferred to future (adds complexity, users can scroll chronologically)
- User ID Filter: Only shows current user's evals (authorization constraint)
- Triggered Rules Multi-select: Niche use case, deferred

**UI Behavior**:
- Changing any filter resets `offset` to 0 (go back to page 1)
- Filter state persists in component state (not URL query params yet - future enhancement)

#### Loading State

**Skeleton Design**:
```jsx
<div className="bg-white rounded-lg shadow-md p-4 animate-pulse">
  <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
</div>
```

**Animation**: Framer Motion fade-in with staggered delays (i * 0.1s)

**Why Skeleton over Spinner**:
- Reduces perceived load time (content shape visible)
- Less jarring visual shift when data loads
- Standard pattern in modern UIs (LinkedIn, Twitter)

#### Empty State

**Design**:
- Icon: 📊 (data chart emoji, large 6xl)
- Heading: "No evaluations yet" (friendly, non-technical)
- Body: "When you perform your first evaluation, history will appear here."
- CTA Button: "Run Evaluation" (blue-600, links to /decision-analysis)

**Why This Messaging**:
- **Positive framing**: "yet" implies future action, not failure
- **Clear next step**: CTA button reduces friction for first-time users
- **Visual hierarchy**: Large emoji draws attention, button stands out

#### Error State

**Design**:
- Red-50 background with red-200 border (alert styling)
- Red-700 text for error message
- Example: "Failed to load history" (simple, non-technical)

**Why Not Detailed Errors**:
- Users can't fix backend issues (no value in showing stack traces)
- Support teams have logs (structured JSON with full error context)
- Privacy: Don't leak internal error details to frontend

#### Evaluation Cards

**Card Structure**:
1. **Header Row**: Model ID (left) | Score + Badge (right)
2. **Timestamp**: Small gray text below model ID
3. **Explanation Summary**: 1-2 sentence preview (gray-600)
4. **Triggered Rules**: Orange tags (if any rules triggered)
5. **CTA Button**: "View Details →" (blue-600, hover blue-700)

**Hover Effects**:
- Card: shadow-md → shadow-lg (elevation increase)
- Button: bg-blue-600 → bg-blue-700 (standard interactive feedback)

**Animation**: Framer Motion `initial={{ opacity: 0, x: -20 }}` slide-in from left

**Why This Layout**:
- **Score prominence**: Right-aligned large number draws eye (F-pattern reading)
- **Timestamp secondary**: Users recognize eval by model/score, not timestamp
- **Triggered rules visible**: Red flags (policy violations) need immediate visibility
- **CTA clarity**: Arrow icon (→) reinforces navigation action

#### Pagination Controls

**Design**:
- Previous button (disabled if offset=0)
- Page indicator: "Showing 1-20"
- Next button (disabled if evaluations.length < limit)

**Why Offset Pagination**:
- Simpler implementation (no cursor management)
- Adequate for <1000 evaluations (Firestore offset performance acceptable)
- **Future**: Migrate to cursor-based (`startAfter`) for >1000 docs

**Button States**:
- Enabled: Gray-600, hover gray-700
- Disabled: Gray-300, cursor-not-allowed (clear non-interactive state)

### 2. Evaluation Detail Page (`/history/[id]`)

**URL**: `/history/[id]` (Next.js dynamic route)

**Purpose**: Full audit trail for a single evaluation with technical details

**Target Users**:
- Compliance officers reviewing high-risk decisions
- Data scientists debugging model behavior
- End users understanding "why this score?"

#### Layout Sections

```
┌──────────────────────────────────────────────────────┐
│  Evaluation Details                    [← Back]      │
│  2025-01-18 14:30:15 · Request ID: abc123           │
├──────────────────────────────────────────────────────┤
│  🎯 Evaluation Summary                               │
│  ┌────────────┬────────────┬────────────┐          │
│  │ Model      │ Risk Score │ Compliance │          │
│  │ modelA     │    85      │   [HIGH]   │          │
│  └────────────┴────────────┴────────────┘          │
├──────────────────────────────────────────────────────┤
│  📌 Triggered Rules                                  │
│  ┌──────────────────────────────────────────────┐  │
│  │ fairness_imbalance              [TRIGGERED]  │  │
│  │ Sensitive attribute distribution exceeded... │  │
│  └──────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────┤
│  🔎 Explanation Narrative                            │
│  Summary: Risk level: high (score=85)               │
│  Key Factors:                                       │
│   • Fairness imbalance detected...                 │
│   • Extreme output bias flagged...                 │
│  Recommended Action: IMMEDIATE REVIEW REQUIRED...   │
├──────────────────────────────────────────────────────┤
│  🧪 Technical Details                                │
│  ▶ Input Features                                   │
│  ▶ Simulation Output                                │
│  ▶ Rules Evaluation                                 │
│  ▶ Risk Analysis                                    │
├──────────────────────────────────────────────────────┤
│  🔁 Re-run Evaluation                                │
│  Run this evaluation again with the same inputs...  │
│  [Re-Evaluate with Same Inputs →]                   │
└──────────────────────────────────────────────────────┘
```

#### Section 1: Evaluation Summary Card

**Metrics Displayed**:
- Model Used (string)
- Risk Score (large bold number)
- Compliance Level (badge: low/medium/high)

**Layout**: 3-column grid (responsive: 1 col mobile, 3 col desktop)

**Why This Structure**:
- **At-a-glance overview**: Critical context before diving into details
- **Grid layout**: Equal visual weight for all three metrics
- **Large risk score**: Reinforces primary concern (consistent with list view)

#### Section 2: Triggered Rules Panel

**Empty State**: "No rules triggered - evaluation passed all checks" (italic gray-500)

**Rule Card Design** (if rules triggered):
- Orange-50 background (warning color)
- Orange-200 border (emphasis)
- Rule name: Bold orange-800 (e.g., "fairness_imbalance")
- Explanation: Small orange-600 text (e.g., "Imbalance ratio: 0.85")
- Badge: "TRIGGERED" (orange-200 background, orange-900 text)

**Animation**: Staggered fade-in (`delay: 0.1 * idx`)

**Why Orange Theme**:
- Red: Too alarming (not all triggered rules are failures)
- Yellow: Too subtle (rules are important)
- Orange: Middle ground (caution, but not panic)

**Rule Explanation Logic**:
- `fairness_imbalance`: Shows max_group_ratio from rules.fairness
- `extreme_output_bias`: Shows model_output from rules.bias
- `compliance_missing_fields`: Shows missing_fields array from rules.compliance

**Why Show Explanations**:
- Users understand "what" triggered (rule name) but need "why" (threshold details)
- Compliance officers need specific values for regulatory reports

#### Section 3: Explanation Narrative

**Subsections**:
1. **Summary**: One-sentence overview (gray-800)
2. **Key Factors**: Bulleted list of details (gray-700)
3. **Recommended Action**: Blue-50 box with blue-700 text (action-oriented)

**Why This Structure**:
- **Inverted pyramid**: Most important info first (summary), details second
- **Bulleted list**: Easier to scan than prose paragraph
- **Action callout**: Highlighted box draws attention to required next step

**Visual Hierarchy**:
- Uppercase tracking-wide labels (SUMMARY, KEY FACTORS) for section clarity
- Blue box for recommended action (differentiate from descriptive content)

#### Section 4: Technical Details (JSON Viewer)

**Collapsible Sections**:
- Input Features (default: collapsed)
- Simulation Output (default: collapsed)
- Rules Evaluation (default: collapsed)
- Risk Analysis (default: collapsed)

**UI Behavior**:
- Click button → toggle `jsonExpanded[key]` state
- Framer Motion: Height animation (0 → auto), fade-in
- Button: ▶ (collapsed) / ▼ (expanded)

**JSON Display**:
- Gray-50 background (subtle, not pure white)
- Gray-200 border (contained feel)
- Text-sm (smaller font for dense data)
- Overflow-x-auto (horizontal scroll if JSON wide)

**Why Collapsible**:
- **Progressive disclosure**: Most users don't need JSON (only data scientists)
- **Reduce cognitive load**: Hide complexity by default
- **Power user access**: Click to reveal full technical details

**Formatting**: `JSON.stringify(data, null, 2)` (indented, readable)

#### Section 5: Re-Evaluate Button

**Design**:
- Centered card (text-center)
- Blue-600 button, hover blue-700
- Arrow icon (→) for action indication

**Functionality**:
- Navigate to `/decision-analysis` with query params:
  - `model_id`: Pre-fill model ID field
  - `input_features`: Pre-fill feature rows (JSON.stringify)
- User can edit inputs or re-run as-is

**Why This Feature**:
- **Regression testing**: "Did model behavior change?"
- **Whatif analysis**: "What if I change one feature?"
- **Audit trail continuity**: Link historical eval to new eval

**Future Enhancement**: Show diff between old/new evaluation results side-by-side

#### Header Actions

**Back Button**:
- Gray-600 background, hover gray-700
- Arrow: ← (navigation icon)
- Links to `/history`

**Why Top-Right Placement**:
- Standard UI pattern (mobile apps, dashboards)
- Doesn't compete with page title (left-aligned)
- Easy thumb reach on mobile (top-right corner)

#### Loading State

**Design**: Centered spinner (animate-spin), "Loading evaluation details..." text below

**Why Not Skeleton**:
- Unknown layout structure (depends on triggered rules count, JSON sizes)
- Spinner adequate for <500ms load time (Firestore doc fetch)

#### Error State

**Design**: Red-50 box with error message + Back button

**Error Messages**:
- "evaluation_not_found" → "Evaluation not found"
- "forbidden" → "You don't have permission to view this evaluation"
- Network error → "Failed to load evaluation"

**Why Simple Messages**: Users can't debug Firestore issues (hide technical errors)

## Animation Strategy

### Timing Decisions

**Page Entry**: 0.5s duration (smooth but not sluggish)

**Staggered Lists**: 0.05s delay per item (subtle cascade effect)

**Skeleton Loading**: 0.1s delay between skeleton cards (mimics content loading progressively)

**JSON Expand**: 0.3s height animation (smooth transition, not jarring)

**Why These Timings**:
- **<300ms**: Feels instant (users don't consciously notice)
- **300-1000ms**: Feels responsive (acceptable wait time)
- **>1000ms**: Feels slow (need spinner/skeleton)

**Rationale**: 0.5s page entry + 0.05s stagger = ~0.7s for 20 items (acceptable)

### Motion Patterns

**Fade-in**: `opacity: 0 → 1` (all sections)

**Slide-in**: `x: -20 → 0` (cards, sections) - subtle directional cue

**Scale**: `scale: 0.9 → 1` (empty state) - playful, draws attention

**Why Not Complex Animations**:
- **Performance**: Too many simultaneous animations = janky (60fps goal)
- **Accessibility**: Some users prefer reduced motion (future: respect prefers-reduced-motion)
- **Professionalism**: Subtle animations feel polished, not gimmicky

## Accessibility Considerations

### Keyboard Navigation

- **Tab order**: Filters → Cards → Pagination → Detail sections
- **Focus indicators**: Blue outline on focused elements (browser default preserved)
- **Button labels**: Descriptive text ("View Details" not just "→")

### Screen Readers

- **Alt text**: Badges read as "High risk level" (not just "HIGH")
- **ARIA labels**: Buttons have aria-label for context (e.g., "View details for evaluation abc123")
- **Landmark roles**: `<main>`, `<section>`, `<nav>` for page structure

**Future Enhancements**:
- Skip to content link
- Live region announcements (e.g., "20 evaluations loaded")
- High-contrast mode support

### Color Blindness

**Risk Badges**: Not color-only (also use text: LOW/MEDIUM/HIGH)

**Triggered Rules**: Orange theme + "TRIGGERED" label (not just color)

**Why This Matters**: ~8% of males have red-green color blindness (need text+color redundancy)

## Responsive Design

### Breakpoints

- **Mobile** (<768px): Single column, stacked filters
- **Tablet** (768-1024px): 2-column grid for summary cards
- **Desktop** (>1024px): 3-column grid, side-by-side filters

**Tailwind Classes Used**:
- `grid grid-cols-1 md:grid-cols-3` (responsive grid)
- `flex flex-col md:flex-row` (stack on mobile, row on desktop)
- `text-2xl md:text-4xl` (smaller font on mobile)

### Mobile Considerations

- **Touch targets**: Buttons 44x44px min (Apple HIG guideline)
- **Thumb zones**: Back button top-right, CTA buttons bottom-center
- **Scrolling**: Cards scroll vertically (natural mobile pattern)

## Performance Optimizations

### Bundle Size

- **Framer Motion**: ~50KB gzipped (acceptable for animation value)
- **Axios**: ~13KB gzipped (standard HTTP client)
- **No heavy libraries**: No moment.js (use native Date), no lodash (use native methods)

### Rendering

- **React Keys**: evaluation_id used as key (stable, unique)
- **Conditional Rendering**: JSON sections only render when expanded (reduce DOM size)
- **Pagination**: Limit 20 items/page (prevent scroll lag with 1000+ items)

### API Calls

- **Filters trigger new fetch**: Trade-off (simplicity over caching)
- **No polling**: Static data (evaluations don't update after creation)
- **Authorization token**: Cached in localStorage (no repeated login)

**Future**: React Query for caching/deduplication

## Error Handling Patterns

### Network Errors

**User sees**: "Failed to load history" message

**Logs show**: Full axios error with status code, endpoint, user_id

**Why Hide Details**: Security (don't leak API structure), UX (users can't fix network)

### Authorization Errors

**403 Forbidden**: "You don't have permission to view this evaluation"

**401 Unauthorized**: Redirect to login (token expired)

**Why Differentiate**: Users understand "not allowed" vs "not logged in" (different actions)

### Validation Errors

**Not applicable**: No user input on history pages (filters are dropdowns, safe values)

## Future Enhancements

### Planned Features

1. **URL Query Params**: Persist filters in URL (shareable links, browser back button)
2. **Export to CSV**: Download audit trail for offline analysis
3. **Date Range Picker**: Filter evaluations by timestamp range
4. **Comparison View**: Side-by-side diff of two evaluations
5. **Real-time Updates**: WebSocket notifications when new evaluation saved
6. **Dark Mode**: Toggle for low-light environments

### Deferred Features

- Advanced search (full-text search across explanations)
- Custom dashboard (user-defined metrics/charts)
- Bulk operations (delete/export multiple evaluations)

**Why Deferred**: Complexity vs value (80% of users need basic list+detail)

## Conclusion

The History UI prioritizes **clarity** (clean visual hierarchy), **accessibility** (keyboard nav, screen readers), and **progressive disclosure** (show summaries, hide complexity). Design decisions balance aesthetic appeal (animations, colors) with functional requirements (filters, pagination, JSON viewers). The two-page structure (list → detail) follows industry-standard patterns (email clients, file managers) for familiarity, while audit-specific features (triggered rules, risk badges) address domain requirements. Animations enhance perceived performance without sacrificing actual load times, and empty/error states provide clear guidance when data is absent or unavailable.
