import chicken from "../assets/images/1.png";
import burger from "../assets/images/2.png";
import rice from "../assets/images/3.png";
import sides from "../assets/images/4.png";
import aboutImg from "../assets/images/ab2.png";
import drumstick from "../assets/images/g-drumstick.jpg";
import fries from "../assets/images/g-fries.jpg";
import crispy from "../assets/images/g-crispy.jpg";
import sauce from "../assets/images/g-sauce.jpg";

export const FOUNDED = 2002;
/** All BFC outlets (the 21 branches on the online ordering page + Dhanmondi, Jamuna Future Park, Bashundhara City) */
export const AREAS = [
  "Dhanmondi",
  "Mirpur 1",
  "Mirpur 10",
  "Mirpur 12",
  "Khilgaon",
  "Mohammadpur",
  "Gulshan - 2",
  "Banani",
  "Keari Plaza",
  "Orchid Plaza",
  "Badda",
  "Shyamoli",
  "Satmasjid Road",
  "Meher Plaza",
  "Baily Road",
  "Eskaton",
  "Uttara Jashimuddin",
  "Uttara Sector 13",
  "Green Road",
  "Motijheel",
  "ECB Chattar",
  "Savar",
  "Jamuna Future Park",
  "Bashundhara City",
];

export const OUTLET_COUNT = AREAS.length;

/** Outlet opening hours (Saturday - Friday), 24h clock, Dhaka time */
export const HOURS = { open: 10, close: 23 };

export const SITE = {
  name: "BFC (Best Fried Chicken)",
  phone: "09666 70 77 70",
  phoneHref: "tel:09666707770",
  email: "info@bfcbd.com",
  addressTitle: "House 56/1,",
  addressLines: ["Road-1, Block-C, Section-13", "Mirpur, Dhaka-1216."],
  mapQuery: "House 56/1, Road-1, Block-C, Section-13, Mirpur, Dhaka 1216",
  hours: "Saturday - Friday 10.00 am - 11.00 pm",
  orderUrl: "https://engaze.ai/bfc",
  /** BFC online ordering page the menu items link to (Uttara Jashimuddin outlet) */
  menuOrderUrl:
    "https://bfc.engaze.ai/613764cc195989f50819dfad/6141e21d9438e349e43aefb2/pickup",
  feedbackUrl:
    "https://docs.google.com/forms/d/e/1FAIpQLSfmlmVccG_UhmuoXlDgkvLHADrFE2XF1gbK-m7ym0ijy1CqHw/viewform",
  facebook: "https://www.facebook.com/ILoveBFC/",
  linkedin: "https://www.linkedin.com/company/ilovebfc/",
};

export const ABOUT = {
  image: aboutImg,
  paragraphs: [
    "To make chicken in a much more celebrated enjoyable and modern form, Best Fried Chicken (BFC) started its journey back in 2002. Under the guidance of Anisur Rahman Sinha, an Industrialist & chairman of Opex & Sinha Group, today BFC is Bangladesh's largest local fast-food chain. The birth of BFC is the manifestation of its founder's commitment to provide International Standard, high-quality & Hygienic food at a reasonable price to the fast-food appetite of the growing consumers in Dhaka city. The commitment to provide hygienic food in a decent clean environment is unwavering. The signature blend of spices with which the chicken is coated is unique in taste and aroma, manufactured carefully under the creative supervision of a master blender.",
    `The food chain has gained immense popularity from the patrons and to serve its growing valued customers, it has opened ${OUTLET_COUNT} outlets in most of the key areas in and around Dhaka city including Dhanmondi, Mirpur, Gulshan, Banani, Badda, Uttara, Mohammadpur, Shyamoli, Baily Road, Khilgaon, Eskaton, Jamuna Future Park, Bashundhara City, Green Road, Motijheel and Savar.`,
    "Housed in a clean and customer-friendly environment with alert service staff, providing quality service to our customers is our primary goal. Fresh, hygienic, tasty food at an affordable price is the commitment and motto of BFC.",
    "The food of BFC is liked by its Patrons. The face of a satisfied customer is our inspiration. Its phenomenal growth in sales is a testimony to its bright growth.",
  ],
};

export const TICKER = [
  "Crispy Fried Chicken",
  "Burger",
  "Rice Items",
  "Side Items",
  "Online Order",
  "Online Delivery",
  "Take Away",
  "Dine-in",
];

export interface FoodItem {
  title: string;
  price: number;
  image: string;
  glow: string;
}

export const FOODS: FoodItem[] = [
  { title: "Crispy Fried Chicken", price: 125, image: chicken, glow: "#33290a" },
  { title: "Burger", price: 175, image: burger, glow: "#3a1410" },
  { title: "Rice Items", price: 200, image: rice, glow: "#33290a" },
  { title: "Side Items", price: 65, image: sides, glow: "#3a1410" },
];

export const SERVICES = ["Online Order", "Online Delivery", "Take Away", "Dine-in"];

export interface GalleryItem {
  title: string;
  src: string;
  shape: "sq" | "wide" | "tall";
}

export const GALLERY: GalleryItem[] = [
  { title: "Sauce-dipped crispy chicken", src: drumstick, shape: "tall" },
  { title: "BFC combo meal", src: aboutImg, shape: "wide" },
  { title: "Golden fries", src: fries, shape: "sq" },
  { title: "Crispy Fried Chicken", src: chicken, shape: "sq" },
  { title: "Burger", src: burger, shape: "sq" },
  { title: "Rice Items", src: rice, shape: "sq" },
  { title: "Crispy chicken pieces", src: crispy, shape: "wide" },
  { title: "Side Items", src: sides, shape: "sq" },
  { title: "Chicken & dipping sauce", src: sauce, shape: "sq" },
];

export const REVIEW = {
  name: "Mr. Saklaine",
  rating: 3.5,
  text: "Best Fried Chicken Items in the Town",
};
