/**
 * Full BFC menu (from the BFC online ordering page, Uttara Jashimuddin outlet).
 * Prices are in BDT. `from: true` means "From ৳price" (sizes / variants).
 * `image` is optional - items without a photo show a small dot instead.
 */
export interface Dish {
  name: string;
  price: number;
  from?: boolean;
  desc?: string;
  image?: string;
}

export interface MenuCategory {
  id: string;
  title: string;
  items: Dish[];
}

const R = "https://engaze-prod.s3.amazonaws.com/restaurants/146463305457288/foods/tr-180xauto/";
const P = "https://engaze-prod.s3.ap-south-1.amazonaws.com/stores/613764cc195989f50819dfad/products/";

const DRINK = "Bottle Drinks (200 ml)";

export const MENU: MenuCategory[] = [
  {
    id: "fried-chicken",
    title: "Fried Chicken",
    items: [
      { name: "Fried Chicken", price: 140, from: true, image: R + "CRISPY_FRIED_CHICKEN_7487.jpeg" },
      { name: "Naga Fried Chicken", price: 145, from: true, image: P + "tr-280xauto/Naga_Fried_Chicken__344146.jpeg" },
    ],
  },
  {
    id: "chicken-wings",
    title: "Chicken Wings",
    items: [
      { name: "Hot Wing", price: 130, from: true, image: R + "HOT_SPICY_WING_6780.jpeg" },
      { name: "Naga Wings", price: 145, from: true },
      {
        name: "BBQ Hot Wings",
        price: 140,
        from: true,
        desc: "4 pcs: BDT 155 · 8 pcs: BDT 300 · 24 pcs: BDT 870",
        image: R + "BBQ_HOT_SPICY_WINGS_1071.jpeg",
      },
    ],
  },
  {
    id: "chicken-delight",
    title: "Chicken Delight",
    items: [
      { name: "Chicken Pops", price: 195 },
      { name: "Naga Pops", price: 205 },
      { name: "Chicken Lollipop", price: 140, from: true },
      { name: "Crispy Strips", price: 160, from: true, image: R + "CRISPY_STRIPS_7116.jpeg" },
      { name: "Chicken Mini Strips", price: 165, from: true },
      { name: "Nuggets", price: 145, from: true, image: R + "SPICY_NUGGETS_3667.jpeg" },
      { name: "BBQ Boneless Chicken", price: 160, from: true },
    ],
  },
  {
    id: "chicken-burger",
    title: "Chicken Burger",
    items: [
      { name: "Best Burger", price: 275, image: R + "BEST_BURGER_8495.jpeg" },
      { name: "Best Burger With Cheese (Super)", price: 305, image: R + "SUPER_CHEESE_BURGER________3516.jpeg" },
      {
        name: "Spicy Burger",
        price: 210,
        from: true,
        desc: "Crispy Spicy Chicken Fillet with Spicy Sauce, Iceberg Lettuce & Pickle",
        image: P + "tr-180xauto/SPICY_BURGER_4603.jpeg",
      },
      {
        name: "Spicy Burger With Cheese",
        price: 305,
        desc: "Crispy Spicy Chicken Fillet with Spicy Sauce, Iceberg Lettuce & Pickle",
        image: P + "tr-180xauto/SPICY_BURGER_WITH_CHEESE_6567.jpeg",
      },
      { name: "Supreme Burger", price: 295, image: R + "SUPREME_BURGER_____4581.jpeg" },
      { name: "Supreme Cheese Burger", price: 325, image: R + "SUPREME_CHEESE_BURGER_9056.jpeg" },
      { name: "Garlic Burger Regular", price: 220 },
      { name: "Garlic Burger Large", price: 290 },
      { name: "Garlic Burger Regular With Cheese", price: 250 },
      {
        name: "Garlic Burger Large With Cheese",
        price: 320,
        desc: "Crispy chicken fillet with garlic sauce, pickle, lettuce, and cheese.",
      },
      { name: "Juicy Burger", price: 195, from: true, image: R + "KIDS_BURGER_4178.jpeg" },
      { name: "Juicy Burger With Cheese", price: 225, image: R + "KIDS_CHEESE_BURGER_1935.jpeg" },
    ],
  },
  {
    id: "rice-items",
    title: "Rice Items",
    items: [
      { name: "Rice", price: 95 },
      { name: "Rice Bowl 2", price: 215, desc: "1 Rice Bowl, 1 Fried Chicken/4 pieces Wings" },
      { name: "Rice Bowl 3", price: 235, desc: "1 Rice Bowl, 3 Strips/ 10 BBQ Boneless" },
    ],
  },
  {
    id: "rice-meal",
    title: "Rice Meal",
    items: [
      {
        name: "Combo 13",
        price: 315,
        desc: "1 Rice Bowl, 1 Fried Chicken, 1 Coleslaw. 1 Drinks (Dine in Fountain Drink, Takeaway - Bottle Mini)",
      },
      {
        name: "Combo 14",
        price: 315,
        desc: "1 Rice Bowl, 4 Pieces Hot Wings, 1 Coleslaw. 1 Drinks (Dine in Fountain Drink, Takeaway - Bottle Mini)",
      },
      {
        name: "Combo 15",
        price: 345,
        desc: "1 Rice Bowl, 3 fried Strips, 1 Coleslaw. 1 Drinks (Dine in Fountain Drink, Takeaway - Bottle Mini)",
      },
      {
        name: "Combo 16",
        price: 345,
        desc: "1 Rice Bowl,10 Pieces BBQ Boneless Chicken, 1 Coleslaw. 1 Drinks (Dine in Fountain Drink, Takeaway - Bottle Mini)",
      },
      {
        name: "Combo 17",
        price: 340,
        desc: "1 Rice Bowl, Grilled Chicken, 1 Coleslaw. 1 Drinks (Dine in Fountain Drink, Takeaway - Bottle Mini)",
      },
    ],
  },
  {
    id: "side-menu",
    title: "Side Menu",
    items: [
      { name: "French Fries", price: 115, from: true, image: R + "FRENCH_FRIES_5394.jpeg" },
      { name: "Masala / Garlic Fries", price: 125, from: true, image: R + "MASALA_FRENCH_FRIES_9389.jpeg" },
      { name: "Potato Wedges", price: 95, image: R + "POTATO_WEDGES_3416.jpeg" },
      { name: "Coleslaw", price: 75, image: R + "COLESLAW_3100.jpeg" },
      { name: "Extra Cheese", price: 30 },
      { name: "Extra Bun", price: 20 },
      { name: "BBQ Dip", price: 30 },
      { name: "Dip", price: 20, from: true },
    ],
  },
  {
    id: "chicken-combo",
    title: "Chicken Combo",
    items: [
      { name: "Combo-1", price: 395, desc: `F.Chicken 2 pcs + F.Fries (R) 1 pcs + ${DRINK} 1 pcs` },
      { name: "Combo-2", price: 350, desc: `F.Chicken 2 pcs + Coleslaw (R) 1 pcs + ${DRINK} 1 pcs` },
      { name: "Combo-3", price: 520, desc: `F.Chicken 3 pcs + F.Fries (R) 1 pcs + ${DRINK} 1 pcs` },
      { name: "Combo-4", price: 475, desc: `F.Chicken 3 pcs + Coleslaw (R) 1 pcs + ${DRINK} 1 pcs` },
    ],
  },
  {
    id: "burger-combo",
    title: "Burger Combo",
    items: [
      { name: "Combo-5", price: 440, desc: `B.Burger with Cheese 1 pcs + F.Fries (R) 1 pcs + ${DRINK} 1 pcs` },
      { name: "Combo-6", price: 395, desc: `B.Burger with Cheese 1 pcs+ Coleslaw (R) 1 pcs + ${DRINK} 1 pcs` },
      { name: "Combo-7", price: 460, desc: `Suprm.Chs Burger 1 pcs + F.Fries (R) 1 pcs + ${DRINK} 1 pcs` },
      { name: "Combo-8", price: 415, desc: `Suprm.Chs Burger 1 pcs + Coleslaw (R) 1 pcs + ${DRINK} 1 pcs` },
    ],
  },
  {
    id: "new-burger-combo",
    title: "New Burger Combo",
    items: [
      { name: "New Burger Combo-1", price: 440, desc: "Spicy Burger with cheese (L)+ 1 Bottle Drink 200 ml + 1 french fries (R)" },
      { name: "New Burger Combo-2", price: 395, desc: "Spicy Burger with cheese (L)+ 1 Bottle Drink (200 ml)+ 1 coleslaw" },
      { name: "New Burger Combo-3", price: 360, desc: "Juicy Burger with Cheese (R)+ 1 Bottle Drink (200 ml)+ 1 French fries (R)" },
      { name: "New Burger Combo-4", price: 315, desc: "Juicy Burger with cheese (L)+ 1 Bottle Drink (200 ml)+ 1 coleslaw" },
    ],
  },
  {
    id: "special-meal",
    title: "Special Meal",
    items: [
      {
        name: "Special Meal-1",
        price: 260,
        desc: "1 pc Crispy Fried Chicken + 1 French Fries (R) + 1 Mango Juice",
        image: P + "tr-180xauto/Special_Meal-1_561856.jpeg",
      },
      {
        name: "Special Meal-2",
        price: 290,
        desc: "1 pcs Crispy Strips + 1 French Fries (R) + 1 Mango Juice",
        image: P + "tr-180xauto/Special_Meal-2_289198.jpeg",
      },
      {
        name: "Special Meal-3",
        price: 355,
        desc: "Junior Cheese Burger + 1 French Fries (R) + 1 Mango Juice",
        image: P + "tr-180xauto/Special_Meal-3_224428.jpeg",
      },
    ],
  },
  {
    id: "mega-feast",
    title: "Mega Feast",
    items: [
      {
        name: "Mega Feast-1 (for 2 person)",
        price: 970,
        desc: "F.Chicken 4 pcs + Coleslaw (R) 2 pcs + F.Fries (R) 2 pcs Bun 2 pcs + Bottle Drinks (250 ml) 2 pcs",
      },
      { name: "Mega Feast (for 2 person)", price: 970 },
    ],
  },
  {
    id: "new-combo",
    title: "New Combo",
    items: [
      { name: "New Combo-1", price: 440, desc: "Consists of one Spicy cheese burger, regular french fries & 200 ml bottle drinks." },
      { name: "New Combo-2", price: 395, desc: "Consists of spicy cheese burger, regular coleslaw & 200 ml bottle drinks" },
      { name: "New Combo-3", price: 360, desc: "Consists of juicy cheese burger, regular french fries & 200 ml bottle drinks" },
      { name: "New Combo-4", price: 315, desc: "Consists of juicy cheese burger, regular coleslaw & 200 ml bottle drinks" },
    ],
  },
  {
    id: "beverage",
    title: "Beverage",
    items: [
      { name: "Mango Juice", price: 20 },
      {
        name: "Aquafina",
        price: 20,
        image: "https://engaze-prod.s3.ap-south-1.amazonaws.com/restaurants/146463305457288/food/tr-180xauto/Mineral%20Water%20_4598.jpeg",
      },
    ],
  },
  {
    id: "chicken-wrap",
    title: "Chicken Wrap",
    items: [{ name: "Regular Wrap", price: 220, from: true }],
  },
  {
    id: "combos",
    title: "Combos",
    items: [
      { name: "Combo 11", price: 455, from: true, desc: "Garlic Burger Combo, New Items" },
      { name: "Combo 12", price: 410, from: true, desc: "Garlic Burger Combo, New Items" },
    ],
  },
];

/** Delivery charge shown on the online ordering page */
export const DELIVERY_CHARGE = 60;
