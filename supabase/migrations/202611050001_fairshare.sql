-- FAIRSHARE: authoritative ledger, membership, private files and recurring work.
-- Run as the Supabase migration owner. All public writes go through checked RPCs.
create table public.households (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 80),
 description text not null default '', currency text not null default 'AUD' check(currency='AUD'),
 timezone text not null default 'Australia/Sydney', created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.household_members (
 household_id uuid not null references public.households(id), user_id uuid not null references auth.users(id),
 display_name text not null check(length(display_name) between 1 and 80), role text not null check(role in ('admin','member')),
 joined_at timestamptz not null default now(), left_at timestamptz, primary key(household_id,user_id)
);
create table public.household_invitations (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id), token_hash text not null unique,
 email text, created_by uuid not null references auth.users(id), expires_at timestamptz not null default now()+interval '7 days',
 accepted_by uuid references auth.users(id), accepted_at timestamptz, created_at timestamptz not null default now()
);
create table public.expenses (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id),
 created_by uuid not null references auth.users(id), paid_by uuid not null, request_id uuid not null, request_fingerprint text not null,
 kind text not null check(kind in ('expense','bill','trip','rent')), description text not null check(length(description) between 1 and 200),
 category text not null, amount_cents integer not null check(amount_cents between 1 and 100000000),
 occurred_on date not null, due_on date, split_method text not null check(split_method in ('equal','amount','percentage')),
 notes text not null default '' check(length(notes)<=2000), metadata jsonb not null default '{}',
 status text not null default 'active' check(status in ('active','void')), external_paid boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(household_id,paid_by) references public.household_members(household_id,user_id), unique(created_by,request_id), unique(id,household_id)
);
create table public.expense_participants (
 expense_id uuid not null, household_id uuid not null, user_id uuid not null, amount_cents integer not null check(amount_cents>=0),
 primary key(expense_id,user_id), foreign key(expense_id,household_id) references public.expenses(id,household_id),
 foreign key(household_id,user_id) references public.household_members(household_id,user_id)
);
create table public.repayments (
 id uuid primary key default gen_random_uuid(), household_id uuid not null, expense_id uuid not null,
 payer uuid not null, recipient uuid not null, amount_cents integer not null check(amount_cents>0), occurred_on date not null,
 note text not null default '' check(length(note)<=2000), status text not null default 'pending' check(status in ('pending','confirmed','rejected')),
 request_id uuid not null, created_at timestamptz not null default now(), confirmed_at timestamptz,
 foreign key(expense_id,household_id) references public.expenses(id,household_id),
 foreign key(expense_id,payer) references public.expense_participants(expense_id,user_id),
 foreign key(household_id,recipient) references public.household_members(household_id,user_id),
 check(payer<>recipient), unique(payer,request_id)
);
create table public.vehicles (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id), owner uuid not null,
 name text not null check(length(name) between 1 and 100), model text not null default '', registration text not null default '',
 fuel_type text not null default 'Unleaded', efficiency numeric(8,3) not null check(efficiency>0 and efficiency<=100),
 tank_litres numeric(8,3) not null check(tank_litres>0 and tank_litres<=500), notes text not null default '', active boolean not null default true,
 foreign key(household_id,owner) references public.household_members(household_id,user_id), created_at timestamptz not null default now()
);
create table public.fuel_price_records (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id), vehicle_id uuid references public.vehicles(id),
 price_per_litre numeric(8,4) not null check(price_per_litre>0 and price_per_litre<=20), fuel_type text not null,
 observed_on date not null, created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.rent_configurations (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id), created_by uuid not null references auth.users(id),
 amount_cents integer not null check(amount_cents>0), collector uuid not null, request_id uuid not null, request_fingerprint text not null, anchor_date date not null, next_generate date not null,
 interval_days integer not null default 14 check(interval_days in (7,14,28)), split_method text not null, participants jsonb not null,
 reminder_days integer not null default 1 check(reminder_days between 1 and 14), active boolean not null default true,
 foreign key(household_id,collector) references public.household_members(household_id,user_id), unique(created_by,request_id)
);
create unique index one_active_rent on public.rent_configurations(household_id) where active;
create unique index rent_occurrence on public.expenses((metadata->>'rent_config'),due_on) where kind='rent';
create table public.cleaning_tasks (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id), created_by uuid not null references auth.users(id),
 title text not null check(length(title) between 1 and 150), description text not null default '', frequency text not null check(frequency in ('daily','weekly','fortnightly','monthly')),
 anchor_date date not null, next_generate date not null, rotation uuid[] not null check(cardinality(rotation)>0), cursor integer not null default 0,
 duration_minutes integer not null default 20 check(duration_minutes between 1 and 1440), active boolean not null default true
);
create table public.cleaning_assignments (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id), task_id uuid not null references public.cleaning_tasks(id),
 assigned_to uuid not null, due_on date not null, completed_at timestamptz, completed_by uuid references auth.users(id), completion_note text not null default '',
 foreign key(household_id,assigned_to) references public.household_members(household_id,user_id), unique(task_id,due_on)
);
create table public.notification_preferences (
 user_id uuid primary key references auth.users(id), email_enabled boolean not null default false, activity_enabled boolean not null default true
);
create table public.notifications (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id), user_id uuid not null references auth.users(id),
 event_key text not null, message text not null, href text not null, essential boolean not null default true,
 created_at timestamptz not null default now(), read_at timestamptz, unique(user_id,event_key)
);
create table public.email_outbox (
 id uuid primary key default gen_random_uuid(), notification_id uuid not null unique references public.notifications(id),
 user_id uuid not null references auth.users(id), status text not null default 'queued' check(status in ('queued','sending','sent','failed','skipped')),
 attempts integer not null default 0, lease_until timestamptz, sent_at timestamptz, created_at timestamptz not null default now()
);
create table public.documents (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id), expense_id uuid references public.expenses(id),
 fuel_price_id uuid references public.fuel_price_records(id), repayment_id uuid references public.repayments(id), assignment_id uuid references public.cleaning_assignments(id),
 uploaded_by uuid not null references auth.users(id), path text not null unique, name text not null, mime text not null, size_bytes integer not null check(size_bytes between 1 and 5242880),
 created_at timestamptz not null default now(), check(num_nonnulls(expense_id,fuel_price_id,repayment_id,assignment_id)=1)
);
create table public.audit_logs (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id), actor uuid references auth.users(id),
 action text not null, record_id uuid, details jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.rate_limits (user_id uuid not null, bucket text not null, window_start timestamptz not null, hits integer not null, primary key(user_id,bucket,window_start));
