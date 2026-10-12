import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { DriverProfile, Settings } from '@/types';

interface AuthState {
  user: { id: string; username: string; email?: string } | null;
  profile: DriverProfile | null;
  settings: Settings | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const defaultSettings: Settings = {
  id: '',
  user_id: 'mock-user-id',
  normal_rate: 1.60,
  express_rate: 3.60,
  saturday_hourly_rate: 48.14,
  theme: 'light',
  updated_at: '',
};

const API_BASE = '/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  // Mock user - authentication disabled
  const mockUser = { id: 'mock-user-id', username: 'Contractor', email: '' };
  const [user, setUser] = useState<{ id: string; username: string; email?: string } | null>(mockUser);
  const [profile, setProfile] = useState<DriverProfile | null>({
    id: 'mock-user-id',
    full_name: 'Contractor',
    vehicle_type: 'Van',
    created_at: new Date().toISOString(),
  });
  const [settings, setSettings] = useState<Settings | null>(defaultSettings);
  const [loading, setLoading] = useState(false);

  async function loadProfile(userId: string) {
    // No-op - authentication disabled
  }

  async function loadSettings(userId: string) {
    try {
      const res = await fetch(`${API_BASE}/settings`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          setSettings({
            id: '',
            user_id: userId,
            normal_rate: data.settings.rates?.normal || 1.60,
            express_rate: data.settings.rates?.express || 3.60,
            saturday_hourly_rate: data.settings.rates?.saturdayHourly || 48.14,
            theme: data.settings.theme || 'light',
            updated_at: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setSettings({ ...defaultSettings, user_id: userId });
    }
  }

  useEffect(() => {
    // Auto-load settings on mount without auth check
    loadSettings(mockUser.id);
  }, []);

  async function signIn(username: string, password: string) {
    // No-op - authentication disabled
    return { error: null };
  }

  async function signOut() {
    // No-op - authentication disabled
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.id);
  }

  async function refreshSettings() {
    if (user) await loadSettings(user.id);
  }

  async function updateSettings(updates: Partial<Settings>) {
    if (!user || !settings) return;
    try {
      const rates = updates.normal_rate !== undefined || updates.express_rate !== undefined || updates.saturday_hourly_rate !== undefined
        ? {
            normal: updates.normal_rate ?? settings.normal_rate,
            express: updates.express_rate ?? settings.express_rate,
            saturdayHourly: updates.saturday_hourly_rate ?? settings.saturday_hourly_rate,
          }
        : undefined;
      
      const theme = updates.theme !== undefined ? updates.theme : settings.theme;

      const res = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rates, theme }),
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          setSettings({
            ...settings,
            ...updates,
            normal_rate: data.settings.rates?.normal || settings.normal_rate,
            express_rate: data.settings.rates?.express || settings.express_rate,
            saturday_hourly_rate: data.settings.rates?.saturdayHourly || settings.saturday_hourly_rate,
            theme: data.settings.theme || settings.theme,
            updated_at: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        settings,
        loading,
        signIn,
        signOut,
        refreshProfile,
        refreshSettings,
        updateSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
