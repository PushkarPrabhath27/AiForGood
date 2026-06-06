# RaktaSetu NOOR — Person 1 (Frontend) Implementation Guide
## AI Agent Instructions: Cursor / Claude Code
### READ THIS ENTIRE FILE BEFORE WRITING A SINGLE LINE OF CODE

---

## PRIME DIRECTIVE

You are implementing the frontend of a production-grade clinical AI platform for a 24-hour hackathon. Every component you write must meet FAANG engineering standards. No shortcuts. No placeholder UI. No `// TODO` in demo-critical paths.

**Your domain:** Everything in `/frontend/` and `/shared/`. You do NOT touch `/backend/` under any circumstances.

**Your stack:** Next.js 14 (App Router), TypeScript (strict mode, zero `any`), Tailwind CSS, shadcn/ui, Recharts, Leaflet (for maps). All components must be server-components where possible, client components only when interactivity requires it.

**Your API contract:** All data shapes are defined in `/shared/contracts/api.types.ts`. You consume what Person 2 builds. If a field is missing from an API response, you raise it — you do NOT cast or hardcode.

**Rule:** After completing each phase below, STOP. Print a summary of what was built, what was tested, and the implementation plan for the next phase. Do NOT proceed to the next phase until the user explicitly says "proceed" or "go to Phase X."

---

## PHASE 0: Environment & Foundation Setup

### 0.1 Read These First

Before writing any code, confirm the following files exist and read them:
- `/shared/contracts/api.types.ts` — all TypeScript types
- `/shared/contracts/api.schema.json` — API schema
- `/shared/constants/index.ts` — shared constants
- `/frontend/package.json` — existing dependencies

### 0.2 Update `package.json` Dependencies

Ensure these packages are present. Add any missing ones:

```json
{
  "dependencies": {
    "next": "14.2.x",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "typescript": "^5.4.0",
    "@types/react": "^18.3.0",
    "@types/node": "^20.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "recharts": "^2.12.0",
    "leaflet": "^1.9.4",
    "react-leaflet": "^4.2.1",
    "@types/leaflet": "^1.9.8",
    "date-fns": "^3.6.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.3.0",
    "lucide-react": "^0.383.0",
    "zustand": "^4.5.2",
    "react-query": "^5.40.0",
    "@tanstack/react-query": "^5.40.0",
    "zod": "^3.23.0",
    "framer-motion": "^11.2.0",
    "sonner": "^1.5.0",
    "class-variance-authority": "^0.7.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-tooltip": "^1.0.7",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-badge": "^1.0.0",
    "@aws-amplify/ui-react": "^6.1.0",
    "aws-amplify": "^6.3.0"
  }
}
```

### 0.3 Update `next.config.js` for S3 Static Export

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',          // S3 static export
  trailingSlash: true,
  images: {
    unoptimized: true,       // Required for static export
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_COGNITO_USER_POOL_ID: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
    NEXT_PUBLIC_COGNITO_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
    NEXT_PUBLIC_CLOUDFRONT_URL: process.env.NEXT_PUBLIC_CLOUDFRONT_URL,
  },
}

module.exports = nextConfig
```

### 0.4 Environment Variables File

Create `/frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-south-1_XXXXXXXXX
NEXT_PUBLIC_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_CLOUDFRONT_URL=https://XXXX.cloudfront.net
NEXT_PUBLIC_MAPBOX_TOKEN=  # leave empty, using OSM/Leaflet
```

### 0.5 Shared API Client

Create `/frontend/lib/api-client.ts`:

```typescript
// frontend/lib/api-client.ts
import { fetchAuthSession } from 'aws-amplify/auth'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL!

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const session = await fetchAuthSession()
    const token = session.tokens?.idToken?.toString()
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await getAuthHeader()
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...headers },
    next: { revalidate: 30 }, // 30s ISR for dashboard data
  })
  if (!res.ok) throw new Error(`API error ${res.status} on GET ${path}`)
  const data = await res.json()
  if (!data.success) throw new Error(data.error?.message ?? 'Unknown API error')
  return data.data as T
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const headers = await getAuthHeader()
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API error ${res.status} on POST ${path}`)
  const data = await res.json()
  if (!data.success) throw new Error(data.error?.message ?? 'Unknown API error')
  return data.data as T
}
```

### 0.6 Cognito Auth Setup

