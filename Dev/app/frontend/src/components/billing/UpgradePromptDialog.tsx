import { PricingPlanCard } from "@/components/PricingPlanCard";
import {
  PricingValueFocus,
  pricingCtaLabel,
  type BillingPlan,
} from "@/components/account/PlansAndBillingSection";

type UpgradePromptDialogProps = {
  message: string;
  billingPlans: BillingPlan[];
  selectedBillingPlanId: string | null;
  squarePaymentsReady: boolean;
  checkoutPlanId: string | null;
  scalableOperatorPlanId: string;
  operatorPlanQuoteTotalCents?: number;
  onSelectPlan: (planId: string) => void;
  onPurchasePlan: (planId: string) => void;
  onViewAllPlans: () => void;
  onClose: () => void;
};

export function UpgradePromptDialog({
  message,
  billingPlans,
  selectedBillingPlanId,
  squarePaymentsReady,
  checkoutPlanId,
  scalableOperatorPlanId,
  operatorPlanQuoteTotalCents,
  onSelectPlan,
  onPurchasePlan,
  onViewAllPlans,
  onClose,
}: UpgradePromptDialogProps) {
  return (
    <div className="idle-session-overlay" role="dialog" aria-modal="true" aria-labelledby="upgrade-prompt-title">
      <div className="idle-session-dialog glass-panel upgrade-prompt-dialog">
        <h2 id="upgrade-prompt-title">Choose a plan</h2>
        <p className="muted">{message}</p>
        {billingPlans.length > 0 ? (
          <div className="pricing-grid pricing-grid--compact">
            {billingPlans
              .filter((plan) => plan.purchasable)
              .map((plan) => {
                const isSelected = plan.id === selectedBillingPlanId;
                return (
                  <PricingPlanCard
                    key={plan.id}
                    plan={plan}
                    selected={isSelected}
                    interactive
                    onSelect={onSelectPlan}
                    comparedToSlot={<PricingValueFocus text={plan.comparedTo ?? ""} />}
                    footer={
                      <button
                        type="button"
                        className={isSelected || plan.highlight ? "primary-btn" : "secondary-btn"}
                        disabled={!squarePaymentsReady || checkoutPlanId === plan.id}
                        onClick={() => onPurchasePlan(plan.id)}
                      >
                        {pricingCtaLabel(
                          plan,
                          checkoutPlanId === plan.id,
                          plan.id === scalableOperatorPlanId ? operatorPlanQuoteTotalCents : undefined,
                        )}
                      </button>
                    }
                  />
                );
              })}
          </div>
        ) : null}
        <div className="idle-session-actions">
          <button type="button" className="primary-btn" onClick={onViewAllPlans}>
            View all plans in Account
          </button>
          <button type="button" className="secondary-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
