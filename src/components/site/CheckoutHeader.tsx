import Image from "next/image";
import Link from "next/link";
import kroonLuxeLogo from "../../../logo/backgrounderaser_1785409165.png";

export function CheckoutHeader() {
  return <header className="checkout-header"><Link href="/" aria-label="Kroon Luxe home"><Image alt="Kroon Luxe" priority src={kroonLuxeLogo} /></Link></header>;
}
