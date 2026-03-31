"use client";

import { useState } from "react";
import { ArrowUpFromLine } from "lucide-react";
import type { PropertyDefinition } from "@/lib/types";
import { Modal } from "@/components/modal";
import { ReconcileStatementLauncher } from "@/components/reconcile-statement-launcher";
import { SectionCard } from "@/components/section-card";
import { UploadPanel } from "@/components/upload-panel";

export function ImportCenterLauncher({
  properties,
}: {
  properties: PropertyDefinition[];
}) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <>
      <SectionCard
        title="Bring your data"
        subtitle="Import bookings, expenses, or financial statements in a focused modal, then keep this page centered on history and control."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="workspace-button-primary inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition"
            >
              <ArrowUpFromLine className="h-4 w-4" />
              Import bookings or expenses
            </button>
            <ReconcileStatementLauncher
              properties={properties}
              buttonLabel="Financial statement"
              buttonClassName="workspace-button-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition"
            />
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div className="workspace-soft-card rounded-[24px] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
              Focused flow
            </p>
            <p className="mt-3 text-base font-medium text-[var(--workspace-text)]">
              Upload, review, and confirm inside a modal.
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--workspace-muted)]">
              Use the main import flow for bookings or expenses. Use the financial statement path when you want Reconcile to compare expected payout against actual payout.
            </p>
          </div>

          <div className="workspace-soft-card rounded-[24px] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted)]">
              Supported
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Airbnb bookings", "Booking.com bookings", "Hostlyx Excel", "Financial statements"].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[var(--workspace-border)] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-[var(--workspace-muted)]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <Modal
        open={isUploadOpen}
        title="Import bookings or expenses"
        onClose={() => setIsUploadOpen(false)}
      >
        <UploadPanel
          properties={properties}
          title="Import bookings or expenses"
          subtitle="Upload your Airbnb, Booking.com, or Excel files to bring bookings and expenses into Hostlyx."
          onCancel={() => setIsUploadOpen(false)}
        />
      </Modal>
    </>
  );
}
