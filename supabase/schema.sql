-- ════════════════════════════════════════════════════════════
-- Symbi Assess — Full Database Schema
-- Run this in the Supabase SQL Editor
-- ════════════════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Users / Profiles ────────────────────────────────────────
-- Extends Supabase auth.users
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  email         text not null unique,
  phone         text,
  role          text not null check (role in ('teacher','student')) default 'student',
  avatar_url    text,
  must_change_password boolean default false,
  created_at    timestamptz default now()
);

-- ── Cohorts ─────────────────────────────────────────────────
create table public.cohorts (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  description text,
  teacher_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz default now()
);

-- ── Cohort Students ─────────────────────────────────────────
create table public.cohort_students (
  id          uuid primary key default uuid_generate_v4(),
  cohort_id   uuid not null references public.cohorts(id) on delete cascade,
  student_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  unique (cohort_id, student_id)
);

-- ── Assessments ─────────────────────────────────────────────
create table public.assessments (
  id                  uuid primary key default uuid_generate_v4(),
  name                text not null,
  total_questions     int not null,
  total_time_seconds  int,            -- null = no overall timer
  time_per_question   int,            -- null = no per-question timer
  marks_per_correct   numeric(5,2) not null default 1,
  total_marks         numeric(7,2) not null,
  is_active           boolean not null default false,
  teacher_id          uuid not null references public.profiles(id) on delete cascade,
  created_at          timestamptz default now()
);

-- ── Question Bank ────────────────────────────────────────────
create table public.questions (
  id              uuid primary key default uuid_generate_v4(),
  assessment_id   uuid not null references public.assessments(id) on delete cascade,
  co              text,
  topic_number    text,
  topic_name      text,
  bloom_level     int,
  bloom_label     text,
  question_text   text not null,
  option_a        text not null,
  option_b        text not null,
  option_c        text not null,
  option_d        text not null,
  correct_answer  char(1) not null check (correct_answer in ('A','B','C','D')),
  explanation     text,
  created_at      timestamptz default now()
);

-- ── Assessment Assignments ───────────────────────────────────
-- Links an assessment to a cohort (or single student)
create table public.assignments (
  id              uuid primary key default uuid_generate_v4(),
  assessment_id   uuid not null references public.assessments(id) on delete cascade,
  cohort_id       uuid references public.cohorts(id) on delete cascade,
  student_id      uuid references public.profiles(id) on delete cascade,
  assigned_by     uuid not null references public.profiles(id),
  assigned_at     timestamptz default now(),
  -- Either cohort_id or student_id must be set
  check (cohort_id is not null or student_id is not null)
);

-- ── Student Question Papers ──────────────────────────────────
-- Pre-generated randomized paper per student per assignment
create table public.student_papers (
  id              uuid primary key default uuid_generate_v4(),
  assignment_id   uuid not null references public.assignments(id) on delete cascade,
  student_id      uuid not null references public.profiles(id) on delete cascade,
  assessment_id   uuid not null references public.assessments(id) on delete cascade,
  started_at      timestamptz,
  submitted_at    timestamptz,
  score           numeric(7,2),
  status          text not null default 'pending' check (status in ('pending','in_progress','completed')),
  created_at      timestamptz default now(),
  unique (assignment_id, student_id)
);

