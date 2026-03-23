import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { toast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client'; // Import Supabase
import { useAuth } from '@/contexts/AuthContext'; // Import Auth to get the user ID

export const usePushNotifications = () => {
  const { user } = useAuth(); // Get the currently logged-in user

  useEffect(() => {
    // Push notifications only work on physical mobile devices
    if (Capacitor.getPlatform() !== 'android' && Capacitor.getPlatform() !== 'ios') {
      return;
    }

    // Don't register if we don't have a logged-in user yet
    if (!user?.id) return; 

    const registerPush = async () => {
      // 1. Request Permission
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('User denied push notification permission');
        return;
      }

      // 2. Register with Firebase
      await PushNotifications.register();

      // 3. Listen for successful registration & SAVE TO SUPABASE
      PushNotifications.addListener('registration', async (token) => {
        console.log('Push registration success! Token: ', token.value);
        
        // 🚀 NEW: Save this token to the user's profile automatically!
        const { error } = await supabase
          .from('profiles')
          .update({ fcm_token: token.value })
          .eq('id', user.id);

        if (error) {
          console.error('❌ Error saving FCM token to Supabase:', error);
        } else {
          console.log('✅ FCM token saved to Supabase successfully!');
        }
      });

      // 4. Listen for errors
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Error on registration: ', error);
      });

      // 5. Listen for notifications received while the app is OPEN (Foreground)
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received: ', notification);
        toast.info(notification.title || 'New Notification', {
          description: notification.body,
        });
      });

      // 6. Listen for when the user taps on a notification in their system tray
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push action performed: ', notification);
      });
    };

    registerPush();

    // Cleanup listeners on unmount
    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [user?.id]); // Re-run if the user changes (e.g., logging out and logging back in)
};