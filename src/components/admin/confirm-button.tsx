"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui";

/** Submit button that asks for confirmation first (used for deletes). */
export function ConfirmButton({ message, label, icon = true }: { message: string; label?: string; icon?: boolean }) {
  return (
    <Button
      type="submit"
      variant="danger"
      size={label ? "md" : "icon"}
      aria-label={label || message}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {icon && <Trash2 className="h-4 w-4" />} {label}
    </Button>
  );
}