create index members_user on public.household_members(user_id);
create index expenses_household on public.expenses(household_id,occurred_on desc);
create index participants_user on public.expense_participants(user_id,expense_id);
create index repayments_expense on public.repayments(expense_id,payer,status);
create index notifications_user on public.notifications(user_id,created_at desc);
create index assignments_due on public.cleaning_assignments(household_id,due_on);

create function public.is_member(h uuid, u uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from household_members where household_id=h and user_id=u and left_at is null)
$$;
create function public.is_member(h uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select public.is_member(h,auth.uid())
$$;
create function public.is_admin(h uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from household_members where household_id=h and user_id=auth.uid() and role='admin' and left_at is null)
$$;
create function public.can_read_expense(e uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from expenses x where x.id=e and is_member(x.household_id) and (is_admin(x.household_id) or x.paid_by=auth.uid() or x.created_by=auth.uid() or exists(select 1 from expense_participants p where p.expense_id=e and p.user_id=auth.uid())))
$$;
create function public.can_manage_expense(e uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from expenses where id=e and is_member(household_id) and (is_admin(household_id) or created_by=auth.uid() or paid_by=auth.uid()))
$$;
create function public.can_read_document(p text) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from documents d where d.path=p and is_member(d.household_id) and
 ((d.expense_id is not null and can_read_expense(d.expense_id)) or d.fuel_price_id is not null or d.assignment_id is not null or
 exists(select 1 from repayments r where r.id=d.repayment_id and (r.payer=auth.uid() or r.recipient=auth.uid() or is_admin(r.household_id)))))
$$;
create function public.rate_limit(b text, lim integer) returns void language plpgsql security definer set search_path=public,pg_temp as $$
 declare n integer;
 begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 insert into rate_limits values(auth.uid(),b,date_trunc('hour',now()),1) on conflict(user_id,bucket,window_start) do update set hits=rate_limits.hits+1 returning hits into n;
 if n>lim then raise exception 'Too many requests. Please try again later.'; end if;
 end $$;
create function public.notify(h uuid, u uuid, k text, m text, link text, important boolean default true) returns void language plpgsql security definer set search_path=public,pg_temp as $$
 declare n uuid;
 begin
 if not is_member(h,u) then return; end if;
 if not important and exists(select 1 from notification_preferences where user_id=u and not activity_enabled) then return; end if;
 insert into notifications(household_id,user_id,event_key,message,href,essential) values(h,u,k,m,link,important) on conflict do nothing returning id into n;
 if n is not null and exists(select 1 from notification_preferences where user_id=u and email_enabled) then
 insert into email_outbox(notification_id,user_id) values(n,u) on conflict do nothing;
 end if;
 end $$;

