import icedLatte from "@/assets/iced-latte.jpg";
import spanishLatte from "@/assets/spanish-latte.jpg";
import matchaLatte from "@/assets/matcha-latte.jpg";
import croissant from "@/assets/croissant.jpg";
import bottledWater from "@/assets/bottled-water.jpg";
import vanillaSyrup from "@/assets/vanilla-syrup.jpg";

export const products = [
  { id: "iced-latte", name: "Iced Latte", price: 4.5, cost: 1.6, image: icedLatte },
  { id: "spanish-latte", name: "Spanish Latte", price: 4.75, cost: 1.7, image: spanishLatte },
  { id: "matcha-latte", name: "Matcha Latte", price: 4.5, cost: 1.75, image: matchaLatte },
  { id: "croissant", name: "Croissant", price: 3.25, cost: 1.1, image: croissant },
  { id: "bottled-water", name: "Bottled Water", price: 1.75, cost: 0.4, image: bottledWater },
  { id: "vanilla-syrup", name: "Vanilla Syrup", price: 1.25, cost: 0.35, image: vanillaSyrup },
];

export const inventory = [
  { name: "Coffee Beans", available: "4.5 kg", status: "in" as const },
  { name: "Fresh Milk", available: "3 L", status: "low" as const },
  { name: "16 oz Cups", available: "24 pcs", status: "low" as const },
  { name: "Bottled Water", available: "36 pcs", status: "in" as const },
];