Create `/frontend/lib/auth-config.ts`:

```typescript
// frontend/lib/auth-config.ts
import { Amplify } from 'aws-amplify'

export function configureAmplify() {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
        userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
        loginWith: {
          email: true,
        },
      },
    },
  })
}
```

### 0.7 Phase 0 Completion Checkpoint

After completing Phase 0:
- `npm run dev` starts without errors
- `npm run build` completes (even if pages are empty)
- `npm run type-check` passes
- All env vars are set and accessible

**STOP HERE. Print Phase 0 summary. Wait for user approval before Phase 1.**

---

## PHASE 1: Auth + Layout Shell

### 1.1 Cognito Auth Integration

Replace Supabase auth with Cognito. Create `/frontend/app/auth/page.tsx`:

```typescript
// frontend/app/auth/page.tsx
'use client'

import { useState } from 'react'
import { signIn, signUp, confirmSignUp } from 'aws-amplify/auth'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

type AuthMode = 'signin' | 'signup' | 'confirm'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignIn() {
    setLoading(true)
    try {
      await signIn({ username: email, password })
      router.push('/dashboard')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUp() {
    setLoading(true)
    try {
      await signUp({ username: email, password, options: { userAttributes: { email } } })
      setMode('confirm')
      toast.success('Check your email for a verification code')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    setLoading(true)
    try {
      await confirmSignUp({ username: email, confirmationCode: code })
      setMode('signin')
      toast.success('Account confirmed. Please sign in.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Confirmation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-full max-w-md p-8 bg-slate-900 rounded-2xl border border-slate-800">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">RaktaSetu NOOR</h1>
          <p className="text-slate-400 text-sm mt-1">Blood Intelligence Platform</p>
        </div>
        {/* Form fields based on mode */}
        {/* ... full implementation */}
      </div>
    </div>
  )
}
```

### 1.2 Root Layout with Auth Guard

Create `/frontend/app/layout.tsx` — configures Amplify, wraps with QueryClient, adds Sonner toaster:

```typescript
// frontend/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'RaktaSetu NOOR | Blood Intelligence Platform',
  description: 'AI-powered blood care coordination for Thalassemia patients',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased`}>
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  )
}
```

Create `/frontend/components/providers.tsx`:
```typescript
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { configureAmplify } from '@/lib/auth-config'
import { useState, useEffect } from 'react'

configureAmplify()

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 2 } }
  }))
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

### 1.3 Dashboard Shell Layout

Create `/frontend/app/dashboard/layout.tsx` with sidebar navigation:

```typescript
// Sidebar items: Dashboard, Patients, Guardian Network, RaktaGrid, Sentinel, Admin
// Active state tracked via usePathname()
// Each nav item has: icon (lucide-react), label, href
// Sidebar is collapsible on mobile
// User profile dropdown in bottom-left with signOut
```

Design tokens to use throughout:
```typescript
// Color system — use these CSS variables exclusively
// --color-noor: #ef4444      (red — clinical urgency)
// --color-guardian: #8b5cf6  (purple — relationship)
// --color-grid: #06b6d4      (cyan — logistics)
// --color-sentinel: #f59e0b  (amber — warning)
// --color-grief: #64748b     (slate — memorial)
// --color-weather: #10b981   (emerald — forecast)
// Background: slate-950 / slate-900 / slate-800
```

### 1.4 Phase 1 Completion Checkpoint

- Auth flow works (sign in, protected route redirect)
- Dashboard shell loads with sidebar
- All nav links resolve without 404
- `npm run build` still passes

**STOP HERE. Print Phase 1 summary and Phase 2 plan. Wait for user approval.**

---

## PHASE 2: NOOR Dashboard (Existing — Polish + Sentinel Integration)

### 2.1 Existing Components to Verify

These components should already exist. Verify they render correctly with real API data:
- `HbForecastChart` — Recharts ComposedChart with sawtooth + forecast + CI band
- `ClinicalAlerts` — three-pill component (alloimmunization / iron overload / rapid decline)
- `PatientHeader` — name, age, blood type, next transfusion date

If any of these are missing or broken, fix them before adding new components.

### 2.2 New: `SentinelPanel` Component

Create `/frontend/components/sentinel/SentinelPanel.tsx`:

