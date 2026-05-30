import type { ComponentProps } from "react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="dark"
    position="bottom-right"
    richColors
    closeButton
    toastOptions={{
      classNames: {
        toast:
          "group toast glass-panel border border-white/12 bg-transparent text-foreground shadow-lg",
        description: "text-muted-foreground",
        actionButton: "bg-primary text-primary-foreground",
        cancelButton: "bg-muted text-muted-foreground",
      },
    }}
    {...props}
  />
);

export { Toaster };
