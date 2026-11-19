import React from 'react';
import { LogIn, MapPin, CalendarCheck, Bell, Smartphone, Phone, Mail } from 'lucide-react';
import { BRAND } from '../config/brand';

interface Props {
  onLoginClick: () => void;
}

const features = [
  { icon: MapPin, title: 'Check in from your phone', text: 'Open the portal at work, allow location and tap Check In.' },
  { icon: CalendarCheck, title: 'Apply for leave', text: 'Request leave and follow its approval in one place.' },
  { icon: Bell, title: 'Stay informed', text: 'Company announcements and notifications as they happen.' },
];

/** Branded landing page for Solid Arts staff. Replaces the OpenHRApp marketing site. */
const StaffPortalLanding: React.FC<Props> = ({ onLoginClick }) => {
  const { colors } = BRAND;
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

      {/* Install tip */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 pb-14">
        <div className="rounded-xl p-6 flex items-start gap-4" style={{ backgroundColor: `${colors.gold}1A` }}>
          <Smartphone size={24} className="shrink-0 mt-0.5" style={{ color: colors.crimson }} />
          <div>
            <h3 className="font-bold" style={{ color: colors.navy }}>Put the portal on your home screen</h3>
            <p className="mt-1 text-sm text-slate-600">
              Android (Chrome): open the menu ⋮ and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
              iPhone (Safari): tap Share, then <strong>Add to Home Screen</strong>.
            </p>
          </div>
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
