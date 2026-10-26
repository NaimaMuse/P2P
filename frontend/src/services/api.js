import axios from "axios";
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 6000,
});
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("p2p-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export const errorMessage = (error) => {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT")
    return "The marketplace server took too long to respond. Please try again.";
  if (!error.response)
    return "Cannot connect to the marketplace server. Make sure the backend is running and your connection is available, then try again.";
  return "The marketplace could not complete your request. Please try again.";
};
export default api;
export const imageUrl = (url) => url?.startsWith('/uploads/')
  ? new URL(url, new URL(api.defaults.baseURL, window.location.origin)).href
  : url;
