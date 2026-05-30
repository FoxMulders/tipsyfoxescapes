import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useExperienceDesigner } from "../ExperienceDesignerContext";

export function ReviewPage() {
  const navigate = useNavigate();
  const { reviewContent, canReview } = useExperienceDesigner();

  useEffect(() => {
    if (!canReview) {
      navigate("/builder/compose", { replace: true });
    }
  }, [canReview, navigate]);

  if (!canReview) {
    return null;
  }

  return (
    <div className="experience-step experience-step--scroll h-full">
      <div className="experience-review-inner">{reviewContent}</div>
      <div className="experience-review-footer flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => navigate("/builder/studio")}>
          Back to studio
        </Button>
        <Button
          type="button"
          onClick={() =>
            document.getElementById("builder-export-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        >
          Export &amp; save
        </Button>
      </div>
    </div>
  );
}
