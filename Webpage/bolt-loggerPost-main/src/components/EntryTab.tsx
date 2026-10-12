import { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Plus, Minus, Truck, Clock, ArrowRightLeft,
  ChevronDown, ChevronUp, DollarSign, Package, Zap, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { fetchEntries, createEntry } from '@/api';
import type { Entry, EntryInput } from '@/types';
import {
  todayStr, yesterdayStr, isSaturday, calcHoursWorked, calcPayForInput,
  formatCurrency, formatDate,
} from '@/utils';

const MOCK_SETTINGS = {
  normal_rate: 1.60,
  express_rate: 3.60,
  saturday_hourly_rate: 48.14,
};

export default function EntryTab() {
  const [date, setDate] = useState(todayStr());
  const [normal, setNormal] = useState(0);
  const [express, setExpress] = useState(0);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferType, setTransferType] = useState<'Normal' | 'Express' | ''>('');
  const [transferQty, setTransferQty] = useState(0);
  const [transferredFrom, setTransferredFrom] = useState('');
  const [showShift, setShowShift] = useState(false);
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('12:00');
  const [breakDeducted, setBreakDeducted] = useState(true);
  const [differentLogin, setDifferentLogin] = useState(false);
  const [deliveryLogin, setDeliveryLogin] = useState('');
  const [recentLogins, setRecentLogins] = useState<string[]>([]);
  const [todayEntries, setTodayEntries] = useState<Entry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const satMode = isSaturday(date);

  useEffect(() => {
    if (satMode) {
      setShowShift(true);
    } else {
      setShowShift(false);
    }
  }, [satMode]);

  const loadTodayEntries = useCallback(async () => {
    try {
      const allEntries = await fetchEntries();
      const today = allEntries.filter(e => e.date === date);
      setTodayEntries(today);
    } catch (error) {
      console.error('Error loading today entries:', error);
    }
  }, [date]);

  const loadRecentLogins = useCallback(async () => {
    try {
      const allEntries = await fetchEntries();
      const logins = [...new Set(allEntries.map((d) => d.delivery_login).filter(Boolean))] as string[];
      setRecentLogins(logins.slice(0, 20));
    } catch (error) {
      console.error('Error loading recent logins:', error);
    }
  }, []);

  useEffect(() => {
    loadTodayEntries();
  }, [loadTodayEntries]);

  useEffect(() => {
    loadRecentLogins();
  }, [loadRecentLogins]);

  const hoursWorked = showShift && satMode
    ? calcHoursWorked(startTime, endTime, breakDeducted)
    : null;

  const livePay = calcPayForInput(
      satMode && showShift,
      normal,
      express,
      transferType || null,
      transferQty,
      hoursWorked,
      MOCK_SETTINGS
    );

  const todayPay = todayEntries.reduce((sum, e) => sum + calcPayForInput(
      e.is_saturday, e.normal, e.express, e.transfer_type, e.transfer_qty, e.hours_worked, MOCK_SETTINGS
    ), 0);

  const unpaidPay = todayEntries.filter((e) => !e.paid).reduce((sum, e) => sum + calcPayForInput(
      e.is_saturday, e.normal, e.express, e.transfer_type, e.transfer_qty, e.hours_worked, MOCK_SETTINGS
    ), 0);

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function resetForm() {
    setNormal(0);
    setExpress(0);
    setTransferType('');
    setTransferQty(0);
    setTransferredFrom('');
    setShowTransfer(false);
    setStartTime('07:00');
    setEndTime('12:00');
    setBreakDeducted(true);
    setDifferentLogin(false);
    setDeliveryLogin('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!satMode && normal === 0 && express === 0 && transferQty === 0) {
      showToast('Enter at least one parcel count', 'error');
      return;
    }
    if (satMode && showShift && (!startTime || !endTime)) {
      showToast('Enter shift start and end times', 'error');
      return;
    }

    setSubmitting(true);

    const input: EntryInput = {
      date,
      normal,
      express,
      transfer_type: transferType || null,
      transfer_qty: transferQty,
      transferred_from: transferredFrom || null,
      is_saturday: satMode && showShift,
      start_time: showShift && satMode ? startTime : null,
      end_time: showShift && satMode ? endTime : null,
      hours_worked: hoursWorked,
      break_deducted: showShift && satMode ? breakDeducted : false,
      delivery_login: differentLogin ? deliveryLogin : null,
    };

    try {
      await createEntry(input);
      setSubmitting(false);
      showToast('Entry saved successfully', 'success');
      resetForm();
      loadTodayEntries();
    } catch (error) {
      setSubmitting(false);
      showToast('Failed to save entry', 'error');
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-auspost shadow-lg animate-slide-down ${
            toast.type === 'success' ? 'bg-auspost-success text-white' : 'bg-auspost-red text-white'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}

      {/* Hero stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-auspost-red-light flex items-center justify-center">
              <Package className="w-4 h-4 text-auspost-red" />
            </div>
            <span className="text-xs font-semibold text-auspost-gray uppercase tracking-wide">
              Today's Parcels
            </span>
          </div>
          <p className="text-2xl font-display font-bold text-auspost-charcoal">
            {todayEntries.reduce((s, e) => s + e.normal + e.express + e.transfer_qty, 0)}
          </p>
          <p className="text-xs text-auspost-gray mt-1">
            {todayEntries.length} {todayEntries.length === 1 ? 'run' : 'runs'} logged
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-auspost-warning-light flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-auspost-warning" />
            </div>
            <span className="text-xs font-semibold text-auspost-gray uppercase tracking-wide">
              Unpaid Balance
            </span>
          </div>
          <p className="text-2xl font-display font-bold text-auspost-charcoal">
            {formatCurrency(unpaidPay)}
          </p>
          <p className="text-xs text-auspost-gray mt-1">
            of {formatCurrency(todayPay)} total today
          </p>
        </div>
      </div>

      {/* Saturday banner */}
      {satMode && (
        <div className="flex items-center gap-3 p-4 rounded-auspost bg-auspost-warning-light border border-auspost-warning/30 animate-fade-in">
          <Clock className="w-5 h-5 text-auspost-warning flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-auspost-warning">Saturday Shift Mode</p>
            <p className="text-xs text-auspost-gray">
              Pay calculated at {settings ? formatCurrency(settings.saturday_hourly_rate) : '$48.14'}/hr
            </p>
          </div>
        </div>
      )}

      {/* Entry form */}
      <form onSubmit={handleSubmit} className="card p-5 sm:p-6 space-y-5">
        {/* Date */}
        <div>
          <label className="block text-xs font-semibold text-auspost-charcoal mb-1.5">
            Delivery Date
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-auspost-gray" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <button
              type="button"
              onClick={() => setDate(todayStr())}
              className="btn-secondary px-3"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setDate(yesterdayStr())}
              className="btn-secondary px-3"
            >
              Yest.
            </button>
          </div>
        </div>

        {/* Parcel steppers - only show for non-Saturday or Saturday without shift-only mode */}
        {(!satMode || !showShift || normal > 0 || express > 0) && (
          <div className="grid grid-cols-2 gap-4">
            <StepperField
              label="Standard Parcels"
              icon={<Package className="w-4 h-4" />}
              value={normal}
              onChange={setNormal}
              rate={settings ? formatCurrency(settings.normal_rate) : '$1.60'}
              color="auspost-red"
            />
            <StepperField
              label="Express Parcels"
              icon={<Zap className="w-4 h-4" />}
              value={express}
              onChange={setExpress}
              rate={settings ? formatCurrency(settings.express_rate) : '$3.60'}
              color="auspost-warning"
            />
          </div>
        )}

        {/* Transfer section */}
        {!satMode && (
          <div>
            <button
              type="button"
              onClick={() => setShowTransfer(!showTransfer)}
              className="w-full flex items-center justify-between p-3 rounded-auspost bg-auspost-gray-light hover:bg-auspost-gray-border/50 transition-all"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-auspost-charcoal">
                <ArrowRightLeft className="w-4 h-4 text-auspost-gray" />
                Transfers from Another Driver
              </span>
              {showTransfer ? <ChevronUp className="w-4 h-4 text-auspost-gray" /> : <ChevronDown className="w-4 h-4 text-auspost-gray" />}
            </button>

            {showTransfer && (
              <div className="mt-3 p-4 rounded-auspost border border-auspost-gray-border space-y-3 animate-slide-down">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-auspost-charcoal mb-1.5">
                      Transfer Type
                    </label>
                    <select
                      value={transferType}
                      onChange={(e) => setTransferType(e.target.value as 'Normal' | 'Express' | '')}
                      className="input-field"
                    >
                      <option value="">Select type</option>
                      <option value="Normal">Normal</option>
                      <option value="Express">Express</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-auspost-charcoal mb-1.5">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={transferQty || ''}
                      onChange={(e) => setTransferQty(Math.max(0, parseInt(e.target.value) || 0))}
                      onFocus={(e) => e.target.select()}
                      className="input-field"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-auspost-charcoal mb-1.5">
                    Transferred From (Driver Name)
                  </label>
                  <input
                    type="text"
                    value={transferredFrom}
                    onChange={(e) => setTransferredFrom(e.target.value)}
                    className="input-field"
                    placeholder="e.g. John Smith"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Shift time tracking */}
        {satMode && (
          <div>
            <button
              type="button"
              onClick={() => setShowShift(!showShift)}
              className="w-full flex items-center justify-between p-3 rounded-auspost bg-auspost-gray-light hover:bg-auspost-gray-border/50 transition-all"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-auspost-charcoal">
                <Clock className="w-4 h-4 text-auspost-gray" />
                Shift Time Tracking
              </span>
              {showShift ? <ChevronUp className="w-4 h-4 text-auspost-gray" /> : <ChevronDown className="w-4 h-4 text-auspost-gray" />}
            </button>

            {showShift && (
              <div className="mt-3 p-4 rounded-auspost border border-auspost-gray-border space-y-3 animate-slide-down">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-auspost-charcoal mb-1.5">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-auspost-charcoal mb-1.5">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={breakDeducted}
                    onChange={(e) => setBreakDeducted(e.target.checked)}
                    className="w-4 h-4 rounded accent-auspost-red"
                  />
                  <span className="text-sm text-auspost-charcoal">
                    Deduct 30-min break (for shifts 5+ hrs)
                  </span>
                </label>
                {hoursWorked !== null && (
                  <div className="flex items-center justify-between p-3 rounded-auspost bg-auspost-gray-light">
                    <span className="text-sm font-semibold text-auspost-charcoal">Hours Worked</span>
                    <span className="text-lg font-display font-bold text-auspost-red">
                      {hoursWorked.toFixed(2)} hrs
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Different login */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={differentLogin}
              onChange={(e) => setDifferentLogin(e.target.checked)}
              className="w-4 h-4 rounded accent-auspost-red"
            />
            <span className="text-sm font-semibold text-auspost-charcoal">
              Use different delivery login
            </span>
          </label>
          {differentLogin && (
            <div className="mt-3 animate-slide-down">
              <input
                type="text"
                value={deliveryLogin}
                onChange={(e) => setDeliveryLogin(e.target.value)}
                className="input-field"
                placeholder="Enter login name"
                list="recent-logins"
              />
              <datalist id="recent-logins">
                {recentLogins.map((login) => (
                  <option key={login} value={login} />
                ))}
              </datalist>
            </div>
          )}
        </div>

        {/* Live pay calc */}
        <div className="flex items-center justify-between p-4 rounded-auspost bg-auspost-red text-white">
          <div>
            <p className="text-xs text-white/80 uppercase tracking-wide font-semibold">
              Calculated Pay
            </p>
            <p className="text-2xl font-display font-bold">{formatCurrency(livePay)}</p>
          </div>
          <DollarSign className="w-8 h-8 text-white/40" />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full py-3 text-base"
        >
          {submitting ? 'Saving...' : 'Save Entry'}
        </button>
      </form>

      {/* Today's runs */}
      {todayEntries.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-auspost-gray uppercase tracking-wide mb-3">
            Today's Runs — {formatDate(date)}
          </h3>
          <div className="space-y-2">
            {todayEntries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                rate={settings ? calcPayForInput(
                  entry.is_saturday, entry.normal, entry.express,
                  entry.transfer_type, entry.transfer_qty, entry.hours_worked, settings
                ) : 0}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepperField({
  label, icon, value, onChange, rate, color,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
  rate: string;
  color: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-auspost-charcoal mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-10 h-10 rounded-auspost border border-auspost-gray-border bg-white flex items-center justify-center hover:bg-auspost-gray-light transition-all active:scale-95"
        >
          <Minus className="w-4 h-4 text-auspost-charcoal" />
        </button>
        <input
          type="number"
          min={0}
          value={value || ''}
          onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          onFocus={(e) => e.target.select()}
          className="input-field text-center font-mono font-semibold text-lg"
          placeholder="0"
        />
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="w-10 h-10 rounded-auspost border border-auspost-gray-border bg-white flex items-center justify-center hover:bg-auspost-gray-light transition-all active:scale-95"
        >
          <Plus className="w-4 h-4 text-auspost-charcoal" />
        </button>
      </div>
      <div className="flex items-center gap-1 mt-1.5">
        <span className={`text-xs font-semibold text-${color}`}>{icon}</span>
        <span className="text-xs text-auspost-gray">{rate} per parcel</span>
      </div>
    </div>
  );
}

function EntryCard({ entry, rate }: { entry: Entry; rate: number }) {
  return (
    <div className="card p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-auspost-gray-light flex items-center justify-center">
          {entry.is_saturday ? (
            <Clock className="w-5 h-5 text-auspost-warning" />
          ) : (
            <Truck className="w-5 h-5 text-auspost-red" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-auspost-charcoal">
            {entry.is_saturday
              ? `${(entry.hours_worked || 0).toFixed(2)} hrs Saturday shift`
              : `${entry.normal} normal + ${entry.express} express`}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {entry.transfer_qty > 0 && (
              <span className="text-xs text-auspost-gray">
                + {entry.transfer_qty} transfer ({entry.transfer_type})
              </span>
            )}
            {entry.delivery_login && (
              <span className="badge badge-neutral">{entry.delivery_login}</span>
            )}
            {entry.is_paid ? (
              <span className="badge badge-success">Paid</span>
            ) : (
              <span className="badge badge-warning">Unpaid</span>
            )}
          </div>
        </div>
      </div>
      <span className="text-sm font-mono font-semibold text-auspost-charcoal">
        {formatCurrency(rate)}
      </span>
    </div>
  );
}
