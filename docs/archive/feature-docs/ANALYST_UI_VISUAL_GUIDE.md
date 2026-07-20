# Analyst UI/UX - Visual Quick Guide

## 📱 What Analyst Sees After Login

### Desktop View (1280px+)
```
┌────────────────────────────────────────────────────────────────────────────────┐
│  EthAI  [Search]           [Notifications] [Analyst ▼]                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│ Dashboard    │ Analyst Workspace                                                 │
│ ➕ Run       │ Datasets, model evaluations, and explainability tools             │
│ 📁 Datasets  │                                                                    │
│ 📋 Reports   │ [New Analysis Run] [Upload Dataset] [View All Reports]            │
│ 🤖 Models    │                                                                    │
│ ⚖️  Fairness  │ ┌─────────────────┬─────────────────┬─────────────────┐         │
│ 📡 Monitoring│ │ 42              │ 18              │ 3               │         │
│ ⚙️  Settings  │ │ Total Datasets  │ Total Models    │ Active Runs     │         │
│ 👤 Profile   │ └─────────────────┴─────────────────┴─────────────────┘         │
│ 🚪 Logout    │ [Alerts: 2 bias/drift issues detected]                           │
│              │                                                                    │
│              │ Recent Analysis Runs                                              │
│              │ ┌──────────────┬────────┬──────────┬──────────┬─────────────┐    │
│              │ │Run ID        │Model   │Dataset   │Created   │Status      │    │
│              │ ├──────────────┼────────┼──────────┼──────────┼─────────────┤    │
│              │ │run_20250211  │xgb_v2  │census_df │2/11/2025 │ ✓ Done     │    │
│              │ │run_20250210  │bert_v1 │news_feed │2/10/2025 │ ⟳ Running  │    │
│              │ │run_20250209  │gpt_v3  │product_x │2/9/2025  │ ✓ Done     │    │
│              │ │run_20250208  │xgb_v2  │census_df │2/8/2025  │ ✗ Failed   │    │
│              │ └──────────────┴────────┴──────────┴──────────┴─────────────┘    │
│              │                                                                    │
│              │ Your Datasets                                                     │
│              │ ┌────────────────┬────────────┬──────────┬──────────────┐         │
│              │ │Name            │Sensitivity │Version   │Status        │         │
│              │ ├────────────────┼────────────┼──────────┼──────────────┤         │
│              │ │census_df       │high        │v2.1      │ready         │         │
│              │ │product_x       │standard    │v1.0      │ready         │         │
│              │ │news_feed       │high        │v3.2      │ready         │         │
│              │ │customer_db     │sensitive   │v1.0      │indexing      │         │
│              │ └────────────────┴────────────┴──────────┴──────────────┘         │
│              │                                                                    │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Tablet View (768px)
```
┌─────────────────────────────────────────────────┐
│  EthAI  [Search]    [Notifications] [👤 ▼]     │
├─────────────────────────────────────────────────┤
│ ☰  │ Analyst Workspace                          │
│    │ Datasets, evaluations, explainability      │
│ ━┿━ │                                             │
│ 📊 │ [New Run] [Upload] [All Reports]           │
│ ➕ │                                             │
│ 📁 │ ┌────────────────┬────────────────┐        │
│ 📋 │ │42              │18              │        │
│ 🤖 │ │Total Datasets  │Total Models    │        │
│ ⚖️  │ └────────────────┴────────────────┘        │
│ 📡 │ ┌────────────────┬────────────────┐        │
│ ⚙️  │ │3               │2               │        │
│    │ │Active Runs     │Alerts          │        │
│    │ └────────────────┴────────────────┘        │
│    │                                             │
│    │ Recent Analysis Runs                       │
│    │ ┌──────────────┬──────────┬────────┐      │
│    │ │Run ID        │Model     │Status  │      │
│    │ ├──────────────┼──────────┼────────┤      │
│    │ │run_20250211  │xgb_v2    │ ✓ Done │      │
│    │ │run_20250210  │bert_v1   │⟳ Run  │      │
│    │ │run_20250209  │gpt_v3    │ ✓ Done │      │
│    │ └──────────────┴──────────┴────────┘      │
│    │                                             │
│    │ Your Datasets                              │
│    │ ┌────────────────┬──────────────┐         │
│    │ │Name            │Sensitivity   │         │
│    │ ├────────────────┼──────────────┤         │
│    │ │census_df       │high          │         │
│    │ │product_x       │standard      │         │
│    │ │news_feed       │high          │         │
│    │ └────────────────┴──────────────┘         │
└─────────────────────────────────────────────────┘
```

### Mobile View (375px)
```
┌──────────────────────────────┐
│  EthAI  [Search] [👤 ▼]      │
├──────────────────────────────┤
│ ☰ │ Analyst Workspace         │
├──────────────────────────────┤
│                              │
│ [New Run]                    │
│ [Upload]                     │
│ [All Reports]                │
│                              │
│ ┌────────────────────────┐   │
│ │42                      │   │
│ │Total Datasets          │   │
│ │Available for analysis  │   │
│ └────────────────────────┘   │
│                              │
│ ┌────────────────────────┐   │
│ │18                      │   │
│ │Total Models            │   │
│ │Registered models       │   │
│ └────────────────────────┘   │
│                              │
│ ┌────────────────────────┐   │
│ │3                       │   │
│ │Active Runs             │   │
│ │In progress             │   │
│ └────────────────────────┘   │
│                              │
│ ┌────────────────────────┐   │
│ │2                       │   │
│ │Alerts                  │   │
│ │Bias/drift detected     │   │
│ └────────────────────────┘   │
│                              │
│ Recent Runs                  │
│ ┌────────────────────────┐   │
│ │run_20250211            │   │
│ │✓ Done                  │   │
│ │[View]                  │   │
│ └────────────────────────┘   │
│ ┌────────────────────────┐   │
│ │run_20250210            │   │
│ │⟳ Running               │   │
│ │[View]                  │   │
│ └────────────────────────┘   │
│ ┌────────────────────────┐   │
│ │run_20250209            │   │
│ │✓ Done                  │   │
│ │[View]                  │   │
│ └────────────────────────┘   │
│                              │
│ Your Datasets                │
│ ┌────────────────────────┐   │
│ │census_df               │   │
│ │[View]                  │   │
│ └────────────────────────┘   │
│ ┌────────────────────────┐   │
│ │product_x               │   │
│ │[View]                  │   │
│ └────────────────────────┘   │
│ ┌────────────────────────┐   │
│ │news_feed               │   │
│ │[View]                  │   │
│ └────────────────────────┘   │
└──────────────────────────────┘
```

---

## 🔑 Key Information Display

### KPI Cards (Responsive)

**Desktop: 4 columns**
```
[42]      [18]      [3]       [2]
Datasets  Models    Active    Alerts
```

**Tablet: 2 columns**
```
[42]      [18]
Datasets  Models