```typescript
'use client'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import type { SentinelStatus, CaregiverCheckin } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, Mic, AlertTriangle, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'

interface SentinelPanelProps {
  patientId: string
}

export function SentinelPanel({ patientId }: SentinelPanelProps) {
  const { data: sentinel, isLoading } = useQuery({
    queryKey: ['sentinel', patientId],
    queryFn: () => apiGet<SentinelStatus>(`/api/v1/sentinel/${patientId}`),
    refetchInterval: 60_000, // refresh every minute
  })

  if (isLoading) return <SentinelSkeleton />

  const scoreColor = 
    !sentinel ? 'text-slate-400' :
    sentinel.sentinel_score > 65 ? 'text-red-400' :
    sentinel.sentinel_score > 35 ? 'text-amber-400' :
    'text-emerald-400'

  const borderColor =
    sentinel?.sentinel_score && sentinel.sentinel_score > 65
      ? 'border-red-500/50 shadow-red-500/10'
      : sentinel?.sentinel_score && sentinel.sentinel_score > 35
      ? 'border-amber-500/50 shadow-amber-500/10'
      : 'border-slate-700'

  return (
    <motion.div
      className={`rounded-xl border bg-slate-900 p-4 shadow-lg ${borderColor}`}
      animate={sentinel?.alert_active ? { borderColor: ['#ef4444', '#991b1b', '#ef4444'] } : {}}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-slate-200">Sentinel Monitor</span>
        </div>
        <SentinelScoreGauge score={sentinel?.sentinel_score ?? 0} />
      </div>

      {sentinel?.last_checkin && (
        <LastCheckinCard checkin={sentinel.last_checkin} />
      )}

      {sentinel?.alert_active && sentinel.recommended_action && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg"
        >
          <p className="text-xs text-red-400 font-medium">⚠ {sentinel.recommended_action}</p>
        </motion.div>
      )}
    </motion.div>
  )
}

function SentinelScoreGauge({ score }: { score: number }) {
  // SVG arc gauge, 0-100
  // Green 0-35, amber 35-65, red 65-100
  const radius = 20
  const circumference = Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score > 65 ? '#ef4444' : score > 35 ? '#f59e0b' : '#10b981'

  return (
    <div className="relative w-14 h-8">
      <svg viewBox="0 0 48 28" className="w-full h-full">
        <path
          d="M 4 24 A 20 20 0 0 1 44 24"
          fill="none" stroke="#1e293b" strokeWidth="4" strokeLinecap="round"
        />
        <path
          d="M 4 24 A 20 20 0 0 1 44 24"
          fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-end justify-center pb-0.5">
        <span className="text-xs font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  )
}

function LastCheckinCard({ checkin }: { checkin: CaregiverCheckin }) {
  const activityIcons = {
    normal: <CheckCircle className="w-3 h-3 text-emerald-400" />,
    reduced: <AlertTriangle className="w-3 h-3 text-amber-400" />,
    very_low: <AlertTriangle className="w-3 h-3 text-red-400" />,
  }

  return (
    <div className="bg-slate-800/50 rounded-lg p-3 mt-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        {checkin.language_detected !== 'en' && (
          <Mic className="w-3 h-3 text-amber-400" />
        )}
        <span className="text-xs text-slate-400">
          Last check-in · {format(new Date(checkin.checkin_date), 'MMM d, h:mm a')}
        </span>
      </div>
      <div className="flex gap-3">
        <div className="flex items-center gap-1">
          {activityIcons[checkin.activity_level]}
          <span className="text-xs text-slate-300 capitalize">
            {checkin.activity_level.replace('_', ' ')}
          </span>
        </div>
        {checkin.fatigue_reported && (
          <span className="text-xs text-amber-400">Fatigue reported</span>
        )}
      </div>
    </div>
  )
}

function SentinelSkeleton() {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 animate-pulse">
      <div className="h-4 w-32 bg-slate-800 rounded mb-3" />
      <div className="h-16 bg-slate-800 rounded" />
    </div>
  )
}
```

### 2.3 Update NOOR Dashboard Page

Update `/frontend/app/dashboard/patients/[id]/page.tsx` to include `SentinelPanel` below `ClinicalAlerts`. The SentinelPanel renders conditionally — only if `sentinel.sentinel_score > 0`.

### 2.4 Phase 2 Completion Checkpoint

