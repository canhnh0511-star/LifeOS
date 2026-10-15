import type { LifeOsApi } from './client';
import { httpClient } from './httpClient';
import { mockClient } from './mockClient';
/** Switch to VITE_API_MODE=real without changing UI components. */
export const api: LifeOsApi = import.meta.env.VITE_API_MODE === 'real' ? httpClient : mockClient;
export const isDemo = import.meta.env.VITE_API_MODE !== 'real';
