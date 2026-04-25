import Taro from "@tarojs/taro";

/** Read API base URL from defineConstants injected at build time */
function getBaseUrl(): string {
  return (process.env.API_BASE as string) || "http://localhost:3001/api/v1";
}

interface RequestOptions {
  url: string;
  method?: keyof Taro.request.Method;
  data?: unknown;
  header?: Record<string, string>;
}

/** Core request wrapper with JWT interceptor */
async function request<T>(options: RequestOptions): Promise<T> {
  const token = Taro.getStorageSync("access_token");

  const header: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.header,
  };

  if (token) {
    header["Authorization"] = `Bearer ${token}`;
  }

  const res = await Taro.request({
    url: `${getBaseUrl()}${options.url}`,
    method: options.method || "GET",
    data: options.data,
    header,
  });

  // 401 interceptor: clear token and redirect to profile page
  if (res.statusCode === 401) {
    Taro.removeStorageSync("access_token");
    Taro.removeStorageSync("refresh_token");
    Taro.navigateTo({ url: "/pages/profile/index" });
    throw new Error("Unauthorized");
  }

  if (res.statusCode >= 400) {
    const message =
      typeof res.data === "object" && res.data !== null
        ? (res.data as { message?: string }).message || "Request failed"
        : "Request failed";
    throw new Error(message);
  }

  return res.data as T;
}

/** Convenience GET method */
export function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  return request<T>({
    url: params ? `${url}?${buildQuery(params)}` : url,
    method: "GET",
  });
}

/** Convenience POST method */
export function post<T>(url: string, data?: unknown): Promise<T> {
  return request<T>({ url, method: "POST", data });
}

/** Convenience PUT method */
export function put<T>(url: string, data?: unknown): Promise<T> {
  return request<T>({ url, method: "PUT", data });
}

/** File upload using Taro.uploadFile */
export async function upload<T>(
  url: string,
  filePath: string,
  formData?: Record<string, string>
): Promise<T> {
  const token = Taro.getStorageSync("access_token");
  const header: Record<string, string> = {};

  if (token) {
    header["Authorization"] = `Bearer ${token}`;
  }

  const res = await Taro.uploadFile({
    url: `${getBaseUrl()}${url}`,
    filePath,
    name: "file",
    formData,
    header,
  });

  if (res.statusCode >= 400) {
    throw new Error("Upload failed");
  }

  return JSON.parse(res.data) as T;
}

/** Build query string from params object */
function buildQuery(params: Record<string, unknown>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
}
