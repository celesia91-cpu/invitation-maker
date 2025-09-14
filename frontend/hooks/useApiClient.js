import { useMemo } from 'react';
import { APIClient } from '../services/api-client.js';

// Hook that returns an API client instance
export default function useApiClient() {
  return useMemo(() => new APIClient(), []);
}

