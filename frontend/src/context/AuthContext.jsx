import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(
    () => !sessionStorage.getItem("p2p-token"),
  );
  useEffect(() => {
    const token = sessionStorage.getItem("p2p-token");
    if (!token) return;
    const controller = new AbortController();
    api
      .get("/auth/me", { signal: controller.signal })
      .then((r) => {
        if (sessionStorage.getItem("p2p-token") === token) setUser(r.data.data);
      })
      .catch((error) => {
        if (error.code !== "ERR_CANCELED" && sessionStorage.getItem("p2p-token") === token)
          sessionStorage.removeItem("p2p-token");
      })
      .finally(() => { if (!controller.signal.aborted) setReady(true); });
    return () => controller.abort();
  }, []);
  async function authenticate(path, values) {
    const { data } = await api.post(`/auth/${path}`, values);
    if (!data.success || !data.data?.token || !data.data?.user?._id)
      throw new Error("Invalid authentication response");
    sessionStorage.setItem("p2p-token", data.data.token);
    setUser(data.data.user);
    setReady(true);
    return data.data.user;
  }
  function logout() {
    sessionStorage.removeItem("p2p-token");
    setUser(null);
  }
  return (
    <AuthContext.Provider value={{ user, ready, authenticate, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
// Context hooks intentionally share their provider module.
// eslint-disable-next-line react/only-export-components
export const useAuth = () => useContext(AuthContext);
