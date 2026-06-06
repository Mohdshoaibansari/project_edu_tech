# EduTech Frontend — Comprehensive Testing Guide

> **Phase 2 — Weeks 11-12** | Client v0.1.0  
> **Last Updated:** 2026-06-06  
> **Server Port:** 3000 | **Client Port:** 3001

---

## Prerequisites

### 1. Database & Services
- [ ] PostgreSQL running on `localhost:5432` (database: `edutech`)
- [ ] SuperTokens core running on `localhost:3567`
- [ ] Seed data applied (3 schools, 3 admin users)

### 2. Start the Server (Terminal 1)
```bash
cd server
npm run start:dev
```
Expected: `EduTech server running on http://localhost:3000`

### 3. Start the Client (Terminal 2)
```bash
cd client
npm run dev -- -p 3001
```
Expected: `Ready in Xms` → Open `http://localhost:3001`

---

## Test Data

| School | Slug | Name | Admin Email | Admin Name | Attendance Config |
|--------|------|------|-------------|------------|-------------------|
| School A | `school-a` | Delhi Public School (CBSE) | `admin@school-a.edu` | Amit Sharma | 3-status (Present/Absent/Late) |
| School B | `school-b` | St. Xavier's High School (ICSE) | `admin@school-b.edu` | Priya Patel | 5-status (+ Half Day/Medical) |
| School C | `school-c` | Springfield International School | `admin@school-c.edu` | John Smith | Period-based (4 custom statuses) |

> **Dev Mode Login:** Any password ≤10 characters works. SuperTokens verification is skipped for passwords ≤10 chars.  
> **Example password:** `dev`

---

## Test Checklist

---

### 🔐 SECTION 1 — Authentication

#### 1.1 Unauthenticated Access — Route Guard
- [ ] **Open `http://localhost:3001`** (not logged in)
  - Expected: **Redirected to `/login` page**
  - Expected: Login page shows EduTech logo + "Sign in to your school account"
- [ ] **Open `http://localhost:3001/students`** (not logged in)
  - Expected: **Redirected to `/login`** (not the students page)
- [ ] **Open `http://localhost:3001/attendance`** (not logged in)
  - Expected: **Redirected to `/login`**
- [ ] **Open `http://localhost:3001/settings`** (not logged in)
  - Expected: **Redirected to `/login`**

#### 1.2 Login — Invalid Credentials
- [ ] Go to `http://localhost:3001/login`
- [ ] Leave fields empty, click **Sign In**
  - Expected: Validation errors appear ("Email: Enter a valid email", "Password: Password is required")
- [ ] Enter invalid email: `not-an-email`
  - Expected: "Enter a valid email" error
- [ ] Enter valid email but wrong: `nonexistent@school.edu` with password `dev`
  - Expected: Red error banner with "User not found" or similar server error | My Comment Throw Network Error My Comment ends
- [ ] Check browser **DevTools Console** and **Network tab**
  - Expected: POST to `/api/v1/auth/login` returns 404 
  
My Comment
Network shows below error:
Access to XMLHttpRequest at 'http://localhost:3000/api/v1/auth/login' from origin 'http://localhost:3001' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
auth.api.ts:27 
 POST http://localhost:3000/api/v1/auth/login net::ERR_FAILED
Promise.then		
(anonymous)	@	auth.api.ts:27
(anonymous)	@	auth.store.ts:26
(anonymous)	@	page.tsx:43

But console shows:  GET /.well-known/appspecific/com.chrome.devtools.json 404 in 1416ms
My Comment ends

#### 1.3 Login — Valid Credentials (School A)
- [ ] Go to `http://localhost:3001/login`
- [ ] Enter:
  - **Email:** `admin@school-a.edu`
  - **Password:** `dev`
- [ ] Click **Sign In**
  - Expected: **Redirected to Dashboard** (`/`)
  - Expected: Dashboard shows "Welcome, Amit"
  - Expected: Dashboard shows "ADMIN Dashboard"
  - Expected: Sidebar visible with all navigation items
