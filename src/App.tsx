import { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import ChatBot from "./chatbot/ChatBot";
import CartBar from "./components/CartBar";
import CartDrawer from "./components/CartDrawer";
import FloatingActions from "./components/FloatingActions";
import Footer from "./components/Footer";
import Header from "./components/Header";
import ScrollManager from "./components/ScrollManager";
import { useReveal } from "./hooks/useReveal";
import FeedbackPage from "./pages/FeedbackPage";
import Home from "./pages/Home";
import MenuPage from "./pages/MenuPage";

// the team panel is its own bundle - customers never download it
const AdminApp = lazy(() => import("./admin/AdminApp"));

export default function App() {
  const { pathname } = useLocation();
  useReveal(pathname);

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return (
      <Suspense fallback={<div className="adm-boot">Loading team panel...</div>}>
        <AdminApp />
      </Suspense>
    );
  }

  return (
    <>
      <ScrollManager />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <FloatingActions />
      <CartBar />
      <CartDrawer />
      <ChatBot />
    </>
  );
}
