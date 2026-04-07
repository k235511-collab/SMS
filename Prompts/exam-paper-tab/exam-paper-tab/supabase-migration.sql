-- ============================================================
-- Supabase Migration: exam_papers table
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

create table if not exists public.exam_papers (
  id            uuid primary key default gen_random_uuid(),
  exam_id       uuid not null references public.exams(id) on delete cascade,
  school_name   text not null default '',
  paper_title   text not null default '',
  subject       text not null default '',
  class_grade   text not null default '',
  date          text not null default '',
  total_marks   integer not null default 100,
  duration      text not null default '',

  -- Sections stored as JSONB array:
  -- [{ id, title, type, totalMarks, instructions, content (TipTap JSON string) }]
  sections      jsonb not null default '[]'::jsonb,

  -- Optional rich header/footer
  header_content text default '',
  footer_content text default '',

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- One paper per exam (can extend to multiple drafts later)
create unique index if not exists exam_papers_exam_id_idx on public.exam_papers(exam_id);

-- Updated at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists exam_papers_updated_at on public.exam_papers;
create trigger exam_papers_updated_at
  before update on public.exam_papers
  for each row execute function public.set_updated_at();

-- RLS Policies
alter table public.exam_papers enable row level security;

-- Allow authenticated users to read exam papers in their campus
create policy "exam_papers_select" on public.exam_papers
  for select using (auth.role() = 'authenticated');

create policy "exam_papers_insert" on public.exam_papers
  for insert with check (auth.role() = 'authenticated');

create policy "exam_papers_update" on public.exam_papers
  for update using (auth.role() = 'authenticated');

create policy "exam_papers_delete" on public.exam_papers
  for delete using (auth.role() = 'authenticated');

-- ============================================================
-- Supabase Storage bucket for exam images
-- Run separately or via Supabase Dashboard → Storage
-- ============================================================

-- Create bucket (run via Supabase JS client or Dashboard)
-- insert into storage.buckets (id, name, public) values ('exam-assets', 'exam-assets', true);

-- Storage policy: allow authenticated uploads
-- create policy "exam_assets_upload" on storage.objects
--   for insert with check (bucket_id = 'exam-assets' AND auth.role() = 'authenticated');
-- create policy "exam_assets_read" on storage.objects
--   for select using (bucket_id = 'exam-assets');
