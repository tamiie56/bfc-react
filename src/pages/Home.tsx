import About from "../components/About";
import Contact from "../components/Contact";
import Gallery from "../components/Gallery";
import Hero from "../components/Hero";
import Marquee from "../components/Marquee";
import Outlets from "../components/Outlets";
import Services from "../components/Services";
import Testimonial from "../components/Testimonial";

export default function Home() {
  return (
    <>
      <Hero />
      <Marquee />
      <About />
      <Services />
      <Outlets />
      <Gallery />
      <Testimonial />
      <Contact />
    </>
  );
}
