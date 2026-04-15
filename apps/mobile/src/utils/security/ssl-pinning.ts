import { Platform } from "react-native";
import { Sentry } from "../../services/sentry";

export interface SSLConfig {
  domains: string[];
  publicKeys: string[];
  certificates: string[];
  enforcePinning: boolean;
}

export interface SSLError {
  domain: string;
  error: string;
  timestamp: Date;
}

type _StorageBackend = "expo-secure-store" | "encrypted-storage" | "async-storage";

const PRODUCTION_DOMAINS = ["api.xuno.app", "cdn.xuno.app"] as const;
const PRODUCTION_PUBLIC_KEYS = [
  "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=",
] as const;

const DEFAULT_SSL_CONFIG: SSLConfig = {
  domains: [...PRODUCTION_DOMAINS],
  publicKeys: [...PRODUCTION_PUBLIC_KEYS],
  certificates: [],
  enforcePinning: !__DEV__,
};

let currentConfig: SSLConfig = { ...DEFAULT_SSL_CONFIG };
let lastValidated: Date | null = null;
const sslErrors: SSLError[] = [];

function logSSLError(domain: string, error: string): void {
  const sslError: SSLError = { domain, error, timestamp: new Date() };
  sslErrors.push(sslError);

  Sentry.captureMessage(`[SSL-Pinning] Validation failed for ${domain}: ${error}`, {
    level: "error",
    tags: { security: "ssl-pinning", domain, platform: Platform.OS },
    extra: { sslError },
  });
}

export function configureSSLPinning(config?: Partial<SSLConfig>): void {
  if (config) {
    currentConfig = {
      domains: config.domains ?? currentConfig.domains,
      publicKeys: config.publicKeys ?? currentConfig.publicKeys,
      certificates: config.certificates ?? currentConfig.certificates,
      enforcePinning: config.enforcePinning ?? currentConfig.enforcePinning,
    };
  }

  if (Platform.OS === "ios") {
    // iOS: SSL pinning is configured via Info.plist NSAppTransportSecurity
    // and native module (e.g., react-native-ssl-pinning or TrustKit)
    // This config is used by the native layer at runtime
  } else if (Platform.OS === "android") {
    // Android: SSL pinning is configured via network_security_config.xml
    // and OkHttp CertificatePinner in the native module
  }
}

export function validateCertificate(serverCert: string, domain: string): boolean {
  if (!currentConfig.domains.includes(domain)) {
    if (currentConfig.enforcePinning) {
      logSSLError(domain, `Domain not in pinned list: ${domain}`);
      return false;
    }
    return true;
  }

  if (currentConfig.publicKeys.length > 0) {
    const certMatchesPin = currentConfig.publicKeys.some((pin) =>
      serverCert.includes(pin.replace("sha256/", ""))
    );
    if (!certMatchesPin) {
      logSSLError(domain, "Certificate public key does not match any pinned key");
      if (currentConfig.enforcePinning) {
        return false;
      }
      if (__DEV__) {
        console.warn(
          `[SSL-Pinning] Certificate validation failed for ${domain} but allowed in development`
        );
        return true;
      }
      return false;
    }
  }

  if (currentConfig.certificates.length > 0) {
    const certMatches = currentConfig.certificates.some((cert) => serverCert === cert);
    if (!certMatches) {
      logSSLError(domain, "Certificate does not match any pinned certificate");
      if (currentConfig.enforcePinning) {
        return false;
      }
      if (__DEV__) {
        console.warn(
          `[SSL-Pinning] Certificate validation failed for ${domain} but allowed in development`
        );
        return true;
      }
      return false;
    }
  }

  lastValidated = new Date();
  return true;
}

export function isPinningEnabled(): boolean {
  return currentConfig.enforcePinning;
}

export function getPinningStatus(): {
  enabled: boolean;
  domains: string[];
  lastValidated: Date | null;
} {
  return {
    enabled: currentConfig.enforcePinning,
    domains: [...currentConfig.domains],
    lastValidated,
  };
}

export function getSSLErrors(): readonly SSLError[] {
  return sslErrors;
}

export const PINNING_CONSTANTS = {
  PRODUCTION_DOMAINS,
  PRODUCTION_PUBLIC_KEYS,
} as const;
