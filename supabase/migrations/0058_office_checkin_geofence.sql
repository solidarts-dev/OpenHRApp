-- Office check-ins must be made at the office.
--
-- The app already blocks an Office check-in when the phone is outside an office
-- radius (Organization → Placement → office locations in app_config). This guard
-- enforces the same rule in the database, so a modified app or a direct API call
-- can't record an Office check-in from somewhere else.
--
-- Rules:
--   * Only new rows with duty_type 'OFFICE' and a check-in time are checked.
--     Factory duty (work at a client's site), absences written by cron jobs and
--     check-outs (updates) are not affected.
--   * Admins, HR and Super Admins are not limited, so they can enter or correct
--     attendance by hand. Server jobs (no signed-in user) are not limited either.
--   * Nothing is enforced if the organization has no office locations configured.
--   * Inside means within the office radius + 100 m. The app adds an allowance of
--     up to 100 m for GPS accuracy, so the two checks agree.

create or replace function public.enforce_office_checkin_geofence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  cfg jsonb;
  office jsonb;
  dist double precision;
  best_dist double precision;
  best_name text;
  best_radius double precision;
  r double precision;
begin
  if coalesce(upper(new.duty_type), '') <> 'OFFICE' or new.check_in is null then
    return new;
  end if;

  if auth.uid() is null then
    return new;                                   -- server-side jobs
  end if;
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role in ('ADMIN', 'HR', 'SUPER_ADMIN') then
    return new;
  end if;

  select case when s.value is null or btrim(s.value) = '' then null else s.value::jsonb end
    into cfg
    from public.settings s
   where s.organization_id = new.organization_id and s.key = 'app_config';

  if cfg is null or jsonb_typeof(cfg->'officeLocations') <> 'array'
     or jsonb_array_length(cfg->'officeLocations') = 0 then
    return new;                                   -- no offices configured
  end if;

  if new.latitude is null or new.longitude is null
     or (new.latitude = 0 and new.longitude = 0) then
    raise exception 'CHECKIN_OUTSIDE_OFFICE: Office check-in needs your location. Turn on location for this app and try again.'
      using errcode = 'P0001';
  end if;

  for office in select * from jsonb_array_elements(cfg->'officeLocations') loop
    if (office->>'lat') is null or (office->>'lng') is null then continue; end if;
    r := coalesce(nullif(office->>'radius', '')::double precision, 100);
    -- Haversine distance in metres.
    dist := 2 * 6371000 * asin(least(1, sqrt(
              power(sin(radians((office->>'lat')::double precision - new.latitude) / 2), 2)
            + cos(radians(new.latitude)) * cos(radians((office->>'lat')::double precision))
            * power(sin(radians((office->>'lng')::double precision - new.longitude) / 2), 2))));
    if dist <= r + 100 then
      return new;                                 -- inside this office
    end if;
    if best_dist is null or dist < best_dist then
      best_dist := dist; best_name := office->>'name'; best_radius := r;
    end if;
  end loop;

  if best_dist is null then
    return new;                                   -- no usable office coordinates
  end if;

  raise exception 'CHECKIN_OUTSIDE_OFFICE: You''re about % from %. Office check-in only works within % m.',
    case when best_dist >= 1000 then round((best_dist / 1000)::numeric, 1)::text || ' km'
         else round(best_dist)::text || ' m' end,
    coalesce(best_name, 'the office'),
    round(best_radius)
    using errcode = 'P0001';
end;
$$;

drop trigger if exists trg_enforce_office_checkin_geofence on public.attendance;
create trigger trg_enforce_office_checkin_geofence
  before insert on public.attendance
  for each row execute function public.enforce_office_checkin_geofence();
