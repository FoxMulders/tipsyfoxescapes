import type { KeyboardEvent, ReactNode } from "react";
import { buildPricingFeatureLines } from "@/lib/pricingTierDisplay";
import { cn } from "@/lib/utils";

export type PricingPlanCardPlan = {
  id: string;
  name: string;
  tagline: string;
  priceLabel: string;
  priceSubtitle?: string | null;
  priceCents: number;
  billingInterval?: string;
  tierLane?: string;
  valueHeadline?: string | null;
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

const tierLaneLabel = (lane?: string): string | null => {
  if (lane === "home") return "Home hosting";
  if (lane === "operator") return "Operator subscription";
  return null;
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
  const lane = tierLaneLabel(plan.tierLane);
  const featureLines = buildPricingFeatureLines(plan.id, plan.features);
  const className = cn(
    "pricing-card",
    plan.tierLane === "operator" && "pricing-card--operator",
    plan.highlight && "pricing-card--highlight",
    isCurrent && "pricing-card--current",
    selected && "pricing-card--selected",
    interactive && "pricing-card--interactive",
  );

  const body = (
    <>
      <header className="pricing-card-head">
        {lane ? <p className="pricing-tier-badge">{lane}</p> : null}
        <h3>{plan.name}</h3>
        <p className="pricing-tagline muted">{plan.tagline}</p>
        <p className="pricing-price">{plan.priceLabel}</p>
        {plan.priceSubtitle ? <p className="pricing-price-sub muted">{plan.priceSubtitle}</p> : null}
        {plan.valueHeadline ? <p className="pricing-value-headline">{plan.valueHeadline}</p> : null}
        {plan.perRoomPriceLabel ? <p className="pricing-per-room muted">{plan.perRoomPriceLabel}</p> : null}
      </header>
      <ul className="pricing-features">
        {featureLines.map((line, index) => (
          <li
            key={`${plan.id}-${line.kind}-${index}`}
            className={line.kind === "plus-lead" ? "pricing-features-plus-lead" : undefined}
          >
            {line.text}
          </li>
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
