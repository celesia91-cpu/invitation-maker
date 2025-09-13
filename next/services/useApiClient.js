import { useMemo } from 'react';
import { APIClient } from './api-client.js';

// Returns an API client instance scoped to the current auth token
export default function useApiClient() {
  return useMemo(() => new APIClient(), []);
}
