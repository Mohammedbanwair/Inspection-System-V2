import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://inspection-system-v2-production.up.railway.app";
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export function formatApiError(err) {
  const d = err?.response?.data?.detail;
  if (!d) return err?.message || "حدث خطأ غير متوقع";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((e) => e?.msg || JSON.stringify(e)).join(" ");
  return String(d);
}