[3]       [2]
Active    Alerts
```

**Mobile: 1 column**
```
[42]
Datasets

[18]
Models

[3]
Active

[2]
Alerts
```

---

### Recent Analysis Runs Table

**Mobile (375px) - Show only:**
- Run ID
- Status (badge)
- Actions (View link)

**Tablet (768px) - Add:**
- Model name
- Run ID
- Status
- Actions

**Desktop (1280px) - Show all:**
- Run ID
- Model
- Dataset
- Created date
- Status
- Actions

**Status Colors:**
- ✓ Completed = Green `bg-green-100 text-green-700`
- ⟳ Running = Blue `bg-blue-100 text-blue-700`
- ✗ Failed = Red `bg-red-100 text-red-700`
- ⊙ Pending = Gray `bg-gray-100 text-gray-700`

---

### Your Datasets Table

**Mobile (375px) - Show only:**
- Dataset name
- Actions (View link)

**Tablet (768px) - Add:**
- Sensitivity level badge

**Desktop (1280px) - Show all:**
- Name
- Sensitivity badge
- Version
- Status
- Actions

**Sensitivity Badges:**
```
[high]       = Red badge
[sensitive]  = Orange badge
[standard]   = Blue badge
```

---

## 🧭 Navigation Menu (Left Sidebar)

### Desktop (Expanded)
```
📊 Dashboard
➕ New Analysis Run
📁 Datasets
📋 Reports
🤖 Models
⚖️  Fairness
📡 Monitoring
⚙️  Settings
👤 Profile
🚪 Logout
```

### Tablet (Icon View)
```
📊
➕
📁
📋
🤖
⚖️
📡
⚙️
👤
🚪
```

### Mobile (Hidden, behind hamburger)
```
☰ [tap to reveal full menu]
```

---

## 🎨 Color Scheme

| Element | Color | Hex | Usage |
|---------|-------|-----|-------|
| Success | Green | #10B981 | Completed runs, successful alerts |
| Running | Blue | #3B82F6 | Active/running processes |
| Error | Red | #EF4444 | Failed runs, critical alerts |
| Warning | Orange | #F97316 | Warnings, sensitive data |
| Info | Blue | #0EA5E9 | Informational badges |
| Neutral | Gray | #6B7280 | Pending, standard |

---

## 📊 Example API Responses

### KPI Data
```json
// GET /v1/datasets
{
  "data": [
    {"datasetId": "ds_1", "name": "census_df", ...},
    {"datasetId": "ds_2", "name": "product_x", ...},
    // ... 40 more
  ]
}

