---
name: PieceJobs badge system
description: How worker badges work and what DB change is needed
---

Worker badge is a TEXT column on the `workers` table. Values: new, bronze, silver, gold, diamond.

**SQL the user must run in Supabase:**
```sql
ALTER TABLE workers ADD COLUMN IF NOT EXISTS badge TEXT DEFAULT 'new';
```

`getBadgeInfo(completedJobs: number)` in `supabase.ts` maps job counts to badge levels:
- 0 = New ⭐, 1–4 = Bronze 🥉, 5–14 = Silver 🥈, 15–29 = Gold 🥇, 30+ = Diamond 💎

Badge display components exist in: workers.tsx (WorkerBadge fn), worker-dashboard.tsx (WorkerBadgePill component).

**Why:** Badge is DB-stored so admin can manually award; progress tracking uses completed payment count.

**How to apply:** When updating badge on payment release, PATCH workers table badge field based on completed payment count.
