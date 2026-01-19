import { useState, useEffect, useCallback } from 'react';

export interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  consentGiven: boolean;
  timestamp: string | null;
}

const STORAGE_KEY = 'vispe_cookie_consent';

const defaultPreferences: CookiePreferences = {
  necessary: true,
  analytics: true,
  marketing: true,
  consentGiven: false,
  timestamp: null,
};

export function useCookieConsent() {
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CookiePreferences;
        setPreferences(parsed);
      } catch {
        setPreferences(defaultPreferences);
      }
    }
    setIsLoaded(true);
  }, []);

  const savePreferences = useCallback((newPreferences: Partial<CookiePreferences>) => {
    const updated: CookiePreferences = {
      ...preferences,
      ...newPreferences,
      necessary: true, // Always true
      consentGiven: true,
      timestamp: new Date().toISOString(),
    };
    setPreferences(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, [preferences]);

  const acceptAll = useCallback(() => {
    savePreferences({
      analytics: true,
      marketing: true,
    });
  }, [savePreferences]);

  const rejectAll = useCallback(() => {
    savePreferences({
      analytics: false,
      marketing: false,
    });
  }, [savePreferences]);

  const updatePreference = useCallback((key: 'analytics' | 'marketing', value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const saveCurrentPreferences = useCallback(() => {
    savePreferences({
      analytics: preferences.analytics,
      marketing: preferences.marketing,
    });
  }, [savePreferences, preferences]);

  return {
    preferences,
    isLoaded,
    showBanner: isLoaded && !preferences.consentGiven,
    acceptAll,
    rejectAll,
    updatePreference,
    saveCurrentPreferences,
  };
}