-- Shared allocator runs inside the same transaction as the ledger insert.
create function public.create_entry(h uuid, actor uuid, d jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
 declare e uuid; p jsonb; total integer; paid uuid; n integer; base integer; rem integer; allocated integer:=0; method text; share integer; uid uuid; k text;
 begin
 if not is_member(h,actor) then raise exception 'Household access denied'; end if;
 total:=(d->>'amount_cents')::integer; paid:=(d->>'paid_by')::uuid; method:=coalesce(d->>'split_method','equal'); k:=coalesce(d->>'kind','expense');
 if total is null or total<1 or total>100000000 or not is_member(h,paid) then raise exception 'Invalid amount or payer'; end if;
 if method not in ('equal','amount','percentage') or k not in ('expense','bill','trip','rent') then raise exception 'Invalid entry type'; end if;
 if k='rent' and not exists(select 1 from household_members where household_id=h and user_id=actor and role='admin' and left_at is null) then raise exception 'Administrator required'; end if;
 n:=jsonb_array_length(d->'participants');
 if n is null or n=0 or n>1000 then raise exception 'Select beneficiaries'; end if;
 if (select count(distinct value->>'user_id') from jsonb_array_elements(d->'participants'))<>n then raise exception 'Duplicate beneficiaries'; end if;
 for p in select value from jsonb_array_elements(d->'participants') loop
 if not is_member(h,(p->>'user_id')::uuid) then raise exception 'Beneficiary is not an active member'; end if;
 if method<>'equal' and (coalesce(p->>'value','') !~ '^[0-9]+$' or (p->>'value')::numeric>100000000) then raise exception 'Invalid allocation'; end if;
 end loop;
 if method='amount' and (select sum((value->>'value')::integer) from jsonb_array_elements(d->'participants'))<>total then raise exception 'Shares must equal total'; end if;
 if method='percentage' and (select sum((value->>'value')::integer) from jsonb_array_elements(d->'participants'))<>10000 then raise exception 'Percentages must total 100%%'; end if;
 select id into e from expenses where created_by=actor and request_id=(d->>'request_id')::uuid;
 if e is not null then
 if not exists(select 1 from expenses where id=e and household_id=h and request_fingerprint=encode(sha256(convert_to(d::text,'UTF8')),'hex')) then raise exception 'This submission key was already used for different values. Reload this page to start a new submission.'; end if;
 return e; end if;
 insert into expenses(household_id,created_by,paid_by,request_id,request_fingerprint,kind,description,category,amount_cents,occurred_on,due_on,split_method,notes,metadata)
 values(h,actor,paid,(d->>'request_id')::uuid,encode(sha256(convert_to(d::text,'UTF8')),'hex'),k,d->>'description',coalesce(d->>'category','Other'),total,(d->>'occurred_on')::date,(d->>'due_on')::date,method,coalesce(d->>'notes',''),coalesce(d->'metadata','{}')) returning id into e;
 if method='equal' then rem:=total%n;
 elsif method='percentage' then select total-sum(floor(total::numeric*(value->>'value')::numeric/10000))::integer into rem from jsonb_array_elements(d->'participants');
 else rem:=0; end if;
 -- UUID sort means the same input always awards remainder cents to the same people.
 for p in select value from jsonb_array_elements(d->'participants') order by value->>'user_id' loop
 uid:=(p->>'user_id')::uuid;
 share:=case method when 'equal' then total/n when 'percentage' then floor(total::numeric*(p->>'value')::numeric/10000)::integer else (p->>'value')::integer end;
 if rem>0 then share:=share+1; rem:=rem-1; end if;
 allocated:=allocated+share;
 insert into expense_participants values(e,h,uid,share);
 perform notify(h,uid,'entry:'||e,'New '||k||': '||(d->>'description'),'/app/'||case when k='expense' then 'expenses' when k='trip' then 'vehicles' when k='rent' then 'rent' else 'bills' end);
 end loop;
 if allocated<>total then raise exception 'Allocation mismatch'; end if;
 insert into audit_logs(household_id,actor,action,record_id) values(h,actor,'Created '||k,e);
 return e;
 end $$;

create function public.create_household(d jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
 declare h uuid;
 begin
 perform rate_limit('household',10);
 if not exists(select 1 from pg_timezone_names where name=coalesce(d->>'timezone','Australia/Sydney')) then raise exception 'Unknown timezone'; end if;
 insert into households(name,description,timezone,created_by) values(d->>'name',coalesce(d->>'description',''),coalesce(d->>'timezone','Australia/Sydney'),auth.uid()) returning id into h;
 insert into household_members(household_id,user_id,display_name,role) values(h,auth.uid(),d->>'display_name','admin');
 return h;
 end $$;
create function public.create_invitation(h uuid, email_address text default null) returns text language plpgsql security definer set search_path=public,pg_temp as $$
 declare token text:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
 begin
 if not is_admin(h) then raise exception 'Administrator required'; end if;
 perform rate_limit('invite',30);
 if email_address is not null and (length(email_address)>254 or email_address !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$') then raise exception 'Invalid email'; end if;
 insert into household_invitations(household_id,token_hash,email,created_by) values(h,encode(sha256(convert_to(token,'UTF8')),'hex'),lower(email_address),auth.uid());
 return token;
 end $$;
create function public.accept_invitation(token text, member_name text) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
 declare inv household_invitations; mail text;
 begin
 perform rate_limit('join',30);
 select * into inv from household_invitations where token_hash=encode(sha256(convert_to(token,'UTF8')),'hex') for update;
 if inv.id is null or inv.expires_at<=now() or inv.accepted_at is not null then raise exception 'Invitation is invalid, expired or already used'; end if;
 select lower(email) into mail from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if mail is null or (inv.email is not null and inv.email<>mail) then raise exception 'Use the verified email address on this invitation'; end if;
 if exists(select 1 from household_members where household_id=inv.household_id and user_id=auth.uid()) then raise exception 'Already joined previously. Ask the administrator to restore membership.'; end if;
 insert into household_members(household_id,user_id,display_name,role) values(inv.household_id,auth.uid(),member_name,'member');
 update household_invitations set accepted_at=now(),accepted_by=auth.uid() where id=inv.id;
 insert into audit_logs(household_id,actor,action) values(inv.household_id,auth.uid(),'Joined household');
 return inv.household_id;
 end $$;

create function public.record_entry(h uuid, d jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
 declare v vehicles; f fuel_price_records; distance numeric; efficiency numeric; price numeric; fuel integer; extra integer; meta jsonb;
 begin
 if not is_member(h) then raise exception 'Household access denied'; end if;
 perform rate_limit('entry',150);
 if (d->>'paid_by')::uuid<>auth.uid() and not is_admin(h) then raise exception 'Members may record only their own payments'; end if;
 if coalesce(d->>'kind','expense')='rent' then raise exception 'Use rent configuration'; end if;
 if d->>'kind'='trip' then
 select * into v from vehicles where id=(d->'metadata'->>'vehicle_id')::uuid and household_id=h and active;
 if v.id is null then raise exception 'Vehicle unavailable'; end if;
 distance:=(d->'metadata'->>'distance')::numeric; efficiency:=v.efficiency;
 if d->'metadata'->>'fuel_price_id' is not null then
 select * into f from fuel_price_records where id=(d->'metadata'->>'fuel_price_id')::uuid and household_id=h and (vehicle_id is null or vehicle_id=v.id);
 if f.id is null then raise exception 'Fuel price unavailable'; end if; price:=f.price_per_litre;
 else price:=(d->'metadata'->>'price')::numeric; end if;
 extra:=coalesce((d->'metadata'->>'tolls_cents')::integer,0)+coalesce((d->'metadata'->>'parking_cents')::integer,0);
 if distance is null or distance<=0 or distance>100000 or price is null or price<=0 or price>20 or coalesce((d->'metadata'->>'tolls_cents')::integer,0)<0 or coalesce((d->'metadata'->>'parking_cents')::integer,0)<0 or extra>100000000 then raise exception 'Invalid trip distance, fuel price or extras'; end if;
 if not is_member(h,(d->'metadata'->>'driver')::uuid) then raise exception 'Select an active driver'; end if;
 fuel:=round(distance/efficiency*price*100)::integer;
 meta:=jsonb_build_object('vehicle_id',v.id,'vehicle_name',v.name,'driver',d->'metadata'->>'driver','distance',distance,'efficiency',efficiency,'price',price,'fuel_price_id',f.id,'litres',distance/efficiency,'fuel_cents',fuel,'tolls_cents',coalesce(d->'metadata'->>'tolls_cents','0')::integer,'parking_cents',coalesce(d->'metadata'->>'parking_cents','0')::integer);
 d:=jsonb_set(jsonb_set(d,'{amount_cents}',to_jsonb(fuel+extra)),'{metadata}',meta);
 elsif d->>'kind'='bill' then
 if d->>'due_on' is null or (d->>'due_on')::date<(d->>'occurred_on')::date then raise exception 'Bill due date must follow issue date'; end if;
 if coalesce((d->'metadata'->>'reminder_days')::integer,1) not between 0 and 30 then raise exception 'Invalid reminder days'; end if;
 if (d->'metadata'->>'period_end')::date<(d->'metadata'->>'period_start')::date then raise exception 'Invalid billing period'; end if;
 else d:=jsonb_set(d,'{kind}','"expense"'); d:=jsonb_set(d,'{metadata}','{}'); end if;
 return create_entry(h,auth.uid(),d);
 end $$;
create function public.record_repayment(h uuid, d jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
 declare e expenses; r uuid; share integer; reserved integer; amount integer;
 begin
 if not is_member(h) then raise exception 'Household access denied'; end if;
 perform rate_limit('repayment',100);
 select * into e from expenses where id=(d->>'expense_id')::uuid and household_id=h for update;
 if e.id is null or e.status<>'active' or e.paid_by=auth.uid() then raise exception 'Invalid obligation'; end if;
 select id into r from repayments where payer=auth.uid() and request_id=(d->>'request_id')::uuid;
 if r is not null then return r; end if;
 select amount_cents into share from expense_participants where expense_id=e.id and user_id=auth.uid();
 select coalesce(sum(amount_cents),0) into reserved from repayments where expense_id=e.id and payer=auth.uid() and status in ('pending','confirmed');
 amount:=(d->>'amount_cents')::integer;
 if share is null or amount is null or amount<=0 or amount>share-reserved then raise exception 'Amount exceeds the remaining obligation (including pending repayments)'; end if;
 insert into repayments(household_id,expense_id,payer,recipient,amount_cents,occurred_on,note,request_id)
 values(h,e.id,auth.uid(),e.paid_by,amount,(d->>'occurred_on')::date,coalesce(d->>'note',''),(d->>'request_id')::uuid) returning id into r;
 perform notify(h,e.paid_by,'repayment:'||r,'A repayment is awaiting your confirmation.','/app/balances');
 insert into audit_logs(household_id,actor,action,record_id) values(h,auth.uid(),'Recorded repayment',r);
 return r;
 end $$;
create function public.review_repayment(rid uuid, approve boolean) returns void language plpgsql security definer set search_path=public,pg_temp as $$
 declare r repayments;
 begin
 select * into r from repayments where id=rid for update;
 if r.id is null or not is_member(r.household_id) or r.recipient<>auth.uid() then raise exception 'Only the recipient can review this repayment'; end if;
 if r.status<>'pending' then return; end if;
 update repayments set status=case when approve then 'confirmed' else 'rejected' end,confirmed_at=case when approve then now() end where id=rid;
 perform notify(r.household_id,r.payer,'review:'||rid,'Your repayment was '||case when approve then 'confirmed.' else 'rejected.' end,'/app/balances');
 insert into audit_logs(household_id,actor,action,record_id) values(r.household_id,auth.uid(),case when approve then 'Confirmed repayment' else 'Rejected repayment' end,rid);
 end $$;
create function public.void_entry(eid uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
 declare e expenses;
 begin
 select * into e from expenses where id=eid for update;
 if not can_manage_expense(eid) then raise exception 'Access denied'; end if;
 if exists(select 1 from repayments where expense_id=eid and status in ('pending','confirmed')) then raise exception 'Settled or pending records cannot be voided. Record an agreed adjustment instead.'; end if;
 update expenses set status='void',updated_at=now() where id=eid;
 insert into audit_logs(household_id,actor,action,record_id) values(e.household_id,auth.uid(),'Voided entry',eid);
 end $$;

-- Correct an unsettled expense atomically, retaining the original and its documents.
create function public.replace_entry(eid uuid, d jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
 declare original expenses; replacement uuid;
 begin
 select * into original from expenses where id=eid for update;
 if not can_manage_expense(eid) then raise exception 'Expense access denied'; end if;
 select id into replacement from expenses where created_by=auth.uid() and request_id=(d->>'request_id')::uuid and metadata->>'corrects'=eid::text;
 if replacement is not null then return replacement; end if;
 if exists(select 1 from expenses where created_by=auth.uid() and request_id=(d->>'request_id')::uuid) then raise exception 'Submission key already used. Reload this page to start a new correction.'; end if;
 if original.status<>'active' or original.kind not in ('expense','bill') or d->>'kind'<>original.kind then raise exception 'Only active expenses or bills can be corrected here'; end if;
 if exists(select 1 from repayments where expense_id=eid and status in ('pending','confirmed')) then raise exception 'Pending or settled records require an explicit agreed adjustment'; end if;
 perform void_entry(eid);
 replacement:=record_entry(original.household_id,d);
 update expenses set metadata=metadata||jsonb_build_object('corrects',eid) where id=replacement;
 insert into audit_logs(household_id,actor,action,record_id,details) values(original.household_id,auth.uid(),'Corrected entry',replacement,jsonb_build_object('original',eid));
 return replacement;
 end $$;
create function public.record_adjustment(h uuid, d jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
 declare original expenses; e uuid;
 begin
 if not is_admin(h) then raise exception 'Administrator required'; end if;
 perform rate_limit('entry',150);
 select * into original from expenses where id=(d->>'expense_id')::uuid and household_id=h;
 if original.id is null then raise exception 'Original record unavailable'; end if;
 if (d->>'creditor')::uuid=(d->>'debtor')::uuid then raise exception 'Choose different members'; end if;
 e:=create_entry(h,auth.uid(),jsonb_build_object('request_id',d->>'request_id','kind','expense','description','Agreed adjustment: '||(d->>'reason'),'category','Other','amount_cents',(d->>'amount_cents')::integer,'paid_by',d->>'creditor','occurred_on',d->>'occurred_on','split_method','equal','participants',jsonb_build_array(jsonb_build_object('user_id',d->>'debtor')),'metadata',jsonb_build_object('adjusts',original.id),'notes','An agreed correction, not a claim that money changed hands. Original: '||original.description));
 insert into audit_logs(household_id,actor,action,record_id,details) values(h,auth.uid(),'Recorded agreed adjustment',e,jsonb_build_object('original',original.id));
 return e;
 end $$;

create function public.save_vehicle(h uuid, d jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
 declare vid uuid:=(d->>'id')::uuid;
 begin
 if not is_member(h) then raise exception 'Household access denied'; end if;
 if not is_member(h,(d->>'owner')::uuid) then raise exception 'Invalid vehicle owner'; end if;
 if vid is null then
 if not is_admin(h) then raise exception 'Administrator required'; end if;
 if not is_member(h,(d->>'owner')::uuid) then raise exception 'Invalid owner'; end if;
 insert into vehicles(household_id,owner,name,model,registration,fuel_type,efficiency,tank_litres,notes)
 values(h,(d->>'owner')::uuid,d->>'name',coalesce(d->>'model',''),coalesce(d->>'registration',''),d->>'fuel_type',(d->>'efficiency')::numeric,(d->>'tank_litres')::numeric,coalesce(d->>'notes','')) returning id into vid;
 else
 if not exists(select 1 from vehicles where id=vid and household_id=h and (owner=auth.uid() or is_admin(h))) then raise exception 'Vehicle access denied'; end if;
 if not is_admin(h) and not exists(select 1 from vehicles where id=vid and owner=(d->>'owner')::uuid) then raise exception 'Only an administrator may transfer vehicle ownership'; end if;
 update vehicles set owner=(d->>'owner')::uuid,name=d->>'name',efficiency=(d->>'efficiency')::numeric,tank_litres=(d->>'tank_litres')::numeric,active=coalesce((d->>'active')::boolean,true),fuel_type=d->>'fuel_type',model=coalesce(d->>'model',''),registration=coalesce(d->>'registration',''),notes=coalesce(d->>'notes','') where id=vid;
 end if;
 return vid;
 end $$;
create function public.record_fuel_price(h uuid, d jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
 declare fid uuid;
 begin
 if not is_member(h) then raise exception 'Household access denied'; end if;
 if not exists(select 1 from vehicles where id=(d->>'vehicle_id')::uuid and household_id=h) then raise exception 'Invalid vehicle'; end if;
 insert into fuel_price_records(household_id,vehicle_id,price_per_litre,fuel_type,observed_on,created_by)
 values(h,(d->>'vehicle_id')::uuid,(d->>'price')::numeric,d->>'fuel_type',(d->>'observed_on')::date,auth.uid()) returning id into fid;
 return fid;
 end $$;
create function public.configure_rent(h uuid, d jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
 declare c uuid; trial uuid; old_entry expenses; local_today date;
 begin
 if not is_admin(h) then raise exception 'Administrator required'; end if;
 select id into c from rent_configurations where created_by=auth.uid() and request_id=(d->>'request_id')::uuid and household_id=h;
 if c is not null then
 if not exists(select 1 from rent_configurations where id=c and request_fingerprint=encode(sha256(convert_to(d::text,'UTF8')),'hex')) then raise exception 'Submission key already used with different rent values'; end if;
 return c; end if;
 select (now() at time zone timezone)::date into local_today from households where id=h;
 if (d->>'anchor_date')::date<local_today then raise exception 'The next rent anchor must be today or later'; end if;
 if exists(select 1 from expenses e where e.household_id=h and e.kind='rent' and e.status='active' and e.due_on>=(d->>'anchor_date')::date and exists(select 1 from repayments r where r.expense_id=e.id and r.status in ('pending','confirmed'))) then raise exception 'Choose an anchor after existing pending or settled future rent cycles'; end if;
 -- Validate through the authoritative allocator, then remove the temporary record in this same transaction.
 trial:=create_entry(h,auth.uid(),d||jsonb_build_object('kind','rent','description','Rent configuration validation','occurred_on',d->>'anchor_date','request_id',gen_random_uuid()));
 delete from email_outbox where notification_id in(select id from notifications where event_key='entry:'||trial);
 delete from notifications where event_key='entry:'||trial;
 delete from audit_logs where record_id=trial;
 delete from expense_participants where expense_id=trial;
 delete from expenses where id=trial;
 for old_entry in select * from expenses where household_id=h and kind='rent' and status='active' and due_on>=(d->>'anchor_date')::date for update loop
 if exists(select 1 from repayments where expense_id=old_entry.id and status in ('pending','confirmed')) then raise exception 'Future rent now has a pending or confirmed payment. Choose a later anchor.'; end if;
 update expenses set status='void',updated_at=now() where id=old_entry.id;
 insert into audit_logs(household_id,actor,action,record_id) values(h,auth.uid(),'Superseded future unpaid rent',old_entry.id);
 end loop;
 update rent_configurations set active=false where household_id=h and active;
 insert into rent_configurations(household_id,created_by,amount_cents,collector,request_id,request_fingerprint,anchor_date,next_generate,interval_days,split_method,participants,reminder_days)
 values(h,auth.uid(),(d->>'amount_cents')::integer,(d->>'paid_by')::uuid,(d->>'request_id')::uuid,encode(sha256(convert_to(d::text,'UTF8')),'hex'),(d->>'anchor_date')::date,(d->>'anchor_date')::date,coalesce((d->>'interval_days')::integer,14),d->>'split_method',d->'participants',coalesce((d->>'reminder_days')::integer,1)) returning id into c;
 insert into audit_logs(household_id,actor,action,record_id) values(h,auth.uid(),'Configured rent',c);
 return c;
 end $$;
create function public.save_cleaning_task(h uuid, d jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
 declare tid uuid:=(d->>'id')::uuid; people uuid[];
 begin
 if not is_admin(h) then raise exception 'Administrator required'; end if;
 select array_agg(value::uuid order by ord) into people from jsonb_array_elements_text(d->'rotation') with ordinality a(value,ord);
 if coalesce(cardinality(people),0)=0 or cardinality(people)<>(select count(distinct x) from unnest(people) x) or exists(select 1 from unnest(people) x where not is_member(h,x)) then raise exception 'Choose eligible members once each'; end if;
 if tid is null then
 insert into cleaning_tasks(household_id,created_by,title,description,frequency,anchor_date,next_generate,rotation,duration_minutes)
 values(h,auth.uid(),d->>'title',coalesce(d->>'description',''),d->>'frequency',(d->>'anchor_date')::date,(d->>'anchor_date')::date,people,coalesce((d->>'duration_minutes')::integer,20)) returning id into tid;
 else
 update cleaning_tasks set title=d->>'title',rotation=people,active=coalesce((d->>'active')::boolean,true) where id=tid and household_id=h;
 if not found then raise exception 'Task unavailable'; end if;
 end if;
 return tid;
 end $$;
create function public.update_assignment(aid uuid, d jsonb) returns void language plpgsql security definer set search_path=public,pg_temp as $$
 declare a cleaning_assignments;
 begin
 select * into a from cleaning_assignments where id=aid for update;
 if a.id is null or not is_member(a.household_id) then raise exception 'Task unavailable'; end if;
 if a.completed_at is not null then raise exception 'Completed history is immutable'; end if;
 if d->>'assigned_to' is not null then
 if not is_admin(a.household_id) or not is_member(a.household_id,(d->>'assigned_to')::uuid) then raise exception 'Administrator and eligible member required'; end if;
 update cleaning_assignments set assigned_to=(d->>'assigned_to')::uuid where id=aid;
 perform notify(a.household_id,(d->>'assigned_to')::uuid,'reassign:'||aid||':'||(d->>'assigned_to'),'A cleaning task was assigned to you.','/app/cleaning');
 else
 if a.assigned_to<>auth.uid() and not is_admin(a.household_id) then raise exception 'Only the assignee or administrator may complete this task'; end if;
 update cleaning_assignments set completed_at=now(),completed_by=auth.uid(),completion_note=left(coalesce(d->>'note',''),2000) where id=aid;
 perform notify(a.household_id,m.user_id,'clean-complete:'||aid,'A cleaning task was completed.','/app/cleaning',false) from household_members m where m.household_id=a.household_id and m.left_at is null;
 end if;
 insert into audit_logs(household_id,actor,action,record_id) values(a.household_id,auth.uid(),'Updated cleaning assignment',aid);
 end $$;
create function public.manage_household(h uuid, d jsonb) returns void language plpgsql security definer set search_path=public,pg_temp as $$
 declare target uuid:=(d->>'user_id')::uuid; old household_members;
 begin
 if not is_member(h) then raise exception 'Access denied'; end if;
 -- Serialise all membership/settings operations, including concurrent admin departures.
 perform 1 from households where id=h for update;
 if d->>'action'='settings' then
 if not is_admin(h) then raise exception 'Administrator required'; end if;
 if not exists(select 1 from pg_timezone_names where name=d->>'timezone') then raise exception 'Invalid timezone'; end if;
 update households set name=d->>'name',description=left(coalesce(d->>'description',''),2000),timezone=d->>'timezone' where id=h;
 elsif d->>'action'='external_paid' then
 if not is_admin(h) then raise exception 'Administrator required'; end if;
 update expenses set external_paid=(d->>'paid')::boolean where id=(d->>'expense_id')::uuid and household_id=h and kind in ('bill','rent');
 else
 if target<>auth.uid() and not is_admin(h) then raise exception 'Administrator required'; end if;
 if d->>'action' not in ('leave','role') or (d->>'action'='role' and not is_admin(h)) then raise exception 'Access denied'; end if;
 select * into old from household_members where household_id=h and user_id=target for update;
 if old.user_id is null then raise exception 'Member unavailable'; end if;
 if old.role='admin' and (d->>'action'='leave' or d->>'role'<>'admin') and (select count(*) from household_members where household_id=h and role='admin' and left_at is null)<=1 then raise exception 'Assign another administrator before removing the last administrator'; end if;
 if d->>'action'='leave' then
 update household_members set left_at=now() where household_id=h and user_id=target;
 -- Pause future obligations until an administrator agrees new contributions; history remains.
 update rent_configurations set active=false where household_id=h and active;
 update cleaning_tasks set rotation=array_remove(rotation,target) where household_id=h and target=any(rotation) and cardinality(rotation)>1;
 update cleaning_tasks set active=false where household_id=h and target=any(rotation);
 else
 if d->>'role' not in ('admin','member') then raise exception 'Invalid role'; end if;
 update household_members set role=d->>'role' where household_id=h and user_id=target;
 if d->>'role'='member' then update rent_configurations set active=false where household_id=h and created_by=target and active; end if;
 end if;
 end if;
 insert into audit_logs(household_id,actor,action,record_id,details) values(h,auth.uid(),coalesce(d->>'action','Household update'),target,d);
 end $$;
create function public.set_preferences(email_on boolean, activity_on boolean) returns void language plpgsql security definer set search_path=public,pg_temp as $$
 begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 insert into notification_preferences values(auth.uid(),email_on,activity_on) on conflict(user_id) do update set email_enabled=email_on,activity_enabled=activity_on;
 end $$;
create function public.mark_notifications_read() returns void language sql security definer set search_path=public,pg_temp as $$
 update notifications set read_at=now() where user_id=auth.uid() and read_at is null
$$;

-- Called by an authenticated member (their household only) and by the scheduler.
create function public.generate_schedule(h uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
 declare today date; c rent_configurations; t cleaning_tasks; e expenses; a cleaning_assignments; p expense_participants; i integer; due date; who uuid; anchor_day integer;
 begin
 if auth.uid() is not null and not is_member(h) then raise exception 'Access denied'; end if;
 select (now() at time zone timezone)::date into today from households where id=h;
 for c in select * from rent_configurations where household_id=h and active for update loop
 i:=0;
 while c.next_generate<=today+14 and i<100 loop
 if not exists(select 1 from expenses where kind='rent' and metadata->>'rent_config'=c.id::text and due_on=c.next_generate) then
 perform create_entry(h,c.created_by,jsonb_build_object('request_id',gen_random_uuid(),'kind','rent','description','Rent contribution','category','Rent','amount_cents',c.amount_cents,'paid_by',c.collector,'occurred_on',c.next_generate,'due_on',c.next_generate,'split_method',c.split_method,'participants',c.participants,'metadata',jsonb_build_object('rent_config',c.id,'reminder_days',c.reminder_days)));
 end if;
 c.next_generate:=c.next_generate+c.interval_days; i:=i+1;
 end loop;
 update rent_configurations set next_generate=c.next_generate where id=c.id;
 end loop;
 for t in select * from cleaning_tasks where household_id=h and active for update loop
 i:=0;
 while t.next_generate<=today+14 and i<100 loop
 who:=t.rotation[(t.cursor%cardinality(t.rotation))+1];
 if is_member(h,who) then
 insert into cleaning_assignments(household_id,task_id,assigned_to,due_on) values(h,t.id,who,t.next_generate) on conflict do nothing;
 end if;
 t.cursor:=t.cursor+1;
 if t.frequency='monthly' then
 -- Anchor the day in each month; 31 January -> 28 February -> 31 March.
 due:=(date_trunc('month',t.next_generate)+interval '1 month')::date;
 anchor_day:=extract(day from t.anchor_date)::integer;
 t.next_generate:=due+least(anchor_day-1,extract(day from (due+interval '1 month -1 day'))::integer-1);
 else t.next_generate:=t.next_generate+case t.frequency when 'daily' then 1 when 'weekly' then 7 else 14 end; end if;
 i:=i+1;
 end loop;
 update cleaning_tasks set next_generate=t.next_generate,cursor=t.cursor where id=t.id;
 end loop;
 for e in select * from expenses where household_id=h and kind in ('rent','bill') and status='active' and due_on<=today+coalesce((metadata->>'reminder_days')::integer,1) loop
 for p in select ep.* from expense_participants ep where ep.expense_id=e.id and ((ep.user_id=e.paid_by and not e.external_paid) or (ep.user_id<>e.paid_by and ep.amount_cents>(select coalesce(sum(r.amount_cents),0) from repayments r where r.expense_id=e.id and r.payer=ep.user_id and r.status='confirmed'))) loop
 if today=e.due_on-coalesce((e.metadata->>'reminder_days')::integer,1) or today=e.due_on or today=e.due_on+1 then
 perform notify(h,p.user_id,'due:'||e.id||':'||today,e.description||case when today<e.due_on then ' is approaching.' when today=e.due_on then ' is due today.' else ' is overdue.' end,'/app/'||case e.kind when 'rent' then 'rent' else 'bills' end);
 end if;
 end loop;
 if not e.external_paid and not exists(select 1 from expense_participants where expense_id=e.id and user_id=e.paid_by) and (today=e.due_on-coalesce((e.metadata->>'reminder_days')::integer,1) or today=e.due_on or today=e.due_on+1) then
 perform notify(h,e.paid_by,'due:'||e.id||':'||today,'Provider / landlord payment: '||e.description||' is due '||e.due_on::text,'/app/'||case e.kind when 'rent' then 'rent' else 'bills' end);
 end if;
 end loop;
 for a in select * from cleaning_assignments where household_id=h and completed_at is null and due_on between today-1 and today+1 loop
 perform notify(h,a.assigned_to,'chore:'||a.id||':'||today,'Cleaning: '||(select title from cleaning_tasks where id=a.task_id)||case when a.due_on<today then ' is overdue.' when a.due_on=today then ' is due today.' else ' is due tomorrow.' end,'/app/cleaning');
 end loop;
 end $$;
create function public.process_schedules() returns integer language plpgsql security definer set search_path=public,pg_temp as $$
 declare h households; n integer:=0;
 begin
 for h in select * from households loop
 perform generate_schedule(h.id); n:=n+1;
 end loop;
 delete from rate_limits where window_start<now()-interval '2 days';
 return n;
 end $$;
create function public.claim_emails() returns table(id uuid, notification_id uuid, user_id uuid) language sql security definer set search_path=public,pg_temp as $$
 update email_outbox set status='sending',attempts=attempts+1,lease_until=now()+interval '10 minutes'
 where email_outbox.id in (select o.id from email_outbox o where (status in ('queued','failed') or (status='sending' and lease_until<now())) and attempts<5 and created_at>now()-interval '23 hours' order by created_at for update skip locked limit 8)
 returning email_outbox.id,email_outbox.notification_id,email_outbox.user_id
$$;
create function public.register_document(h uuid, d jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
 declare doc uuid:=gen_random_uuid(); permitted boolean:=false;
 begin
 if not is_member(h) then raise exception 'Access denied'; end if;
 if d->>'mime' not in ('application/pdf','image/jpeg','image/png','image/webp') or (d->>'size_bytes')::integer not between 1 and 5242880 then raise exception 'Use a PDF or image under 5 MB'; end if;
 if d->>'expense_id' is not null then permitted:=exists(select 1 from expenses where id=(d->>'expense_id')::uuid and household_id=h and can_manage_expense(id));
 elsif d->>'fuel_price_id' is not null then permitted:=exists(select 1 from fuel_price_records where id=(d->>'fuel_price_id')::uuid and household_id=h and (created_by=auth.uid() or is_admin(h)));
 elsif d->>'repayment_id' is not null then permitted:=exists(select 1 from repayments where id=(d->>'repayment_id')::uuid and household_id=h and payer=auth.uid());
 elsif d->>'assignment_id' is not null then permitted:=exists(select 1 from cleaning_assignments where id=(d->>'assignment_id')::uuid and household_id=h and (assigned_to=auth.uid() or is_admin(h))); end if;
 if not permitted then raise exception 'Document access denied'; end if;
 perform rate_limit('upload',50);
 insert into documents(id,household_id,expense_id,fuel_price_id,repayment_id,assignment_id,uploaded_by,path,name,mime,size_bytes)
 values(doc,h,(d->>'expense_id')::uuid,(d->>'fuel_price_id')::uuid,(d->>'repayment_id')::uuid,(d->>'assignment_id')::uuid,auth.uid(),h::text||'/'||doc::text,left(d->>'name',200),d->>'mime',(d->>'size_bytes')::integer);
 return doc;
 end $$;

-- Read policies: active membership is required even for historic records after departure.
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invitations enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_participants enable row level security;
alter table public.repayments enable row level security;
alter table public.vehicles enable row level security;
alter table public.fuel_price_records enable row level security;
alter table public.rent_configurations enable row level security;
alter table public.cleaning_tasks enable row level security;
alter table public.cleaning_assignments enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;
alter table public.email_outbox enable row level security;
alter table public.documents enable row level security;
alter table public.audit_logs enable row level security;
alter table public.rate_limits enable row level security;
create policy household_read on public.households for select to authenticated using(is_member(id));
create policy members_read on public.household_members for select to authenticated using(is_member(household_id));
create policy invites_read on public.household_invitations for select to authenticated using(is_admin(household_id));
create policy expense_read on public.expenses for select to authenticated using(can_read_expense(id));
create policy shares_read on public.expense_participants for select to authenticated using(can_read_expense(expense_id));
create policy repayments_read on public.repayments for select to authenticated using(is_member(household_id) and (payer=auth.uid() or recipient=auth.uid() or is_admin(household_id)));
create policy vehicles_read on public.vehicles for select to authenticated using(is_member(household_id));
create policy fuel_read on public.fuel_price_records for select to authenticated using(is_member(household_id));
create policy rent_read on public.rent_configurations for select to authenticated using(is_member(household_id));
create policy tasks_read on public.cleaning_tasks for select to authenticated using(is_member(household_id));
create policy assignments_read on public.cleaning_assignments for select to authenticated using(is_member(household_id));
create policy preferences_read on public.notification_preferences for select to authenticated using(user_id=auth.uid());
create policy notifications_read on public.notifications for select to authenticated using(user_id=auth.uid() and is_member(household_id));
create policy documents_read on public.documents for select to authenticated using(can_read_document(path));
create policy audit_read on public.audit_logs for select to authenticated using(is_admin(household_id));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('household-documents','household-documents',false,5242880,array['application/pdf','image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy private_document_read on storage.objects for select to authenticated using(bucket_id='household-documents' and public.can_read_document(name));
create policy private_document_insert on storage.objects for insert to authenticated with check(bucket_id='household-documents' and exists(select 1 from public.documents d where d.path=storage.objects.name and d.uploaded_by=auth.uid() and public.can_read_document(d.path)));

-- A STABLE, security-invoker RPC uses one statement snapshot and each table's RLS.
-- Returning one JSON value avoids PostgREST's row cap truncating ledger allocations.
create function public.household_snapshot(h uuid) returns jsonb language plpgsql stable security invoker set search_path=public,pg_temp as $$
 begin
 if not is_member(h) then raise exception 'Household access denied'; end if;
 if (select count(*) from expenses where household_id=h)>10000 or (select count(*) from expense_participants where household_id=h)>100000 then raise exception 'This household needs paginated reporting before more records can be displayed. No partial balances are shown.'; end if;
 return jsonb_build_object(
 'members',(select coalesce(jsonb_agg(to_jsonb(m) order by joined_at,user_id),'[]') from household_members m where household_id=h),
 'expenses',(select coalesce(jsonb_agg(to_jsonb(e) order by occurred_on desc,created_at desc),'[]') from expenses e where household_id=h),
 'shares',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from expense_participants p where household_id=h),
 'repayments',(select coalesce(jsonb_agg(to_jsonb(r) order by created_at desc),'[]') from repayments r where household_id=h),
 'vehicles',(select coalesce(jsonb_agg(to_jsonb(v) order by created_at),'[]') from vehicles v where household_id=h),
 'fuel',(select coalesce(jsonb_agg(to_jsonb(f) order by observed_on desc),'[]') from fuel_price_records f where household_id=h),
 'tasks',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from cleaning_tasks t where household_id=h),
 'assignments',(select coalesce(jsonb_agg(to_jsonb(a) order by due_on),'[]') from cleaning_assignments a where household_id=h),
 'notifications',(select coalesce(jsonb_agg(to_jsonb(n) order by created_at desc),'[]') from (select * from notifications where household_id=h order by created_at desc limit 100) n),
 'rent',(select coalesce(jsonb_agg(to_jsonb(c)),'[]') from rent_configurations c where household_id=h),
 'documents',(select coalesce(jsonb_agg(to_jsonb(d)),'[]') from documents d where household_id=h),
 'audit',(select coalesce(jsonb_agg(to_jsonb(l) order by created_at desc),'[]') from (select * from audit_logs where household_id=h order by created_at desc limit 30) l),
 'preferences',(select to_jsonb(p) from notification_preferences p where user_id=auth.uid())
 );
 end $$;

-- Supabase defaults can otherwise leave newly created functions executable by anon.
revoke create on schema public from public,anon,authenticated;
revoke all on all tables in schema public from anon,authenticated;
grant select on public.households,public.household_members,public.household_invitations,public.expenses,public.expense_participants,public.repayments,public.vehicles,public.fuel_price_records,public.rent_configurations,public.cleaning_tasks,public.cleaning_assignments,public.notification_preferences,public.notifications,public.documents,public.audit_logs to authenticated;
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.is_member(uuid),public.is_admin(uuid),public.can_read_expense(uuid),public.can_manage_expense(uuid),public.can_read_document(text) to authenticated;
grant execute on function public.create_household(jsonb),public.create_invitation(uuid,text),public.accept_invitation(text,text),public.record_entry(uuid,jsonb),public.replace_entry(uuid,jsonb),public.record_adjustment(uuid,jsonb),public.record_repayment(uuid,jsonb),public.review_repayment(uuid,boolean),public.void_entry(uuid),public.save_vehicle(uuid,jsonb),public.record_fuel_price(uuid,jsonb),public.configure_rent(uuid,jsonb),public.save_cleaning_task(uuid,jsonb),public.update_assignment(uuid,jsonb),public.manage_household(uuid,jsonb),public.set_preferences(boolean,boolean),public.mark_notifications_read(),public.generate_schedule(uuid),public.register_document(uuid,jsonb),public.household_snapshot(uuid) to authenticated;
grant all on all tables in schema public to service_role;
grant execute on function public.process_schedules(),public.claim_emails() to service_role;
