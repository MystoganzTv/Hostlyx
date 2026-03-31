"use client";

import { useState } from "react";
import { ArrowUpFromLine } from "lucide-react";
import { Modal } from "@/components/modal";
import { UploadPanel } from "@/components/upload-panel";
import type { PropertyDefinition } from "@/lib/types";

export function ReconcileStatementLauncher({
  properties,
  buttonLabel = "Import statement",
  buttonClassName,
}: {
  properties: PropertyDefinition[];
  buttonLabel?: string;
  buttonClassName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          buttonClassName ??
          "workspace-button-primary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition"
        }
      >
        <ArrowUpFromLine className="h-4 w-4" />
        {buttonLabel}
      </button>

      <Modal
        open={isOpen}
        bare
        alignTop
        onClose={() => setIsOpen(false)}
      >
        <UploadPanel
          properties={properties}
          title="Add a financial statement"
          subtitle="Upload an Airbnb or Booking.com payout statement so Reconcile can compare expected payout against actual payout."
          onCancel={() => setIsOpen(false)}
          onImportComplete={() => setIsOpen(false)}
        />
      </Modal>
    </>
  );
}
