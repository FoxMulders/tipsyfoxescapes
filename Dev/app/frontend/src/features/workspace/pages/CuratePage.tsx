import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useExperienceDesigner } from "../ExperienceDesignerContext";

export function CuratePage() {
  const navigate = useNavigate();
  const { curateContent, hasBlueprint, puzzlesGenerating } = useExperienceDesigner();

  useEffect(() => {
    if (!hasBlueprint && !puzzlesGenerating) {
      navigate("/builder/compose", { replace: true });
    }
  }, [hasBlueprint, puzzlesGenerating, navigate]);

  return (
    <div className="experience-step experience-step--scroll h-full">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="m-0 text-lg font-bold text-slate-50">Curate puzzles</h2>
        <p className="mt-1 mb-0 text-sm text-slate-400">Replace slots, toggle pool picks, and refine the set before review.</p>
      </div>
      <div className="p-4">{curateContent}</div>
    </div>
  );
}
