import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, UserCircle, FileCheck, Search, Settings, Clock, CheckCircle2, Inbox, Building2, Calendar as CalendarIcon, List, LayoutGrid, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../lib/api';
import type { Driver, Delivery, Dealer, DriverApplication, ApprovedDriverDealer } from '../../shared/schema';
import { StatusBadge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { DashboardSkeleton } from '../components/ui/LoadingSkeleton';
import { DealershipSearch } from '../components/driver/DealershipSearch';
import { EditProfileModal } from '../components/driver/EditProfileModal';
import { DealershipRequestCard } from '../components/driver/DealershipRequestCard';
import { DealershipFilter } from '../components/driver/DealershipFilter';
import { MyDealerships } from '../components/driver/MyDealerships';
import { NotificationService } from '../lib/notificationService';
import { DeliveryCardWithChat } from '../components/driver/DeliveryCardWithChat';
import { Calendar } from '../components/ui/Calendar';
import { UnreadBadge } from '../components/ui/UnreadBadge';
import { useUnreadMessagesCount } from '../hooks/useUnreadMessagesCount';
import { OnboardingChecklist } from '../components/OnboardingChecklist';

interface DeliveryWithDealer extends Delivery {
  dealer: Dealer;
  sales?: { name: string } | null;
}

interface ApplicationWithDealer extends DriverApplication {
  dealer: Dealer;
}

interface DealershipWithStats extends ApprovedDriverDealer {
  dealer: Dealer;
  pendingCount?: number;
  upcomingCount?: number;
  completedCount?: number;
}

export function DriverDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { unreadCount } = useUnreadMessagesCount(user?.id);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [requestDeliveries, setRequestDeliveries] = useState<DeliveryWithDealer[]>([]);
  const [upcomingDeliveries, setUpcomingDeliveries] = useState<DeliveryWithDealer[]>([]);
  const [recentDeliveries, setRecentDeliveries] = useState<DeliveryWithDealer[]>([]);
  const [, setApplications] = useState<ApplicationWithDealer[]>([]);
  const [approvedDealerships, setApprovedDealerships] = useState<DealershipWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'upcoming' | 'recent' | 'search' | 'dealerships'>('requests');
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [selectedDealershipId, setSelectedDealershipId] = useState<string | null>(null);
  const [dealershipColors] = useState<Map<string, string>>(new Map());
  const [hasRequestedNotificationPermission, setHasRequestedNotificationPermission] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connected');
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [upcomingViewMode, setUpcomingViewMode] = useState<'list' | 'calendar'>('list');
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getDealershipColor = (dealershipId: string) => {
    if (!dealershipColors.has(dealershipId)) {
      const colors = [
        '#DC2626', '#2563EB', '#059669', '#D97706', '#7C3AED',
        '#DB2777', '#0891B2', '#EA580C', '#4F46E5', '#0D9488'
      ];
      const index = dealershipColors.size % colors.length;
      dealershipColors.set(dealershipId, colors[index]);
    }
    return dealershipColors.get(dealershipId) || '#6B7280';
  };

  useEffect(() => {
    if (user) {
      loadDriverData();
      if (!hasRequestedNotificationPermission && NotificationService.isSupported) {
        NotificationService.requestPermission();
        setHasRequestedNotificationPermission(true);
      }
    }
  }, [user, hasRequestedNotificationPermission]);

  useEffect(() => {
    if (!user || !driver) {
      console.log('[Polling] Skipping setup - missing user or driver');
      return;
    }

    console.log('[Polling] Setting up polling for driver:', driver.id);
    setRealtimeStatus('connected');

    const POLLING_INTERVAL = 15000;
    let isVisible = true;

    const pollDeliveries = async () => {
      if (!isVisible) return;
      
      console.log('[Polling] Fetching deliveries...');
      try {
        await Promise.all([
          loadRequestDeliveries(driver.id),
          loadUpcomingDeliveries(driver.id),
          loadRecentDeliveries(driver.id),
        ]);
        setLastUpdateTime(new Date());
      } catch (error) {
        console.error('[Polling] Error fetching deliveries:', error);
      }
    };

    const handleVisibilityChange = () => {
      isVisible = document.visibilityState === 'visible';
      if (isVisible) {
        pollDeliveries();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    pollingIntervalRef.current = setInterval(pollDeliveries, POLLING_INTERVAL);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [user, driver?.id]);

  const loadDriverData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const driverData = await api.drivers.current();
      if (driverData) {
        setDriver(driverData as Driver);
        await Promise.all([
          loadRequestDeliveries(driverData.id),
          loadUpcomingDeliveries(driverData.id),
          loadRecentDeliveries(driverData.id),
          loadApplications(driverData.id),
          loadApprovedDealerships(driverData.id),
        ]);
      } else {
        console.warn('No driver data found for user:', user.id);
      }
    } catch (error) {
      console.error('Error loading driver data:', error);
    }
    setLoading(false);
  };

  const loadRequestDeliveries = async (driverId: string) => {
    try {
      console.log('[LoadRequests] Loading request deliveries for driver:', driverId);
      setLoadingRequests(true);

      const data = await api.deliveries.requestsForDriver(driverId);
      console.log('[LoadRequests] Found', data?.length || 0, 'request deliveries');
      setRequestDeliveries(data as DeliveryWithDealer[]);
    } catch (error) {
      console.error('[LoadRequests] Failed to load request deliveries:', error);
      showToast('Failed to load delivery requests', 'error');
      setRequestDeliveries([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  const loadUpcomingDeliveries = async (driverId: string) => {
    try {
      const data = await api.deliveries.byDriver(driverId, 'accepted,assigned,in_progress');
      console.log('[LoadUpcoming] Loaded upcoming deliveries:', data?.length || 0);
      setUpcomingDeliveries(data as DeliveryWithDealer[]);
    } catch (error) {
      console.error('[LoadUpcoming] Failed to load upcoming deliveries:', error);
    }
  };

  const loadRecentDeliveries = async (driverId: string) => {
    try {
      const data = await api.deliveries.byDriver(driverId, 'completed');
      setRecentDeliveries(data as DeliveryWithDealer[]);
    } catch (error) {
      console.error('[LoadRecent] Failed to load recent deliveries:', error);
    }
  };

  const loadApplications = async (_driverId: string) => {
    try {
      const data = await api.driverApplications.list();
      setApplications(data as ApplicationWithDealer[]);
    } catch (error) {
      console.error('[LoadApplications] Failed to load applications:', error);
    }
  };

  const loadApprovedDealerships = async (driverId: string) => {
    try {
      const data = await api.approvedDriverDealers.byDriver(driverId);
      setApprovedDealerships(data as DealershipWithStats[]);
    } catch (error) {
      console.error('[LoadApprovedDealerships] Failed to load dealerships:', error);
    }
  };

  const handleManualRefresh = async () => {
    if (!driver) return;

    console.log('[Manual] Manually refreshing deliveries');
    showToast('Refreshing deliveries...', 'success');

    try {
      await Promise.all([
        loadRequestDeliveries(driver.id),
        loadUpcomingDeliveries(driver.id),
        loadRecentDeliveries(driver.id),
      ]);
      setLastUpdateTime(new Date());
      showToast('Deliveries refreshed successfully', 'success');
    } catch (error) {
      console.error('[Manual] Error refreshing:', error);
      showToast('Failed to refresh deliveries', 'error');
    }
  };

  const handleDeclineDelivery = async (deliveryId: string) => {
    if (!driver) {
      showToast('Driver profile not found', 'error');
      return;
    }

    try {
      await api.deliveries.decline(deliveryId, driver.id);
      setRequestDeliveries(prev => prev.filter(d => d.id !== deliveryId));
      showToast('Delivery request declined', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to decline delivery';
      showToast(message, 'error');
    }
  };

  const handleAcceptDelivery = async (deliveryId: string) => {
    if (!driver) {
      showToast('Driver profile not found', 'error');
      return;
    }

    try {
      await api.deliveries.accept(deliveryId, driver.id);
      
      const acceptedDelivery = requestDeliveries.find(d => d.id === deliveryId);
      setRequestDeliveries(prev => prev.filter(d => d.id !== deliveryId));
      
      if (acceptedDelivery) {
        setUpcomingDeliveries(prev => [{
          ...acceptedDelivery,
          driverId: driver.id,
          status: 'accepted' as const,
          chatActivatedAt: new Date(),
          acceptedAt: new Date()
        }, ...prev]);
      }
      
      showToast('Delivery accepted successfully!', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to accept delivery';
      showToast(message, 'error');
      await loadRequestDeliveries(driver.id);
    }
  };

  const handleUpdateStatus = async (deliveryId: string, newStatus: string) => {
    if (!driver) return;

    try {
      const updateData: { status: string; completedAt?: string } = { status: newStatus };
      if (newStatus === 'completed') {
        updateData.completedAt = new Date().toISOString();
      }

      await api.deliveries.update(deliveryId, updateData);

      if (newStatus === 'completed') {
        setUpcomingDeliveries(prev => prev.filter(d => d.id !== deliveryId));
        const completedDelivery = upcomingDeliveries.find(d => d.id === deliveryId);
        if (completedDelivery) {
          setRecentDeliveries(prev => [{
            ...completedDelivery,
            status: 'completed' as const,
            completedAt: new Date()
          }, ...prev]);
        }
      } else {
        loadUpcomingDeliveries(driver.id);
      }

      showToast('Status updated successfully!', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      showToast(message, 'error');
    }
  };

  const toggleAvailability = async () => {
    if (!driver) return;

    try {
      await api.drivers.update(driver.id, { isAvailable: !driver.isAvailable });
      setDriver({ ...driver, isAvailable: !driver.isAvailable } as Driver);
      showToast(
        `You are now ${!driver.isAvailable ? 'available' : 'unavailable'}`,
        'success'
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update availability';
      showToast(message, 'error');
    }
  };

  const handleSaveProfile = async (updatedDriver: Partial<Driver>) => {
    if (!driver) return;

    try {
      await api.drivers.update(driver.id, updatedDriver);
      setDriver({ ...driver, ...updatedDriver });
      showToast('Profile updated successfully!', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      showToast(message, 'error');
      throw err;
    }
  };

  if (loading && !driver) {
    return (
      <div className="min-h-screen bg-gray-50 pb-12">
        <div className="bg-white shadow-md sticky top-16 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="h-10 w-64 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="min-h-screen bg-gray-50 pb-12">
        <div className="bg-white shadow-md sticky top-16 z-40">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-3xl font-bold">Driver profile not found</h1>
            <p className="text-gray-600 mt-2">
              We couldn&apos;t load your driver profile. Please finish registration or contact support.
            </p>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
            <EmptyState
              icon={UserCircle}
              title="Profile Not Found"
              description="Your driver profile could not be loaded. Please contact support for assistance."
            />
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50 pb-12 bounce-scroll">
      <div className="bg-white shadow-md sticky top-16 z-40">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 truncate">Welcome, {driver?.name}</h1>
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                {driver?.canDriveManual ? 'Manual OK' : 'Auto only'} | {driver?.radius} mi radius
              </p>
            </div>
            <div className="flex gap-2 sm:gap-3 items-center">
              <button
                onClick={() => navigate('/conversations')}
                className="touch-target relative p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                title="All Conversations"
              >
                <MessageCircle size={20} />
                <UnreadBadge count={unreadCount} variant="button" />
              </button>
              <button
                onClick={() => setIsEditProfileOpen(true)}
                className="touch-target p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                title="Edit Profile"
              >
                <Settings size={20} />
              </button>
              <button
                onClick={toggleAvailability}
                className={`touch-target active-press px-4 sm:px-6 py-2 rounded-lg font-semibold transition text-sm sm:text-base ${
                  driver?.isAvailable
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                {driver?.isAvailable ? 'Available' : 'Unavailable'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        <OnboardingChecklist role="driver" />
        
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveTab('requests')}
                className={`px-4 sm:px-6 py-3 sm:py-4 font-semibold transition flex items-center whitespace-nowrap relative touch-target ${
                  activeTab === 'requests'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                <Inbox size={18} className="mr-1.5 sm:mr-2 flex-shrink-0" />
                <span className="hidden xs:inline sm:inline">Requests</span>
                <span className="inline xs:hidden sm:hidden">Req</span>
                {requestDeliveries.length > 0 && (
                  <span className="absolute -top-1 -right-1 sm:static sm:ml-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                    {requestDeliveries.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`px-4 sm:px-6 py-3 sm:py-4 font-semibold transition flex items-center whitespace-nowrap touch-target ${
                  activeTab === 'upcoming'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                <Clock size={18} className="mr-1.5 sm:mr-2 flex-shrink-0" />
                <span className="hidden xs:inline">Upcoming</span>
                <span className="inline xs:hidden">Up</span>
                {upcomingDeliveries.length > 0 && (
                  <span className="ml-1.5 sm:ml-2 bg-blue-100 text-blue-600 text-xs font-bold px-2 py-1 rounded-full">
                    {upcomingDeliveries.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('recent')}
                className={`px-4 sm:px-6 py-3 sm:py-4 font-semibold transition flex items-center whitespace-nowrap touch-target ${
                  activeTab === 'recent'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                <CheckCircle2 size={18} className="mr-1.5 sm:mr-2 flex-shrink-0" />
                <span className="hidden xs:inline">Recent</span>
                <span className="inline xs:hidden">Rec</span>
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`px-4 sm:px-6 py-3 sm:py-4 font-semibold transition flex items-center whitespace-nowrap touch-target ${
                  activeTab === 'search'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                <Search size={18} className="mr-1.5 sm:mr-2 flex-shrink-0" />
                <span className="hidden xs:inline sm:inline">Search</span>
                <span className="inline xs:hidden sm:hidden">Find</span>
              </button>
              <button
                onClick={() => setActiveTab('dealerships')}
                className={`px-4 sm:px-6 py-3 sm:py-4 font-semibold transition flex items-center whitespace-nowrap touch-target ${
                  activeTab === 'dealerships'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                <Building2 size={18} className="mr-1.5 sm:mr-2 flex-shrink-0" />
                <span className="hidden xs:inline">Dealers</span>
                <span className="inline xs:hidden">My</span>
                {approvedDealerships.length > 0 && (
                  <span className="ml-1.5 sm:ml-2 bg-gray-100 text-gray-700 text-xs font-bold px-2 py-1 rounded-full">
                    {approvedDealerships.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'requests' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      realtimeStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                      realtimeStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                      'bg-red-500'
                    }`} />
                    <span className="text-sm font-medium text-gray-700">
                      {realtimeStatus === 'connected' ? 'Real-time Connected' :
                       realtimeStatus === 'connecting' ? 'Connecting...' :
                       'Offline - Using Polling'}
                    </span>
                  </div>
                  {lastUpdateTime && (
                    <span className="text-xs text-gray-500">
                      Last update: {lastUpdateTime.toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleManualRefresh}
                  disabled={loadingRequests}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <svg
                    className={`w-4 h-4 ${loadingRequests ? 'animate-spin' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Refresh</span>
                </button>
              </div>
            </div>
            {approvedDealerships.length === 0 ? (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <EmptyState
                  icon={FileCheck}
                  title="No approved dealerships"
                  description="Once a dealership approves your application, their delivery requests will appear here"
                />
              </div>
            ) : requestDeliveries.length === 0 ? (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <EmptyState
                  icon={Inbox}
                  title="No available requests"
                  description="New delivery requests from your approved dealerships will appear here"
                />
              </div>
            ) : (
              <>
                {approvedDealerships.length > 1 && (
                  <DealershipFilter
                    dealerships={approvedDealerships.map(ad => ad.dealer)}
                    selectedDealershipId={selectedDealershipId}
                    onSelectDealership={setSelectedDealershipId}
                    dealershipColors={dealershipColors}
                    requestCounts={requestDeliveries.reduce((map, delivery) => {
                      const count = map.get(delivery.dealerId) || 0;
                      map.set(delivery.dealerId, count + 1);
                      return map;
                    }, new Map<string, number>())}
                  />
                )}

                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-bold mb-6 flex items-center">
                    <Inbox size={28} className="mr-3 text-red-600" />
                    Available Requests
                    {selectedDealershipId && (
                      <span className="ml-3 text-sm font-normal text-gray-600">
                        for {approvedDealerships.find(ad => ad.dealer.id === selectedDealershipId)?.dealer.name}
                      </span>
                    )}
                  </h2>

                  <div className="space-y-4">
                    {requestDeliveries
                      .filter(delivery => !selectedDealershipId || delivery.dealerId === selectedDealershipId)
                      .map((delivery) => (
                        <DealershipRequestCard
                          key={delivery.id}
                          delivery={delivery}
                          onAccept={handleAcceptDelivery}
                          onDecline={handleDeclineDelivery}
                          dealerColor={getDealershipColor(delivery.dealerId)}
                        />
                      ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'upcoming' && (
          <div className="space-y-6">
            {upcomingDeliveries.length === 0 ? (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center">
                  <Clock size={28} className="mr-3 text-red-600" />
                  Upcoming Drives
                </h2>
                <EmptyState
                  icon={Clock}
                  title="No upcoming drives"
                  description="Accept a request from the Requests tab to see it here"
                />
              </div>
            ) : (
              <>
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold flex items-center">
                      <Clock size={28} className="mr-3 text-red-600" />
                      Upcoming Drives
                    </h2>
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setUpcomingViewMode('list')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold transition ${
                          upcomingViewMode === 'list'
                            ? 'bg-white text-red-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <List size={18} />
                        List
                      </button>
                      <button
                        onClick={() => setUpcomingViewMode('calendar')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold transition ${
                          upcomingViewMode === 'calendar'
                            ? 'bg-white text-red-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <LayoutGrid size={18} />
                        Calendar
                      </button>
                    </div>
                  </div>

                  {upcomingViewMode === 'list' ? (
                    <div className="space-y-4">
                      {upcomingDeliveries.map((delivery) => (
                        <Card key={delivery.id} hover>
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <p className="font-bold text-lg">VIN: {delivery.vin}</p>
                                <span className="text-xs bg-gray-100 px-3 py-1 rounded-full font-semibold text-gray-700">
                                  {delivery.dealer.name}
                                </span>
                                {delivery.sales?.name && (
                                  <span className="text-xs bg-blue-100 px-3 py-1 rounded-full font-semibold text-blue-700">
                                    {delivery.sales.name}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center text-sm text-gray-600 mb-1">
                                <MapPin size={16} className="mr-2 text-gray-400" />
                                <span className="font-medium">Pickup:</span>
                                <span className="ml-2">{delivery.pickup}</span>
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <MapPin size={16} className="mr-2 text-gray-400" />
                                <span className="font-medium">Dropoff:</span>
                                <span className="ml-2">{delivery.dropoff}</span>
                              </div>
                            </div>
                            <StatusBadge status={(delivery.status ?? 'pending') as 'pending' | 'accepted' | 'in_progress' | 'completed'} size="md" />
                          </div>
                          {delivery.scheduledDate && delivery.scheduledTime && (
                            <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                              <div className="flex items-center gap-2 mb-2">
                                <CalendarIcon size={16} className="text-green-600" />
                                <p className="text-xs font-bold text-green-900">Schedule Confirmed</p>
                              </div>
                              <p className="text-sm font-semibold text-gray-900">
                                {new Date(delivery.scheduledDate).toLocaleDateString('en-US', {
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric'
                                })} at {delivery.scheduledTime}
                              </p>
                            </div>
                          )}
                          {delivery.notes && (
                            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                              <p className="text-sm text-gray-700">{delivery.notes}</p>
                            </div>
                          )}
                          <div className="flex gap-3 flex-wrap">
                            {(delivery.status === 'accepted' || delivery.status === 'assigned') && (
                              <button
                                onClick={() => handleUpdateStatus(delivery.id, 'in_progress')}
                                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition shadow-sm hover:shadow-md"
                              >
                                Start Drive
                              </button>
                            )}
                            {delivery.status === 'in_progress' && (
                              <button
                                onClick={() => handleUpdateStatus(delivery.id, 'completed')}
                                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition shadow-sm hover:shadow-md"
                              >
                                Drive Complete
                              </button>
                            )}
                            <DeliveryCardWithChat
                              deliveryId={delivery.id}
                            />
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Calendar
                      deliveries={upcomingDeliveries}
                      onDeliveryClick={(deliveryId) => navigate(`/chat/${deliveryId}`)}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'recent' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <CheckCircle2 size={28} className="mr-3 text-red-600" />
              Recent Drives
            </h2>

            {recentDeliveries.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No recent drives"
                description="Your completed deliveries will appear here"
              />
            ) : (
              <div className="space-y-4">
                {recentDeliveries.map((delivery) => (
                  <Card key={delivery.id}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <p className="font-bold text-lg">VIN: {delivery.vin}</p>
                          <span className="text-xs bg-gray-100 px-3 py-1 rounded-full font-semibold text-gray-700">
                            {delivery.dealer.name}
                          </span>
                          {delivery.sales?.name && (
                            <span className="text-xs bg-blue-100 px-3 py-1 rounded-full font-semibold text-blue-700">
                              {delivery.sales.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center text-sm text-gray-600 mb-1">
                          <MapPin size={16} className="mr-2 text-gray-400" />
                          <span>{delivery.pickup} → {delivery.dropoff}</span>
                        </div>
                        {delivery.completedAt && (
                          <p className="text-xs text-gray-500 mt-2">
                            Completed on {new Date(delivery.completedAt).toLocaleDateString()} at {new Date(delivery.completedAt).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                      <StatusBadge status="completed" size="md" />
                    </div>
                    {delivery.notes && (
                      <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-sm text-gray-700">{delivery.notes}</p>
                      </div>
                    )}
                    <DeliveryCardWithChat
                      deliveryId={delivery.id}
                      buttonLabel="View Chat History"
                      buttonClass="w-full px-4 py-2.5 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg font-medium hover:bg-gray-200 transition flex items-center justify-center"
                    />
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <DealershipSearch driverId={driver.id} showToast={showToast} />
          </div>
        )}

        {activeTab === 'dealerships' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <MyDealerships
              approvedDealerships={approvedDealerships}
              dealershipColors={dealershipColors}
              onSelectDealership={setSelectedDealershipId}
              onNavigateToTab={setActiveTab}
            />
          </div>
        )}
      </div>

      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        driver={driver}
        onSave={handleSaveProfile}
      />
    </div>
  );
}
