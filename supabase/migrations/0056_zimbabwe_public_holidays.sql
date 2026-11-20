-- Zimbabwe public holidays, calculated every year and saved to each Zimbabwean
-- organization's holiday calendar (settings key 'holidays', read by the app,
-- the dashboard and cron-auto-absent).
--
-- Source: Public Holidays and Prohibition of Business Act [Chapter 10:21], Schedule,
-- plus Robert Gabriel Mugabe National Youth Day (21 Feb, from 2018) and
-- Munhumutapa Day (15 Sep, from 2025).
-- Sunday rule, s.2(1)(i): "when a public holiday falls on a Sunday, the Monday
-- following shall be a public holiday". If that Monday is already a holiday
-- (Christmas on a Sunday → Boxing Day Monday), the next free day is used.
--
-- Holidays the Government declares ad hoc (e.g. election days) cannot be
-- calculated: add them by hand in Organization → Holidays. The sync keeps them.
--
-- Replaces the earlier sync_zimbabwe_holidays_from_api(), which fetched data with
-- pg_net but never wrote it anywhere the app reads, and never ran.

create or replace function public.zw_public_holidays(p_year int)
returns table (holiday_date date, holiday_name text)
language plpgsql
immutable
set search_path = public
as $$
declare
  a int; b int; c int; d int; e int; f int; g int; h int; i int; k int; l int; m int;
  easter date;
  aug1 date;
  heroes date;
  base_dates date[] := '{}';
  base_names text[] := '{}';
  all_dates date[];
  idx int;
  cand date;
begin
  -- Western Easter Sunday (anonymous Gregorian algorithm).
  a := p_year % 19; b := p_year / 100; c := p_year % 100; d := b / 4; e := b % 4;
  f := (b + 8) / 25; g := (b - f + 1) / 3; h := (19 * a + b - d - g + 15) % 30;
  i := c / 4; k := c % 4; l := (32 + 2 * e + 2 * i - h - k) % 7; m := (a + 11 * h + 22 * l) / 451;
  easter := make_date(p_year, (h + l - 7 * m + 114) / 31, ((h + l - 7 * m + 114) % 31) + 1);

  -- Heroes' Day: second Monday of August. Defence Forces Day: the day after.
  aug1 := make_date(p_year, 8, 1);
  heroes := aug1 + ((8 - extract(isodow from aug1)::int) % 7) + 7;

  base_dates := array[make_date(p_year, 1, 1)];                       base_names := array['New Year''s Day'];
  if p_year >= 2018 then
    base_dates := base_dates || make_date(p_year, 2, 21);             base_names := base_names || 'Robert Gabriel Mugabe National Youth Day'::text;
  end if;
  base_dates := base_dates || (easter - 2);                           base_names := base_names || 'Good Friday'::text;
  base_dates := base_dates || (easter - 1);                           base_names := base_names || 'Holy Saturday'::text;
  base_dates := base_dates || (easter + 1);                           base_names := base_names || 'Easter Monday'::text;
  base_dates := base_dates || make_date(p_year, 4, 18);               base_names := base_names || 'Independence Day'::text;
  base_dates := base_dates || make_date(p_year, 5, 1);                base_names := base_names || 'Workers'' Day'::text;
  base_dates := base_dates || make_date(p_year, 5, 25);               base_names := base_names || 'Africa Day'::text;
  base_dates := base_dates || heroes;                                 base_names := base_names || 'Heroes'' Day'::text;
  base_dates := base_dates || (heroes + 1);                           base_names := base_names || 'Defence Forces Day'::text;
  if p_year >= 2025 then
    base_dates := base_dates || make_date(p_year, 9, 15);             base_names := base_names || 'Munhumutapa Day'::text;
  end if;
  base_dates := base_dates || make_date(p_year, 12, 22);              base_names := base_names || 'National Unity Day'::text;
  base_dates := base_dates || make_date(p_year, 12, 25);              base_names := base_names || 'Christmas Day'::text;
  base_dates := base_dates || make_date(p_year, 12, 26);              base_names := base_names || 'Boxing Day'::text;

  all_dates := base_dates;
  for idx in 1 .. array_length(base_dates, 1) loop
    holiday_date := base_dates[idx];
    holiday_name := base_names[idx];
    return next;

    if extract(isodow from base_dates[idx]) = 7 then
      cand := base_dates[idx] + 1;
      while cand = any(all_dates) loop
        cand := cand + 1;
      end loop;
      all_dates := all_dates || cand;
      holiday_date := cand;
      holiday_name := 'Public Holiday (' || base_names[idx] || ' observed)';
      return next;
    end if;
  end loop;
end;
$$;

-- Writes this year's and next year's holidays into every Zimbabwean organization's
-- calendar. Automatic entries have ids starting with 'zw-'; they are replaced for
-- the synced years. Manually added holidays and past years are left untouched.
create or replace function public.sync_zw_holidays()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  y0 int := extract(year from (now() at time zone 'Africa/Harare'))::int;
  org record;
  current_list jsonb;
  kept jsonb;
  generated jsonb;
  n int := 0;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', 'zw-' || to_char(holiday_date, 'YYYY-MM-DD'),
           'date', to_char(holiday_date, 'YYYY-MM-DD'),
           'name', holiday_name,
           'isGovernment', true,
           'type', 'NATIONAL') order by holiday_date), '[]'::jsonb)
    into generated
    from (select * from public.zw_public_holidays(y0)
          union all
          select * from public.zw_public_holidays(y0 + 1)) h;

  for org in select id from public.organizations where upper(coalesce(country, '')) = 'ZW' loop
    select case when s.value is null or btrim(s.value) = '' then '[]'::jsonb
                else s.value::jsonb end
      into current_list
      from public.settings s
     where s.organization_id = org.id and s.key = 'holidays';
    if current_list is null or jsonb_typeof(current_list) <> 'array' then
      current_list := '[]'::jsonb;
    end if;

    -- Keep manual holidays, and automatic ones from years outside the sync window.
    select coalesce(jsonb_agg(x), '[]'::jsonb)
      into kept
      from jsonb_array_elements(current_list) x
     where not (coalesce(x->>'id', '') like 'zw-%'
                and left(coalesce(x->>'date', ''), 4) in (y0::text, (y0 + 1)::text))
       -- don't duplicate a manual entry on a date the sync now covers
       and not (coalesce(x->>'id', '') not like 'zw-%'
                and exists (select 1 from jsonb_array_elements(generated) gx
                             where gx->>'date' = x->>'date' and lower(gx->>'name') = lower(x->>'name')));

    insert into public.settings (organization_id, key, value, updated)
    values (org.id, 'holidays', (kept || generated)::text, now())
    on conflict (organization_id, key)
    do update set value = excluded.value, updated = now();

    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function public.sync_zw_holidays() from public, anon, authenticated;

-- Replace the old, broken job and function.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'sync-zimbabwe-holidays-annually') then
    perform cron.unschedule('sync-zimbabwe-holidays-annually');
  end if;
  if exists (select 1 from cron.job where jobname = 'sync-zw-holidays') then
    perform cron.unschedule('sync-zw-holidays');
  end if;
end $$;
drop function if exists public.sync_zimbabwe_holidays_from_api();

-- Runs at 02:05 Harare time on the 1st of every month. Each run writes this year
-- and next year, so next year's calendar is in place all year and is refreshed on
-- 1 January. Re-running is harmless.
select cron.schedule('sync-zw-holidays', '5 0 1 * *', $$select public.sync_zw_holidays();$$);

-- Fill the calendar now.
select public.sync_zw_holidays();
