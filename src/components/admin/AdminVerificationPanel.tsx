import React, { useState, useEffect } from 'react';
import { verificationService } from '../../services/verification.service';

interface UnverifiedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  created: string;
  updated: string;
}

export const AdminVerificationPanel: React.FC = () => {
  const [users, setUsers] = useState<UnverifiedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [featureAvailable, setFeatureAvailable] = useState(true);

  useEffect(() => {
    loadUnverifiedUsers();
    let interval = setInterval(loadUnverifiedUsers, 30000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadUnverifiedUsers();
        interval = setInterval(loadUnverifiedUsers, 30000);
      } else {
        clearInterval(interval);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const loadUnverifiedUsers = async () => {
    setLoading(true);
    const result = await verificationService.getUnverifiedUsers();

    if (result.success) {
      setUsers(result.users);
      setMessage('');
      setFeatureAvailable(true);
    } else {
      // If unauthorized/forbidden, the feature is not available (hooks not deployed)
      if (result.error?.includes('Unauthorized') || result.error?.includes('Forbidden') || result.error?.includes('404')) {
        setFeatureAvailable(false);
        setMessage('');
      } else {
        setMessage(`Error: ${result.error}`);
      }
      setUsers([]);
    }

    setLoading(false);
  };

  const handleVerifyUser = async (userId: string, email: string) => {
    setVerifyingId(userId);
    setMessage('Verifying user...');

    const result = await verificationService.manuallyVerifyUser(userId);
    
    if (result.success) {
      setMessage(`✅ ${email} verified successfully`);
      // Refresh list
      await loadUnverifiedUsers();
    } else {
      setMessage(`❌ Error: ${result.message}`);
    }
    
    setVerifyingId(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Don't render if feature is not available
  if (!featureAvailable && !loading) {
    return null;
  }

  // Uses the app's theme classes (not inline colours) so it follows light/dark mode.
  return (
    <div className="bg-white text-slate-800 rounded-xl border border-slate-100 shadow-sm p-5 md:p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Pending user verification</h2>
        <p className="text-sm text-slate-500 mt-1">Manually verify users who haven't clicked their email link.</p>
      </div>

      {message && (
        <div
          role="status"
          className={`p-3 rounded-lg border text-sm font-medium ${
            message.includes('✅')
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          {message}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={loadUnverifiedUsers}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-60"
        >
          Refresh
        </button>
        <span className="text-sm text-slate-600">
          {loading ? 'Loading…' : `${users.length} users pending verification`}
        </span>
      </div>

      {loading ? (
        <div className="text-center py-8 text-sm text-slate-500">Loading unverified users…</div>
      ) : users.length === 0 ? (
        <div className="text-center py-6 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium">
          All users have verified their emails.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="p-3 font-semibold text-slate-700">Email</th>
                <th className="p-3 font-semibold text-slate-700">Name</th>
                <th className="p-3 font-semibold text-slate-700">Role</th>
                <th className="p-3 font-semibold text-slate-700">Registered</th>
                <th className="p-3 font-semibold text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-slate-100">
                  <td className="p-3">
                    <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-xs">{user.email}</code>
                  </td>
                  <td className="p-3 text-slate-800">{user.name}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      user.role === 'ADMIN' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600" title={user.created}>
                    {formatDate(user.created)}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => handleVerifyUser(user.id, user.email)}
                      disabled={verifyingId === user.id}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:opacity-90 disabled:opacity-60"
                    >
                      {verifyingId === user.id ? 'Verifying…' : 'Verify'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700">
        <h4 className="font-semibold text-slate-900">About manual verification</h4>
        <ul className="mt-2 pl-5 list-disc space-y-1 leading-relaxed">
          <li>Use this when a user hasn't received or clicked the verification email.</li>
          <li>The user can log in straight after being verified.</li>
          <li>Email verification is preferred; use manual verification as a fallback.</li>
          <li>If most users need manual verification, check the email (SMTP) settings in Supabase Auth.</li>
        </ul>
      </div>
    </div>
  );
};