- [ ] **Browser DevTools → Application → Local Storage**
  - Expected: `access_token` key present with JWT value

#### 1.4 Login — Valid Credentials (School B)
- [ ] Logout first (sidebar → Logout icon, or clear localStorage + cookies)
- [ ] Go to `http://localhost:3001/login`
- [ ] Enter: **Email:** `admin@school-b.edu` / **Password:** `dev`
- [ ] Click **Sign In**
  - Expected: Dashboard shows "Welcome, Priya"
  - Expected: Sidebar shows user initials "PP"

#### 1.5 Login — Valid Credentials (School C)
- [ ] Logout, then login with **Email:** `admin@school-c.edu` / **Password:** `dev`
  - Expected: Dashboard shows "Welcome, John"

#### 1.6 Logout
- [ ] While logged in, click the **Logout icon** (bottom of sidebar, door icon)
  - Expected: **Redirected to `/login`**
  - Expected: Accessing `/dashboard` redirects to `/login` again
  - Expected: `access_token` removed from localStorage
- [ ] **Browser DevTools → Application → Cookies**
  - Expected: `refresh_token` cookie cleared

#### 1.7 Token Refresh (Background)
- [ ] Login as `admin@school-a.edu`
- [ ] Open **DevTools → Network** tab
- [ ] Wait 15 minutes, OR manually test by:
  - Navigate to any page after login
  - If server returns 401, check that client auto-refreshes and retries
  - Expected: No visible error to user; page loads normally after refresh
- [ ] Manual refresh test (optional):
  - Temporarily modify `access_token` in localStorage to an invalid value
  - Navigate to a page
  - Expected: Client auto-refreshes via `/api/v1/auth/refresh` and continues

---

### 🏠 SECTION 2 — Dashboard

#### 2.1 Dashboard Load
- [ ] Login as `admin@school-a.edu`
- [ ] Verify the **dashboard loads**
  - Expected: No infinite loading spinner
  - Expected: 4 stat cards visible (Attendance Rate, Upcoming Exams, Pending Homework, Leave Requests)
- [ ] If backend is down or API fails:
  - Expected: **ErrorState** component with "Something went wrong" + "Try Again" button
  - [ ] Click "Try Again" → Expected: Retries the API call

#### 2.2 Dashboard — Loading State (refresh test)
- [ ] Hard-refresh the dashboard page (Ctrl+Shift+R)
  - Expected: **LoadingSkeleton** (6 skeleton card placeholders) shown briefly
  - Expected: Then actual data loads in

#### 2.3 Dashboard — Cards
- [ ] **Attendance Rate** card
  - Expected: Shows a percentage or "—%"
  - Expected: ClipboardCheck icon (blue)
- [ ] **Upcoming Exams** card
  - Expected: Shows a number or "—"
  - Expected: GraduationCap icon (purple)
- [ ] **Pending Homework** card
  - Expected: BookOpen icon (orange)
- [ ] **Leave Requests** card
  - Expected: CalendarDays icon (red)

#### 2.4 Dashboard — Recent Activity Panels
- [ ] **Upcoming Exams** panel
  - Expected: Lists upcoming exams with title + date, or "No upcoming exams"
- [ ] **Pending Homework** panel
  - Expected: Lists homework with title + due date, or "No pending homework"

#### 2.5 Dashboard — Role Context
- [ ] Login as each admin user
  - Expected: Welcome message uses the correct admin first name
  - Expected: Role label matches "ADMIN"

---

### 🧭 SECTION 3 — Sidebar Navigation

#### 3.1 Navigation Items
- [ ] Click each sidebar link and verify correct page loads:
  - [ ] **Dashboard** → `/` — shows dashboard with stats
  - [ ] **Students** → `/students` — shows "Student Management" placeholder
  - [ ] **Attendance** → `/attendance` — shows "Attendance Tracking" placeholder
  - [ ] **Homework** → `/homework` — shows "Homework Management" placeholder
  - [ ] **Exams** → `/exams` — shows "Exam Management" placeholder
  - [ ] **Leave** → `/leave` — shows "Leave Management" placeholder
  - [ ] **Reports** → `/reports` — shows "Reporting" placeholder
  - [ ] **Notifications** → `/notifications` — shows "Notification Inbox" placeholder
  - [ ] **Settings** → `/settings` — shows account info page

