import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

export function PushNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const initialized = useRef(false);

  useEffect(() => {
    if (!user?.id || initialized.current) return;
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const initializePushNotifications = async () => {
      try {
        let permissionStatus = await PushNotifications.checkPermissions();
        
        if (permissionStatus.receive === 'prompt') {
          permissionStatus = await PushNotifications.requestPermissions();
        }

        if (permissionStatus.receive !== 'granted') {
          console.log('Push notification permission denied');
          return;
        }

        await PushNotifications.register();

        PushNotifications.addListener('registration', async (token) => {
          console.log('Push registration success, token:', token.value);
          try {
            await api.pushTokens.register(token.value, Capacitor.getPlatform());
            console.log('Push token registered with server');
          } catch (error) {
            console.error('Error registering push token:', error);
          }
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('Push registration error:', error.error);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push notification received:', notification);
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('Push notification action performed:', action);
          
          const data = action.notification.data;
          if (data?.type) {
            switch (data.type) {
              case 'new_delivery':
              case 'delivery_status':
              case 'driver_accepted':
              case 'driver_application':
              case 'application_decision':
                // Navigate to role-appropriate dashboard (user is already authenticated)
                const role = user?.role;
                if (role === 'dealer') {
                  navigate('/dealer');
                } else if (role === 'sales') {
                  navigate('/sales');
                } else if (role === 'driver') {
                  navigate('/driver');
                }
                break;
              case 'new_message':
                if (data.deliveryId) {
                  navigate(`/chat/${data.deliveryId}`);
                }
                break;
            }
          }
        });

        initialized.current = true;
      } catch (error) {
        console.error('Error initializing push notifications:', error);
      }
    };

    initializePushNotifications();

    return () => {
      PushNotifications.removeAllListeners();
      initialized.current = false;
    };
  }, [user?.id, navigate]);

  return <>{children}</>;
}
