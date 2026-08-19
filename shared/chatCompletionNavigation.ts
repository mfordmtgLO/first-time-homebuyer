export const chatCompletionNavigation = [
  {
    targetId: "buydown",
    label: "2-1 Buydown",
    description: "See a sample payment-savings scenario.",
  },
  {
    targetId: "cost-of-waiting",
    label: "Cost of Waiting",
    description: "Compare renting with buying sooner.",
  },
  {
    targetId: "roadmap",
    label: "Free Roadmap",
    description: "Review the homebuying steps at your pace.",
  },
  {
    targetId: "about",
    label: "Your Guide",
    description: "Meet Mike and see how he can help.",
  },
] as const;

export type ChatCompletionNavigationTarget = (typeof chatCompletionNavigation)[number]["targetId"];

export const FULL_FIRST_TIME_HOMEBUYER_URL = "https://firsttimehomebuyer.manus.space";

/**
 * Property pages contain payment tools and a Roadmap form, but not the main
 * landing page's guide section. Keep their completion choices local wherever
 * possible and provide a clear escape to the full buyer-education website.
 */
export const propertyChatCompletionNavigation = [
  {
    targetId: "buydown",
    label: "2-1 Buydown",
    description: "See a sample payment-savings scenario.",
  },
  {
    targetId: "cost-of-waiting",
    label: "Cost of Waiting",
    description: "Compare renting with buying sooner.",
  },
  {
    targetId: "roadmap",
    label: "Free Roadmap",
    description: "Request your personalized homebuying guide.",
  },
  {
    targetId: "full-homebuyer-site",
    label: "Full Homebuyer Site",
    description: "Explore the complete first-time buyer guide.",
  },
] as const;

export type PropertyChatCompletionNavigationTarget = (typeof propertyChatCompletionNavigation)[number]["targetId"];
