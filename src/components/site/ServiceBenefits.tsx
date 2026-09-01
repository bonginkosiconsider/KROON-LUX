type Benefit = {
  title: string;
  description: string;
  icon: "delivery" | "support" | "payment" | "returns";
};

const benefits: Benefit[] = [
  { title: "FREE DELIVERY", description: "On orders above R999", icon: "delivery" },
  { title: "CUSTOMER SUPPORT", description: "Support 7 days a week", icon: "support" },
  { title: "SECURE PAYMENT", description: "Safe and convenient checkout", icon: "payment" },
  { title: "EASY RETURNS", description: "Convenient 7-Day Returns", icon: "returns" },
];

function BenefitIcon({ name }: { name: Benefit["icon"] }) {
  const common = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, strokeWidth: 1.7 };
  if (name === "delivery") return <svg aria-hidden="true" viewBox="0 0 48 48"><path {...common} d="M5 11.5h25v22H5zM30 19h8l5 5v9H30z" /><circle {...common} cx="13" cy="36.5" r="3.5" /><circle {...common} cx="36" cy="36.5" r="3.5" /></svg>;
  if (name === "support") return <svg aria-hidden="true" viewBox="0 0 48 48"><path {...common} d="M8.5 10.5h27a3 3 0 0 1 3 3v17a3 3 0 0 1-3 3H19l-8.5 6v-26a3 3 0 0 1 3-3Z" /></svg>;
  if (name === "payment") return <svg aria-hidden="true" viewBox="0 0 48 48"><rect {...common} height="27" rx="2.5" width="34" x="7" y="10.5" /><path {...common} d="M7 19h34M13 29h8" /></svg>;
  return <svg aria-hidden="true" viewBox="0 0 48 48"><path {...common} d="M39 18a15 15 0 0 0-26-3.5M9 30a15 15 0 0 0 26 3.5M13 10.5v6h6M35 37.5v-6h-6" /></svg>;
}

export function ServiceBenefits() {
  return <section className="service-benefits" aria-label="Kroon Luxe service benefits"><div className="service-benefits-grid">{benefits.map((benefit) => <article className="service-benefit" key={benefit.title}><div className="service-benefit-icon"><BenefitIcon name={benefit.icon} /></div><h2>{benefit.title}</h2><p>{benefit.description}</p></article>)}</div></section>;
}
