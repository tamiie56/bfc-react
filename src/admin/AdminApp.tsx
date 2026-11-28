import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import "./admin.css";
import AdminLayout from "./AdminLayout";
import { useAuthed } from "./auth";
import Bookings from "./pages/Bookings";
import Customers from "./pages/Customers";
import Dashboard from "./pages/Dashboard";
import Feedback from "./pages/Feedback";
import Login from "./pages/Login";
import MenuManager from "./pages/MenuManager";
import Orders from "./pages/Orders";
import Settings from "./pages/Settings";

export default function AdminApp() {
  const authed = useAuthed();

  // keep the panel out of search engines + give the tab its own title
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "BFC Team Panel";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    document.head.appendChild(meta);
    return () => {
      document.title = prevTitle;
      meta.remove();
    };
  }, []);

  if (!authed) return <Login />;

  return (
    <Routes>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="menu" element={<MenuManager />} />
        <Route path="customers" element={<Customers />} />
        <Route path="feedback" element={<Feedback />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
