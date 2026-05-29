/// <reference types="vite/client" />

declare const __APP_SEMVER__: string;

interface ImportMetaEnv {
  readonly VITE_CREATIVE_ENGINES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
