
create table public.equity_company_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.equity_companies(id) on delete cascade,
  assessment_id uuid references public.equity_assessments(id) on delete set null,
  file_name text not null,
  file_path text not null,
  mime_type text,
  size_bytes integer,
  doc_type text,
  extraction_status text not null default 'pending',
  extracted_json jsonb,
  extraction_summary text,
  extraction_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.equity_company_documents to authenticated;
grant all on public.equity_company_documents to service_role;

alter table public.equity_company_documents enable row level security;

create policy "ep_docs_owner_all"
on public.equity_company_documents for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger trg_ep_docs_updated
before update on public.equity_company_documents
for each row execute function public.update_updated_at_column();

create index idx_ep_docs_assessment on public.equity_company_documents(assessment_id);
create index idx_ep_docs_company on public.equity_company_documents(company_id);
