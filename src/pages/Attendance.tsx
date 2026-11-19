
import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertTriangle, CheckCircle2, MapPin, LogOut } from 'lucide-react';

// Hooks
import { useGeoLocation } from '../hooks/attendance/useGeoLocation';
import { useAttendance } from '../hooks/attendance/useAttendance';
import { useSubscription } from '../context/SubscriptionContext';
import { useToast } from '../context/ToastContext';
import { NO_LOCATION_ADDRESS, addNoLocationRemark, buildNoLocationRemarks, stripNoLocationRemark } from '../utils/attendanceUtils';

// UI Components
import { AttendanceHeader } from '../components/attendance/AttendanceHeader';
import { LocationDisplay } from '../components/attendance/LocationDisplay';
import { AttendanceActions } from '../components/attendance/AttendanceActions';

interface AttendanceProps {
  user: any;
  autoStart?: 'OFFICE' | 'FACTORY' | 'FINISH';
  onFinish?: () => void;
}

const Attendance: React.FC<AttendanceProps> = ({ user, autoStart, onFinish }) => {
  const { showToast } = useToast();

  // 1. Logic Hooks
  const {
    currentTime, activeRecord, appConfig, isLoading, status, submitPunch
  } = useAttendance(user, onFinish);

  const {
    location, isLocating, error: locationError, failure: locationFailure, diagnostics: locationDiagnostics, detectLocation
  } = useGeoLocation();

  // Subscription check for write access
  const { canPerformAction, subscription } = useSubscription();
  const canPunch = canPerformAction('write');

  // 2. Local UI State
  const [remarks, setRemarks] = useState('');
  const [dutyType, setDutyType] = useState<'OFFICE' | 'FACTORY'>('OFFICE');
  const [skipLocationChosen, setSkipLocationChosen] = useState(false);
  const locationInitialized = useRef(false);

  // Check-out does not save a location, so it never waits for one.
  const isCheckOut = !!activeRecord && !activeRecord.checkOut;
  const canSkipLocation = !isCheckOut && !location && !isLocating && !!locationError
    && appConfig?.allowCheckInWithoutLocation !== false;
  const withoutLocation = canSkipLocation && skipLocationChosen;
  const locationReady = isCheckOut || !!location || withoutLocation;
  // The auto-written remark does not count as the mandatory factory details.
  const factoryInputMissing = dutyType === 'FACTORY'
    && !(withoutLocation ? stripNoLocationRemark(remarks) : remarks.trim());

  const handleToggleWithoutLocation = () => {
    setRemarks(current => skipLocationChosen
      ? stripNoLocationRemark(current)
      : addNoLocationRemark(current, dutyType === 'FACTORY'));
    setSkipLocationChosen(!skipLocationChosen);
  };

  // A retry can succeed after the option was chosen. Do not save the remark with a real location.
  useEffect(() => {
    if (location && skipLocationChosen) {
      setSkipLocationChosen(false);
      setRemarks(stripNoLocationRemark);
    }
  }, [location, skipLocationChosen]);

  // 3. Look up the location once when data is ready (no camera: selfies are not used)
  useEffect(() => {
    if (isLoading || locationInitialized.current) return;
    locationInitialized.current = true;

    if (!isCheckOut) detectLocation(true);
  }, [isLoading]);

  // Update duty type when autoStart or activeRecord changes (no camera restart)
  useEffect(() => {
    if (autoStart === 'FACTORY') setDutyType('FACTORY');
    else if (activeRecord?.dutyType) setDutyType(activeRecord.dutyType);
  }, [autoStart, activeRecord?.dutyType]);

  // 4. Handlers
  const handlePunchSubmit = async () => {
    if (!canPunch) {
      if (subscription?.status === 'EXPIRED') {
        showToast('Your trial has expired. Please upgrade to continue punching attendance.', 'warning');
      } else if (subscription?.status === 'SUSPENDED') {
        showToast('Your account is suspended. Please contact support.', 'error');
      }
      return;
    }

    if (factoryInputMissing) {
      showToast("Mandatory: Please mention the Factory Name and details in remarks.", 'warning');
      return;
    }

    if (withoutLocation && !remarks.trim()) {
      showToast('Mandatory: Please enter why your location is not available.', 'warning');
      return;
    }

    if (status !== 'idle' || !locationReady) return;

    if (withoutLocation) {
      await submitPunch(
        dutyType,
        buildNoLocationRemarks(locationFailure || 'unknown', remarks, locationDiagnostics),
        { lat: 0, lng: 0, address: NO_LOCATION_ADDRESS }
      );
    } else {
      await submitPunch(dutyType, remarks, isCheckOut ? null : location);
    }
  };

  const handleBack = () => {
    if (onFinish) onFinish();
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  return (
    <div className="fixed inset-0 bg-[#fcfdfe] z-[9999] flex flex-col animate-in slide-in-from-bottom-6 duration-500 overflow-hidden">

      <AttendanceHeader
        currentTime={currentTime}
        onBack={handleBack}
      />

      <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-0">
        <div className="relative w-full max-w-[280px] aspect-[3/4] rounded-[2.5rem] overflow-hidden bg-slate-900 shadow-2xl ring-8 ring-white flex flex-col items-center justify-center text-center px-6">
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-4">
            {isCheckOut ? <LogOut size={36} className="text-amber-300" /> : <MapPin size={36} className="text-emerald-300" />}
          </div>
          <p className="text-white text-sm font-semibold uppercase tracking-widest">
            {isCheckOut ? 'Ready to check out' : 'Ready to check in'}
          </p>
          {!isCheckOut && status !== 'success' && (
            <div className="absolute inset-x-0 top-6 flex flex-col items-center">
              <LocationDisplay
                location={location}
                isLocating={isLocating}
                error={locationError}
                onRetry={() => detectLocation(true)}
              />
            </div>
          )}
          {status === 'success' && (
            <div className="absolute inset-0 bg-emerald-600/95 flex flex-col items-center justify-center z-10 animate-in zoom-in">
              <div className="p-4 bg-white rounded-full shadow-2xl mb-4">
                <CheckCircle2 size={48} className="text-emerald-500 animate-bounce" />
              </div>
              <h3 className="text-xl font-semibold text-white uppercase tracking-widest">Done</h3>
            </div>
          )}
        </div>
      </div>

      {/* Subscription Warning Banner */}
      {!canPunch && (
        <div className="px-4 py-3 bg-red-50 border-t border-red-200 flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm font-medium">
            {subscription?.status === 'EXPIRED'
              ? 'Your trial has expired. Attendance punching is disabled.'
              : 'Your account is suspended. Please contact support.'}
          </span>
        </div>
      )}

      <AttendanceActions
        dutyType={dutyType}
        dutyLabel={dutyType === 'FACTORY' ? (appConfig?.dutyLabel2 || 'Factory') : (appConfig?.dutyLabel1 || 'Office')}
        remarks={remarks}
        setRemarks={setRemarks}
        onSubmit={handlePunchSubmit}
        status={status}
        activeRecord={activeRecord}
        canSkipLocation={canSkipLocation}
        withoutLocation={withoutLocation}
        onToggleWithoutLocation={handleToggleWithoutLocation}
        isDisabled={!canPunch || !locationReady || (!isCheckOut && isLocating) || status !== 'idle' || factoryInputMissing || (withoutLocation && !remarks.trim())}
      />

    </div>
  );
};

export default Attendance;