#### 3.2 Active State Highlighting
- [ ] Click each nav item, verify:
  - Expected: **Active page** has blue/purple highlight (primary color)
  - Expected: **Inactive pages** are muted color
  - Expected: Hover effect (light background) on inactive items

#### 3.3 Sidebar Collapse
- [ ] Click the **chevron-left icon** (top-right of sidebar)
  - Expected: Sidebar collapses to icon-only width (~64px)
  - Expected: Icons remain visible, labels hidden
  - Expected: Page content shifts left to fill space
- [ ] Click **chevron-right** (expanded chevron)
  - Expected: Sidebar expands to full width (~256px)
  - Expected: Labels reappear

#### 3.4 Sidebar — User Info
- [ ] Bottom of sidebar shows:
  - [ ] **Avatar circle** with user initials ("AS" for Amit Sharma)
  - [ ] **Full name**: "Amit Sharma"
  - [ ] **Role**: "ADMIN"
  - [ ] **Logout icon** (door)

#### 3.5 Sidebar — Toggle (Mobile)
- [ ] Collapse sidebar to icon-only mode
- [ ] Expected: Menu button not shown (sidebar always open on desktop)
- [ ] **Resize browser to mobile width (<768px)**
  - Expected: Sidebar hidden, hamburger menu button appears in top-left
  - [ ] Click menu button → sidebar slides in

---

### 📄 SECTION 4 — Module Stub Pages

All module pages currently show **EmptyState** placeholders.

#### 4.1 Students Page (`/students`)
- [ ] Navigate to **Students**
  - Expected: Title "Students" + description "Manage student records"
  - Expected: Users icon + "Student Management" text
  - Expected: "View, enroll, and manage students..." description

#### 4.2 Attendance Page (`/attendance`)
- [ ] Navigate to **Attendance**
  - Expected: ClipboardCheck icon + "Attendance Tracking" text

#### 4.3 Homework Page (`/homework`)
- [ ] Navigate to **Homework**
  - Expected: BookOpen icon + "Homework Management" text

#### 4.4 Exams Page (`/exams`)
- [ ] Navigate to **Exams**
  - Expected: GraduationCap icon + "Exam Management" text

#### 4.5 Leave Page (`/leave`)
- [ ] Navigate to **Leave**
  - Expected: CalendarDays icon + "Leave Management" text

#### 4.6 Reports Page (`/reports`)
- [ ] Navigate to **Reports**
  - Expected: FileText icon + "Reporting" text

#### 4.7 Notifications Page (`/notifications`)
- [ ] Navigate to **Notifications**
  - Expected: Bell icon + "Notification Inbox" text

#### 4.8 Settings Page (`/settings`)
- [ ] Navigate to **Settings**
  - Expected: Title "Settings" + "Manage account and preferences"
  - Expected: **Account Information card** showing:
    - Name: "Amit Sharma"
    - Email: "admin@school-a.edu"
    - Role: "ADMIN"
  - Expected: **Admin Settings card** visible (since user is ADMIN)
  - [ ] Login as a non-admin user (if available) — Admin Settings card should be hidden

---

### ⚠️ SECTION 5 — Error Handling

#### 5.1 Server Offline
- [ ] **Stop the backend server** (`Ctrl+C` in server terminal)
- [ ] Refresh the dashboard
  - Expected: Dashboard shows **ErrorState** with "Something went wrong" + Try Again button
- [ ] Navigate to any page
  - Expected: ErrorState appears
- [ ] **Restart the server**
- [ ] Click **Try Again** on error page
  - Expected: Data loads successfully

#### 5.2 404 Page
- [ ] Navigate to a non-existent URL: `http://localhost:3001/nonexistent`
  - Expected: Next.js default 404 page shown

