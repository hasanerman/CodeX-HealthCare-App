import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

export type User = {
  id: number;
  name: string;
  email: string;
  height: string | null;
  weight: string | null;
  age: number | null;
  gender: string | null;
  bmi_interpretation?: string | null;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const BASE_URL = 'http://YOR_SERVER_IP:{PORT}/api';

// Configure notifications display
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const registerDeviceNotification = async (authToken: string) => {
    if (!Device.isDevice) {
      console.log('Bildirimler yalnızca fiziksel cihazlarda çalışır.');
      return;
    }

    if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
      console.warn('NOT: Android Push bildirimleri Expo Go SDK 53+ üzerinde kısıtlıdır. Gerçek bildirim almak için bir "Development Build" gereklidir.');
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Bildirim izni reddedildi.');
        return;
      }

      // Check for projectId
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      
      if (!projectId) {
        console.error('Hata: app.json içinde "projectId" bulunamadı. Bildirim servisi aktif olamaz.');
        return;
      }

      const expoPushToken = (await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      })).data;

      console.log('Cihaz Token Kaydı Başlatılıyor:', expoPushToken);

      await fetch(`${BASE_URL}/notify/register-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ expoPushToken }),
      });
    } catch (error) {
      console.error('Bildirim Sistemi Kayıt Hatası (Kritik değil):', error);
    }
  };

  const unregisterDeviceNotification = async (authToken: string) => {
    try {
      await fetch(`${BASE_URL}/notify/register-device`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({}),
      });
    } catch (error) {
      console.error('Bildirim Silme Hatası:', error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Sunucu Yanıtı (JSON değil):', text.substring(0, 500));
        Alert.alert('Giriş Hatası', 'Sunucu geçersiz bir format döndürdü. Lütfen API adresini kontrol edin.');
        return false;
      }

      const data = await response.json();

      if (response.ok) {
        setToken(data.token);
        setUser(data.user);
        // Register device for notifications safely
        registerDeviceNotification(data.token);
        return true;
      } else {
        Alert.alert('Giriş Hatası', data.error || 'Geçersiz email veya şifre.');
        return false;
      }
    } catch (error: any) {
      Alert.alert('Bağlantı Hatası', `Sunucuya bağlanılamadı: ${error.message}`);
      return false;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Başarılı', 'Kayıt başarılı. Şimdi giriş yapabilirsiniz.');
        return true;
      } else {
        Alert.alert('Kayıt Hatası', data.error || 'Kayıt sırasında bir hata oluştu.');
        return false;
      }
    } catch (error) {
      Alert.alert('Bağlantı Hatası', 'Sunucuya bağlanılamadı.');
      return false;
    }
  };

  const logout = () => {
    if (token) unregisterDeviceNotification(token);
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