- Existing Hb chart renders with real data from Person 2's API
- ClinicalAlerts shows correct pill states
- SentinelPanel renders (may show empty state if Person 2's endpoint isn't ready yet — that's fine, handle gracefully)
- No TypeScript errors

**STOP. Print Phase 2 summary and Phase 3 plan. Wait for user approval.**

---

## PHASE 3: Guardian Constellation (Existing + Churn + Fatigue)

### 3.1 Existing Constellation — Verify

The guardian constellation SVG with 8 nodes must work. Each node:
- Correct color by status (active=green, cooldown=amber, pending=blue, unavailable=red, empty=gray)
- Hover tooltip with guardian name, last donation, next eligible date
- Click to expand guardian detail panel
- Animation: active nodes pulse gently

### 3.2 New: `ChurnRiskBadge` on Guardian Nodes

Each guardian node in the constellation gets a small badge overlay in the top-right corner based on `donor_churn_score.engagement_trend`:

```typescript
// components/guardian/ChurnRiskBadge.tsx
import { TrendingDown, AlertCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface ChurnRiskBadgeProps {
  trend: 'stable' | 'declining' | 'critical'
  cusumScore: number
}

export function ChurnRiskBadge({ trend, cusumScore }: ChurnRiskBadgeProps) {
  if (trend === 'stable') return null

  const config = {
    declining: {
      icon: <TrendingDown className="w-2.5 h-2.5" />,
      bg: 'bg-amber-500',
      label: `Engagement declining (CUSUM: ${cusumScore.toFixed(2)})`,
    },
    critical: {
      icon: <AlertCircle className="w-2.5 h-2.5" />,
      bg: 'bg-red-500',
      label: `Churn risk critical (CUSUM: ${cusumScore.toFixed(2)})`,
    },
  }

  const { icon, bg, label } = config[trend]

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full ${bg} flex items-center justify-center text-white shadow-lg`}>
          {icon}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{label}</p>
      </TooltipContent>
    </Tooltip>
  )
}
```

### 3.3 New: `FatigueMeter` on Guardian Nodes

Below each guardian node label, render a small horizontal battery-style indicator:

```typescript
// components/guardian/FatigueMeter.tsx
interface FatigueMeterProps {
  annual_donation_count: number
  fatigue_ceiling: number
  is_eligible: boolean
  fatigue_rest_until: string | null
}

