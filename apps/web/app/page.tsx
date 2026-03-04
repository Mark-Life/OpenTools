import { Approval } from "@/components/landing/approval";
import { Comparison } from "@/components/landing/comparison";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Problem } from "@/components/landing/problem";
import { Spec } from "@/components/landing/spec";

export default function Page() {
  return (
    <main className="mx-auto max-w-4xl px-4">
      <Hero />
      <Problem />
      <HowItWorks />
      <Spec />
      <Approval />
      <Comparison />
      <Footer />
    </main>
  );
}
