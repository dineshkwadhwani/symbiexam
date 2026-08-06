# Symbi Assess

Full-stack MCQ assessment platform for Symbiosis Institute of Technology — Course F0003.

## Tech Stack
- **Next.js 15** · App Router · TypeScript
- **Supabase** — Auth, PostgreSQL database, File storage
- **Resend** — Transactional email
- **Groq** — AI (key wired in, ready to extend)
- **XLSX** — Excel student bulk upload

---

## Getting Started in VS Code

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste and run the contents of `supabase/schema.sql`
3. Note your **Project URL**, **Anon Key**, and **Service Role Key**

### 3. Set up Resend
1. Sign up at [resend.com](https://resend.com)
2. Verify your sending domain
3. Create an API key

### 4. Create your `.env.local` file
Copy `.env.local.example` to `.env.local` and fill in your values:
```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

RESEND_API_KEY=re_xxxx
RESEND_FROM_EMAIL=assessments@yourdomain.com

GROQ_API_KEY=gsk_xxxx

NEXTAUTH_SECRET=any-random-32-char-string-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Run locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### 6. Create the Teacher account
Visit this URL once (replace YOUR_SECRET with your NEXTAUTH_SECRET):
```
http://localhost:3000/api/seed-teacher?secret=YOUR_SECRET
```
This creates:
- **Email:** dinesh.k.wadhwani@gmail.com  
- **Password:** SymbiTeacher@2024

---

## Deploy to Vercel
1. Push to a GitHub repo
2. Import at [vercel.com](https://vercel.com/new)
3. Add all environment variables (same as `.env.local`, but set `NEXT_PUBLIC_APP_URL` to your Vercel URL)
4. After deploy, call `/api/seed-teacher?secret=YOUR_SECRET` to create the teacher account

---

## Features

### Teacher
| Feature | Description |
|---|---|
| Cohorts | Create cohorts, add students individually or via Excel upload |
| Email onboarding | Students get auto-generated credentials + welcome email |
| Assessments | Create with flexible timer settings, marks, question count |
| Question Bank | Upload JSON bank (stratified draw by CO at assignment time) |
| Try Now | Teacher takes the assessment — not stored in DB |
| Assign | To whole cohort or individual student — papers generated instantly |
| Results | Filter by assessment + cohort, click to view full student paper |
| Print | Browser-print cohort summary (name, email, score) |

### Student
| Feature | Description |
|---|---|
| Dashboard | Tiles grouped by status: Pending / In Progress / Completed |
| Quiz Engine | Per-question timer (auto-advance) or total timer (auto-submit) |
| Review | After submission: see every answer, correct/wrong highlights, explanations |
| No retakes | Completed assessments are locked |

### Both Roles
- Profile page — avatar upload, phone number edit
- First-login password change enforced
- RBAC — database RLS + API ownership checks

---

## Question Bank JSON Format
```json
{
  "questions": [
    {
      "co": "CO1",
      "topic_number": "1.1",
      "topic_name": "Introduction to AI",
      "bloom_level": 2,
      "bloom_label": "Understand",
      "question": "Which best describes a Large Language Model?",
      "options": {
        "A": "A rule-based expert system",
        "B": "A transformer trained on large text corpora",
        "C": "A symbolic reasoning engine",
        "D": "A relational database of facts"
      },
      "correct_answer": "B",
      "explanation": "LLMs are transformer-based neural networks trained on massive text datasets to predict and generate language."
    }
  ]
}
```

---

## Timer Behaviour
| Setting | Behaviour |
|---|---|
| `time_per_question` only | Each question auto-advances when timer hits 0 |
| `total_time_seconds` only | Countdown shown; auto-submits at 0 |
| Both set | Per-question advances + total countdown visible simultaneously |
| Neither set | Student navigates freely, submits manually |

---

## Project Structure
```
symbi-assess/
├── app/
│   ├── api/                  # All API routes
│   │   ├── auth/             # login, logout, change-password
│   │   ├── cohorts/          # CRUD + members
│   │   ├── students/         # add, bulk upload, remove, reset-pw
│   │   ├── assessments/      # CRUD + toggle active
│   │   ├── questions/        # Upload JSON bank
│   │   ├── assignments/      # Assign to cohort or student
│   │   ├── papers/           # Student paper: start, answer, submit
│   │   ├── profile/          # Get + update profile
│   │   └── seed-teacher/     # One-time teacher seeding
│   ├── login/
│   ├── change-password/
│   ├── profile/
│   ├── teacher/
│   │   ├── dashboard/
│   │   ├── cohorts/
│   │   ├── assessments/
│   │   └── results/
│   └── student/
│       ├── dashboard/
│       ├── assessment/[id]/  # Quiz engine
│       └── result/[id]/      # Result review
├── components/
│   ├── AppShell.tsx
│   └── Sidebar.tsx
├── lib/
│   ├── auth.ts
│   ├── email.ts
│   ├── paper-generator.ts
│   ├── types.ts
│   └── supabase/
│       ├── client.ts
│       └── server.ts
└── supabase/
    ├── schema.sql            # Run this first in Supabase
    └── seed.sql              # Manual seeding notes
```
