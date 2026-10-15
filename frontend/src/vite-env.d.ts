/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
interface ImportMetaEnv {
  readonly VITE_API_MODE?: 'mock' | 'real';
  readonly VITE_API_BASE_URL?: string;
}
