import { toast as sonnerToast } from 'sonner';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import iosSoundFile from '@/assets/sounds/ios-ding.mp3';
// 1. Play the notification sound
const playIosSound = () => {
  // Use the imported local file instead of a web URL!
  const audio = new Audio(iosSoundFile);
  audio.volume = 0.5; // Adjust from 0.0 to 1.0 depending on how loud the mp3 is
  
  audio.play().catch(e => console.log('Audio muted by browser policy:', e));
};

// 2. Trigger Native Capacitor Haptics
const triggerHaptic = async (type: 'success' | 'error' | 'info' | 'warning') => {
  try {
    switch (type) {
      case 'success':
      case 'info':
        // A light, crisp native tick
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'warning':
        // A native warning pattern
        await Haptics.notification({ type: NotificationType.Warning });
        break;
      case 'error':
        // A heavy native error buzz
        await Haptics.notification({ type: NotificationType.Error });
        break;
    }
  } catch (error) {
    // FALLBACK: If the native plugin isn't available (like testing on a desktop web browser)
    if (typeof window !== 'undefined' && navigator.vibrate) {
      if (type === 'success' || type === 'info') navigator.vibrate(50);
      else if (type === 'warning') navigator.vibrate([50, 50, 50]);
      else navigator.vibrate([100, 50, 100]);
    }
  }
};

// 3. Helper to fire both sound and vibration
const notifyDevice = (type: 'success' | 'error' | 'info' | 'warning') => {
  playIosSound();
  triggerHaptic(type);
};

// 4. The Exported Custom Toast
export const toast = {
  success: (message: string, data?: any) => {
    notifyDevice('success');
    return sonnerToast.success(message, data);
  },
  error: (message: string, data?: any) => {
    notifyDevice('error');
    return sonnerToast.error(message, data);
  },
  info: (message: string, data?: any) => {
    notifyDevice('info');
    return sonnerToast.info(message, data);
  },
  warning: (message: string, data?: any) => {
    notifyDevice('warning');
    return sonnerToast.warning(message, data);
  },
  raw: sonnerToast,
};