#### 5.3 API 403 — Cross-Tenant Access
- [ ] **Test cross-tenant isolation** (if API supports it):
  - Login as `admin@school-a.edu`
  - Manually change the tenant ID in a URL or API call
  - Expected: 403 error with "TENANT_ACCESS_DENIED" toast notification

#### 5.4 API 500 — Toast
- [ ] If server has a 500 error on any endpoint:
  - Expected: Red toast notification "Server Error" appears at bottom-right

---

### 🎨 SECTION 6 — Design System Components

#### 6.1 Button
Navigate to login page to test:
- [ ] **Primary button**: "Sign In" — blue background, white text
  - [ ] Hover: darker shade
  - [ ] Click: loads/submits
- [ ] **Loading state**: Click "Sign In" — button shows spinner + disabled
- [ ] **Disabled state**: Try submitting empty form — button is disabled

#### 6.2 Input
- [ ] **Normal state**: White background, gray border
- [ ] **Focused state**: Blue ring around input
- [ ] **Error state**: Red border + red error text below
- [ ] **Disabled state**: Gray background (if applicable)

#### 6.3 Toast Notifications
- [ ] Login with wrong credentials → red toast appears
- [ ] Toast has: icon (red X), title, description, close button (X)
- [ ] Toast auto-dismisses after ~5 seconds
- [ ] Click X on toast → dismisses immediately

#### 6.4 Badge
- [ ] Tested on Settings page (role badge if implemented)

#### 6.5 Card
- [ ] Dashboard stat cards: white background, border, shadow
- [ ] Settings account card: white background, header + content sections

#### 6.6 Spinner
- [ ] Login loading state: spinner in button
- [ ] Dashboard loading: large spinner centered on page

#### 6.7 Skeleton
- [ ] Dashboard loading: 6 placeholder cards with pulse animation

#### 6.8 Modal (Dialog)
- [ ] No modals in current pages — will be tested in Week 13-14

#### 6.9 DataTable
- [ ] No data tables in current pages — will be tested in Week 13-14

---

### 📱 SECTION 7 — Responsive Design

#### 7.1 Desktop (>1024px)
- [ ] Sidebar fully visible with labels
- [ ] Dashboard: 4 stat cards in a row
- [ ] Content has proper padding (p-6)

#### 7.2 Tablet (768px — 1024px)
- [ ] Sidebar collapses or stays visible based on preference
- [ ] Dashboard cards: 2 per row

#### 7.3 Mobile (<768px)
- [ ] Sidebar hidden by default, menu button visible
- [ ] Click menu button → sidebar overlays content
- [ ] Dashboard cards: 1 per row (stacked)
- [ ] Login form: centered, not too wide

#### 7.4 Test Steps
- [ ] Open browser DevTools → Toggle Device Toolbar (Ctrl+Shift+M)
- [ ] Select **iPhone 12 Pro** preset
  - Verify login page is usable
  - Login → verify mobile sidebar works
- [ ] Select **iPad Pro** preset
  - Verify 2-column card layout
- [ ] Select **Responsive** → drag to various widths
  - Verify no horizontal scroll
  - Verify no broken layouts

---

### 🍪 SECTION 8 — Browser & State Persistence

#### 8.1 localStorage
- [ ] Login → check **DevTools → Application → Local Storage**
  - Expected: `access_token` key with value
- [ ] Close browser tab → reopen `http://localhost:3001`
  - Expected: AuthProvider reads token, calls `/auth/me`, user stays logged in

#### 8.2 Cookies
- [ ] Login → check **DevTools → Application → Cookies**
  - Expected: `refresh_token` cookie (HttpOnly, SameSite=Lax)

#### 8.3 Clear Storage
- [ ] Clear localStorage and cookies manually
- [ ] Refresh page
  - Expected: Redirected to `/login`

---

### 🔄 SECTION 9 — Refresh & Hard-Reload

