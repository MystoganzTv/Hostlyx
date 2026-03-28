import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Terms of Service | Hostlyx",
  description: "Terms of Service for Hostlyx.",
};

export default function TermsPage() {
  return (
    <LegalPageShell
      eyebrow="Legal"
      title="Terms of Service"
      description="These terms govern the use of Hostlyx and the financial reporting tools we provide to short-term rental operators."
    >
      <section>
        <h2 className="text-xl font-semibold text-slate-100">Use of Hostlyx</h2>
        <p className="mt-3">
          Hostlyx is provided to help hosts organize bookings, expenses, tax estimates, and reporting. You agree to use the product lawfully and to provide accurate account information.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-100">Billing and access</h2>
        <p className="mt-3">
          Paid access is billed through Stripe. Trial access, plan limits, and feature availability may change depending on your subscription status. Cancelling a paid plan stops future billing but does not delete your underlying data.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-100">Your data</h2>
        <p className="mt-3">
          You retain ownership of the bookings, expense files, and business data you upload to Hostlyx. You are responsible for reviewing reports before sharing them with accountants, partners, or investors.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-100">Service changes</h2>
        <p className="mt-3">
          We may improve, modify, or discontinue parts of the service over time. If a change materially affects paid access, we will aim to communicate it clearly inside the product or by email.
        </p>
      </section>
    </LegalPageShell>
  );
}
