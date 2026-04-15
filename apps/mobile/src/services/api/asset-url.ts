import { mobileRuntimeConfig } from "../../config/runtime";
import apiClient from "./client";

const LOCAL_STORAGE_HOSTS = new Set(["localhost", "127.0.0.1", "10.0.2.2"]);
const LOCAL_STORAGE_PORT = "9000";
const STORAGE_BUCKET_PREFIX = "/xuno/";

function buildStorageProxyUrl(originalUrl: string): string {
  const apiBase = mobileRuntimeConfig.apiUrl.replace(/\/+$/, "");
  return `${apiBase}/storage/proxy?url=${encodeURIComponent(originalUrl)}`;
}

function buildApiAssetUrl(pathname: string): string {
  const apiBase = mobileRuntimeConfig.apiUrl.replace(/\/+$/, "");
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${apiBase}${normalizedPath}`;
}

export function ensureAuthenticatedAssetUrl(url?: string | null): string {
  if (!url) {
    return "";
  }

  if (url.startsWith("data:") || url.startsWith("file:") || url.startsWith("content:")) {
    return url;
  }

  const token = apiClient.getToken();

  if (!token || url.includes("access_token=")) {
    return url;
  }

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}access_token=${encodeURIComponent(token)}`;
}

export function isLocalStorageAssetUrl(value?: string | null): boolean {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);

    return (
      LOCAL_STORAGE_HOSTS.has(parsed.hostname) &&
      (!parsed.port || parsed.port === LOCAL_STORAGE_PORT) &&
      parsed.pathname.startsWith(STORAGE_BUCKET_PREFIX)
    );
  } catch {
    return false;
  }
}

export function normalizeAssetUrl(value?: string | null): string {
  if (!value) {
    return "";
  }

  try {
    const parsed = new URL(value);

    if (isLocalStorageAssetUrl(parsed.toString())) {
      return buildStorageProxyUrl(parsed.toString());
    }

    return parsed.toString();
  } catch {
    return value;
  }
}

export function buildPhotoAssetUrl(
  photoId: string,
  variant: "original" | "thumbnail",
  value?: string | null
): string {
  if (photoId && isLocalStorageAssetUrl(value)) {
    return ensureAuthenticatedAssetUrl(
      buildApiAssetUrl(`/photos/${photoId}/${variant === "thumbnail" ? "thumbnail" : "asset"}`)
    );
  }

  return normalizeAssetUrl(value);
}

export function buildTryOnResultAssetUrl(tryOnId: string, value?: string | null): string {
  if (tryOnId && isLocalStorageAssetUrl(value)) {
    return ensureAuthenticatedAssetUrl(buildApiAssetUrl(`/try-on/${tryOnId}/result-image`));
  }

  return normalizeAssetUrl(value);
}
