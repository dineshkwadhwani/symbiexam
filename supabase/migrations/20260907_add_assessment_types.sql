-- Add assessment variants while preserving the existing MCQ workflow.
-- Run with the Supabase SQL editor or `supabase db push`.

alter table public.assessments
  add column if not exists assessment_type text;

update public.assessments
set assessment_type = $$mcq$$
where assessment_type is null;

alter table public.assessments
  alter column assessment_type set default $$mcq$$,
  alter column assessment_type set not null;

alter table public.assessments
  drop constraint if exists assessments_assessment_type_check;

alter table public.assessments
  add constraint assessments_assessment_type_check
  check (assessment_type in ($$mcq$$, $$subjective$$, $$subjective_online$$));

alter table public.questions
  add column if not exists image_url text,
  add column if not exists model_answer text,
  add column if not exists max_marks numeric(7,2);

alter table public.questions
  alter column option_a drop not null,
  alter column option_b drop not null,
  alter column option_c drop not null,
  alter column option_d drop not null,
  alter column correct_answer drop not null;

alter table public.paper_questions
  add column if not exists answer_text text,
  add column if not exists marks_awarded numeric(7,2),
  add column if not exists evaluation_feedback text,
  add column if not exists evaluation_status text;

update public.paper_questions
set evaluation_status = $$not_started$$
where evaluation_status is null;

alter table public.paper_questions
  alter column evaluation_status set default $$not_started$$,
  alter column evaluation_status set not null;

alter table public.paper_questions
  drop constraint if exists paper_questions_evaluation_status_check;

alter table public.paper_questions
  add constraint paper_questions_evaluation_status_check
  check (evaluation_status in ($$not_started$$, $$queued$$, $$processing$$, $$completed$$, $$failed$$));

create table if not exists public.ai_evaluation_jobs (
  id                uuid primary key default uuid_generate_v4(),
  paper_id          uuid not null references public.student_papers(id) on delete cascade,
  paper_question_id uuid not null references public.paper_questions(id) on delete cascade,
  status            text not null default $$queued$$ check (status in ($$queued$$, $$processing$$, $$completed$$, $$failed$$)),
  attempts          int not null default 0,
  available_at      timestamptz not null default now(),
  started_at        timestamptz,
  completed_at      timestamptz,
  last_error        text,
  created_at        timestamptz default now(),
  unique (paper_question_id)
);

alter table public.ai_evaluation_jobs enable row level security;

drop policy if exists "Service role manages evaluation jobs" on public.ai_evaluation_jobs;
create policy "Service role manages evaluation jobs"
  on public.ai_evaluation_jobs for all using (true) with check (true);

-- The storage policy below needs this helper even when the original schema
-- was not applied to this project.
create or replace function public.get_my_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

insert into storage.buckets (id, name, public) values ('question-images', 'question-images', true)
on conflict do nothing;

drop policy if exists "Question images are publicly readable" on storage.objects;
create policy "Question images are publicly readable"
  on storage.objects for select using (bucket_id = 'question-images');

drop policy if exists "Teachers can upload question images" on storage.objects;
create policy "Teachers can upload question images"
  on storage.objects for insert with check (
    bucket_id = 'question-images' and auth.uid() is not null and public.get_my_role() = 'teacher'
  );