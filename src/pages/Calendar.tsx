import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Truck, User, Plus, MessageCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { ScheduleDeliveryModal } from '../components/calendar/ScheduleDeliveryModal';
import type { Delivery, Dealer, Driver, Sales } from '../../shared/schema';

interface DeliveryWithRelations extends Delivery {
  dealer?: Dealer | null;
  driver?: Driver | null;
  sales?: Sales | null;
}

interface CalendarEventItem {
  id: string;
  deliveryId: string;
  createdByUserId: string;
  title: string;
  notes: string | null;
  location: string | null;
  startAt: string;
  endAt: string;
  participantUserIds: string[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function Calendar() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { showToast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [deliveries, setDeliveries] = useState<DeliveryWithRelations[]>([]);
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [salesData, setSalesData] = useState<Sales | null>(null);
  const [dealerId, setDealerId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadScheduledDeliveries();
      loadCalendarEvents();
      loadUserData();
    }
  }, [user, currentDate]);

  const loadCalendarEvents = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const from = new Date(year, month, 1).toISOString();
      const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      const data = await api.calendarEvents.list(from, to);
      setEvents(data || []);
    } catch (err) {
      console.error('Error loading calendar events:', err);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Delete this calendar event?')) return;
    try {
      await api.calendarEvents.delete(id);
      showToast('Event deleted', 'success');
      loadCalendarEvents();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete event', 'error');
    }
  };

  const loadUserData = async () => {
    try {
      if (role === 'sales') {
        const sales = await api.sales.current();
        if (sales) {
          setSalesData(sales);
          setDealerId(sales.dealerId || null);
        }
      } else if (role === 'dealer') {
        const result = await api.dealers.current();
        if (result?.dealer) {
          setDealerId(result.dealer.id);
        }
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  };

  const loadScheduledDeliveries = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const data = await api.deliveries.scheduled(year, month);
      setDeliveries(data || []);
    } catch (err) {
      console.error('Error loading scheduled deliveries:', err);
    }
    setLoading(false);
  };

  const deliveriesByDate = useMemo(() => {
    const map: Record<string, DeliveryWithRelations[]> = {};
    deliveries.forEach(d => {
      if (d.scheduledDate) {
        const dateKey = d.scheduledDate;
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(d);
      }
    });
    return map;
  }, [deliveries]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEventItem[]> = {};
    events.forEach((e) => {
      const d = new Date(e.startAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [events]);

  const dayHasContent = (key: string) =>
    (deliveriesByDate[key]?.length || 0) + (eventsByDate[key]?.length || 0) > 0;

  const isConfirmedStatus = (status?: string | null) =>
    !!status && status !== 'pending' && status !== 'pending_driver_acceptance' && status !== 'cancelled';

  const dayHasConfirmed = (key: string) => {
    const ds = deliveriesByDate[key] || [];
    const es = eventsByDate[key] || [];
    return ds.some((d) => isConfirmedStatus(d.status)) || es.length > 0;
  };

  const dayHasPending = (key: string) => {
    const ds = deliveriesByDate[key] || [];
    return ds.some((d) => !isConfirmedStatus(d.status));
  };

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    
    const endPadding = 42 - days.length;
    for (let i = 1; i <= endPadding; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    
    return days;
  }, [currentDate]);

  const formatDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const formatTime = (time: string | null) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(formatDateKey(new Date()));
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const selectedDateDeliveries = selectedDate ? deliveriesByDate[selectedDate] || [] : [];
  const selectedDateEvents = selectedDate ? eventsByDate[selectedDate] || [] : [];

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarIcon className="text-red-400" size={24} />
              <h1 className="text-xl font-bold text-white">Delivery Calendar</h1>
            </div>
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-white border border-white/50 rounded-lg hover:bg-white/10 transition"
              data-testid="button-today"
            >
              Today
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              data-testid="button-prev-month"
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-lg font-semibold">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              data-testid="button-next-month"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(day => (
              <div key={day} className="text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400 py-2">
                {day}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-7 gap-1">
              {Array(42).fill(0).map((_, i) => (
                <div key={i} className="aspect-square bg-gray-100 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(({ date, isCurrentMonth }, i) => {
                const dateKey = formatDateKey(date);
                const isSelected = selectedDate === dateKey;
                const isTodayDate = isToday(date);
                const hasConfirmed = dayHasConfirmed(dateKey);
                const hasPending = dayHasPending(dateKey);

                const baseText = !isCurrentMonth
                  ? 'text-gray-300'
                  : isSelected
                  ? 'text-white'
                  : isTodayDate
                  ? 'text-red-600 font-bold'
                  : 'text-gray-900';

                const baseBg = isSelected
                  ? 'bg-red-600 shadow-sm'
                  : 'hover:bg-gray-100';

                const ring = !isSelected && isTodayDate ? 'ring-1 ring-red-500' : '';

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(dateKey)}
                    className={`aspect-square rounded-lg text-sm transition relative flex flex-col items-center justify-center ${baseBg} ${ring}`}
                    data-testid={`calendar-day-${dateKey}`}
                  >
                    <span className={`text-[15px] leading-none ${baseText}`}>{date.getDate()}</span>
                    {(hasConfirmed || hasPending) && (
                      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
                        {hasConfirmed && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-red-600'}`} />
                        )}
                        {hasPending && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/60' : 'bg-gray-400'}`} />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
              Confirmed
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              Pending
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full ring-1 ring-red-500" />
              Today
            </div>
          </div>
        </Card>

        {selectedDate && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              {(role === 'sales' || role === 'dealer') && dealerId && (
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
                  data-testid="button-schedule-delivery"
                >
                  <Plus size={18} />
                  Schedule Delivery
                </button>
              )}
            </div>
            
            {selectedDateEvents.length > 0 && (
              <div className="space-y-3 mb-3">
                {selectedDateEvents
                  .sort((a, b) => a.startAt.localeCompare(b.startAt))
                  .map((evt) => {
                    const start = new Date(evt.startAt);
                    const isOwner = evt.createdByUserId === user?.id;
                    return (
                      <Card key={evt.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                              <span className="flex items-center gap-1 text-xs font-medium text-gray-500">
                                <Clock size={12} />
                                {start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="font-semibold text-gray-900 text-base leading-snug" data-testid={`text-event-title-${evt.id}`}>{evt.title}</p>
                            {evt.notes && (
                              <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{evt.notes}</p>
                            )}
                            {evt.location && (
                              <div className="flex items-start gap-2 mt-2 text-sm">
                                <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-600">{evt.location}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => navigate(`/chat/${evt.deliveryId}`)}
                              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                              title="Open chat"
                              data-testid={`button-event-chat-${evt.id}`}
                            >
                              <MessageCircle size={16} />
                            </button>
                            {isOwner && (
                              <button
                                onClick={() => handleDeleteEvent(evt.id)}
                                className="p-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition"
                                title="Delete event"
                                data-testid={`button-event-delete-${evt.id}`}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
              </div>
            )}

            {selectedDateDeliveries.length === 0 && selectedDateEvents.length === 0 ? (
              <Card className="p-6 text-center">
                <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No deliveries or events scheduled</p>
                {(role === 'sales' || role === 'dealer') && dealerId && (
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
                    data-testid="button-schedule-delivery-empty"
                  >
                    Schedule a Delivery
                  </button>
                )}
              </Card>
            ) : (
              <div className="space-y-3">
                {selectedDateDeliveries.sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || '')).map((delivery) => {
                  const confirmed = isConfirmedStatus(delivery.status);
                  return (
                  <Card key={delivery.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${confirmed ? 'bg-red-600' : 'bg-gray-400'}`} />
                          {delivery.scheduledTime && (
                            <span className="flex items-center gap-1 text-xs font-medium text-gray-500">
                              <Clock size={12} />
                              {formatTime(delivery.scheduledTime)}
                            </span>
                          )}
                          <StatusBadge status={(delivery.status || 'pending') as any} size="sm" />
                        </div>
                        <p className="font-semibold text-gray-900 text-base leading-snug">
                          {delivery.year} {delivery.make} {delivery.model}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">VIN: {delivery.vin}</p>
                        
                        <div className="mt-3 space-y-1 text-sm">
                          <div className="flex items-start gap-2">
                            <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-600">{delivery.dropoff}</span>
                          </div>
                          {role === 'sales' && delivery.driver && (
                            <div className="flex items-center gap-2">
                              <Truck size={14} className="text-gray-400" />
                              <span className="text-gray-600">Driver: {delivery.driver.name}</span>
                            </div>
                          )}
                          {role === 'driver' && delivery.sales && (
                            <div className="flex items-center gap-2">
                              <User size={14} className="text-gray-400" />
                              <span className="text-gray-600">Requested by: {delivery.sales.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/delivery/${delivery.id}`)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                        data-testid={`button-view-${delivery.id}`}
                      >
                        View
                      </button>
                    </div>
                  </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!selectedDate && deliveries.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Upcoming Scheduled Deliveries</h3>
            <div className="space-y-3">
              {deliveries
                .filter(d => d.scheduledDate && d.scheduledDate >= formatDateKey(new Date()))
                .sort((a, b) => {
                  const dateA = `${a.scheduledDate}T${a.scheduledTime || '00:00'}`;
                  const dateB = `${b.scheduledDate}T${b.scheduledTime || '00:00'}`;
                  return dateA.localeCompare(dateB);
                })
                .slice(0, 5)
                .map((delivery) => (
                  <Card key={delivery.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-600">
                            {delivery.scheduledDate && new Date(delivery.scheduledDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                          {delivery.scheduledTime && (
                            <span className="text-sm text-red-600">
                              {formatTime(delivery.scheduledTime)}
                            </span>
                          )}
                        </div>
                        <p className="font-semibold">
                          {delivery.year} {delivery.make} {delivery.model}
                        </p>
                        <p className="text-sm text-gray-600">{delivery.dropoff}</p>
                      </div>
                      <button
                        onClick={() => navigate(`/delivery/${delivery.id}`)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                      >
                        View
                      </button>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        )}
      </div>

      {selectedDate && dealerId && (role === 'sales' || role === 'dealer') && (
        <ScheduleDeliveryModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          selectedDate={selectedDate}
          dealerId={dealerId}
          salesId={salesData?.id || ''}
          defaultPickupAddress={salesData ? {
            street: salesData.defaultPickupStreet || '',
            city: salesData.defaultPickupCity || '',
            state: salesData.defaultPickupState || '',
            zip: salesData.defaultPickupZip || '',
          } : undefined}
          onSuccess={() => loadScheduledDeliveries()}
          showToast={showToast}
        />
      )}
    </div>
  );
}
