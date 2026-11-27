import combo from "../assets/images/ab2.png";
import crispy from "../assets/images/g-crispy.jpg";
import drumstick from "../assets/images/g-drumstick.jpg";
import fries from "../assets/images/g-fries.jpg";
import heroImg from "../assets/images/hero.jpg";

export interface HeroSlide {
  title: string;
  tag: string;
  desc: string;
  /** big outlined word behind the photo */
  word: string;
  /** colour of the glow, title, sparks and ribbon */
  accent: string;
  /** photo shown in the shutter frame */
  image: string;
  /** which part of that photo stays visible */
  focus: string;
  /** full-screen background behind the whole hero */
  bg: string;
  bgFocus: string;
  /** blur (px) for backgrounds that are smaller than the screen */
  blur: number;
}

/** The best items the hero cycles through. Edit this list to change them. */
export const HERO_SLIDES: HeroSlide[] = [
  {
    title: "Sauce-Dipped Crispy Chicken",
    tag: "Best Seller",
    desc: "Golden, crunchy and dripping with our signature sauce.",
    word: "Crunchy",
    accent: "#ff7a1a",
    image: drumstick,
    focus: "50% 30%",
    bg: heroImg,
    bgFocus: "72% 50%",
    blur: 0,
  },
  {
    title: "Golden Fries",
    tag: "Crowd Favourite",
    desc: "Hot, salty and perfectly crisp - the side everyone reaches for.",
    word: "Golden",
    accent: "#ffc80a",
    image: fries,
    focus: "50% 50%",
    bg: fries,
    bgFocus: "50% 50%",
    blur: 7,
  },
  {
    title: "Crispy Chicken Pieces",
    tag: "Signature Taste",
    desc: "Fresh, hygienic, tasty food at an affordable price.",
    word: "Juicy",
    accent: "#ff4d2e",
    image: crispy,
    focus: "30% 50%",
    bg: crispy,
    bgFocus: "50% 50%",
    blur: 6,
  },
  {
    title: "BFC Combo Meal",
    tag: "Best Value",
    desc: "Everything you love in one meal, ready to eat or take away.",
    word: "Combo",
    accent: "#f0a30a",
    image: combo,
    focus: "50% 50%",
    bg: combo,
    bgFocus: "50% 50%",
    blur: 8,
  },
];
