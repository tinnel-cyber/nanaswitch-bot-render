import { useState, useCallback } from 'react';

export interface GeolocationCoordinatesData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  formattedCoords: string;
  approximateAddress?: string;
  isSimulated?: boolean;
}

export type GeolocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error';

export interface UseMysteryGiftGeolocationReturn {
  status: GeolocationStatus;
  isLocating: boolean;
  coordinates: GeolocationCoordinatesData | null;
  errorMessage: string | null;
  requestLocation: (options?: PositionOptions) => Promise<GeolocationCoordinatesData>;
  simulateLocation: (customCoords?: Partial<GeolocationCoordinatesData>) => GeolocationCoordinatesData;
  reset: () => void;
}

/**
 * Formate des coordonnées GPS en chaîne lisible (ex: 5.3484° N, 4.0287° W)
 */
export function formatGpsCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'O';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

/**
 * Hook personnalisé ultra-robuste pour la gestion du consentement et de l'acquisition
 * de la position GPS du destinataire du cadeau mystère Wameet via l'API HTML5 navigator.geolocation.
 */
export function useMysteryGiftGeolocation(): UseMysteryGiftGeolocationReturn {
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [coordinates, setCoordinates] = useState<GeolocationCoordinatesData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Réinitialise l'état du hook
   */
  const reset = useCallback(() => {
    setStatus('idle');
    setCoordinates(null);
    setErrorMessage(null);
  }, []);

  /**
   * Simule une acquisition GPS (idéal pour le développement, les tests ou en cas de refus d'autorisation)
   */
  const simulateLocation = useCallback(
    (customCoords?: Partial<GeolocationCoordinatesData>): GeolocationCoordinatesData => {
      // Coordonnées par défaut : Abidjan Plateau / Cocody (QG Nanasore)
      const lat = customCoords?.latitude ?? 5.3484 + (Math.random() - 0.5) * 0.008;
      const lng = customCoords?.longitude ?? -4.0287 + (Math.random() - 0.5) * 0.008;
      const accuracy = customCoords?.accuracy ?? Math.round(8 + Math.random() * 12);
      const timestamp = Date.now();

      const result: GeolocationCoordinatesData = {
        latitude: lat,
        longitude: lng,
        accuracy,
        timestamp,
        formattedCoords: formatGpsCoordinates(lat, lng),
        approximateAddress: customCoords?.approximateAddress || 'Cocody, Boulevard Hassan II • NaNa Express',
        isSimulated: true
      };

      setCoordinates(result);
      setStatus('granted');
      setErrorMessage(null);
      return result;
    },
    []
  );

  /**
   * Déclenche la demande de consentement et la capture GPS native
   */
  const requestLocation = useCallback(
    (options?: PositionOptions): Promise<GeolocationCoordinatesData> => {
      return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !navigator.geolocation) {
          const fallbackError = 'La géolocalisation n’est pas prise en charge par votre navigateur.';
          setStatus('error');
          setErrorMessage(fallbackError);
          // On bascule automatiquement sur une simulation fluide pour ne pas bloquer l'UX
          const fallbackData = simulateLocation();
          resolve(fallbackData);
          return;
        }

        setStatus('requesting');
        setErrorMessage(null);

        const geoOptions: PositionOptions = {
          enableHighAccuracy: true,
          timeout: 14000,
          maximumAge: 0,
          ...options
        };

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            const data: GeolocationCoordinatesData = {
              latitude,
              longitude,
              accuracy: Math.round(accuracy),
              timestamp: position.timestamp || Date.now(),
              formattedCoords: formatGpsCoordinates(latitude, longitude),
              approximateAddress: 'Position GPS validée en direct',
              isSimulated: false
            };

            setCoordinates(data);
            setStatus('granted');
            setErrorMessage(null);
            resolve(data);
          },
          (error) => {
            let msg = 'Impossible de récupérer votre position GPS.';
            switch (error.code) {
              case error.PERMISSION_DENIED:
                msg = 'Autorisation GPS refusée. Veuillez autoriser la géolocalisation pour valider la livraison.';
                setStatus('denied');
                break;
              case error.POSITION_UNAVAILABLE:
                msg = 'Le signal GPS est momentanément indisponible.';
                setStatus('error');
                break;
              case error.TIMEOUT:
                msg = 'Délai d’attente dépassé pour la capture GPS.';
                setStatus('error');
                break;
              default:
                setStatus('error');
                break;
            }

            setErrorMessage(msg);
            reject(new Error(msg));
          },
          geoOptions
        );
      });
    },
    [simulateLocation]
  );

  return {
    status,
    isLocating: status === 'requesting',
    coordinates,
    errorMessage,
    requestLocation,
    simulateLocation,
    reset
  };
}