#### 9.1 Soft Refresh (F5)
- [ ] Login and navigate to any page
- [ ] Press F5
  - Expected: Page reloads, auth state preserved (not redirected to login)

#### 9.2 Hard Refresh (Ctrl+Shift+R)
- [ ] Login and navigate to students page
- [ ] Press Ctrl+Shift+R
  - Expected: Brief loading → page renders correctly

#### 9.3 Direct URL Access
- [ ] Login, then open a new tab and go directly to `http://localhost:3001/students`
  - Expected: Auth state recognized, page loads (no redirect to login)

---

### 🔌 SECTION 10 — API Proxy

#### 10.1 Verify Proxy Works
- [ ] Open **DevTools → Network** tab
- [ ] Login and observe the `/auth/login` request
  - Expected: Request goes to `http://localhost:3001/api/v1/auth/login`
  - Expected: Next.js rewrites it to `http://localhost:3000/api/v1/auth/login`
- [ ] Check response is received successfully

#### 10.2 CORS
- [ ] Login with backend running on port 3000 and client on 3001
  - Expected: No CORS errors in console
- [ ] Check API requests have `Authorization: Bearer ...` header

---

### 🚀 SECTION 11 — Build & Production

#### 11.1 Production Build
- [ ] Stop the dev server (Ctrl+C)
- [ ] Run:
  ```bash
  cd client
  npm run build
  ```
  - Expected: ✅ Compiled successfully
  - Expected: Linting and type checking pass
  - Expected: All 13 static pages generated
  - Expected: No errors or warnings

#### 11.2 Production Start
```bash
cd client
npm start
```
- [ ] Open `http://localhost:3000` (production default port)
- [ ] Login and navigate pages
  - Expected: All pages work as in dev mode

---

### 📋 SECTION 12 — Quick Smoke Test (5 Minutes)

Run this quick check whenever you make changes:

1. [ ] **Start server** → `npm run start:dev` (server/) → check "EduTech server running"
2. [ ] **Start client** → `npm run dev -- -p 3001` (client/) → check "Ready"
3. [ ] **Open** `http://localhost:3001` → redirects to `/login` ✓
4. [ ] **Login** with `admin@school-a.edu` / `dev` → dashboard loads ✓
5. [ ] **Sidebar** — click Dashboard, Students, Attendance, Homework, Exams, Leave, Reports, Notifications, Settings → each page loads ✓
6. [ ] **Collapse sidebar** (chevron icon) → collapses ✓
7. [ ] **Expand sidebar** → expands ✓
8. [ ] **Logout** → redirects to `/login` ✓
9. [ ] **Navigate to** `/students` while logged out → redirects to `/login` ✓

---

## Test Data Reference

### API Endpoints (via proxy)
| Endpoint | Method | Auth Required |
|----------|--------|:---:|
| `/api/v1/auth/login` | POST | No |
| `/api/v1/auth/logout` | POST | Yes |
| `/api/v1/auth/refresh` | POST | Cookie |
| `/api/v1/auth/me` | GET | Yes |
| `/{tenantId}/reports/dashboard` | GET | Yes |
| `/{tenantId}/config/convenience/*` | GET | Yes |
| `/{tenantId}/students` | GET | Yes |
| `/{tenantId}/attendance/*` | GET/POST | Yes |
| `/{tenantId}/exams` | GET/POST | Yes |
| `/{tenantId}/leaves` | GET/POST | Yes |
| `/{tenantId}/notifications/inbox` | GET | Yes |
| `/{tenantId}/homework` | GET/POST | Yes |

### Users
| Email | Password | Name | Role | Tenant |
|-------|----------|------|------|--------|
| `admin@school-a.edu` | `dev` | Amit Sharma | ADMIN | school-a |
| `admin@school-b.edu` | `dev` | Priya Patel | ADMIN | school-b |
| `admin@school-c.edu` | `dev` | John Smith | ADMIN | school-c |

---

## Issues Found

| # | Test | Expected | Actual | Severity |
|---|------|----------|--------|----------|
| — | — | — | — | — |

