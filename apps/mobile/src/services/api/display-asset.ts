import axios from "axios";

import apiClient from "./client";
import { ensureAuthenticatedAssetUrl, isLocalStorageAssetUrl } from "./asset-url";

const displayUriCache = new Map<string, string>();
const inflightRequests = new Map<string, Promise<string>>();

function shouldResolveDisplayUri(uri: string): boolean {
  if (uri.startsWith("data:") || uri.startsWith("file:") || uri.startsWith("content:")) {
    return false;
  }

  return (
    isLocalStorageAssetUrl(uri) ||
    uri.includes("/photos/") ||
    uri.includes("/try-on/") ||
    uri.includes("/storage/proxy")
  );
}

function getAuthHeaders(): Record<string, string> | undefined {
  const token = apiClient.getToken();

  if (!token) {
    return undefined;
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string | null {
  const globalObject = globalThis as {
    Buffer?: {
      from: (value: ArrayBuffer) => { toString: (encoding: string) => string };
    };
    btoa?: (value: string) => string;
  };

  if (globalObject.Buffer?.from) {
    return globalObject.Buffer.from(buffer).toString("base64");
  }

  if (typeof globalObject.btoa !== "function") {
    return null;
  }

  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, Math.min(index + chunkSize, bytes.length)));
  }

  return globalObject.btoa(binary);
}

export async function resolveDisplayUri(uri?: string | null): Promise<string> {
  if (!uri) {
    return "";
  }

  const authenticatedUri = ensureAuthenticatedAssetUrl(uri);

  if (!shouldResolveDisplayUri(authenticatedUri)) {
    return authenticatedUri;
  }

  const cached = displayUriCache.get(authenticatedUri);
  if (cached) {
    return cached;
  }

  const inflight = inflightRequests.get(authenticatedUri);
  if (inflight) {
    return inflight;
  }

  const request = (async () => {
    try {
      const response = await axios.get<ArrayBuffer>(authenticatedUri, {
        headers: getAuthHeaders(),
        responseType: "arraybuffer",
      });

      const contentType = response.headers["content-type"] ?? "application/octet-stream";
      const base64 = arrayBufferToBase64(response.data);

      if (!base64) {
        return authenticatedUri;
      }

      const dataUri = `data:${contentType};base64,${base64}`;
      displayUriCache.set(authenticatedUri, dataUri);
      return dataUri;
    } catch (error) {
      return authenticatedUri;
    } finally {
      inflightRequests.delete(authenticatedUri);
    }
  })();

  inflightRequests.set(authenticatedUri, request);
  return request;
}
