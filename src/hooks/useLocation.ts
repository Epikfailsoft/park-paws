import { useState, useEffect, useCallback } from 'react';

interface LocationState {
  lat: number | null;
  lng: number | null;
  error: string | null;
  loading: boolean;
  permissionDenied: boolean;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationState>({
    lat: null,
    lng: null,
    error: null,
    loading: false,
    permissionDenied: false,
  });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, error: 'Konum desteği yok', loading: false }));
      return;
    }

    setLocation(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          error: null,
          loading: false,
          permissionDenied: false,
        });
      },
      (err) => {
        setLocation({
          lat: null,
          lng: null,
          error: err.message,
          loading: false,
          permissionDenied: err.code === err.PERMISSION_DENIED,
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000, // 5 min cache
      }
    );
  }, []);

  // Request on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return { ...location, requestLocation };
}
