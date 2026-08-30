import { FirebaseCartClient } from "@/components/firebase/FirebaseCartClient";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

export default function CartPage() {
  return <><SiteHeader /><FirebaseCartClient /><SiteFooter /></>;
}
