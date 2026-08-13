/* GOLDEN HOUR PORCH — FAQ accordion addressing pre-approval fears */
import { useReveal } from "@/hooks/useReveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Do I really not need 20% down?",
    a: "Correct. The 20% figure is the biggest myth in home buying. USDA and VA loans allow qualified buyers to purchase with 0% down, certain conventional programs also offer zero-down options, and FHA requires as little as 3.5% — which can even be a gift from family.",
  },
  {
    q: "Will checking my credit hurt my score?",
    a: "A single mortgage pre-approval inquiry has a minimal, temporary effect — typically just a few points. More importantly, we review your credit together first, so there are no surprises and we can fix quick red flags before they matter.",
  },
  {
    q: "When should I get pre-approved?",
    a: "Before you even look at homes online. Pre-approval gives you a hard budget — your exact max price and monthly payment — and real estate agents won't show homes (and sellers won't accept offers) without a pre-approval letter attached.",
  },
  {
    q: "What if my credit score isn't great?",
    a: "You may have more options than you think. FHA loans are highly flexible on credit scores, and often a few targeted fixes can move your score meaningfully in a short time. We'll look at it together and build a plan — no judgment, ever.",
  },
  {
    q: "What happens on the 15-minute strategy call?",
    a: "We talk through your goals, timeline, and finances, then run custom scenarios comparing the programs you qualify for. You leave knowing your realistic price range, estimated monthly payment, and exact next steps. No pressure, no obligation.",
  },
  {
    q: "How much does working with you cost?",
    a: "The strategy call and Roadmap are completely free. Lender fees and closing costs vary by loan program, and we'll walk through every line item transparently before you commit to anything.",
  },
];

export default function Faq() {
  const ref = useReveal<HTMLElement>();
  return (
    <section id="faq" ref={ref} className="py-20 md:py-28">
      <div className="container grid lg:grid-cols-[4fr_8fr] gap-10 lg:gap-16">
        <div className="reveal">
          <span className="key-tag bg-secondary text-secondary-foreground">Good questions</span>
          <h2 className="mt-5 font-sans font-semibold tracking-[-0.03em] text-3xl md:text-[2.25rem] leading-[1.12] text-foreground">
            Common first-time buyer lender questions.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            Still wondering about something? Bring it to your strategy call — there are no silly questions.
          </p>
        </div>
        <div className="reveal">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-border">
                <AccordionTrigger className="text-left font-display text-lg md:text-xl font-semibold text-foreground hover:no-underline py-5">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground leading-relaxed pb-5">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
