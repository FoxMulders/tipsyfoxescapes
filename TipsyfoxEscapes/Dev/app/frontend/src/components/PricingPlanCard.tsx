import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PricingPlanCardPlan = {
  id: string;
  name: string;
  tagline: string;
  priceLabel: string;
  priceCents: number;
  roomsToAdd: number;
  exportCreditsToAdd: number;
  perRoomPriceLabel?: string | null;
  features: string[];
  comparedTo?: string;
  purchasable: boolean;
  highlight?: boolean;
};

type PricingPlanCardProps = {
  plan: PricingPlanCardPlan;
  selected?: boolean;
  isCurrent?: boolean;
  interactive?: boolean;
  onSelect?: (planId: string) => void;
  comparedToSlot?: ReactNode;
  footer?: ReactNode;
};

function PricingCardFooter({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={className}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function PricingPlanCard({
  plan,
  selected = false,
  isCurrent = false,
  interactive = false,
  onSelect,
  comparedToSlot,
  footer,
}: PricingPlanCardProps) {
  const className = cn(
    "pricing-card",
    plan.highlight && "pricing-card--highlight",
    isCurrent && "pricing-card--current",
    selected && "pricing-card--selected",
    interactive && "pricing-card--interactive",
  );

  const body = (
    <>
      <header className="pricing-card-head">
        <h3>{plan.name}</h3>
        <p className="pricing-tagline muted">{plan.tagline}</p>
        <p className="pricing-price">{plan.priceLabel}</p>
        {plan.priceCents > 0 ? (
          <p className="muted pricing-pack-detail">
            +{plan.roomsToAdd} slot{plan.roomsToAdd === 1 ? "" : "s"} · +{plan.exportCreditsToAdd} export credit
            {plan.exportCreditsToAdd === 1 ? "" : "s"}
            {plan.perRoomPriceLabel ? ` · ${plan.perRoomPriceLabel}` : ""}
          </p>
        ) : null}
      </header>
      <ul className="pricing-features">
        {plan.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      {comparedToSlot}
      {footer ? <PricingCardFooter className="pricing-card-footer">{footer}</PricingCardFooter> : null}
    </>
  );

  if (interactive && onSelect) {
    const activate = () => onSelect(plan.id);
    const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    };
    return (
      <article
        className={className}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        onClick={activate}
        onKeyDown={onKeyDown}
      >
        {body}
      </article>
    );
  }

  return <article className={className}>{body}</article>;
}
