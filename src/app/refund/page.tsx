import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Refund Policy | Hostlyx",
  description: "Refund Policy for Hostlyx.",
};

export default function RefundPage() {
  return (
    <LegalPageShell
      eyebrow="Billing"
      title="Refund Policy"
      description="This policy explains how Hostlyx handles subscription refunds, billing disputes, and cancelled upgrades."
    >
      <section>
        <h2 className="text-xl font-semibold text-slate-100">Subscription charges</h2>
        <p className="mt-3">
          Paid plans are billed through Stripe using the pricing shown inside Hostlyx. When a trial ends and you upgrade, billing starts according to the subscription created at checkout.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-100">Refund requests</h2>
        <p className="mt-3">
          If you believe a charge was made in error, contact us promptly with the email used for billing and the date of the transaction. Refund decisions are reviewed case by case.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-100">Cancellation timing</h2>
        <p className="mt-3">
          Cancelling a subscription stops future renewals but does not retroactively reverse fees for time already billed, unless a refund is explicitly approved.
        </p>
      </section>
    </LegalPageShell>
  );
}
