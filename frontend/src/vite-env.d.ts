/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional development fallback. Production uses runtime-config.js. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __JECC_CONFIG__?: {
    API_URL?: string;
    RELEASE?: string;
    COMPANY_LEGAL_NAME?: string;
    LEGAL_ADDRESS?: string;
    SUPPORT_EMAIL?: string;
    SUPPORT_PHONE?: string;
    GRIEVANCE_OFFICER_NAME?: string;
    GRIEVANCE_EMAIL?: string;
    CIN?: string;
    GSTIN?: string;
  };
}
