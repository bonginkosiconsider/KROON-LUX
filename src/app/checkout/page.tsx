import { FirebaseCheckoutClient } from "@/components/firebase/FirebaseCheckoutClient";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

export default function CheckoutPage() {
  return <><SiteHeader /><FirebaseCheckoutClient /><SiteFooter /></>;
}
