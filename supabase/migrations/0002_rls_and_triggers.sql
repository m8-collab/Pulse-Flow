-- Run this AFTER `drizzle-kit push` has created the tables/enums from db/schema.ts
-- In Supabase Dashboard: SQL Editor > paste and run.

-- ============================================================
-- 1. Auto-create a profile row whenever a new auth user signs up
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    -- first user to ever sign up becomes admin, everyone else defaults to member
    case when (select count(*) from public.profiles) = 0 then 'admin' else 'member' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. Helper: current user's role, without recursive RLS lookups
-- ============================================================
create or replace function public.current_role()
returns text
language sql stable security definer set search_path = public
as $$
  select role::text from public.profiles where id = auth.uid();
$$;

create or replace function public.is_campaign_member(target_campaign_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.campaign_members
    where campaign_id = target_campaign_id and user_id = auth.uid()
  ) or exists (
    select 1 from public.campaigns
    where id = target_campaign_id and owner_id = auth.uid()
  );
$$;

-- ============================================================
-- 3. Enable RLS everywhere
-- ============================================================
alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.expenses enable row level security;
alter table public.tasks enable row level security;
alter table public.campaign_analytics enable row level security;

-- ============================================================
-- 4. profiles
-- ============================================================
create policy "profiles_select_all_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.current_role() = 'admin');

-- ============================================================
-- 5. campaigns
-- Admin: full access. Manager: create + full access to campaigns they own or are members of.
-- Member: read-only for campaigns they belong to.
-- ============================================================
create policy "campaigns_select_members_or_admin"
  on public.campaigns for select
  to authenticated
  using (
    public.current_role() = 'admin'
    or owner_id = auth.uid()
    or public.is_campaign_member(id)
  );

create policy "campaigns_insert_manager_or_admin"
  on public.campaigns for insert
  to authenticated
  with check (public.current_role() in ('admin', 'manager'));

create policy "campaigns_update_owner_manager_or_admin"
  on public.campaigns for update
  to authenticated
  using (
    public.current_role() = 'admin'
    or (public.current_role() = 'manager' and (owner_id = auth.uid() or public.is_campaign_member(id)))
  );

create policy "campaigns_delete_admin_only"
  on public.campaigns for delete
  to authenticated
  using (public.current_role() = 'admin');

-- ============================================================
-- 6. campaign_members
-- ============================================================
create policy "campaign_members_select"
  on public.campaign_members for select
  to authenticated
  using (public.current_role() = 'admin' or public.is_campaign_member(campaign_id));

create policy "campaign_members_manage"
  on public.campaign_members for all
  to authenticated
  using (public.current_role() in ('admin', 'manager'))
  with check (public.current_role() in ('admin', 'manager'));

-- ============================================================
-- 7. expenses
-- Members can log expenses for campaigns they belong to; only manager/admin can approve (update status).
-- ============================================================
create policy "expenses_select"
  on public.expenses for select
  to authenticated
  using (public.current_role() = 'admin' or public.is_campaign_member(campaign_id));

create policy "expenses_insert"
  on public.expenses for insert
  to authenticated
  with check (public.is_campaign_member(campaign_id) and submitted_by = auth.uid());

create policy "expenses_update_owner_pending_or_approver"
  on public.expenses for update
  to authenticated
  using (
    public.current_role() = 'admin'
    or public.current_role() = 'manager'
    or (submitted_by = auth.uid() and status = 'pending')
  );

create policy "expenses_delete_admin_or_owner_pending"
  on public.expenses for delete
  to authenticated
  using (public.current_role() = 'admin' or (submitted_by = auth.uid() and status = 'pending'));

-- ============================================================
-- 8. tasks
-- ============================================================
create policy "tasks_select"
  on public.tasks for select
  to authenticated
  using (public.current_role() = 'admin' or public.is_campaign_member(campaign_id));

create policy "tasks_insert"
  on public.tasks for insert
  to authenticated
  with check (public.is_campaign_member(campaign_id));

create policy "tasks_update"
  on public.tasks for update
  to authenticated
  using (
    public.current_role() in ('admin', 'manager')
    or assignee_id = auth.uid()
    or created_by = auth.uid()
  );

create policy "tasks_delete"
  on public.tasks for delete
  to authenticated
  using (public.current_role() in ('admin', 'manager') or created_by = auth.uid());

-- ============================================================
-- 9. campaign_analytics (mock ingestion, managers/admins write, members read)
-- ============================================================
create policy "analytics_select"
  on public.campaign_analytics for select
  to authenticated
  using (public.current_role() = 'admin' or public.is_campaign_member(campaign_id));

create policy "analytics_insert"
  on public.campaign_analytics for insert
  to authenticated
  with check (public.current_role() in ('admin', 'manager'));

-- ============================================================
-- 10. Realtime: publish changes on collaborative tables
-- ============================================================
alter publication supabase_realtime add table public.campaigns;
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.campaign_analytics;
