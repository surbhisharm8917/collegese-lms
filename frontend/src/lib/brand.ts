const config = window.__JECC_CONFIG__ ?? {};

export const BRAND = {
  name: "Just Easy CA Classes",
  shortName: "Just Easy",
  legalName: config.COMPANY_LEGAL_NAME || "Just Easy CA Classes Private Limited",
  tagline: "Simplifying Commerce Education",
  description:
    "A focused digital learning platform for CA and commerce students with structured classes, assessments, analytics, and certificates.",
  email: config.SUPPORT_EMAIL || "hello@justeasycaclasses.com",
  phone: config.SUPPORT_PHONE || "+91 8894357155",
  legalAddress: config.LEGAL_ADDRESS || "",
  grievanceOfficerName: config.GRIEVANCE_OFFICER_NAME || "",
  grievanceEmail: config.GRIEVANCE_EMAIL || config.SUPPORT_EMAIL || "hello@justeasycaclasses.com",
  cin: config.CIN || "",
  gstin: config.GSTIN || "",
  assets: {
    mark: "/brand/just-easy-logo-mark.svg",
    favicon: "/brand/just-easy-favicon.svg",
    wordmark: "/brand/just-easy-wordmark.svg",
    webLogo: "/brand/just-easy-web-logo.svg",
    fullReference: "/brand/just-easy-ca-classes-logo.png",
  },
  colors: {
    navy: "#072A60",
    orange: "#FF5A00",
  },
} as const;
