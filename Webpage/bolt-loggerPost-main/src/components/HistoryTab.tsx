import { useState, useEffect, useCallback } from 'react';
import {
  Search, Clock, Truck, Pencil, Trash2, CheckCircle2, DollarSign,
  ArrowRightLeft, X, AlertCircle,
} from 'lucide-react';
import { fetchEntries, togglePaid as togglePaidApi, deleteEntry as deleteEntryApi } from '@/api';
import type { Entry, EntryInput, Settings } from '@/types';
import {
  calcPayForInput, formatCurrency, formatDate,
} from '@/utils';

const MOCK_SETTINGS = {
  normal_rate: 1.60,
  express_rate: 3.60,
  saturday_hourly_rate: 48.14,
};

type FilterMode = 'all' | 'unpaid' | 'paid';

export default function HistoryTab() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [search, setSearch] = useState('');
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
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

  async function togglePaidStatus(entry: Entry) {
    try {
      await togglePaidApi(entry.id);
      showToast(entry.is_paid ? 'Marked as unpaid' : 'Marked as paid', 'success');
      await loadEntries();
    } catch (error) {
      showToast('Failed to update entry', 'error');
    }
  }

  async function deleteEntryFn(entry: Entry) {
    if (!confirm('Delete this entry? This cannot be undone.')) return;
    try {
      await deleteEntryApi(entry.id);
      showToast('Entry deleted', 'success');
      await loadEntries();
    } catch (error) {
      showToast('Failed to delete entry', 'error');
    }
  }

  const filtered = entries.filter((e) => {
    if (filter === 'unpaid' && e.is_paid) return false;
    if (filter === 'paid' && !e.is_paid) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.date.includes(q) ||
        (e.transferred_from && e.transferred_from.toLowerCase().includes(q)) ||
        (e.delivery_login && e.delivery_login.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-5">
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

      <h2 className="text-xl font-display font-bold text-auspost-charcoal">Delivery History</h2>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-auspost-gray" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by date, driver, or login..."
            className="input-field pl-10"
          />
        </div>
        <div className="flex gap-1 p-1 bg-auspost-gray-light rounded-auspost">
          {(['all', 'unpaid', 'paid'] as FilterMode[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-[6px] text-sm font-semibold capitalize transition-all ${
                filter === f
                  ? 'bg-white text-auspost-red shadow-sm'
                  : 'text-auspost-gray'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Entries */}
      {loading ? (
        <div className="text-center py-12 text-auspost-gray text-sm">Loading entries...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Truck className="w-12 h-12 text-auspost-gray-border mx-auto mb-3" />
          <p className="text-auspost-gray text-sm">
            {entries.length === 0
              ? 'No entries yet. Start logging deliveries from the New Entry tab.'
              : 'No entries match your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <HistoryCard
              key={entry.id}
              entry={entry}
              settings={settings}
              onTogglePaid={() => togglePaidStatus(entry)}
              onEdit={() => setEditingEntry(entry)}
              onDelete={() => deleteEntryFn(entry)}
            />
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editingEntry && settings && (
        <EditModal
          entry={editingEntry}
          settings={settings}
          onClose={() => setEditingEntry(null)}
          onSaved={() => {
            setEditingEntry(null);
            loadEntries();
            showToast('Entry updated', 'success');
          }}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}
    </div>
  );
}

function HistoryCard({
  entry, settings, onTogglePaid, onEdit, onDelete,
}: {
  entry: Entry;
  settings: Settings | null;
  onTogglePaid: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pay = settings
    ? calcPayForInput(
        entry.is_saturday, entry.normal, entry.express,
        entry.transfer_type, entry.transfer_qty, entry.hours_worked, settings
      )
    : 0;

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-auspost-gray-light flex items-center justify-center flex-shrink-0">
            {entry.is_saturday ? (
              <Clock className="w-5 h-5 text-auspost-warning" />
            ) : (
              <Truck className="w-5 h-5 text-auspost-red" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-auspost-charcoal">
                {formatDate(entry.date)}
              </p>
              {entry.is_saturday ? (
                <span className="badge badge-warning">Saturday</span>
              ) : null}
              {entry.is_paid ? (
                <span className="badge badge-success">Paid</span>
              ) : (
                <span className="badge badge-red">Unpaid</span>
              )}
            </div>
            <div className="mt-1.5 space-y-0.5">
              {entry.is_saturday ? (
                <p className="text-sm text-auspost-gray">
                  {entry.start_time} — {entry.end_time} ({(entry.hours_worked || 0).toFixed(2)} hrs)
                  {entry.break_deducted && ' (break deducted)'}
                </p>
              ) : (
                <p className="text-sm text-auspost-gray">
                  {entry.normal} normal + {entry.express} express
                </p>
              )}
              {entry.transfer_qty > 0 && (
                <p className="text-xs text-auspost-gray flex items-center gap-1">
                  <ArrowRightLeft className="w-3 h-3" />
                  {entry.transfer_qty} {entry.transfer_type} transfer from {entry.transferred_from}
                </p>
              )}
              {entry.delivery_login && (
                <p className="text-xs text-auspost-gray">
                  Login: <span className="font-mono">{entry.delivery_login}</span>
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-mono font-semibold text-auspost-charcoal">
            {formatCurrency(pay)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-auspost-gray-border">
        <button
          onClick={onTogglePaid}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-all ${
            entry.is_paid
              ? 'text-auspost-gray hover:bg-auspost-gray-light'
              : 'text-auspost-success hover:bg-auspost-success-light'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {entry.is_paid ? 'Mark Unpaid' : 'Mark Paid'}
        </button>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold text-auspost-gray hover:bg-auspost-gray-light hover:text-auspost-charcoal transition-all"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold text-auspost-red hover:bg-auspost-red-light transition-all ml-auto"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}

function EditModal({
  entry, settings, onClose, onSaved, onError,
}: {
  entry: Entry;
  settings: Settings;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState<EntryInput>({
    date: entry.date,
    normal: entry.normal,
    express: entry.express,
    transfer_type: entry.transfer_type,
    transfer_qty: entry.transfer_qty,
    transferred_from: entry.transferred_from,
    is_saturday: entry.is_saturday,
    start_time: entry.start_time,
    end_time: entry.end_time,
    hours_worked: entry.hours_worked,
    break_deducted: entry.break_deducted,
    delivery_login: entry.delivery_login,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from('entries').update(form).eq('id', entry.id);
    setSaving(false);
    if (error) {
      onError('Failed to update: ' + error.message);
    } else {
      onSaved();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-auspost-gray-border">
          <h3 className="text-lg font-display font-bold text-auspost-charcoal">Edit Entry</h3>
          <button onClick={onClose} className="p-1 text-auspost-gray hover:text-auspost-charcoal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-auspost-charcoal mb-1.5">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-auspost-charcoal mb-1.5">Normal</label>
              <input
                type="number"
                min={0}
                value={form.normal || ''}
                onChange={(e) => setForm({ ...form, normal: parseInt(e.target.value) || 0 })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-auspost-charcoal mb-1.5">Express</label>
              <input
                type="number"
                min={0}
                value={form.express || ''}
                onChange={(e) => setForm({ ...form, express: parseInt(e.target.value) || 0 })}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-auspost-charcoal mb-1.5">Transfer Type</label>
              <select
                value={form.transfer_type || ''}
                onChange={(e) => setForm({ ...form, transfer_type: e.target.value || null })}
                className="input-field"
              >
                <option value="">None</option>
                <option value="Normal">Normal</option>
                <option value="Express">Express</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-auspost-charcoal mb-1.5">Transfer Qty</label>
              <input
                type="number"
                min={0}
                value={form.transfer_qty || ''}
                onChange={(e) => setForm({ ...form, transfer_qty: parseInt(e.target.value) || 0 })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-auspost-charcoal mb-1.5">Transferred From</label>
            <input
              type="text"
              value={form.transferred_from || ''}
              onChange={(e) => setForm({ ...form, transferred_from: e.target.value || null })}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-auspost-charcoal mb-1.5">Delivery Login</label>
            <input
              type="text"
              value={form.delivery_login || ''}
              onChange={(e) => setForm({ ...form, delivery_login: e.target.value || null })}
              className="input-field"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_saturday}
              onChange={(e) => setForm({ ...form, is_saturday: e.target.checked })}
              className="w-4 h-4 rounded accent-auspost-red"
            />
            <span className="text-sm text-auspost-charcoal">Saturday shift</span>
          </label>

          {form.is_saturday && (
            <div className="grid grid-cols-2 gap-3 animate-slide-down">
              <div>
                <label className="block text-xs font-semibold text-auspost-charcoal mb-1.5">Start Time</label>
                <input
                  type="time"
                  value={form.start_time || ''}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-auspost-charcoal mb-1.5">End Time</label>
                <input
                  type="time"
                  value={form.end_time || ''}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_paid}
              onChange={(e) => setForm({ ...form, is_paid: e.target.checked })}
              className="w-4 h-4 rounded accent-auspost-red"
            />
            <span className="text-sm text-auspost-charcoal">Marked as paid</span>
          </label>
        </div>

        <div className="flex gap-3 p-5 border-t border-auspost-gray-border">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
