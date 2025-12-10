import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
} from 'react';

import { User } from '@supabase/supabase-js';
import { supabase, UserRole, Sales, Driver, Dealership } from '../lib/supabase';
import { getUserRole } from '../lib/auth';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import { checkAndAcceptPendingInvitations } from '../lib/adminInvitations';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  sales: Sales | null;
  driver: Driver | null;
  dealer: Dealership | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  sales: null,
  driver: null,
  dealer: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [salesProfile, setSalesProfile] = useState<Sales | null>(null);
  const [driverProfile, setDriverProfile] = useState<Driver | null>(null);
  const [dealerProfile, setDealerProfile] = useState<Dealership | null>(null);
  const { showToast } = useToast();

  const handleTimeout = () => {
    showToast('Your session has expired due to inactivity. Please log in again.', 'warning');
    window.location.href = '/login';
  };

  useSessionTimeout(handleTimeout);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setUser(session?.user ?? null);

        if (session?.user) {
          await processUserLogin(session.user);
        } else {
          setRole(null);
        }
      } catch (err) {
        console.error('Error loading session:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSession();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setLoading(true);
        setUser(session?.user ?? null);

        if (session?.user) {
          await processUserLogin(session.user);
        } else {
          setRole(null);
          setSalesProfile(null);
          setDriverProfile(null);
          setDealerProfile(null);
        }

        setLoading(false);
      })();
    });

    return () => {
      isMounted = false;
      data?.subscription?.unsubscribe?.();
    };
  }, []);

  const loadProfiles = async (userId: string, detectedRole: UserRole | null) => {
    setSalesProfile(null);
    setDriverProfile(null);
    setDealerProfile(null);

    if (!detectedRole) return;

    try {
      if (detectedRole === 'dealer') {
        const { data, error } = await supabase
          .from('dealerships')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        if (error) throw error;
        if (data) setDealerProfile(data as Dealership);
      }

      if (detectedRole === 'sales') {
        const { data, error } = await supabase
          .from('sales_staff')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        if (error) throw error;
        if (data) setSalesProfile(data as Sales);
      }

      if (detectedRole === 'driver') {
        const { data, error } = await supabase
          .from('drivers')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        if (error) throw error;
        if (data) setDriverProfile(data as Driver);
      }
    } catch (profileError) {
      console.error('Error loading profile data:', profileError);
    }
  };

  const processUserLogin = async (user: User) => {
    try {
      if (!user.email) {
        const detectedRole = await getUserRole({
          onRoleMissing: (message) => showToast(message, 'error'),
        });
        setRole(detectedRole);
        await loadProfiles(user.id, detectedRole);
        return;
      }

      const { accepted, errors } = await checkAndAcceptPendingInvitations(
        user.email,
        user.id
      );

      if (accepted.length > 0) {
        console.log(`Accepted ${accepted.length} admin invitation(s).`);
      }

      if (errors.length > 0) {
        console.error('Invitation errors:', errors);
      }

      const detectedRole = await getUserRole({
        onRoleMissing: (message) => showToast(message, 'error'),
      });
      setRole(detectedRole);
      await loadProfiles(user.id, detectedRole);
    } catch (err) {
      console.error('Error processing user login:', err);
      setRole(null);
      setSalesProfile(null);
      setDriverProfile(null);
      setDealerProfile(null);
    }
  };

  const value = useMemo(
    () => ({
      user,
      role,
      loading,
      sales: salesProfile,
      driver: driverProfile,
      dealer: dealerProfile,
    }),
    [user, role, loading, salesProfile, driverProfile, dealerProfile]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
