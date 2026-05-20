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
          "group toast border border-slate-800/50 bg-card/95 text-foreground backdrop-blur-md shadow-lg",
        description: "text-muted-foreground",
        actionButton: "bg-primary text-primary-foreground",
        cancelButton: "bg-muted text-muted-foreground",
      },
    }}
    {...props}
  />
);

export { Toaster };
