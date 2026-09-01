import { FirebaseCheckoutClient } from "@/components/firebase/FirebaseCheckoutClient";
import { CheckoutHeader } from "@/components/site/CheckoutHeader";

export default function CheckoutPage() {
  return <><CheckoutHeader /><FirebaseCheckoutClient /></>;
}