// GET /v1/models
{
  "data": [
    {"id": "m_1", "name": "xgb_v2", ...},
    {"id": "m_2", "name": "bert_v1", ...},
    // ... 16 more
  ]
}

// GET /v1/reports
{
  "data": [
    {
      "id": "run_20250211",
      "modelId": "m_1",
      "model": "xgb_v2",
      "datasetId": "ds_1",
      "dataset": "census_df",
      "createdAt": "2025-02-11T10:30:00Z",
      "status": "completed",
      "accuracy": 0.94,
      "biasSeverity": "none",
      "driftScore": 0.05
    },
    // ... 4 more reports
  ]
}
```

---

## 🖱️ Key User Actions

| Action | Starting Point | Destination | Button Text |
|--------|-----------------|-------------|-------------|
| Create run | Home | `/analyst/run` | New Analysis Run |
| Upload data | Home | `/analyst/datasets` | Upload Dataset |
| View all reports | Home | `/analyst/reports` | View All Reports |
| View run details | Table | `/analyst/reports/{id}` | View |
| View dataset | Table | `/analyst/datasets` | View |
| Check fairness | KPI Alert | `/analyst/fairness` | (click card) |

---

## ✅ Quick Verification

### Home page should show:
- [ ] Analyst sidebar menu (Dashboard, Run, Datasets, Reports, Models, Fairness, Monitoring)
- [ ] 4 KPI cards (Total Datasets, Total Models, Active Runs, Alerts)
- [ ] Recent Analysis Runs table (5 latest)
- [ ] Your Datasets table (5 latest)
- [ ] "No data" messages if empty
- [ ] Loading spinners while fetching
- [ ] Error messages if API fails
- [ ] All tables responsive at 375px, 768px, 1280px viewports
- [ ] All buttons have 36px+ height
- [ ] Touch spacing ≥8px between interactive elements

### Expected Behavior:
1. Page loads in < 2 seconds
2. KPI cards populate within 500ms
3. Tables are horizontal-scrollable on mobile
4. No layout shifts or jank
5. All links navigate correctly
6. Mobile-friendly spacing on small screens

---

## 🚀 Current Status

✅ **Analyst home page is LIVE**

- Real API data fetching (not mock/placeholder charts)
- Responsive design (mobile, tablet, desktop)
- Loading and error states handled
- All KPI cards display live data from backend
- Recent runs table shows latest analyses
- Dataset list shows available datasets
- Quick action buttons working

🔄 **Next Phase (Optional):**
- Make analyst child pages responsive (Reports, Datasets, Models, Fairness, Monitoring)
- Add filtering and search
- Add export functionality
- Add saved views

