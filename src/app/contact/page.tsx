import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Contact | Hostlyx",
  description: "Contact Hostlyx for support, billing, or product questions.",
};

export default function ContactPage() {
  return (
    <LegalPageShell
      eyebrow="Support"
      title="Contact"
      description="Reach out for billing questions, data issues, product feedback, or operational support related to your Hostlyx workspace."
    >
      <section>
        <h2 className="text-xl font-semibold text-slate-100">Email</h2>
        <p className="mt-3">
          Contact Hostlyx at{" "}
          <a
            href="mailto:hello@hostlyx.com"
            className="font-semibold text-[var(--accent)] transition hover:text-[var(--accent-hover)]"
          >
            hello@hostlyx.com
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-100">What to include</h2>
        <p className="mt-3">
          To help us respond faster, include your account email, a short description of the issue, and whether your question is about billing, imports, dashboard metrics, or shared reports.
        </p>
      </section>
    </LegalPageShell>
  );
}
