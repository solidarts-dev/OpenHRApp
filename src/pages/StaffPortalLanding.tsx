import React, { useEffect, useState } from 'react';
import { LogIn, MapPin, CalendarCheck, Bell, Smartphone, Phone, Mail, Download, CheckCircle2, Share } from 'lucide-react';
import { BRAND } from '../config/brand';

interface Props {
  onLoginClick: () => void;
}

const features = [
  { icon: MapPin, title: 'Check in from your phone', text: 'Open the portal at work, allow location and tap Check In.' },
  { icon: CalendarCheck, title: 'Apply for leave', text: 'Request leave and follow its approval in one place.' },
  { icon: Bell, title: 'Stay informed', text: 'Company announcements and notifications as they happen.' },
];

type InstallState = 'prompt' | 'ios' | 'installed' | 'manual';

/**
 * Install support. index.html stores Chrome/Edge/Android's beforeinstallprompt event
 * on window.deferredPWAPrompt and fires 'pwa-install-available' / 'pwa-installed'.
 * iPhone/iPad Safari has no install prompt, so we show the Share → Add to Home Screen steps.
 */
function useInstall() {
  const getState = (): InstallState => {
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    if (standalone) return 'installed';
    if ((window as any).deferredPWAPrompt) return 'prompt';
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document);
    return ios ? 'ios' : 'manual';
  };
  const [state, setState] = useState<InstallState>(getState);
  useEffect(() => {
    const refresh = () => setState(getState());
    window.addEventListener('pwa-install-available', refresh);
    window.addEventListener('pwa-installed', refresh);
    return () => {
      window.removeEventListener('pwa-install-available', refresh);
      window.removeEventListener('pwa-installed', refresh);
    };
  }, []);
  const install = async () => {
    const evt = (window as any).deferredPWAPrompt;
    if (!evt) return false;
    evt.prompt();
    try {
      const choice = await evt.userChoice;
      if (choice?.outcome === 'accepted') {
        (window as any).deferredPWAPrompt = null;
        setState('installed');
      }
    } catch { /* ignore */ }
    return true;
  };
  return { state, install };
}

/** Branded landing page for Solid Arts staff. Replaces the OpenHRApp marketing site. */
const StaffPortalLanding: React.FC<Props> = ({ onLoginClick }) => {
  const { colors } = BRAND;
  const { state: installState, install } = useInstall();
  const [showSteps, setShowSteps] = useState(false);
  const onInstall = async () => {
    if (installState === 'prompt' && (await install())) return;
    setShowSteps(true);
    document.getElementById('install')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-800" style={{ fontFamily: "'Libre Franklin', Inter, system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{ backgroundColor: colors.crimson }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
          <a href={BRAND.website} target="_blank" rel="noopener noreferrer" className="flex items-center min-w-0">
            <img src={BRAND.logoWhite} alt={BRAND.companyName} className="h-9 sm:h-11 w-auto object-contain" />
          </a>
          <button
            onClick={onLoginClick}
            className="shrink-0 inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-md bg-white font-semibold text-sm hover:bg-slate-100 transition-colors"
            style={{ color: colors.crimson }}
          >
            <LogIn size={16} /> Log in
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ backgroundColor: colors.navy }}>
        <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 80% 20%, ${colors.crimson} 0, transparent 55%)` }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] mb-4" style={{ color: colors.gold }}>
            {BRAND.companyName}
          </p>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white leading-tight">
            {BRAND.portalTitle}
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-xl mx-auto">
            Attendance, leave and team updates for the Solid Arts team, all from your phone.
          </p>
          <button
            onClick={onLoginClick}
            className="mt-9 inline-flex items-center gap-2 px-8 py-3.5 rounded-md text-white font-semibold text-base shadow-lg transition-colors"
            style={{ backgroundColor: colors.crimson }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.crimsonDark)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = colors.crimson)}
          >
            <LogIn size={18} /> Log in to the portal
          </button>
          {installState !== 'installed' && (
            <div className="mt-4">
              <button
                onClick={onInstall}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-white/40 text-white font-semibold text-sm hover:bg-white/10 transition-colors"
              >
                <Download size={16} /> Download the app
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-14 grid gap-6 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-xl border border-slate-100 p-6 shadow-sm">
            <div className="w-11 h-11 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: `${colors.crimson}14`, color: colors.crimson }}>
              <Icon size={22} />
            </div>
            <h3 className="font-bold text-lg" style={{ color: colors.navy }}>{title}</h3>
            <p className="mt-1.5 text-sm text-slate-500">{text}</p>
          </div>
        ))}
      </section>

      {/* Install */}
      <section id="install" className="max-w-5xl mx-auto w-full px-4 sm:px-6 pb-14">
        <div className="rounded-xl p-6 flex flex-col sm:flex-row sm:items-center gap-5" style={{ backgroundColor: `${colors.gold}1A` }}>
          <Smartphone size={28} className="shrink-0" style={{ color: colors.crimson }} />
          <div className="flex-1">
            <h3 className="font-bold" style={{ color: colors.navy }}>
              {installState === 'installed' ? 'The app is installed' : 'Get the Solid Arts HR app'}
            </h3>
            {installState === 'installed' ? (
              <p className="mt-1 text-sm text-slate-600 flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-600" /> You're using the installed app.
              </p>
            ) : installState === 'ios' || showSteps ? (
              <ol className="mt-2 text-sm text-slate-700 space-y-1 list-decimal pl-5">
                {installState === 'ios' ? (
                  <>
                    <li>Open this page in <strong>Safari</strong>.</li>
                    <li>Tap the <strong>Share</strong> button <Share size={14} className="inline -mt-0.5" aria-hidden="true" />.</li>
                    <li>Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
                  </>
                ) : (
                  <>
                    <li>Open this page in <strong>Chrome</strong> or <strong>Edge</strong>.</li>
                    <li>Open the browser menu <strong>⋮</strong>.</li>
                    <li>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                  </>
                )}
              </ol>
            ) : (
              <p className="mt-1 text-sm text-slate-600">
                Install it on your phone or computer: it opens like a normal app, straight to the staff portal.
              </p>
            )}
          </div>
          {installState === 'prompt' && (
            <button
              onClick={onInstall}
              className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md text-white font-semibold text-sm"
              style={{ backgroundColor: colors.crimson }}
            >
              <Download size={16} /> Install app
            </button>
          )}
          {installState === 'manual' && !showSteps && (
            <button
              onClick={() => setShowSteps(true)}
              className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md text-white font-semibold text-sm"
              style={{ backgroundColor: colors.crimson }}
            >
              <Download size={16} /> How to install
            </button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto text-slate-300" style={{ backgroundColor: colors.navy }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between text-sm">
          <img src={BRAND.logoWhite} alt={BRAND.companyName} className="h-8 w-auto object-contain self-start" />
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
            <a href={`tel:${BRAND.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-2 hover:text-white"><Phone size={14} /> {BRAND.phone}</a>
            <a href={`mailto:${BRAND.email}`} className="inline-flex items-center gap-2 hover:text-white"><Mail size={14} /> {BRAND.email}</a>
          </div>
        </div>
        <div className="border-t border-white/10 text-center text-xs text-slate-400 py-4 px-4">
          © {new Date().getFullYear()} {BRAND.companyName} · Staff use only
        </div>
      </footer>
    </div>
  );
};

export default StaffPortalLanding;
