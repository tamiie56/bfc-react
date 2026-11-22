import type { IconType } from "react-icons";
import {
  FaDribbble,
  FaFacebookF,
  FaGooglePlusG,
  FaLinkedinIn,
  FaTwitter,
  FaVk,
} from "react-icons/fa";
import { SITE } from "../data/content";

interface Item {
  label: string;
  href: string;
  Icon: IconType;
}

const HERO: Item[] = [
  { label: "Facebook", href: SITE.facebook, Icon: FaFacebookF },
  { label: "Twitter", href: "#", Icon: FaTwitter },
  { label: "Google+", href: "#", Icon: FaGooglePlusG },
  { label: "LinkedIn", href: SITE.linkedin, Icon: FaLinkedinIn },
  { label: "Dribbble", href: "#", Icon: FaDribbble },
];

const FOOTER: Item[] = [
  { label: "Facebook", href: SITE.facebook, Icon: FaFacebookF },
  { label: "Twitter", href: "#", Icon: FaTwitter },
  { label: "Dribbble", href: "#", Icon: FaDribbble },
  { label: "VK", href: "#", Icon: FaVk },
];

export default function Socials({ variant }: { variant: "hero" | "footer" | "top" }) {
  const items = variant === "footer" ? FOOTER : HERO;
  return (
    <ul className={`socials socials--${variant}`}>
      {items.map(({ label, href, Icon }) => (
        <li key={label}>
          <a
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel="noreferrer"
            aria-label={label}
          >
            <Icon />
          </a>
        </li>
      ))}
    </ul>
  );
}
