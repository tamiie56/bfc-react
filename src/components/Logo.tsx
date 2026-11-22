import logo from "../assets/images/logo.png";

export default function Logo({ className }: { className?: string }) {
  return <img src={logo} alt="BFC - Best Fried Chicken" className={className} />;
}
