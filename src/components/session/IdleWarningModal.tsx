import React, { useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';

interface Props {
  secondsLeft: number;
  onStay: () => void;
  onLogout: () => void;
}

/** "Still there?" warning shown 30 seconds before the idle logout. */
const IdleWarningModal: React.FC<Props> = ({ secondsLeft, onStay, onLogout }) => {
  const stayRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { stayRef.current?.focus(); }, []);

  const m = Math.floor(secondsLeft / 60);
  const s = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="idle-title"
        aria-describedby="idle-desc"
        className="w-full max-w-sm bg-white rounded-xl shadow-xl border border-slate-100 p-6"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
          <h2 id="idle-title" className="text-lg font-semibold text-slate-900">Still there?</h2>
        </div>
        <p id="idle-desc" className="text-sm text-slate-600 leading-relaxed">
          For security, you'll be logged out in{' '}
          <span className="font-semibold text-slate-900 tabular-nums" aria-live="polite">{m}:{s}</span>{' '}
          because there has been no activity.
        </p>
        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
          <button
            type="button"
            onClick={onLogout}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Log out now
          </button>
          <button
            ref={stayRef}
            type="button"
            onClick={onStay}
            className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors"
          >
            Stay logged in
          </button>
        </div>
      </div>
    </div>
  );
};

export default IdleWarningModal;
