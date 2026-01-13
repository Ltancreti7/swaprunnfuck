import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CheckCircle2, Inbox, Building2, Search, Truck, Play, X, MessageCircle, Settings, Mail, Phone, Star, MapPinned } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../lib/api';
import type { Driver, Delivery, Dealer, ApprovedDriverDealer } from '../../shared/schema';
import { StatusBadge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { DashboardSkeleton } from '../components/ui/LoadingSkeleton';
import { DealershipSearch } from '../components/driver/DealershipSearch';
import { EditProfileModal } from '../components/driver/EditProfileModal';
import { OnboardingChecklist } from '../components/OnboardingChecklist';
import { useUnreadMessagesCount } from '../hooks/useUnreadMessagesCount';

interface DeliveryWithDealer extends Delivery {
  dealer: Dealer;
  sales?: { name: string } | null;
}

interface DealershipWithStats extends ApprovedDriverDealer {
  dealer: Dealer;
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
  const [approvedDealerships, setApprovedDealerships] = useState<DealershipWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'action' | 'history' | 'dealerships'>('action');
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [showDealerSearch, setShowDealerSearch] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) loadDriverData();
  }, [user]);

  useEffect(() => {
    if (!user || !driver) return;
    const POLLING_INTERVAL = 15000;
    let isVisible = true;

    const pollDeliveries = async () => {
      if (!isVisible) return;
      try {
        await Promise.all([
          loadRequestDeliveries(driver.id),
          loadUpcomingDeliveries(driver.id),
        ]);
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    const handleVisibility = () => {
      isVisible = document.visibilityState === 'visible';
      if (isVisible) pollDeliveries();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    pollingIntervalRef.current = setInterval(pollDeliveries, POLLING_INTERVAL);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
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
          loadApprovedDealerships(driverData.id),
        ]);
      }
    } catch (error) {
      console.error('Error loading driver data:', error);
    }
    setLoading(false);
  };

  const loadRequestDeliveries = async (driverId: string) => {
    try {
      const data = await api.deliveries.requestsForDriver(driverId);
      setRequestDeliveries((data || []) as DeliveryWithDealer[]);
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  };

  const loadUpcomingDeliveries = async (driverId: string) => {
    try {
      const data = await api.deliveries.byDriver(driverId, 'accepted,assigned,in_progress');
      setUpcomingDeliveries((data || []) as DeliveryWithDealer[]);
    } catch (error) {
      console.error('Error loading upcoming:', error);
    }
  };

  const loadRecentDeliveries = async (driverId: string) => {
    try {
      const data = await api.deliveries.byDriver(driverId, 'completed');
      setRecentDeliveries(((data || []) as DeliveryWithDealer[]).slice(0, 10));
    } catch (error) {
      console.error('Error loading recent:', error);
    }
  };

  const loadApprovedDealerships = async (driverId: string) => {
    try {
      const data = await api.approvedDriverDealers.byDriver(driverId);
      setApprovedDealerships((data || []) as DealershipWithStats[]);
    } catch (error) {
      console.error('Error loading dealerships:', error);
    }
  };

  const handleAcceptDelivery = async (deliveryId: string) => {
    if (!driver) return;
    try {
      await api.deliveries.accept(deliveryId, driver.id);
      showToast('Delivery accepted!', 'success');
      await loadRequestDeliveries(driver.id);
      await loadUpcomingDeliveries(driver.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to accept delivery', 'error');
    }
  };

  const handleDeclineDelivery = async (deliveryId: string) => {
    if (!driver) return;
    try {
      await api.deliveries.decline(deliveryId, driver.id);
      showToast('Delivery declined', 'info');
      await loadRequestDeliveries(driver.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to decline', 'error');
    }
  };

  const toggleAvailability = async () => {
    if (!driver) return;
    try {
      const newStatus = !driver.isAvailable;
      await api.drivers.update(driver.id, { isAvailable: newStatus });
      setDriver({ ...driver, isAvailable: newStatus });
      showToast(newStatus ? "You're now available" : "You're now offline", 'success');
    } catch (err) {
      showToast('Failed to update availability', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <DashboardSkeleton />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Driver Profile Not Found</h2>
          <p className="text-gray-600">Please complete your registration.</p>
        </Card>
      </div>
    );
  }

  const nextDelivery = upcomingDeliveries[0];
  const initials = driver.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'D';
  const verifiedCount = approvedDealerships.filter(d => d.isVerified).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold backdrop-blur">
                {initials}
              </div>
              <span className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-gray-800 ${driver.isAvailable ? 'bg-green-500' : 'bg-gray-500'}`} />
            </div>
            <div className="flex-1 text-white">
              <h1 className="text-2xl font-bold">{driver.name}</h1>
              <p className="text-gray-300 flex items-center gap-2 mt-1">
                <Truck size={16} />
                Independent Driver
              </p>
              <div className="flex items-center gap-3 mt-2">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${driver.isAvailable ? 'bg-green-500/20 text-green-300' : 'bg-gray-600 text-gray-300'}`}>
                  {driver.isAvailable ? 'Available' : 'Offline'}
                </span>
                {driver.canDriveManual && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                    Manual Trans
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigate('/messages')}
                className="relative p-3 bg-white/20 rounded-full hover:bg-white/30 transition text-white"
                data-testid="button-messages"
              >
                <MessageCircle size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition text-white"
                data-testid="button-settings"
              >
                <Settings size={20} />
              </button>
            </div>
          </div>
          
          {/* Contact & Stats */}
          <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <Mail size={14} />
              {driver.email}
            </div>
            {driver.phone && (
              <div className="flex items-center gap-2">
                <Phone size={14} />
                {driver.phone}
              </div>
            )}
            <div className="flex items-center gap-2">
              <MapPinned size={14} />
              {driver.radius || 50} mi radius
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container mx-auto px-4 -mt-6">
        <div className="grid grid-cols-4 gap-2">
          <Card className="p-3 text-center shadow-lg">
            <p className="text-xl font-bold text-red-600">{requestDeliveries.length}</p>
            <p className="text-xs text-gray-600">Requests</p>
          </Card>
          <Card className="p-3 text-center shadow-lg">
            <p className="text-xl font-bold text-blue-600">{upcomingDeliveries.length}</p>
            <p className="text-xs text-gray-600">Active</p>
          </Card>
          <Card className="p-3 text-center shadow-lg">
            <p className="text-xl font-bold text-green-600">{recentDeliveries.length}</p>
            <p className="text-xs text-gray-600">Completed</p>
          </Card>
          <Card className="p-3 text-center shadow-lg">
            <p className="text-xl font-bold text-purple-600">{verifiedCount}</p>
            <p className="text-xs text-gray-600">Verified</p>
          </Card>
        </div>
      </div>

      {/* Availability Toggle */}
      <div className="container mx-auto px-4 py-4">
        <button
          onClick={toggleAvailability}
          className={`w-full py-4 rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-lg ${
            driver.isAvailable
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
          data-testid="button-toggle-availability"
        >
          {driver.isAvailable ? 'Go Offline' : 'Go Online - Start Accepting Jobs'}
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex gap-1">
            {[
              { id: 'action', label: 'Jobs', count: requestDeliveries.length },
              { id: 'history', label: 'History' },
              { id: 'dealerships', label: 'Dealerships', count: approvedDealerships.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-4 font-medium transition border-b-2 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'text-red-600 border-red-600'
                    : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <OnboardingChecklist role="driver" />
        
        {/* JOBS TAB */}
        {activeTab === 'action' && (
          <div className="space-y-6">
            {/* Next Delivery Card */}
            {nextDelivery && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Your Next Delivery</h2>
                <Card className="p-4 border-l-4 border-l-green-500">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-lg">
                        {nextDelivery.year} {nextDelivery.make} {nextDelivery.model}
                      </p>
                      <p className="text-sm text-gray-600">{nextDelivery.dealer?.name}</p>
                    </div>
                    <StatusBadge status={(nextDelivery.status || 'assigned') as any} />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin size={16} className="text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-gray-600">Pickup</p>
                        <p className="font-medium">{nextDelivery.pickup}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin size={16} className="text-red-500 mt-0.5" />
                      <div>
                        <p className="text-gray-600">Dropoff</p>
                        <p className="font-medium">{nextDelivery.dropoff}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/delivery/${nextDelivery.id}`)}
                    className="w-full mt-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
                    data-testid="button-start-delivery"
                  >
                    <Play size={20} />
                    View Delivery
                  </button>
                </Card>
              </div>
            )}

            {/* Pending Requests */}
            <div>
              <h2 className="text-lg font-semibold mb-3">
                Delivery Requests {requestDeliveries.length > 0 && `(${requestDeliveries.length})`}
              </h2>
              {requestDeliveries.length === 0 ? (
                <Card className="p-6 text-center">
                  <Inbox className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No pending requests</p>
                  <p className="text-sm text-gray-500 mt-1">New delivery requests will appear here</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {requestDeliveries.map((delivery) => (
                    <Card key={delivery.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold">{delivery.year} {delivery.make} {delivery.model}</p>
                          <p className="text-sm text-gray-600">{delivery.dealer?.name}</p>
                        </div>
                        <StatusBadge status="pending" />
                      </div>
                      <p className="text-sm text-gray-600 mb-1">VIN: {delivery.vin}</p>
                      <p className="text-sm text-gray-600 mb-3">To: {delivery.dropoff}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptDelivery(delivery.id)}
                          className="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
                          data-testid={`button-accept-${delivery.id}`}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDeclineDelivery(delivery.id)}
                          className="flex-1 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition"
                          data-testid={`button-decline-${delivery.id}`}
                        >
                          Decline
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Deliveries */}
            {upcomingDeliveries.length > 1 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Upcoming ({upcomingDeliveries.length - 1})</h2>
                <div className="space-y-3">
                  {upcomingDeliveries.slice(1).map((delivery) => (
                    <Card key={delivery.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{delivery.year} {delivery.make} {delivery.model}</p>
                          <p className="text-sm text-gray-600">{delivery.dealer?.name}</p>
                        </div>
                        <button
                          onClick={() => navigate(`/delivery/${delivery.id}`)}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
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
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Completed Deliveries</h2>
            {recentDeliveries.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No completed deliveries"
                description="Your completed deliveries will appear here"
              />
            ) : (
              <div className="space-y-3">
                {recentDeliveries.map((delivery) => (
                  <Card key={delivery.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{delivery.year} {delivery.make} {delivery.model}</p>
                        <p className="text-sm text-gray-600">{delivery.dealer?.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {delivery.completedAt && new Date(delivery.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <StatusBadge status="completed" />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DEALERSHIPS TAB */}
        {activeTab === 'dealerships' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your Dealerships</h2>
              <button
                onClick={() => setShowDealerSearch(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition flex items-center gap-2"
                data-testid="button-find-dealerships"
              >
                <Search size={18} />
                Find More
              </button>
            </div>

            {approvedDealerships.length === 0 ? (
              <Card className="p-8 text-center">
                <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Dealerships Yet</h3>
                <p className="text-gray-600 mb-4">Apply to dealerships to start receiving delivery requests</p>
                <button
                  onClick={() => setShowDealerSearch(true)}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                >
                  Find Dealerships
                </button>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {approvedDealerships.map((item) => (
                  <Card key={item.dealerId} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{item.dealer?.name}</p>
                        <p className="text-sm text-gray-600">{item.dealer?.address}</p>
                        {item.isVerified && (
                          <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full mt-2">
                            <Star size={12} />
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dealership Search Modal */}
      {showDealerSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-lg sm:rounded-lg w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white flex items-center justify-between">
              <h2 className="text-xl font-semibold">Find Dealerships</h2>
              <button onClick={() => setShowDealerSearch(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <DealershipSearch
                driverId={driver.id}
                showToast={showToast}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditProfileOpen && driver && (
        <EditProfileModal
          isOpen={isEditProfileOpen}
          driver={driver}
          onClose={() => setIsEditProfileOpen(false)}
          onSave={async (updates) => {
            await api.drivers.update(driver.id, updates);
            setDriver({ ...driver, ...updates });
            showToast('Profile updated!', 'success');
          }}
        />
      )}
    </div>
  );
}
