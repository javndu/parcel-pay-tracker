import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DollarSign, Clock, TrendingUp, Package, CheckCircle2, Calendar,
  ChevronLeft, ChevronRight, X, Download,
  ArrowRightLeft, AlertCircle,
} from 'lucide-react';
import { fetchEntries, markAllPaid, clearAllEntries, exportExcel, exportInvoice } from '@/api';
import type { Entry, Settings } from '@/types';
import {
  calcPayForInput, formatCurrency, formatDate, getMonthName,
  getDaysInMonth, getFirstDayOfWeek,
} from '@/utils';

const MOCK_SETTINGS = {
  normal_rate: 1.60,
  express_rate: 3.60,
  saturday_hourly_rate: 48.14,
};

const MOCK_PROFILE = {
  full_name: 'Driver',
  vehicle_type: 'Van',
};

export default function PayTab() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchEntries();
      setEntries(data);
    } catch (error) {
      console.error('Error loading entries:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Stats
  const stats = useMemo(() => {
    let unpaid = 0, paid = 0, totalHours = 0, lifetimeDeliveries = 0, lifetimeEarnings = 0;
    for (const e of entries) {
      const pay = calcPayForInput(e.is_saturday, e.normal, e.express, e.transfer_type, e.transfer_qty, e.hours_worked, MOCK_SETTINGS);
      if (e.paid) paid += pay;
      else unpaid += pay;
      if (e.is_saturday) totalHours += e.hours_worked || 0;
      lifetimeDeliveries += e.normal + e.express + e.transfer_qty;
      lifetimeEarnings += pay;
    }
    const weekdayEntries = entries.filter((e) => !e.is_saturday);
    let weekdayHours = 0;
    let weekdayPay = 0;
    for (const e of weekdayEntries) {
      weekdayPay += calcPayForInput(false, e.normal, e.express, e.transfer_type, e.transfer_qty, 0, MOCK_SETTINGS);
    }
    // Approximate weekday hours: assume 8 hours per weekday entry
    weekdayHours = weekdayEntries.length * 8;
    const totalHrs = totalHours + weekdayHours;
    const avgHourly = totalHrs > 0 ? (paid + unpaid) / totalHrs : 0;
    return { unpaid, paid, avgHourly, totalHours: totalHrs, lifetimeDeliveries, lifetimeEarnings };
  }, [entries]);

  // Monthly entries
  const monthEntries = useMemo(() => {
    return entries.filter((e) => {
      const d = new Date(e.date + 'T00:00:00');
      return d.getFullYear() === calYear && d.getMonth() === calMonth;
    });
  }, [entries, calYear, calMonth]);

  const monthStats = useMemo(() => {
    const days = new Set(monthEntries.map((e) => e.date));
    let earned = 0, paid = 0, unpaid = 0;
    for (const e of monthEntries) {
      const pay = calcPayForInput(e.is_saturday, e.normal, e.express, e.transfer_type, e.transfer_qty, e.hours_worked, MOCK_SETTINGS);
      earned += pay;
      if (e.paid) paid += pay;
      else unpaid += pay;
    }
    return { daysWorked: days.size, earned, paid, unpaid, entries: monthEntries.length };
  }, [monthEntries]);

  // Transfers by driver
  const transfersByDriver = useMemo(() => {
    const map: Record<string, { normal: number; express: number; total: number }> = {};
    for (const e of entries) {
      if (e.transfer_qty > 0 && e.transferred_from) {
        if (!map[e.transferred_from]) map[e.transferred_from] = { normal: 0, express: 0, total: 0 };
        if (e.transfer_type === 'Normal') map[e.transferred_from].normal += e.transfer_qty;
        else if (e.transfer_type === 'Express') map[e.transferred_from].express += e.transfer_qty;
        map[e.transferred_from].total += e.transfer_qty;
      }
    }
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [entries]);

  // Calendar
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfWeek(calYear, calMonth);
  const entriesByDate = useMemo(() => {
    const map: Record<string, Entry[]> = {};
    for (const e of monthEntries) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return map;
  }, [monthEntries]);

  function prevMonth() {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
  }

  function nextMonth() {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
  }

  async function markAllPaid() {
    if (!user || monthEntries.length === 0) return;
    if (!confirm(`Mark all ${monthEntries.filter((e) => !e.is_paid).length} unpaid entries in ${getMonthName(calYear, calMonth)} as paid?`)) return;
    const unpaidIds = monthEntries.filter((e) => !e.is_paid).map((e) => e.id);
    if (unpaidIds.length === 0) {
      showToast('All entries already paid', 'error');
      return;
    }
    try {
      await markAllPaid();
      showToast(`${unpaidIds.length} entries marked as paid`, 'success');
      await loadEntries();
    } catch (error) {
      showToast('Failed to mark as paid', 'error');
    }
  }

  function downloadInvoice() {
    if (monthEntries.length === 0) {
      showToast('No entries for this month', 'error');
      return;
    }
    exportInvoice();
    showToast('Invoice download started', 'success');
  }

  const selectedDayEntries = selectedDay ? (entriesByDate[selectedDay] || []) : [];

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

      <h2 className="text-xl font-display font-bold text-auspost-charcoal">Pay & Claims</h2>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          label="Unpaid Balance"
          value={formatCurrency(stats.unpaid)}
          icon={<DollarSign className="w-4 h-4" />}
          color="red"
        />
        <StatCard
          label="Paid Total"
          value={formatCurrency(stats.paid)}
          icon={<CheckCircle2 className="w-4 h-4" />}
          color="success"
        />
        <StatCard
          label="Avg Hourly Rate"
          value={formatCurrency(stats.avgHourly)}
          icon={<TrendingUp className="w-4 h-4" />}
          color="neutral"
        />
        <StatCard
          label="Total Hours"
          value={`${stats.totalHours.toFixed(0)} hrs`}
          icon={<Clock className="w-4 h-4" />}
          color="neutral"
        />
        <StatCard
          label="Lifetime Deliveries"
          value={stats.lifetimeDeliveries.toString()}
          icon={<Package className="w-4 h-4" />}
          color="neutral"
        />
        <StatCard
          label="Lifetime Earnings"
          value={formatCurrency(stats.lifetimeEarnings)}
          icon={<DollarSign className="w-4 h-4" />}
          color="success"
        />
      </div>

      {/* Calendar */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-display font-bold text-auspost-charcoal">
            {getMonthName(calYear, calMonth)}
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 rounded-auspost hover:bg-auspost-gray-light transition-all">
              <ChevronLeft className="w-4 h-4 text-auspost-charcoal" />
            </button>
            <button onClick={nextMonth} className="p-2 rounded-auspost hover:bg-auspost-gray-light transition-all">
              <ChevronRight className="w-4 h-4 text-auspost-charcoal" />
            </button>
          </div>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-center text-xs font-semibold text-auspost-gray py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEntries = entriesByDate[dateStr] || [];
            const hasEntries = dayEntries.length > 0;
            const allPaid = hasEntries && dayEntries.every((e) => e.is_paid);
            const hasUnpaid = hasEntries && dayEntries.some((e) => !e.is_paid);
            const isSelected = selectedDay === dateStr;

            return (
              <button
                key={day}
                onClick={() => hasEntries && setSelectedDay(isSelected ? null : dateStr)}
                className={`aspect-square rounded-[6px] flex flex-col items-center justify-center text-sm transition-all relative ${
                  isSelected
                    ? 'bg-auspost-red text-white font-bold'
                    : hasEntries
                      ? allPaid
                        ? 'bg-auspost-success-light text-auspost-success hover:bg-auspost-success/20'
                        : 'bg-auspost-red-light text-auspost-red hover:bg-auspost-red/20'
                      : 'text-auspost-gray hover:bg-auspost-gray-light'
                }`}
              >
                <span className={hasEntries ? 'font-bold' : ''}>{day}</span>
                {hasEntries && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEntries.slice(0, 3).map((e, idx) => (
                      <div
                        key={idx}
                        className={`w-1 h-1 rounded-full ${
                          isSelected ? 'bg-white' : e.is_paid ? 'bg-auspost-success' : 'bg-auspost-red'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-auspost-gray-border">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-auspost-success-light" />
            <span className="text-xs text-auspost-gray">All paid</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-auspost-red-light" />
            <span className="text-xs text-auspost-gray">Has unpaid</span>
          </div>
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="card p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-auspost-charcoal">
              {formatDate(selectedDay)}
            </h3>
            <button onClick={() => setSelectedDay(null)} className="p-1 text-auspost-gray hover:text-auspost-charcoal">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {selectedDayEntries.map((e) => {
              const pay = settings ? calcPayForInput(e.is_saturday, e.normal, e.express, e.transfer_type, e.transfer_qty, e.hours_worked, settings) : 0;
              return (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-auspost bg-auspost-gray-light">
                  <div>
                    <p className="text-sm font-semibold text-auspost-charcoal">
                      {e.is_saturday
                        ? `${(e.hours_worked || 0).toFixed(2)} hrs Saturday`
                        : `${e.normal} normal + ${e.express} express`}
                    </p>
                    {e.transfer_qty > 0 && (
                      <p className="text-xs text-auspost-gray">
                        + {e.transfer_qty} {e.transfer_type} from {e.transferred_from}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-semibold text-auspost-charcoal">{formatCurrency(pay)}</p>
                    {e.is_paid
                      ? <span className="badge badge-success text-[10px]">Paid</span>
                      : <span className="badge badge-red text-[10px]">Unpaid</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly summary */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-auspost-charcoal">
            {getMonthName(calYear, calMonth)} Summary
          </h3>
          <div className="flex gap-2">
            <button onClick={markAllPaid} className="btn-secondary text-xs px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mark All Paid
            </button>
            <button onClick={downloadInvoice} className="btn-primary text-xs px-3 py-2">
              <Download className="w-3.5 h-3.5" />
              Download Invoice
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-auspost bg-auspost-gray-light">
            <p className="text-xs text-auspost-gray">Days Worked</p>
            <p className="text-lg font-display font-bold text-auspost-charcoal">{monthStats.daysWorked}</p>
          </div>
          <div className="p-3 rounded-auspost bg-auspost-gray-light">
            <p className="text-xs text-auspost-gray">Total Earned</p>
            <p className="text-lg font-display font-bold text-auspost-charcoal">{formatCurrency(monthStats.earned)}</p>
          </div>
          <div className="p-3 rounded-auspost bg-auspost-success-light">
            <p className="text-xs text-auspost-success">Paid</p>
            <p className="text-lg font-display font-bold text-auspost-success">{formatCurrency(monthStats.paid)}</p>
          </div>
          <div className="p-3 rounded-auspost bg-auspost-red-light">
            <p className="text-xs text-auspost-red">Unpaid</p>
            <p className="text-lg font-display font-bold text-auspost-red">{formatCurrency(monthStats.unpaid)}</p>
          </div>
        </div>
      </div>

      {/* Monthly breakdown table */}
      {monthEntries.length > 0 && (
        <div className="card p-5 overflow-x-auto">
          <h3 className="text-sm font-semibold text-auspost-charcoal mb-3">Monthly Breakdown</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-auspost-gray-border">
                <th className="text-left py-2 px-2 text-xs font-semibold text-auspost-gray">Date</th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-auspost-gray">Norm</th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-auspost-gray">Expr</th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-auspost-gray">Trans</th>
                <th className="text-right py-2 px-2 text-xs font-semibold text-auspost-gray">Pay</th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-auspost-gray">Status</th>
              </tr>
            </thead>
            <tbody>
              {monthEntries.map((e) => {
                const pay = settings ? calcPayForInput(e.is_saturday, e.normal, e.express, e.transfer_type, e.transfer_qty, e.hours_worked, settings) : 0;
                return (
                  <tr key={e.id} className="border-b border-auspost-gray-border/50 hover:bg-auspost-gray-light/50">
                    <td className="py-2 px-2 text-auspost-charcoal">
                      {e.is_saturday && <span className="text-auspost-warning mr-1">S</span>}
                      {formatDate(e.date).split(',')[0]}
                    </td>
                    <td className="text-center py-2 px-2 font-mono text-auspost-charcoal">{e.normal}</td>
                    <td className="text-center py-2 px-2 font-mono text-auspost-charcoal">{e.express}</td>
                    <td className="text-center py-2 px-2 font-mono text-auspost-gray">{e.transfer_qty || '-'}</td>
                    <td className="text-right py-2 px-2 font-mono font-semibold text-auspost-charcoal">{formatCurrency(pay)}</td>
                    <td className="text-center py-2 px-2">
                      {e.is_paid
                        ? <span className="badge badge-success">Paid</span>
                        : <span className="badge badge-red">Unpaid</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-auspost-gray-border">
                <td className="py-2 px-2 font-semibold text-auspost-charcoal" colSpan={4}>Total</td>
                <td className="text-right py-2 px-2 font-mono font-bold text-auspost-red">{formatCurrency(monthStats.earned)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Transfers by driver */}
      {transfersByDriver.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-auspost-charcoal mb-3 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-auspost-gray" />
            Transfers by Driver
          </h3>
          <div className="space-y-2">
            {transfersByDriver.map(([driver, data]) => (
              <div key={driver} className="flex items-center justify-between p-3 rounded-auspost bg-auspost-gray-light">
                <span className="text-sm font-semibold text-auspost-charcoal">{driver}</span>
                <div className="flex items-center gap-3 text-xs">
                  {data.normal > 0 && <span className="text-auspost-gray">Normal: {data.normal}</span>}
                  {data.express > 0 && <span className="text-auspost-gray">Express: {data.express}</span>}
                  <span className="badge badge-neutral">Total: {data.total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label, value, icon, color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'red' | 'success' | 'neutral';
}) {
  const colorClasses = {
    red: 'bg-auspost-red-light text-auspost-red',
    success: 'bg-auspost-success-light text-auspost-success',
    neutral: 'bg-auspost-gray-light text-auspost-gray',
  };
  return (
    <div className="stat-card">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-xl font-display font-bold text-auspost-charcoal">{value}</p>
      <p className="text-xs text-auspost-gray mt-0.5">{label}</p>
    </div>
  );
}
