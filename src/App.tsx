import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import CartBar from "./components/CartBar";
import CartDrawer from "./components/CartDrawer";
import FloatingActions from "./components/FloatingActions";
import Footer from "./components/Footer";
import Header from "./components/Header";
import ScrollManager from "./components/ScrollManager";
import ScrollProgress from "./components/ScrollProgress";
import { useReveal } from "./hooks/useReveal";
import Home from "./pages/Home";
import MenuPage from "./pages/MenuPage";

export default function App() {
  const { pathname } = useLocation();
  useReveal(pathname);

  return (
    <>
      <ScrollProgress />
      <ScrollManager />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <FloatingActions />
      <CartBar />
      <CartDrawer />
    </>
  );
}
