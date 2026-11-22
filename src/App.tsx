import About from "./components/About";
import Contact from "./components/Contact";
import FloatingActions from "./components/FloatingActions";
import Footer from "./components/Footer";
import Gallery from "./components/Gallery";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Marquee from "./components/Marquee";
import Outlets from "./components/Outlets";
import ScrollProgress from "./components/ScrollProgress";
import Services from "./components/Services";
import Testimonial from "./components/Testimonial";
import { useReveal } from "./hooks/useReveal";

export default function App() {
  useReveal();

  return (
    <>
      <ScrollProgress />
      <Header />
      <main>
        <Hero />
        <Marquee />
        <About />
        <Services />
        <Outlets />
        <Gallery />
        <Testimonial />
        <Contact />
      </main>
      <Footer />
      <FloatingActions />
    </>
  );
}
