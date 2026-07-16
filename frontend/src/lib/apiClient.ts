import axios, { type AxiosInstance } from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function createApiClient(getToken: () => Promise<string | null>): AxiosInstance {
  const client = axios.create({ baseURL: API_BASE_URL });

  client.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return client;
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { detail?: string | { msg: string }[]; error?: string }
      | undefined;
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail)) {
      const messages = data.detail.map((item) => item.msg).filter(Boolean);
      if (messages.length > 0) return messages.join(" ");
    }
    if (data?.error) return data.error;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