export function FatigueMeter({ annual_donation_count, fatigue_ceiling, is_eligible, fatigue_rest_until }: FatigueMeterProps) {
  const pct = Math.min(annual_donation_count / fatigue_ceiling, 1)
  const barColor = pct >= 1 ? '#ef4444' : pct >= 0.75 ? '#f59e0b' : '#10b981'
  const remaining = fatigue_ceiling - annual_donation_count

  return (
    <div className="w-full mt-1.5">
      {/* Battery bar */}
      <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct * 100}%`, backgroundColor: barColor }}
        />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[9px] text-slate-500">
          {is_eligible ? `${remaining} donations left` : fatigue_rest_until ? `Rest until ${new Date(fatigue_rest_until).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}` : 'At ceiling'}
        </span>
        <span className="text-[9px]" style={{ color: barColor }}>
          {annual_donation_count}/{fatigue_ceiling}
        </span>
      </div>
    </div>
  )
}
```

### 3.4 New: Guardian Engagement Timeline Drawer

When clicking on an amber or red (churn risk) guardian node, open a `Sheet` (shadcn) drawer from the right showing:
- Response latency sparkline (last 6 cycles)
- Donation count trend
- Re-engagement message history
- Button: "Send Re-engagement Message" → calls `POST /api/v1/guardians/{id}/reengage`

```typescript
// components/guardian/GuardianEngagementDrawer.tsx
// Uses Recharts LineChart for latency sparkline
// Uses shadcn Sheet component
// Shows last 6 engagement signals from API
```

### 3.5 Phase 3 Completion Checkpoint

- 8-node constellation renders correctly
- ChurnRiskBadge appears on declining/critical guardians
- FatigueMeter shows on all nodes
- Clicking a churn-risk node opens the drawer
- Re-engagement button works (even if backend endpoint returns mock for now)

**STOP. Print Phase 3 summary and Phase 4 plan. Wait for user approval.**

---

## PHASE 4: RaktaGrid (Existing + Blood Weather + Cross-Patient Panel)

### 4.1 Existing Map — Verify

The Leaflet city map with blood bank markers must work:
- Markers colored by health status (green/yellow/red)
- Clicking marker shows bank inventory popup
- Pending match cards below the map
- Approve transfer button functional

### 4.2 New: `BloodWeatherPanel`

This is the most visually striking new component. It renders ABOVE the city map.

```typescript
// components/grid/BloodWeatherPanel.tsx
'use client'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import type { BloodWeatherForecast } from '@/types'
import { addWeeks, format, startOfWeek } from 'date-fns'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Cloud, CloudRain, Sun, CloudLightning } from 'lucide-react'

interface BloodWeatherPanelProps {
  cityCode: string
}

const BLOOD_TYPES = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
const WEEKS = [0, 1, 2, 3]

const SEVERITY_CONFIG = {
  surplus:  { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-400', icon: <Sun className="w-3 h-3" /> },
  balanced: { bg: 'bg-slate-700/50',   border: 'border-slate-600',      text: 'text-slate-400',   icon: <Cloud className="w-3 h-3" /> },
  shortage: { bg: 'bg-amber-500/20',   border: 'border-amber-500/40',   text: 'text-amber-400',   icon: <CloudRain className="w-3 h-3" /> },
  critical: { bg: 'bg-red-500/20',     border: 'border-red-500/40',     text: 'text-red-400',     icon: <CloudLightning className="w-3 h-3" />, pulse: true },
}

export function BloodWeatherPanel({ cityCode }: BloodWeatherPanelProps) {
  const { data: forecasts = [], isLoading } = useQuery({
    queryKey: ['blood-weather', cityCode],
    queryFn: () => apiGet<BloodWeatherForecast[]>(`/api/v1/weather/${cityCode}`),
    refetchInterval: 300_000, // 5 minutes
  })

  // Build grid: blood_type → week → forecast
  const grid: Record<string, Record<string, BloodWeatherForecast | null>> = {}
  BLOOD_TYPES.forEach(bt => {
    grid[bt] = {}
    WEEKS.forEach(w => { grid[bt][w] = null })
  })
  forecasts.forEach(f => {
    const weekIndex = WEEKS.findIndex(w =>
      format(addWeeks(startOfWeek(new Date()), w), 'yyyy-MM-dd') === f.forecast_week_start
    )
    if (weekIndex >= 0 && grid[f.blood_type]) {
      grid[f.blood_type][weekIndex] = f
    }
  })

  const weekLabels = WEEKS.map(w =>
    w === 0 ? 'This Week' : w === 1 ? 'Next Week' :
    format(addWeeks(new Date(), w), 'MMM d')
  )

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Blood Weather Forecast</h3>
          <p className="text-xs text-slate-500 mt-0.5">30-day supply/demand outlook · {cityCode}</p>
        </div>
        <div className="flex gap-3 text-[10px] text-slate-500">
          {Object.entries(SEVERITY_CONFIG).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1">
              <span className={v.text}>{v.icon}</span>
              <span className="capitalize">{k}</span>
            </div>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-5 gap-1.5 animate-pulse">
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="h-8 bg-slate-800 rounded" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left text-slate-500 font-normal pb-2 pr-3 w-10">Type</th>
                {weekLabels.map(label => (
                  <th key={label} className="text-center text-slate-500 font-normal pb-2 px-1">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BLOOD_TYPES.map(bt => (
                <tr key={bt}>
                  <td className="text-slate-300 font-mono font-semibold pr-3 py-1">{bt}</td>
                  {WEEKS.map(w => {
                    const f = grid[bt][w]
                    const severity = f?.gap_severity ?? 'balanced'
                    const cfg = SEVERITY_CONFIG[severity]
                    return (
                      <td key={w} className="px-1 py-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={`
                              h-8 rounded border flex items-center justify-center cursor-default
                              ${cfg.bg} ${cfg.border}
                              ${cfg.pulse ? 'animate-pulse' : ''}
                            `}>
                              <span className={cfg.text}>{cfg.icon}</span>
                            </div>
                          </TooltipTrigger>
                          {f && (
                            <TooltipContent>
                              <div className="text-xs space-y-0.5">
                                <p className="font-semibold">{bt} · Week of {f.forecast_week_start}</p>
                                <p>Demand: {f.predicted_demand_units} units</p>
                                <p>Supply: {f.current_supply_units} units</p>
                                <p className={f.gap_units > 0 ? 'text-red-400' : 'text-emerald-400'}>
                                  Gap: {f.gap_units > 0 ? `+${f.gap_units} shortage` : `${Math.abs(f.gap_units)} surplus`}
                                </p>
                              </div>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

### 4.3 New: Cross-Patient Donor Pool Panel

On the RaktaGrid view, add a sidebar panel showing compatible donors from other patients' circles available for cross-routing. Appears when a patient's circle mobilization fails.

```typescript
// components/grid/CrossPatientDonorPool.tsx
// Shows list of donors compatible with current patient
// Each donor shows: name (masked), blood type, compatibility score, distance
// "Route This Donor" button → calls POST /api/v1/graph/route
// Only visible when circle mobilization_status === 'failed'
```

### 4.4 Phase 4 Completion Checkpoint

- BloodWeatherPanel renders with 4-week grid (even if data is synthetic from Person 2)
- Tooltips work on all cells
- City map still works (no regression)
- CrossPatientDonorPool panel appears for the correct patient state

**STOP. Print Phase 4 summary and Phase 5 plan. Wait for user approval.**

---

## PHASE 5: Admin Panel (Grief Protocol + New Features Dashboard)

### 5.1 Patient Status Panel + Grief Protocol Modal

On the patient detail page (`/dashboard/patients/[id]`), add `PatientStatusPanel` in the header area:

```typescript
// components/patient/PatientStatusPanel.tsx
'use client'
import { useState } from 'react'
import { apiPost } from '@/lib/api-client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { PatientStatus } from '@/types'

export function PatientStatusPanel({ patientId, currentStatus }: { patientId: string, currentStatus: PatientStatus }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleStatusChange(newStatus: PatientStatus) {
    setLoading(true)
    try {
      await apiPost(`/api/v1/patients/${patientId}/status`, { status: newStatus })
      toast.success(
        newStatus === 'deceased'
          ? 'Grief Protocol initiated. Guardian messages are being sent.'
          : `Patient status updated to ${newStatus}.`
      )
      setOpen(false)
    } catch (err) {
      toast.error('Failed to update patient status')
    } finally {
      setLoading(false)
    }
  }

  // Render status badge + change button
  // Modal for deceased confirmation with warning text
  // "This will initiate the Grief Protocol for all X guardians. This cannot be undone."
}
```

### 5.2 Grief Protocol Admin View

New page: `/dashboard/admin/grief-protocol/page.tsx`

Shows all patients with `status = 'deceased'`, the list of guardians who received memorial messages, and their transition consent status. Read-only view for administrators.

### 5.3 Admin Dashboard Overview

New page: `/dashboard/admin/page.tsx` with:
- Total active patients / guardians / blood banks
- City health score trend (sparkline, last 30 days)
- Guardian churn risk summary (number at risk)
- Donor fatigue summary (number at ceiling)
- Sentinel alert count (active)
- Blood Weather summary (any critical weeks?)
- All rendered as stat cards with micro-charts using Recharts

### 5.4 Phase 5 Completion Checkpoint

- Patient status change works and shows confirmation
- Grief Protocol modal renders with correct guardian count
- Admin overview page loads with real data
- No console errors across all pages

**STOP. Print Phase 5 summary and Phase 6 plan. Wait for user approval.**

---

## PHASE 6: Polish, Performance, and Demo Prep

### 6.1 Loading States

Every data-fetching component must have a proper skeleton:
- Use `animate-pulse` Tailwind class
- Skeletons must match the shape of the real content
- Never show a blank page while data loads

### 6.2 Error States

Every component must handle API failures gracefully:
```typescript
// Pattern to use everywhere
if (isError) return (
  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
    <p className="text-sm text-red-400">Failed to load data. <button onClick={() => refetch()} className="underline">Retry</button></p>
  </div>
)
```

### 6.3 Mobile Responsiveness

- Dashboard sidebar collapses to bottom nav on mobile
- BloodWeatherPanel scrolls horizontally on small screens
- Guardian Constellation resizes SVG viewBox

### 6.4 Performance Checklist

- [ ] No `any` types anywhere in TypeScript
- [ ] All images have `alt` attributes
- [ ] Leaflet map is lazy-loaded (dynamic import with `ssr: false`)
- [ ] Framer Motion animations have `will-change: transform` only on animating elements
- [ ] React Query deduplications: all queries use stable queryKeys
- [ ] No useEffect with missing dependencies

### 6.5 Demo Seed Data Verification

Confirm the following in production environment:
- [ ] Priya's Hb chart shows 14-month sawtooth
- [ ] Priya has one guardian with `engagement_trend: 'declining'`
- [ ] Priya has one guardian with `fatigue_ceiling` reached
- [ ] BloodWeatherPanel shows at least one `critical` cell for Week 3
- [ ] SentinelPanel shows a recent check-in with `activity_level: 'reduced'`
- [ ] One patient has `status: 'active'` and a pre-configured grief demo (Vikram, set to inactive for demo)

### 6.6 S3 + CloudFront Deployment

```bash
# Build static export
cd frontend
npm run build
# Output is in /out directory

# Deploy to S3
aws s3 sync out/ s3://${AWS_S3_BUCKET_FRONTEND} --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id ${AWS_CLOUDFRONT_DISTRIBUTION_ID} \
  --paths "/*"
```

### 6.7 Final Phase 6 Checklist

- [ ] `npm run build` passes with zero warnings
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] Lighthouse score ≥ 85 (acceptable for demo)
- [ ] All 6 demo moments work end-to-end
- [ ] S3 + CloudFront URL loads correctly
- [ ] All production env vars point to AWS services (not localhost)

**STOP. Print final summary. Person 1's work is complete.**

---

## Appendix A: Component File Tree

```
frontend/
├── app/
│   ├── layout.tsx                          ← root layout + Amplify config
│   ├── globals.css
│   ├── auth/
│   │   └── page.tsx                        ← Cognito sign in/up
│   └── dashboard/
│       ├── layout.tsx                      ← sidebar shell
│       ├── page.tsx                        ← redirect to /patients
│       ├── patients/
│       │   ├── page.tsx                    ← patient list
│       │   └── [id]/
│       │       └── page.tsx                ← NOOR dashboard (existing + Sentinel)
│       ├── guardian/
│       │   └── [id]/
│       │       └── page.tsx                ← Guardian Constellation (existing + Churn + Fatigue)
│       ├── grid/
│       │   └── page.tsx                    ← RaktaGrid (existing + Weather + CrossPatient)
│       └── admin/
│           ├── page.tsx                    ← Admin overview
│           └── grief-protocol/
│               └── page.tsx               ← Grief Protocol admin view
├── components/
│   ├── providers.tsx
│   ├── ui/                                 ← shadcn components
│   ├── patient/
│   │   ├── PatientStatusPanel.tsx          ← NEW
│   │   └── PatientHeader.tsx               ← existing
│   ├── noor/
│   │   ├── HbForecastChart.tsx             ← existing
│   │   └── ClinicalAlerts.tsx              ← existing
│   ├── sentinel/
│   │   └── SentinelPanel.tsx               ← NEW
│   ├── guardian/
│   │   ├── GuardianConstellation.tsx       ← existing
│   │   ├── ChurnRiskBadge.tsx              ← NEW
│   │   ├── FatigueMeter.tsx                ← NEW
│   │   └── GuardianEngagementDrawer.tsx    ← NEW
│   └── grid/
│       ├── CityBloodMap.tsx                ← existing
│       ├── BloodWeatherPanel.tsx           ← NEW
│       └── CrossPatientDonorPool.tsx       ← NEW
├── lib/
│   ├── api-client.ts                       ← updated for Cognito
│   └── auth-config.ts                      ← NEW (Amplify/Cognito)
└── types/
    └── index.ts                            ← re-exports from shared/contracts
```

---

## Appendix B: Non-Negotiable Rules

1. Zero `any` in TypeScript. Use `unknown` and type guards if needed.
2. Every async operation wrapped in try/catch.
3. Every list render has a proper `key` prop (never array index unless list is static).
4. No hardcoded colors — use the CSS variable color system or Tailwind classes.
5. No `console.log` in production paths. Use `console.error` only in catch blocks.
6. Framer Motion only for purposeful animations — not gratuitous effects.
7. Every shadcn Dialog has a proper `DialogTitle` (accessibility).
8. All date formatting uses `date-fns` — never `new Date().toLocaleDateString()` raw.
9. React Query for all server state — no `useState` + `useEffect` for data fetching.
10. The Leaflet map must be dynamic imported with `ssr: false` — it will break SSR.