-- ── Paper Questions (student's actual question list + answers)
create table public.paper_questions (
  id              uuid primary key default uuid_generate_v4(),
  paper_id        uuid not null references public.student_papers(id) on delete cascade,
  question_id     uuid not null references public.questions(id) on delete cascade,
  question_order  int not null,
  selected_answer char(1) check (selected_answer in ('A','B','C','D')),
  is_correct      boolean,
  created_at      timestamptz default now()
);

-- ════════════════════════════════════════════════════════════
-- Row Level Security
-- ════════════════════════════════════════════════════════════
alter table public.profiles          enable row level security;
alter table public.cohorts           enable row level security;
alter table public.cohort_students   enable row level security;
alter table public.assessments       enable row level security;
alter table public.questions         enable row level security;
alter table public.assignments       enable row level security;
alter table public.student_papers    enable row level security;
alter table public.paper_questions   enable row level security;

-- Helper: get current user's role
create or replace function public.get_my_role()
returns text language sql security definer stable as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Helper: get teacher_id of a cohort (bypasses RLS to break circular policy recursion)
create or replace function public.get_cohort_teacher(cohort_uuid uuid)
returns uuid language sql security definer stable as $$
  select teacher_id from public.cohorts where id = cohort_uuid;
$$;

-- ── Profiles RLS
create policy "Users can read own profile"
  on public.profiles for select using (id = auth.uid());
create policy "Users can update own profile"
  on public.profiles for update using (id = auth.uid());
create policy "Teacher can read all profiles"
  on public.profiles for select using (get_my_role() = 'teacher');
create policy "Service role full access to profiles"
  on public.profiles for all using (true) with check (true);

-- ── Cohorts RLS
create policy "Teacher owns cohorts"
  on public.cohorts for all using (teacher_id = auth.uid());
create policy "Students can see cohorts they belong to"
  on public.cohorts for select using (
    exists (
      select 1 from public.cohort_students cs
      where cs.cohort_id = id and cs.student_id = auth.uid()
    )
  );

-- ── Cohort Students RLS
create policy "Teacher manages cohort students"
  on public.cohort_students for all using (
    get_cohort_teacher(cohort_id) = auth.uid()
  );
create policy "Students can see own enrollment"
  on public.cohort_students for select using (student_id = auth.uid());

-- ── Assessments RLS
create policy "Teacher manages own assessments"
  on public.assessments for all using (teacher_id = auth.uid());

-- ── Questions RLS
create policy "Teacher manages own questions"
  on public.questions for all using (
    exists (select 1 from public.assessments a where a.id = assessment_id and a.teacher_id = auth.uid())
  );
create policy "Students see questions in their papers"
  on public.questions for select using (
    exists (
      select 1 from public.paper_questions pq
      join public.student_papers sp on sp.id = pq.paper_id
      where pq.question_id = id and sp.student_id = auth.uid()
    )
  );

-- ── Assignments RLS
create policy "Teacher manages own assignments"
  on public.assignments for all using (assigned_by = auth.uid());
create policy "Students see own assignments"
  on public.assignments for select using (
    student_id = auth.uid()
    or exists (
      select 1 from public.cohort_students cs
      where cs.cohort_id = cohort_id and cs.student_id = auth.uid()
    )
  );

-- ── Student Papers RLS
create policy "Teacher sees all papers for own assessments"
  on public.student_papers for all using (
    exists (select 1 from public.assessments a where a.id = assessment_id and a.teacher_id = auth.uid())
  );
create policy "Student sees own paper only"
  on public.student_papers for select using (student_id = auth.uid());
create policy "Student updates own paper"
  on public.student_papers for update using (student_id = auth.uid());

-- ── Paper Questions RLS
create policy "Teacher sees all paper questions for own assessments"
  on public.paper_questions for select using (
    exists (
      select 1 from public.student_papers sp
      join public.assessments a on a.id = sp.assessment_id
      where sp.id = paper_id and a.teacher_id = auth.uid()
    )
  );
create policy "Student sees own paper questions"
  on public.paper_questions for select using (
    exists (select 1 from public.student_papers sp where sp.id = paper_id and sp.student_id = auth.uid())
  );
create policy "Student updates own paper questions"
  on public.paper_questions for update using (
    exists (select 1 from public.student_papers sp where sp.id = paper_id and sp.student_id = auth.uid())
  );

-- ════════════════════════════════════════════════════════════
-- Storage bucket for avatars
-- ════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict do nothing;

create policy "Authenticated users can upload own avatar"
  on storage.objects for insert with check (
    bucket_id = 'avatars' and auth.uid() is not null
  );
create policy "Avatars are publicly readable"
  on storage.objects for select using (bucket_id = 'avatars');
create policy "Users can update own avatar"
  on storage.objects for update using (
    bucket_id = 'avatars' and auth.uid() is not null
  );
