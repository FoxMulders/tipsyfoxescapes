import { PricingPlanCard, type PricingPlanCardPlan } from "@/components/PricingPlanCard";
import { SquareCheckout } from "@/components/SquareCheckout";
import { VenueEscapePlanBuilder } from "@/components/planning/VenueEscapePlanBuilder";
import {
  calculateEscapePlanPrice,
  formatCentsUsd,
  SCALABLE_OPERATOR_PLAN_ID,
  type EscapePlanRoomProfile,
} from "../../../../shared/escapePlanPricing";

export type BillingPlan = PricingPlanCardPlan & {
  currency: string;
  comparedTo: string;
  scalableRoomPricing?: {
    includedLayoutRooms: number;
    perAdditionalRoomCents: number;
    exportCreditsPerRoom?: number;
  };
};

export const PricingValueFocus = ({ text }: { text: string }) => {
  const trimmed = text.trim();
  if (!trimmed) return null;
  return (
    <p className="pricing-value-focus muted" role="note">
      {trimmed}
    </p>
  );
};

export const pricingCtaLabel = (plan: BillingPlan, busy: boolean, checkoutTotalCents?: number): string => {
  if (busy) return "Opening Square…";
  if (plan.billingInterval === "monthly" && checkoutTotalCents && checkoutTotalCents > plan.priceCents) {
    return `Subscribe — ${formatCentsUsd(checkoutTotalCents)}/mo`;
  }
  if (plan.billingInterval === "monthly") return `Subscribe — ${plan.priceLabel}`;
  if (plan.billingInterval === "one_time" && plan.id === "home_enthusiast") return `Buy — ${plan.priceLabel}`;
  if (plan.id === "casual_hobbyist") return `Get event pass — ${plan.priceLabel}`;
  return `Choose ${plan.name}`;
};

type PlansAndBillingSectionProps = {
  authUser: { billingTier: string; isAdmin: boolean };
  billingPlans: BillingPlan[];
  selectedBillingPlanId: string;
  selectedBillingPlan: BillingPlan | null;
  onSelectPlan: (planId: string) => void;
  squarePaymentsReady: boolean;
  squareSetupHint: string | null;
  authToken: string;
  squareWebConfig: Parameters<typeof SquareCheckout>[0]["square"];
  billingNotice: string;
  onBillingNotice: (message: string) => void;
  onBillingError: (message: string) => void;
  checkoutPlanId: string | null;
  onPurchasePlan: (planId: string) => void;
  escapePlanRooms: EscapePlanRoomProfile[];
  activeEscapePlanRoomId: string;
  onEscapePlanRoomsChange: (rooms: EscapePlanRoomProfile[]) => void;
  onActiveEscapePlanRoomChange: (roomId: string) => void;
  operatorPlanQuote: ReturnType<typeof calculateEscapePlanPrice> | null;
  compact?: boolean;
};

export function PlansAndBillingSection({
  authUser,
  billingPlans,
  selectedBillingPlanId,
  selectedBillingPlan,
  onSelectPlan,
  squarePaymentsReady,
  squareSetupHint,
  authToken,
  squareWebConfig,
  billingNotice,
  onBillingNotice,
  onBillingError,
  checkoutPlanId,
  onPurchasePlan,
  escapePlanRooms,
  activeEscapePlanRoomId,
  onEscapePlanRoomsChange,
  onActiveEscapePlanRoomChange,
  operatorPlanQuote,
  compact = false,
}: PlansAndBillingSectionProps) {
  const showEscapePlanBuilder = selectedBillingPlanId === SCALABLE_OPERATOR_PLAN_ID;

  return (
    <section
      className={`card subscription-card pricing-section${compact ? " pricing-section--compact" : ""}`}
      aria-label="Pricing plans"
      id="plans-and-billing"
    >
      <h2 className="subscription-title">Plans &amp; billing</h2>
      <p className="muted pricing-lead">
        Each paid tier lists only what it adds on top of the previous plan. Checkout is powered by <strong>Square</strong>.
      </p>
      {!squarePaymentsReady ? (
        <p className="muted pricing-square-hint" role="status">
          {squareSetupHint ??
            "Square checkout is not configured yet. Set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID in Vercel → Environment Variables (Production & Preview), then redeploy."}
        </p>
      ) : null}
      {!compact && squarePaymentsReady && authToken && selectedBillingPlan?.purchasable ? (
        <SquareCheckout
          planId={selectedBillingPlan.id}
          planLabel={
            operatorPlanQuote
              ? `${selectedBillingPlan.name} — ${formatCentsUsd(operatorPlanQuote.totalCents)}/mo`
              : selectedBillingPlan.name
          }
          authToken={authToken}
          square={squareWebConfig}
          onNotice={onBillingNotice}
          onError={onBillingError}
        />
      ) : null}
      {!compact && showEscapePlanBuilder && selectedBillingPlan?.scalableRoomPricing ? (
        <VenueEscapePlanBuilder
          rooms={escapePlanRooms}
          activeRoomId={activeEscapePlanRoomId}
          onRoomsChange={onEscapePlanRoomsChange}
          onActiveRoomChange={onActiveEscapePlanRoomChange}
          basePriceCents={selectedBillingPlan.priceCents}
          includedLayoutRooms={selectedBillingPlan.scalableRoomPricing.includedLayoutRooms}
          perAdditionalRoomCents={selectedBillingPlan.scalableRoomPricing.perAdditionalRoomCents}
          planName={selectedBillingPlan.name}
        />
      ) : null}
      <div className={`pricing-grid${compact ? " pricing-grid--compact" : ""}`}>
        {billingPlans.map((plan) => {
          const isCurrent = plan.id === "free" ? authUser.billingTier === "trial" : false;
          const isSelected = plan.id === selectedBillingPlanId;
          return (
            <PricingPlanCard
              key={plan.id}
              plan={plan}
              selected={isSelected}
              isCurrent={isCurrent}
              interactive={plan.purchasable}
              onSelect={plan.purchasable ? onSelectPlan : undefined}
              comparedToSlot={<PricingValueFocus text={plan.comparedTo ?? ""} />}
              footer={
                plan.purchasable ? (
                  <button
                    type="button"
                    className={isSelected || plan.highlight ? "primary-btn" : "secondary-btn"}
                    disabled={!squarePaymentsReady || checkoutPlanId === plan.id}
                    aria-busy={checkoutPlanId === plan.id}
                    onClick={() => void onPurchasePlan(plan.id)}
                  >
                    {pricingCtaLabel(
                      plan,
                      checkoutPlanId === plan.id,
                      plan.id === SCALABLE_OPERATOR_PLAN_ID ? operatorPlanQuote?.totalCents : undefined,
                    )}
                  </button>
                ) : (
                  <p className="muted pricing-included">
                    {authUser.billingTier === "trial" ? "Your current plan" : "Included baseline"}
                  </p>
                )
              }
            />
          );
        })}
      </div>
      {billingNotice ? <p className="success-inline pricing-notice">{billingNotice}</p> : null}
    </section>
  );
}
