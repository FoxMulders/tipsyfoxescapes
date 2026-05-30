import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useExperienceDesigner } from "../ExperienceDesignerContext";

export function ReviewPage() {
  const navigate = useNavigate();
  const { reviewContent, canReview, onOpenReview } = useExperienceDesigner();

  useEffect(() => {
    if (!canReview) {
      navigate("/builder/compose", { replace: true });
    }
  }, [canReview, navigate]);

  return (
    <div className="experience-step experience-step--scroll h-full">
      <div className="experience-review-inner">{reviewContent}</div>
      <div className="experience-review-footer flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => navigate("/builder/studio")}>
          Back to studio
        </Button>
        <Button type="button" onClick={onOpenReview}>
          Open full export
        </Button>
      </div>
    </div>
  );
}
