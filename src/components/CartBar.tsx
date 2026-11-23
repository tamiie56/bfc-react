import { FaShoppingBag } from "react-icons/fa";
import { useCart } from "../cart/CartContext";

/** Floating "View cart" pill - shown on every page while the cart has items. */
export default function CartBar() {
  const { count, subtotal, isOpen, openCart } = useCart();
  if (count === 0 || isOpen) return null;

  return (
    <button className="cartbar" onClick={openCart}>
      <FaShoppingBag aria-hidden />
      <span>
        View Cart · {count} {count === 1 ? "item" : "items"}
      </span>
      <strong>৳{subtotal}</strong>
    </button>
  );
}
