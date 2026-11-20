-- Zimbabwe holidays: refresh once a year on 1 January (was the 1st of every month),
-- and start Munhumutapa Day in 2026 — it was created by Statutory Instrument 148 of
-- 2026 (gazetted September 2026), not in 2025.
--
-- The Government of Zimbabwe publishes no machine-readable holiday calendar. The
-- official sources are the Public Holidays and Prohibition of Business Act and
-- Statutory Instruments in the Government Gazette, so public.zw_public_holidays()
-- calculates the dates from those rules. A newly gazetted holiday needs a new
-- migration like this one; one-off days can be added by hand in Organization → Holidays.

-- Munhumutapa Day from 2026.
do $$
declare
  def text;
begin
  def := pg_get_functiondef('public.zw_public_holidays(int)'::regprocedure);
  if position('if p_year >= 2025 then' in def) > 0 then
    execute replace(def, 'if p_year >= 2025 then', 'if p_year >= 2026 then');
  end if;
end $$;

-- Once a year: 31 Dec 22:05 UTC = 1 Jan 00:05 Harare. It writes the new year and the
-- year after, so next year's calendar is ready a year ahead.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'sync-zw-holidays') then
    perform cron.unschedule('sync-zw-holidays');
  end if;
end $$;
select cron.schedule('sync-zw-holidays', '5 22 31 12 *', $$select public.sync_zw_holidays();$$);
