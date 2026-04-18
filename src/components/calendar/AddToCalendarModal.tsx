import { useEffect, useState } from 'react';
import { X, CalendarPlus } from 'lucide-react';
import {
  buildIcsContent,
  downloadIcs,
  getNextRoundHour,
  toDateInputValue,
  toTimeInputValue,
} from '../../lib/calendarUtils';
import api from '../../lib/api';

interface AddToCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  deliveryId?: string;
  defaultStart?: Date | null;
  defaultTitle?: string;
  defaultNotes?: string;
  defaultLocation?: string;
  filenameHint?: string;
  onSaved?: () => void;
  onError?: (msg: string) => void;
}

export function AddToCalendarModal({
  isOpen,
  onClose,
  deliveryId,
  defaultStart,
  defaultTitle = '',
  defaultNotes = '',
  defaultLocation = '',
  filenameHint = 'swaprunn-event',
  onSaved,
  onError,
}: AddToCalendarModalProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const start = defaultStart && !isNaN(defaultStart.getTime()) ? defaultStart : getNextRoundHour();
    setDate(toDateInputValue(start));
    setTime(toTimeInputValue(start));
    setTitle(defaultTitle);
    setNotes(defaultNotes);
  }, [isOpen, defaultStart, defaultTitle, defaultNotes]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!date || !time || !title.trim() || saving) return;
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    const start = new Date(year, month - 1, day, hours, minutes, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    setSaving(true);
    try {
      if (deliveryId) {
        await api.calendarEvents.create({
          deliveryId,
          title: title.trim(),
          notes: notes.trim(),
          location: defaultLocation,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
        });
      }
      const ics = buildIcsContent({
        title: title.trim(),
        description: notes.trim(),
        location: defaultLocation,
        start,
      });
      const safeName = filenameHint.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
      downloadIcs(`${safeName}-${toDateInputValue(start)}.ics`, ics);
      onSaved?.();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save event';
      onError?.(msg);
    } finally {
      setSaving(false);
    }
  };

  const canSave = Boolean(date && time && title.trim()) && !saving;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
      data-testid="modal-add-to-calendar"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-neutral-900 border border-neutral-700 rounded-t-2xl sm:rounded-2xl shadow-xl safe-bottom"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-700">
          <div className="flex items-center gap-2">
            <CalendarPlus size={20} className="text-red-400" />
            <h3 className="text-base sm:text-lg font-semibold text-white">Add to Calendar</h3>
          </div>
          <button
            onClick={onClose}
            className="touch-target text-gray-400 hover:text-white transition"
            aria-label="Close"
            data-testid="button-close-add-to-calendar"
          >
            <X size={22} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              maxLength={120}
              className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-600 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-base"
              data-testid="input-event-title"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 text-base"
                data-testid="input-event-date"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 text-base"
                data-testid="input-event-time"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Add any details..."
              className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-600 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-base resize-none"
              data-testid="input-event-notes"
            />
          </div>
        </div>

        <div className="flex gap-3 px-5 pb-5 pt-2">
          <button
            onClick={onClose}
            className="touch-target flex-1 py-3 rounded-lg font-semibold bg-neutral-700 border border-neutral-500 text-white hover:bg-neutral-600 transition"
            data-testid="button-cancel-calendar"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="touch-target flex-1 py-3 rounded-lg font-semibold bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-save-calendar"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
