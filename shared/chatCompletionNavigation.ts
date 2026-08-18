export const chatCompletionNavigation = [
  {
    targetId: "buydown",
    label: "Try the 2-1 Buydown",
    description: "See a sample payment-savings scenario.",
  },
  {
    targetId: "cost-of-waiting",
    label: "Explore Cost of Waiting",
    description: "Compare renting with buying sooner.",
  },
  {
    targetId: "roadmap",
    label: "Get the free Roadmap",
    description: "Review the homebuying steps at your pace.",
  },
] as const;

export type ChatCompletionNavigationTarget = (typeof chatCompletionNavigation)[number]["targetId"];
