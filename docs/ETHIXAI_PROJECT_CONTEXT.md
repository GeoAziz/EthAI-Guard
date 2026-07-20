# EthixAI — Comprehensive AI Development Context

> **Purpose**: This document is the single source of truth for any AI agent working on the EthixAI codebase. It provides complete project understanding with a **UI/UX focus** so AI can immediately dive into improvements and implementations without re-discovering the architecture.
>
> **Last Updated**: February 28, 2026 | **Version**: 1.0.0 (production-released)

---

## Table of Contents

1. [Project Identity & Purpose](#1-project-identity--purpose)
2. [Architecture Overview](#2-architecture-overview)
3. [Tech Stack Reference](#3-tech-stack-reference)
4. [Frontend Route Map](#4-frontend-route-map)
5. [Component Inventory](#5-component-inventory)
6. [Design System Specification](#6-design-system-specification)
7. [Layout Architecture](#7-layout-architecture)
8. [Authentication & RBAC](#8-authentication--rbac)
9. [State Management Patterns](#9-state-management-patterns)
10. [Backend API Surface](#10-backend-api-surface)
11. [Current UI/UX Status & Known Issues](#11-current-uiux-status--known-issues)
12. [Responsive Design Patterns](#12-responsive-design-patterns)
13. [Accessibility Standards](#13-accessibility-standards)
14. [Testing Infrastructure](#14-testing-infrastructure)
15. [File Path Quick Reference](#15-file-path-quick-reference)
16. [Development Conventions](#16-development-conventions)
17. [Known Technical Debt](#17-known-technical-debt)
18. [Environment Configuration](#18-environment-configuration)

---

## 1. Project Identity & Purpose

**EthixAI** is a **production-ready Ethical AI Governance Platform** built for **financial institutions**. Its core mission:

| Capability | Description |
|---|---|
| **Bias Detection** | Real-time detection of bias in AI/ML model decisions across protected attributes (gender, race, age) |
| **Explainability** | SHAP-powered explanations for every AI decision — human-readable reasoning |
| **Compliance** | Audit trails, regulatory reporting, fairness threshold enforcement |
| **Drift Monitoring** | Continuous monitoring for model and data drift with alerting |
| **Model Governance** | Version control, promotion workflows, validation pipelines, model cards |

### Target Users (4 Roles)

| Role | Persona | Primary Workflow |
|---|---|---|
| **Admin** | Platform administrator | User management, access requests, org settings, audit logs, billing |
| **Analyst** | Data scientist / ML engineer | Run bias analyses, review SHAP explanations, manage datasets & models |
| **Reviewer** | Compliance / ethics officer | Review fairness reports, approve/reject evaluations, set thresholds |
| **User** | General authenticated user | Upload datasets, run basic analyses, view personal reports |

### Domain Context

- Industry: **Financial services** (loan decisions, credit scoring, insurance underwriting)
- Regulation targets: Fair lending laws, ECOA, disparate impact analysis
- Sample data: Loan application datasets with features like income, age, gender, credit score

---

## 2. Architecture Overview

### Three-Tier Microservices

```
┌─────────────────────┐     ┌──────────────────────┐     ┌───────────────────────┐
│  Frontend (Next.js)  │────▶│  Backend (Express)    │────▶│   AI Core (FastAPI)    │
│  Port: 3000          │     │  Port: 5000           │     │   Port: 8100           │
│  TypeScript + React  │     │  Node.js + Mongoose   │     │   Python + scikit-learn │
└─────────────────────┘     └──────────────────────┘     └───────────────────────┘
                                      │                            │
                          ┌───────────┼───────────┐                │
                          ▼           ▼           ▼                ▼
                     MongoDB:27018  PostgreSQL:5432  Redis:6379   MongoDB (shared)
                                                                    
                          Prometheus:9090  ──▶  Grafana:3001
```

### Data Flow (Analysis Request)

1. User uploads CSV dataset via frontend drag-and-drop form
2. Frontend POSTs to backend `/analyze` with dataset reference
3. Backend forwards to AI Core `/analyze` (FastAPI)
4. AI Core runs bias detection (statistical parity, equal opportunity, disparate impact) + SHAP explanations
5. Results cached in Redis, persisted to MongoDB
6. Frontend renders fairness charts, SHAP visualizations, risk badges, compliance score

### Hosting

| Service | Production URL |
|---|---|
| Backend API | `https://ethai-guard.onrender.com` |
| Frontend | Firebase/Vercel-ready (local dev on `:3000`) |
| Database | MongoDB Atlas (`qaran-baby-shop.ed8u0jn.mongodb.net/ethixai`) |

---

## 3. Tech Stack Reference

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 15 | App Router, SSR/SSG, file-based routing |
| **React** | 18 | UI rendering |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 3.4.1 | Utility-first styling |
| **shadcn/ui** | Latest | Component library (Radix UI primitives) |
| **Radix UI** | Various | Accessible headless primitives |
| **Lucide React** | Latest | Icon library |
| **Recharts** | Latest | Data visualization / charts |
| **Framer Motion** | Latest | Animations |
| **Axios** | Latest | HTTP client |
| **Firebase SDK** | Web v9+ | Authentication |
| **Zod** | Latest | Form validation schemas |
| **react-hook-form** | Latest | Form state management |
| **date-fns** | Latest | Date formatting |
| **clsx + tailwind-merge** | Latest | Class name composition (`cn()` utility) |
| **Embla Carousel** | Latest | Carousel component |
| **AOS** | Latest | Animate on scroll |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | 20 | Runtime |
| **Express** | 4 | HTTP framework |
| **Mongoose** | Latest | MongoDB ODM |
| **Firebase Admin SDK** | Latest | Auth verification, custom claims |
| **JWT (jsonwebtoken)** | Latest | Token signing/verification |
| **Helmet** | Latest | Security headers |
| **express-rate-limit** | Latest | API rate limiting |
| **Pino / Winston** | Latest | Structured logging |
| **prom-client** | Latest | Prometheus metrics |

### AI Core

| Technology | Version | Purpose |
|---|---|---|
| **Python** | 3.11 | Runtime |
| **FastAPI** | Latest | API framework |
| **scikit-learn** | Latest | ML models |
| **SHAP** | Latest | Model explainability |
| **Pandas / NumPy** | Latest | Data processing |

### Infrastructure

| Technology | Purpose |
|---|---|
| **Docker + Docker Compose** | Containerization (dev + prod configs) |
| **MongoDB 6** | Primary database |
| **PostgreSQL 15** | Secondary structured data |
| **Redis 7** | Caching & sessions |
| **Prometheus + Grafana** | Monitoring & dashboards |
| **GitHub Actions** | CI/CD (23 workflow files) |
| **Firebase** | Authentication + Firestore audit trails |

---

## 4. Frontend Route Map

### Public Routes (No Auth Required)

| Route | Page File | Description |
|---|---|---|
| `/` | `src/app/page.tsx` | Landing page (`LandingPageClient`) |
| `/login` | `src/app/login/page.tsx` | Login (Zod + Firebase/backend) |
| `/register` | `src/app/register/page.tsx` | Registration |
| `/verify-email` | `src/app/verify-email/page.tsx` | Email verification + resend |
| `/post-login` | `src/app/post-login/page.tsx` | Role-based redirect dispatcher |
| `/unauthorized` | `src/app/unauthorized/page.tsx` | Access denied |
| `/about` | `src/app/about/page.tsx` | About page |
| `/blog` | `src/app/blog/page.tsx` | Blog |
| `/careers` | `src/app/careers/page.tsx` | Careers |
| `/status` | `src/app/status/page.tsx` | System status |
| `/guest` | `src/app/guest/page.tsx` | Guest view |
| `/api-reference` | `src/app/api-reference/page.tsx` | API docs |
| `/community/discord` | `src/app/community/discord/page.tsx` | Community |
| `/demo` | `src/app/demo/page.tsx` | Demo page |

### Docs Routes (`/docs/*` — nested layout)

| Route | Description |
|---|---|
| `/docs` | Docs landing |
| `/docs/quick-start` | Quick start guide |
| `/docs/installation` | Installation |
| `/docs/authentication` | Auth docs |
| `/docs/fairness-metrics` | Fairness metrics reference |
| `/docs/explainability` | Explainability docs |
| `/docs/data-format` | Data format specification |
| `/docs/contributing` | Contributing guide |
| `/docs/compliance` | Compliance documentation |

### Dashboard — General (Auth Required, any role)

| Route | Description |
|---|---|
| `/dashboard` | Upload Dataset (default landing for `user` role) |
| `/dashboard/fairlens` | FairLens bias analysis visualization |
| `/dashboard/explainboard` | ExplainBoard SHAP explanations |
| `/dashboard/compliance` | Compliance reporting |
| `/dashboard/settings` | User settings |
| `/dashboard/request-access` | Request role upgrade |

### Dashboard — Admin (`/dashboard/admin/*`)

| Route | Description |
|---|---|
| `/dashboard/admin` | Admin overview (KPI cards + charts) |
| `/dashboard/admin/users` | User management table |
| `/dashboard/admin/access-requests` | Approve/reject role requests |
| `/dashboard/admin/settings` | Organization settings |
| `/dashboard/admin/fairness` | Fairness threshold configuration |
| `/dashboard/admin/billing` | Billing & usage |
| `/dashboard/admin/datasets` | Dataset management |
| `/dashboard/admin/datasets/[id]` | Dataset detail |
| `/dashboard/admin/models` | Model registry |
| `/dashboard/admin/audit` | Audit logs |
| `/dashboard/admin/reports` | Admin reports |

### Dashboard — Analyst (`/dashboard/analyst/*`)

| Route | Description |
|---|---|
| `/dashboard/analyst` | Analyst dashboard (KPIs, recent reports, datasets) |
| `/dashboard/analyst/run` | Run analysis |
| `/dashboard/analyst/run-analysis` | Run analysis (alternative) |
| `/dashboard/analyst/reports` | Reports list |
| `/dashboard/analyst/reports/[id]` | Report detail |
| `/dashboard/analyst/models` | Models view |
| `/dashboard/analyst/history` | Analysis history |
| `/dashboard/analyst/fairness` | Fairness analysis |
| `/dashboard/analyst/datasets` | Analyst datasets |

### Dashboard — Reviewer (`/dashboard/reviewer/*`)

| Route | Description |
|---|---|
| `/dashboard/reviewer` | Reviewer dashboard |
| `/dashboard/reviewer/reports` | Reviewer reports |
| `/dashboard/reviewer/reports/[id]` | Report detail |
| `/dashboard/reviewer/review/[id]` | Review detail |
| `/dashboard/reviewer/thresholds` | Threshold configuration |
| `/dashboard/reviewer/audit` | Audit logs |
| `/dashboard/reviewer/fairness` | Fairness review |
| `/dashboard/reviewer/profile` | Reviewer profile |

### Dashboard — User (`/dashboard/user/*`)

| Route | Description |
|---|---|
| `/dashboard/user` | User dashboard |
| `/dashboard/user/run` | Run analysis |
| `/dashboard/user/runs` | Past runs list |
| `/dashboard/user/reports` | User reports |
| `/dashboard/user/reports/[id]` | Report detail |
| `/dashboard/user/profile` | Profile |
| `/dashboard/user/notifications` | Notifications |

### Additional Domain Routes

| Route | Description |
|---|---|
| `/models` | Model listing |
| `/models/[id]/promote` | Model promotion |
| `/models/[id]/retrain` | Model retraining |
| `/report` | Report page |
| `/report/[id]` | Report detail |
| `/validation` | Validation page |
| `/validation/[id]` | Validation detail |
| `/datasets` | Datasets listing |
| `/fairness` | Fairness analysis |
| `/explainability` | Explainability page |
| `/decision-analysis` | Decision analysis |
| `/history` | History list |
| `/history/[id]` | History detail |
| `/monitor/drift` | Model drift monitoring |
| `/account/profile` | Account profile |

---

## 5. Component Inventory

### UI Primitives — shadcn/ui (42 components in `src/components/ui/`)

All built on Radix UI primitives, styled with Tailwind + CSS variables.

| Component | Radix Primitive | Notes |
|---|---|---|
| `accordion` | `@radix-ui/react-accordion` | Collapsible content sections |
| `alert-dialog` | `@radix-ui/react-alert-dialog` | Confirmation dialogs |
| `alert` | Custom | Status messages (info, warning, error, success) |
| `avatar` | `@radix-ui/react-avatar` | User avatars with fallback |
| `badge` | Custom (CVA) | Status/role badges with variants |
| `button` | Custom (CVA) | 6 variants: default, destructive, outline, secondary, ghost, link; 4 sizes |
| `calendar` | `react-day-picker` | Date picker |
| `card` | Custom | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter |
| `carousel` | `embla-carousel-react` | Content carousel |
| `chart` | `recharts` | Chart container with theme context |
| `chart-placeholder` | Custom | Placeholder for unimplemented charts |
| `checkbox` | `@radix-ui/react-checkbox` | Checkbox input |
| `collapsible` | `@radix-ui/react-collapsible` | Collapsible panel |
| `dialog` | `@radix-ui/react-dialog` | Modal dialogs |
| `dropdown-menu` | `@radix-ui/react-dropdown-menu` | Context menus |
| `empty-state` | Custom | Empty content placeholder with icon + message |
| `error-boundary` | Custom | React error boundary |
| `form` | `react-hook-form` | Form field wrapper with validation |
| `input` | Custom | Text input |
| `kpi-skeleton` | Custom | KPI card loading skeleton |
| `label` | `@radix-ui/react-label` | Form label |
| `loading-skeleton` | Custom | Generic loading skeleton |
| `loading-spinner` | Custom | Spinning loader |
| `menubar` | `@radix-ui/react-menubar` | Menu bar |
| `popover` | `@radix-ui/react-popover` | Popup content |
| `progress` | `@radix-ui/react-progress` | Progress bar |
| `progress-indicator` | Custom | Progress with label |
| `radio-group` | `@radix-ui/react-radio-group` | Radio buttons |
| `scroll-area` | `@radix-ui/react-scroll-area` | Scrollable container |
| `select` | `@radix-ui/react-select` | Select dropdown |
| `separator` | `@radix-ui/react-separator` | Visual divider |
| `sheet` | `@radix-ui/react-dialog` (sheet) | Side panel / mobile drawer |
| `sidebar` | Custom (773 lines) | Full sidebar system: Provider, Header, Content, Menu, Footer, Trigger, Inset |
| `skeleton` | Custom | Loading placeholder |
| `slider` | `@radix-ui/react-slider` | Range slider |
| `switch` | `@radix-ui/react-switch` | Toggle switch |
| `table` | Custom | Table, TableHeader, TableBody, TableRow, TableCell, TableHead |
| `tabs` | `@radix-ui/react-tabs` | Tabbed content |
| `textarea` | Custom | Multiline text input |
| `toast` | `@radix-ui/react-toast` | Toast notifications |
| `toaster` | Custom wrapper | Toast renderer |
| `tooltip` | `@radix-ui/react-tooltip` | Hover tooltips |

### Auth Components (`src/components/auth/`)

| Component | Purpose |
|---|---|
| `auth-layout.tsx` | Split-screen auth page: form on left, decorative panel on right (hidden on mobile) |
| `RoleProtected.tsx` | RBAC guard — wraps pages requiring specific roles, redirects to `/unauthorized` |

### Layout Components (`src/components/layout/`)

| Component | Purpose |
|---|---|
| `AdminDashboardShell.tsx` | Admin page wrapper with "Admin Console" header |
| `AnalystDashboardShell.tsx` | Analyst page wrapper with "Analysis Workspace" header |
| `user-nav.tsx` | Header avatar dropdown: profile, settings, logout, role refresh |
| `breadcrumbs.tsx` | Auto-generated breadcrumbs from URL pathname |
| `page-header.tsx` | Reusable page header with title, subtitle, Refresh/New action buttons |
| `footer.tsx` | Responsive footer with animated gradient background |

### Dashboard Components (`src/components/dashboard/`)

| Component | Purpose |
|---|---|
| `upload-form.tsx` | CSV drag-and-drop upload form |
| `fairness-charts.tsx` | Fairness metric visualization (bar/radar charts) |

### Docs Components (`src/components/docs/`)

| Component | Purpose |
|---|---|
| `docs-sidebar.tsx` | Documentation navigation sidebar |
| `docs-header.tsx` | Documentation page header |
| `docs-breadcrumb.tsx` | Docs breadcrumb navigation |
| `docs-pagination.tsx` | Previous/next page navigation |

### Other Components

| Component | Path | Purpose |
|---|---|---|
| `DynamicChart.tsx` | `src/components/` | Dynamic chart rendering |
| `theme-toggle.tsx` | `src/components/` | Dark/light mode toggle (toggles `.dark` class on `<html>`) |
| `logo.tsx` | `src/components/` | ShieldCheck icon + "EthixAI" brand text |
| `ConfirmationModal.tsx` | `src/components/common/` | Reusable confirmation dialog |
| `CreateDatasetModal.tsx` | `src/components/datasets/` | Dataset creation modal |
| `UploadDatasetModal.tsx` | `src/components/datasets/` | Dataset upload modal |
| `ReportActions.tsx` | `src/components/report/` | Report action buttons |
| `RiskBadge.tsx` | `src/components/report/` | Risk severity badge (color-coded) |

---

## 6. Design System Specification

### Color Palette (HSL CSS Variables)

#### Light Mode (`:root`)

| Token | HSL Value | Hex Approx | Usage |
|---|---|---|---|
| `--background` | `0 0% 100%` | `#FFFFFF` | Page background |
| `--foreground` | `222.2 84% 4.9%` | `#030712` | Primary text |
| `--card` | `0 0% 100%` | `#FFFFFF` | Card surfaces |
| `--primary` | `132 59% 41%` | `#2EA043` | **Brand green** — buttons, links, accent |
| `--primary-foreground` | `210 40% 98%` | `#F8FAFC` | Text on primary |
| `--secondary` | `0 0% 96.1%` | `#F5F5F5` | Secondary surfaces |
| `--muted` | `0 0% 96.1%` | `#F5F5F5` | Muted backgrounds |
| `--muted-foreground` | `0 0% 45.1%` | `#737373` | Muted text |
| `--accent` | `0 0% 96.1%` | `#F5F5F5` | Accent surfaces |
| `--destructive` | `355 79% 56%` | `#E63946` | **Error red** — destructive actions |
| `--border` | `0 0% 89.8%` | `#E5E5E5` | Borders |
| `--ring` | `132 59% 41%` | `#2EA043` | Focus ring (matches primary) |

#### Dark Mode (`.dark` — **DEFAULT**)

| Token | HSL Value | Hex Approx | Usage |
|---|---|---|---|
| `--background` | `210 29% 9%` | `#0D1117` | Page background (GitHub-dark) |
| `--foreground` | `210 25% 96%` | `#F6F8FA` | Primary text |
| `--card` | `212 28% 11%` | `#161B22` | Card surfaces |
| `--primary` | `132 59% 41%` | `#2EA043` | Brand green (same as light) |
| `--secondary` | `212 28% 16%` | `#21262D` | Secondary surfaces |
| `--muted` | `212 28% 16%` | `#21262D` | Muted backgrounds |
| `--muted-foreground` | `210 25% 65%` | `#8B949E` | Muted text |
| `--accent` | `212 28% 22%` | `#30363D` | Accent surfaces |
| `--destructive` | `355 79% 56%` | `#E63946` | Error red (same as light) |
| `--border` | `212 28% 18%` | `#21262D` | Borders |

#### Chart Colors (Both Themes)

| Token | HSL | Color | Use |
|---|---|---|---|
| `--chart-1` | `132 59% 41%` | Green | Primary data series |
| `--chart-2` | `212 100% 67%` | Blue | Secondary series |
| `--chart-3` | `41 100% 47%` | Gold/Amber | Tertiary series |
| `--chart-4` | `355 79% 56%` | Red | Warning/alert series |
| `--chart-5` | `27 87% 67%` | Orange | Fifth series |

#### Sidebar Tokens (Dark Mode)

| Token | HSL | Purpose |
|---|---|---|
| `--sidebar-background` | `212 28% 11%` | Sidebar bg |
| `--sidebar-foreground` | `210 25% 96%` | Sidebar text |
| `--sidebar-primary` | `132 59% 41%` | Active item highlight |
| `--sidebar-accent` | `212 28% 18%` | Hover state |
| `--sidebar-border` | `212 28% 18%` | Sidebar dividers |

### Typography

| Role | Font | Weights | CSS Class |
|---|---|---|---|
| **Body** | Inter | 400, 500, 600, 700 | `font-body` |
| **Headlines** | Inter | 400, 500, 600, 700 | `font-headline` |
| **Code** | JetBrains Mono | 400, 500, 700 | `font-code` |

- Fonts loaded via Google Fonts `<link>` in root `layout.tsx`
- Body applies `font-body antialiased` globally

### Spacing & Border Radius

| Token | Value | Notes |
|---|---|---|
| `--radius` | `1rem` (16px) | Base border radius |
| `borderRadius.lg` | `var(--radius)` | Large radius (cards, dialogs) |
| `borderRadius.md` | `calc(var(--radius) - 4px)` | Medium (buttons, inputs) |
| `borderRadius.sm` | `calc(var(--radius) - 8px)` | Small (badges, chips) |

### Container System

```
Container: centered, max-width by breakpoint
├── DEFAULT padding: 1rem
├── sm (640px): 2rem
├── lg (1024px): 4rem
├── xl (1280px): 5rem
└── 2xl (1400px): 6rem
```

### Breakpoints

| Name | Width | Typical Use |
|---|---|---|
| `sm` | 640px | Small tablets |
| `md` | 768px | Tablets / sidebar toggle |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktop |
| `2xl` | 1400px | Large desktop |

### Animation Catalog

| Class | Effect | Duration |
|---|---|---|
| `animate-fade-in-up` | Slide up 20px + fade | 0.8s ease-out |
| `animate-fade-in` | Opacity fade | 0.6s ease-out |
| `animate-slide-in-right` | Slide from left 20px + fade | 0.5s ease-out |
| `animate-scale-in` | Scale from 0.95 + fade | 0.4s ease-out |
| `transition-all-smooth` | All properties | 0.3s cubic-bezier(0.4, 0, 0.2, 1) |
| `card-hover-lift` | Shadow + translate-y on hover | 0.3s smooth |
| `skeleton-shimmer` | Loading shimmer gradient | 1.5s infinite |
| `animate-wave` | Background position wave | 15s infinite (footer) |
| `animate-accordion-down/up` | Radix accordion expand/collapse | 0.2s ease-out |

### Icons

- **Library**: Lucide React
- **Common icons used**: `ShieldCheck` (logo), `BarChart2`, `FileUp`, `LayoutGrid`, `Settings`, `Users`, `FileSearch`, `CreditCard`, `Database`, `Layers`, `Archive`, `Play`, `FileText`, `Home`, `LifeBuoy`, `Puzzle`
- **Usage**: Inline via component import, typically 16-20px in sidebar, 24px in page headers

---

## 7. Layout Architecture

### Layout Nesting Hierarchy

```
RootLayout (src/app/layout.tsx)
├── <html lang="en" className="dark">
├── Google Fonts (Inter, JetBrains Mono)
├── AuthProvider → AnnounceProvider → Toaster
│
├── Public pages (landing, about, blog, careers, etc.)
│   └── (public)/layout.tsx — Minimal header (logo, Home/Docs/Login), max-w-5xl centered, footer
│
├── Auth pages (login, register, verify-email)
│   └── (auth)/layout.tsx — Sidebar + header shell (detects /dashboard routes and passes through)
│
├── Dashboard pages
│   └── dashboard/layout.tsx — Full sidebar shell with role-based menus
│       ├── Sidebar: SidebarProvider → Sidebar (Header, Content, Menu, Footer)
│       ├── SidebarInset: sticky header (SidebarTrigger on mobile, ThemeToggle, UserNav)
│       └── <main> with responsive padding (p-4 md:p-6 lg:p-8)
│
└── Docs pages
    └── docs/layout.tsx — DocsHeader, 4-col grid (sidebar + 3-col content), breadcrumb, pagination
```

### Dashboard Layout Details

**File**: `src/app/dashboard/layout.tsx`

- **Auth guard**: Redirects to `/login` if unauthenticated (client-side `useEffect`)
- **Role detection**: Uses `rbac.pickPrimaryRole(roles)` to determine sidebar menu
- **Sidebar menus by role**:
  - `admin` → 9 items (Admin Dashboard, User Management, Access Requests, Org Settings, Fairness Thresholds, Billing, Datasets, Models, Audit Logs)
  - `analyst` → 3 items (Analyst Dashboard, Run Analysis, Reports) — intentionally trimmed for focus
  - `reviewer` → 5 items (Reviewer Dashboard, Compliance Reports, Review Queue, Fairness Thresholds, Audit Logs)
  - default (user/guest) → 4 items (Upload Dataset, FairLens, ExplainBoard, Compliance)
- **Footer items** (all roles): Settings, Support
- **Header**: Sticky, backdrop-blur, shows active section title, `ThemeToggle` + `UserNav`
- **Mobile**: `SidebarTrigger` (hamburger) shown only below `md` breakpoint; sidebar renders as Sheet drawer

### Auth Layout (Split Screen)

**File**: `src/components/auth/auth-layout.tsx`

- Two-column on `lg+`: form panel (left) + decorative image panel (right, hidden on mobile)
- Centered form with max-width constraint
- Gradient or hero image on right panel

---

## 8. Authentication & RBAC

### Authentication Flow

```
User → Login Page (Zod validation)
  │
  ├─ IF NEXT_PUBLIC_USE_BACKEND_LOGIN=1:
  │    POST /auth/login → JWT pair (access + refresh)
  │    Store in localStorage → Set Axios default header
  │    GET /v1/users/me → Extract roles
  │
  └─ ELSE (default — Firebase):
       Firebase signInWithEmailAndPassword
       → POST /auth/firebase/exchange (ID token → backend JWT pair)
       → Store tokens → Read ID token claims for roles
       → GET /v1/users/me → Authoritative role source
  
  → Email verification check (non-admin must verify)
  → Role-based redirect via defaultRouteForRoles()
```

### Role Routing

| Role | Default Landing Route |
|---|---|
| `admin` | `/dashboard/admin/access-requests` |
| `analyst` | `/dashboard/analyst` |
| `reviewer` | `/report` |
| `user` | `/dashboard` |
| `guest` | `/` |

### Role Priority (highest → lowest)

`admin` > `analyst` > `reviewer` > `user` > `guest`

When a user has multiple roles, `pickPrimaryRole()` returns the highest-priority one.

### Token Management (`src/lib/api.ts`)

- **Axios interceptors** attach `Authorization: Bearer <token>` to every request
- **Priority**: Backend JWT (localStorage) > Firebase ID token
- **401 handling**: Automatic refresh via `POST /auth/refresh` with queue to prevent concurrent refreshes
- **Cookie mode** (`NEXT_PUBLIC_USE_COOKIE_REFRESH=1`): Uses HttpOnly cookies instead of localStorage

### Route Protection

| Layer | Mechanism | Coverage |
|---|---|---|
| **Edge middleware** | `middleware.ts` — calls `/auth/verify` | Only `/` route currently |
| **Dashboard layout** | Client-side redirect to `/login` if no user | All `/dashboard/*` routes |
| **RoleProtected component** | Checks `hasAnyRole()` against required roles | Individual pages wrapped |
| **E2E bypass** | `NEXT_PUBLIC_TEST_BYPASS_AUTH=1` | Testing only |

### RBAC Utility Functions (`src/lib/rbac.ts`)

```typescript
pickPrimaryRole(roles: string[]): UserRole | null     // Returns highest priority role
defaultRouteForRoles(roles: string[]): string          // Returns landing page for role
hasAnyRole(userRoles: string[], required: string[]): boolean  // Role membership check
```

---

## 9. State Management Patterns

### Architecture: **React Context + Local State** (no Redux store)

> Note: `@reduxjs/toolkit` and `react-redux` are in `package.json` but **no Redux store, slices, or Provider** exist. These are unused dependencies.

### Context Providers

| Context | File | Purpose | Key State |
|---|---|---|---|
| `AuthContext` | `src/contexts/AuthContext.tsx` | Auth state + operations | `user`, `roles`, `loading`, `login()`, `logout()`, `register()`, `getIdToken()`, `refreshRoles()`, `hasRole()` |
| `AnnounceContext` | `src/contexts/AnnounceContext.tsx` | Screen reader announcements | `announce(message)` → `aria-live="polite"` region |

### Data Fetching Pattern

Pages use **local `useState` + `useEffect`** for API data:

```typescript
// Typical page pattern
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const fetchData = async () => {
    try {
      const res = await api.get('/v1/reports');
      setData(res.data);
    } catch (err) {
      setError('Failed to load');
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);
```

> **No global data cache**: React Query / SWR not used. Every page refetches data on mount.

### Custom Hooks

| Hook | File | Purpose |
|---|---|---|
| `useAuth()` | `src/contexts/AuthContext.tsx` | Access `AuthContext` |
| `useAnnounce()` | `src/contexts/AnnounceContext.tsx` | Access `AnnounceContext` |
| `useIsMobile()` | `src/hooks/use-mobile.tsx` | Returns `true` if viewport < 768px (`window.matchMedia`) |
| `useToast()` | `src/hooks/use-toast.ts` | Toast notification state (reducer-based, limit 1 toast) |

---

## 10. Backend API Surface

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | None | Register (name, email, password) |
| POST | `/auth/login` | None | Login (rate-limited: 10/5min) → JWT pair |
| POST | `/auth/firebase/exchange` | None | Exchange Firebase ID token → backend JWT pair |
| GET | `/auth/verify` | Bearer | Verify current access token |
| POST | `/auth/refresh` | Cookie/Token | Refresh access token |
| POST | `/auth/logout` | Bearer | Revoke session |
| GET | `/auth/devices` | Bearer | List active sessions |
| DELETE | `/auth/devices/:deviceId` | Bearer | Revoke device session |

### Users

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/v1/users/me` | Bearer | Current user profile + roles |

### Datasets (v1)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/v1/datasets` | Bearer | Create dataset |
| GET | `/v1/datasets` | Bearer | List user's datasets |
| GET | `/v1/datasets/:id` | Bearer | Get dataset by ID |
| DELETE | `/v1/datasets/:id` | Bearer | Delete dataset |
| POST | `/v1/datasets/:id/presign` | Bearer | Generate presigned upload URL |
| GET | `/v1/datasets/:id/versions` | Bearer | List dataset versions |
| POST | `/v1/datasets/:id/ingest` | Bearer | Ingest CSV data |

### Analysis & Reports

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/analyze` | Bearer | Submit dataset for bias analysis (forwards to AI Core) |
| GET | `/report/:id` | Bearer | Get analysis report (Redis-cached) |
| GET | `/report/:id/export` | Bearer | Export as PDF/HTML |
| GET | `/reports` | Bearer | List user's reports |

### Evaluation Pipeline (v1)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/v1/evaluate` | Bearer | Run full evaluation (simulation → rules → risk → explanation) |
| GET | `/v1/evaluations` | Bearer | List evaluations (filters: risk_level, model_id, limit, offset) |
| GET | `/v1/evaluations/:id` | Bearer | Get evaluation detail (owner-only) |

### Models (v1)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| POST | `/v1/models/:id/trigger-retrain` | Bearer | admin | Trigger model retrain |
| GET | `/v1/retrain/:requestId` | Bearer | admin | Get retrain job status |
| GET | `/v1/models/:id/versions` | Bearer | any | List model versions |
| POST | `/v1/models/:id/promote` | Bearer | admin | Promote model version |

### Model Validation (v1)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/v1/validate-model` | Bearer | Trigger validation via AI Core |
| GET | `/v1/validation-reports` | Bearer | List validation reports (Firestore) |
| GET | `/v1/validation-reports/:id` | Bearer | Get validation report |

### Access Requests (v1)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| POST | `/v1/access-requests` | Bearer | any | Submit access request |
| GET | `/v1/access-requests` | Bearer | admin | List requests (paginated) |
| POST | `/v1/access-requests/:id/approve` | Bearer | admin | Approve + sync Firebase claims |
| POST | `/v1/access-requests/:id/deny` | Bearer | admin | Deny request |

### Health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Legacy health check |
| GET | `/health/liveness` | Liveness probe (pid, uptime, RSS) |
| GET | `/health/readiness` | DB + AI Core readiness |
| GET | `/health/startup` | Bootstrap status |
| GET | `/metrics` | Prometheus metrics |

### Unmounted Routes (defined but NOT active in server.js)

| Route File | Endpoints | Notes |
|---|---|---|
| `routes/drift.js` | `/v1/drift/*` | Drift snapshots, alerts, status, retrain trigger |
| `routes/auditLogs.js` | `/api/audit/logs` | Admin-only audit log queries |
| `routes/modelCards.js` | `/api/model-cards` | Model card listing + compliance stats |

---

## 11. Current UI/UX Status & Known Issues

### Landing Page Status (Updated Feb 28, 2026)

| Component | Status | Details |
|---|---|---|
| **Responsive Design** | ✅ Excellent | Mobile-first, proper breakpoints, adaptive padding |
| **Production Images** | ✅ Fixed | Using Unsplash curated URLs (non-random) |
| **Carousel Alt Text** | ✅ Fixed | Descriptive alt text: `"{feature.title}: {feature.description}"` |
| **Image Error Handling** | ✅ Fixed | Added `onError` callback to hide broken images gracefully |
| **Public Layout** | ✅ Fixed | Removed duplicate header/main structure — pages now manage own navigation |
| **Mobile Menu** | ✅ Working | Menu closes on anchor clicks (verified implementation) |
| **Demo Dashboard Badge** | ✅ Added | "Demo Dashboard" label overlay on fairness dashboard preview |
| **Accessibility** | ✅ Good | WCAG 2.1 AA baseline, ARIA labels, focus rings, semantic HTML |
| **Performance** | ✅ Good | Next.js Image optimization, lazy carousel |
| **Animations** | ✅ Professional | Fade-in-up, smooth transitions, wave effect on footer |

### Completed UI/UX Improvements

| Date | Area | What Was Done |
|---|---|---|
| Nov 19, 2025 | **Day 30 Polish** | Professional animations (fade-in-up, slide-in, scale-in), enhanced Firebase error messages, auth screen polish, toast message library (`toast-messages.ts`) |
| Dec 11, 2025 | **Analyst Dashboard** | Full rewrite: replaced placeholder charts with real API data, added KPI cards with live metrics, recent runs table, datasets table, loading/error/empty states, responsive + WCAG 2.1 AA |
| Dec 11, 2025 | **Analyst Navigation** | Sidebar trimmed from 7 → 3 items (Dashboard, Run Analysis, Reports); removed cognitive overload |
| Dec 11, 2025 | **Admin Responsiveness** | All 8 admin pages refactored: mobile-first grid system, 44px+ touch targets, responsive padding, intelligent table column hiding, mobile-optimized forms/modals |
| Dec 2, 2025 | **Security** | Enhanced secret scanning (Gitleaks), rotation scripts, audit tooling |

### Known UI/UX Issues (Prioritized)

#### HIGH Priority

| # | Issue | Details | Affected Routes | Status |
|---|---|---|---|---|
| 1 | **Admin dashboard uses mock data** | Hardcoded values ("128 users", "3 requests") and `ChartPlaceholder` components — not connected to real API | `/dashboard/admin` | 🔴 Open |
| 2 | **Reviewer default route mismatch** | RBAC routes reviewer to `/report` but reviewer sidebar links to `/dashboard/reviewer` | Reviewer login redirect | 🔴 Open |
| 3 | **Middleware only covers `/`** | No server-side route protection for authenticated routes; duplicated matcher `['/', '/']` | All routes except `/` | 🔴 Open |

#### MEDIUM Priority

| # | Issue | Details |
|---|---|---|
| 5 | **No persisted theme preference** | Root layout hardcodes `class="dark"`; ThemeToggle toggles class but page reload resets to dark |
| 6 | **No global data caching** | No React Query / SWR; pages refetch data on every mount (performance + UX impact) |
| 7 | **Landing page placeholder images** | Uses `picsum.photos` random images — not production-ready |
| 8 | **Dual layout wrapping** | `(auth)/layout.tsx` detects dashboard routes and passes them through — awkward nesting |
| 9 | **TypeScript/ESLint errors suppressed** | `next.config.ts` has `ignoreBuildErrors: true` and `ignoreDuringBuilds: true` |

#### LOW Priority

| # | Issue | Details |
|---|---|---|
| 10 | **Verbose console logging** | `console.debug`/`console.log` calls throughout AuthContext, api.ts, rbac.ts |
| 11 | **Unused Redux dependencies** | `@reduxjs/toolkit` and `react-redux` installed but never used — dead weight |
| 12 | **Inconsistent accessibility** | Some modals lack keyboard trap management; inconsistent aria-label patterns |

---

## 12. Responsive Design Patterns

### Current Implementation

#### Global Rules (`globals.css`)

```css
html, body { overflow-x: hidden; width: 100%; max-width: 100vw; }
img { max-width: 100%; height: auto; }
html { scroll-behavior: smooth; }
```

#### Grid Patterns Used

```
/* KPI cards */
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4

/* Content sections */
grid grid-cols-1 lg:grid-cols-2 gap-6

/* Form layouts */
flex flex-col sm:flex-row gap-4
```

#### Typography Scaling

```
/* Headings */
text-lg sm:text-xl lg:text-2xl font-semibold

/* Body */
text-sm sm:text-base
```

#### Table Handling

```
/* Progressive column hiding */
<th className="hidden sm:table-cell">...</th>
<th className="hidden md:table-cell">...</th>
<th className="hidden lg:table-cell">...</th>

/* Mobile scroll */
<div className="overflow-x-auto">
  <Table>...</Table>
</div>
```

#### Sidebar Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| `< md` (768px) | Sidebar hidden; `SidebarTrigger` hamburger shown; sidebar opens as Sheet/drawer |
| `≥ md` | Sidebar visible; collapsible to icon-only mode (3rem); full width = 16rem |
| Cookie persistence | Sidebar collapse state saved to cookie via `SidebarProvider` |

#### Main Content Padding

```
<main className="flex-1 p-4 md:p-6 lg:p-8">
```

#### Auth Pages

```
/* Split screen: form + decorative panel */
lg:grid lg:grid-cols-2  /* Desktop: two columns */
/* Mobile: form only, decorative hidden via hidden lg:block */
```

#### Touch Targets

Admin pages verified for **44px minimum** touch targets (WCAG 2.5.5, Level AAA).

---

## 13. Accessibility Standards

### Target: **WCAG 2.1 Level AA**

### Implemented Features

| Feature | Implementation | File |
|---|---|---|
| **Skip to content** | `<a class="skip-link sr-only focus:not-sr-only" href="#content">` | `src/app/layout.tsx` |
| **Live region** | `AnnounceContext` with `aria-live="polite"` invisible div | `src/contexts/AnnounceContext.tsx` |
| **Focus visible** | Custom `:focus-visible { box-shadow: 0 0 0 4px hsl(var(--ring) / 0.18) }` | `globals.css` |
| **Focus ring utility** | `.focus-ring` class for consistent ring styles | `globals.css` |
| **ARIA labels** | Mobile menu toggle, approve/reject buttons, refresh buttons, breadcrumbs | Various pages |
| **Screen reader text** | `sr-only` class used throughout for labels/status | Various components |
| **Semantic HTML** | `<header>`, `<main>`, `<footer>`, `<nav>` in layouts | Layout files |
| **Theme toggle label** | `aria-label="Toggle theme"` | `theme-toggle.tsx` |
| **Color contrast** | GitHub-dark palette designed for high contrast | `globals.css` |
| **Form labels** | `FormLabel` used consistently; `sr-only` for inline inputs | Form pages |
| **ARIA roles** | `role="main"`, `role="dialog"`, `role="status"` where appropriate | Various |
| **ARIA expanded** | Mobile menu `aria-expanded={menuOpen}` | Landing page |

### Accessibility Tooling

| Tool | Configuration |
|---|---|
| `axe-core` | In devDependencies |
| `axe:check` script | Runs `tools/axe-check.cjs` via npm |

### Gaps to Address

- Modal keyboard trap management not consistently implemented
- Not all interactive elements have explicit `aria-label`
- Color-only status indicators (some badges) need icon/text supplement
- No `prefers-reduced-motion` media query respect for animations

---

## 14. Testing Infrastructure

### Unit Tests — Vitest + React Testing Library

**34 test files** in `src/__tests__/`:

| Category | Test Files |
|---|---|
| **Auth / RBAC** | `rbac.test.ts` |
| **Analyst** | `analyst-nav.test.ts`, `analyst-datasets.test.tsx`, `run-analysis.test.tsx`, `datasets-analyst.test.tsx` |
| **Admin** | `access-requests.test.tsx`, `access-requests-email-toggle.test.tsx`, `audit.test.tsx`, `billing.test.tsx`, `datasets-create.test.tsx`, `datasets-upload.test.tsx`, `models.test.tsx`, `settings.test.tsx` |
| **Reports** | `reports-admin.test.tsx`, `reports-analyst.test.tsx`, `reports-reviewer.test.tsx`, `reports-reviewer-detail.test.tsx`, `reports-reviewer-pagination.test.tsx`, `reports-user.test.tsx`, `reports-user-detail.test.tsx`, `reports-user-pagination.test.tsx`, `reports-index.test.tsx`, `reports-detail.test.tsx`, `reports-ui.test.tsx`, `report-page.test.tsx` |
| **Dashboard** | `fairness.test.tsx`, `fairness-events-pagination.test.tsx`, `explainability.test.tsx`, `history.test.tsx`, `user-runs.test.tsx`, `user-runs-pagination.test.tsx`, `notifications.test.tsx`, `profile.test.tsx` |
| **Utilities** | `utils/reportFactory.ts` |

### E2E Tests — Playwright

| File | Coverage |
|---|---|
| `e2e/datasets.spec.ts` | Full CRUD: create dataset → upload CSV → preview → delete version → delete dataset |
| `e2e/selenium/` | Legacy Selenium-based tests |

### Backend Tests — Jest

Located in `backend/tests/` and `backend/src/__tests__/`.

### AI Core Tests — pytest

Located in `ai_core/tests/`.

### CI/CD (23 GitHub Actions Workflows)

- CodeQL, secret scanning, dependency audits
- Frontend CI (lint + test), Backend CI, Integration tests
- E2E test suite, Drift worker tests
- Governance compliance checks

---

## 15. File Path Quick Reference

### Frontend Core

| Purpose | Path |
|---|---|
| Root layout | `frontend/src/app/layout.tsx` |
| Global CSS + tokens | `frontend/src/app/globals.css` |
| Tailwind config | `frontend/tailwind.config.ts` |
| shadcn/ui config | `frontend/components.json` |
| Next.js config | `frontend/next.config.ts` |
| Landing page | `frontend/src/app/page.tsx` |
| Login page | `frontend/src/app/login/page.tsx` |
| Register page | `frontend/src/app/register/page.tsx` |
| Dashboard layout | `frontend/src/app/dashboard/layout.tsx` |
| Docs layout | `frontend/src/app/docs/layout.tsx` |
| Public layout | `frontend/src/app/(public)/layout.tsx` |
| Auth layout | `frontend/src/app/(auth)/layout.tsx` |

### Frontend Libraries

| Purpose | Path |
|---|---|
| Axios client + interceptors | `frontend/src/lib/api.ts` |
| Firebase init | `frontend/src/lib/firebase.ts` |
| RBAC helpers | `frontend/src/lib/rbac.ts` |
| `cn()` utility | `frontend/src/lib/utils.ts` |
| Date formatting | `frontend/src/lib/formatDate.ts` |
| Toast message catalog | `frontend/src/lib/toast-messages.ts` |
| Mock/demo data | `frontend/src/lib/mock-data.ts` |

### Frontend Contexts & Hooks

| Purpose | Path |
|---|---|
| Auth context provider | `frontend/src/contexts/AuthContext.tsx` |
| Announce context | `frontend/src/contexts/AnnounceContext.tsx` |
| Mobile detection hook | `frontend/src/hooks/use-mobile.tsx` |
| Toast hook | `frontend/src/hooks/use-toast.ts` |

### Frontend Components

| Purpose | Path |
|---|---|
| UI primitives (42 files) | `frontend/src/components/ui/` |
| Auth layout component | `frontend/src/components/auth/auth-layout.tsx` |
| Role protection guard | `frontend/src/components/auth/RoleProtected.tsx` |
| Layout components | `frontend/src/components/layout/` |
| Dashboard components | `frontend/src/components/dashboard/` |
| Docs components | `frontend/src/components/docs/` |

### Backend Core

| Purpose | Path |
|---|---|
| Server entry point | `backend/src/server.js` |
| Route files | `backend/src/routes/` |
| Mongoose models | `backend/src/models/` |
| Middleware | `backend/src/middleware/` |
| Firebase Admin service | `backend/src/services/` |

### AI Core

| Purpose | Path |
|---|---|
| FastAPI main | `ai_core/main.py` |
| Routers | `ai_core/routers/` |
| ML models | `ai_core/models/` |

### Configuration

| Purpose | Path |
|---|---|
| Frontend env | `frontend/.env` |
| Backend env | `backend/.env` |
| Docker Compose (dev) | `docker-compose.yml` |
| Docker Compose (prod) | `docker-compose.prod.yml` |
| Firebase config | `firebase.json` |
| Firestore rules | `firestore.rules` |
| GitHub Actions | `.github/workflows/` |
| Makefile | `Makefile` |

---

## 16. Development Conventions

### Styling

- **Tailwind-first**: All styling via Tailwind utility classes
- **CSS variables for theming**: Colors defined as HSL in `globals.css`, consumed via `hsl(var(--token))`
- **`cn()` utility**: Always use `cn()` (from `src/lib/utils.ts`) to compose class names — it merges via `clsx` + `tailwind-merge`
- **No inline styles**: Use Tailwind classes or CSS variables
- **Dark mode**: Class-based (`.dark` on `<html>`), use `dark:` variant when needed

### Component Patterns

- **shadcn/ui style**: Components export named parts (e.g., `Card`, `CardHeader`, `CardTitle`, `CardContent`)
- **Radix composability**: Primitives composed into higher-level components
- **CVA (Class Variance Authority)**: Used for component variants (Button has 6 visual variants × 4 sizes)
- **`forwardRef` pattern**: UI primitives use `React.forwardRef` for ref forwarding
- **Props interface**: Extend underlying HTML element props (e.g., `React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>`)

### File Naming

- **Pages**: `page.tsx` (Next.js App Router convention)
- **Layouts**: `layout.tsx`
- **Components**: PascalCase (`RoleProtected.tsx`, `AdminDashboardShell.tsx`) or kebab-case (`user-nav.tsx`, `theme-toggle.tsx`)
- **Utilities**: camelCase (`formatDate.ts`, `toast-messages.ts`)
- **Tests**: `*.test.ts` / `*.test.tsx`

### Import Aliases

- `@/` maps to `frontend/src/`
- Example: `import { Button } from '@/components/ui/button'`

### State Conventions

- Use `useState` + `useEffect` for page-level data fetching
- Use contexts for cross-cutting concerns (auth, announcements)
- Loading → Error → Empty → Data pattern for async UI states:

```tsx
if (loading) return <LoadingSkeleton />;
if (error) return <Alert variant="destructive">{error}</Alert>;
if (data.length === 0) return <EmptyState />;
return <DataDisplay data={data} />;
```

### Toast Messages

Use centralized toast catalog from `src/lib/toast-messages.ts`:

```tsx
import { toastMessages } from '@/lib/toast-messages';
toast(toastMessages.auth.loginSuccess);
```

### API Calls

Always use the configured Axios instance from `src/lib/api.ts`:

```tsx
import api from '@/lib/api';
const res = await api.get('/v1/reports');
```

---

## 17. Known Technical Debt

| # | Issue | Impact | Location |
|---|---|---|---|
| 1 | `ignoreBuildErrors: true` in Next.js config | TypeScript errors silently ignored; potential runtime failures | `frontend/next.config.ts` |
| 2 | `ignoreDuringBuilds: true` for ESLint | Lint issues not caught in CI builds | `frontend/next.config.ts` |
| 3 | Unused Redux dependencies | ~150KB+ unnecessary bundle size | `frontend/package.json` (`@reduxjs/toolkit`, `react-redux`) |
| 4 | Verbose debug logging in production code | Console noise, potential info leaks | `AuthContext.tsx`, `api.ts`, `rbac.ts` |
| 5 | Backend `server.js` is monolithic (~1831 lines) | Hard to maintain; routes, middleware, and config mixed | `backend/src/server.js` |
| 6 | Several route files defined but not mounted | Dead code (`drift.js`, `auditLogs.js`, `modelCards.js`) | `backend/src/routes/` |
| 7 | `(public)/layout.tsx` renders `<html>`/`<body>` | Conflicts with root layout | `frontend/src/app/(public)/layout.tsx` |
| 8 | OpenAPI spec minimal | Only covers `/ai_core/analyze`; most endpoints undocumented | `docs/api-spec.yaml` |
| 9 | Firebase error codes hardcoded in login page | Should use centralized `getFirebaseErrorMessage()` from `toast-messages.ts` | `frontend/src/app/login/page.tsx` |
| 10 | No `prefers-reduced-motion` support | Animations run regardless of user preference | `globals.css` |
| 11 | `genkit` and `@genkit-ai/google-genai` typed as `any` | No type safety for these dependencies | `frontend/src/types/externals.d.ts` |

---

## 18. Environment Configuration

### Frontend (`frontend/.env`)

| Variable | Value | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://ethai-guard.onrender.com` | Backend API base URL |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSyDfap3x...` | Firebase Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `studio-8429244671-dd548.firebaseapp.com` | Firebase Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `studio-8429244671-dd548` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `studio-8429244671-dd548.firebasestorage.app` | Cloud Storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `122428570627` | FCM sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:122428570627:web:c60d6f11cdee97eac62236` | Firebase app ID |

### Optional Frontend Variables (not in `.env`, used in code)

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_USE_BACKEND_LOGIN` | `undefined` (off) | Set `'1'` to use backend `/auth/login` instead of Firebase client |
| `NEXT_PUBLIC_USE_COOKIE_REFRESH` | `undefined` (off) | Set `'1'` for HttpOnly cookie-based refresh tokens |
| `NEXT_PUBLIC_TEST_BYPASS_AUTH` | `undefined` (off) | Set `'1'` to bypass auth in E2E tests |

### Backend (key variables from `backend/.env`)

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | JWT signing secret |
| `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` | Path to Firebase Admin SDK credentials |
| `AI_CORE_URL` | AI Core service URL (`http://ai_core:8100` in Docker) |
| `CORS_ORIGIN` | Allowed CORS origins |
| `RATE_LIMIT_ENABLED` | Enable/disable rate limiting |

---

## Quick Start for AI Agents

When starting UI/UX work on this project:

1. **Identify the role** the page belongs to (admin, analyst, reviewer, user, public)
2. **Check the layout** it renders within (Section 7)
3. **Use existing components** from shadcn/ui before creating new ones (Section 5)
4. **Follow the design tokens** — use CSS variable references, not hardcoded colors (Section 6)
5. **Use `cn()`** for all class name composition
6. **Follow the responsive patterns** — mobile-first, use established breakpoints (Section 12)
7. **Include loading/error/empty states** for any page fetching data (Section 16)
8. **Use the toast catalog** for user feedback (Section 16)
9. **Call API via the Axios instance** from `src/lib/api.ts` (Section 9)
10. **Check known issues** to avoid duplicating existing bugs or building on broken foundations (Section 11 & 17)

---

*Generated from codebase analysis on February 28, 2026. Update this document when significant architectural changes are made.*
