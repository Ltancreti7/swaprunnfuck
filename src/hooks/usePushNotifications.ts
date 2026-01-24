import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { useNavigate } from 'react-router-dom';

interface UsePushNotificationsOptions {
  userId?: string;
  onNotificationReceived?: (notification: PushNotificationSchema) => void;
  onNotificationAction?: (action: ActionPerformed) => void;
}

export function usePushNotifications(options: UsePushNotificationsOptions = {}) {
  const { userId, onNotificationReceived, onNotificationAction } = options;
  const navigate = useNavigate();
  const initialized = useRef(false);

  useEffect(() => {
    if (!userId || initialized.current) return;
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
            const response = await fetch('/api/push-tokens', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                token: token.value,
                platform: Capacitor.getPlatform(),
              }),
            });
            
            if (response.ok) {
              console.log('Push token registered with server');
            } else {
              console.error('Failed to register push token:', await response.text());
            }
          } catch (error) {
            console.error('Error registering push token:', error);
          }
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('Push registration error:', error.error);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push notification received:', notification);
          onNotificationReceived?.(notification);
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('Push notification action performed:', action);
          onNotificationAction?.(action);
          
          const data = action.notification.data;
          if (data?.deliveryId && data?.type) {
            switch (data.type) {
              case 'new_delivery':
              case 'delivery_status':
              case 'driver_accepted':
                navigate(`/delivery/${data.deliveryId}`);
                break;
              case 'new_message':
                navigate(`/chat/${data.deliveryId}`);
                break;
              case 'driver_application':
                navigate('/dashboard');
                break;
              case 'application_decision':
                navigate('/dashboard');
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
  }, [userId, navigate, onNotificationReceived, onNotificationAction]);

  const unregisterToken = async (token: string) => {
    try {
      await fetch('/api/push-tokens', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token }),
      });
    } catch (error) {
      console.error('Error unregistering push token:', error);
    }
  };

  return { unregisterToken };
}
