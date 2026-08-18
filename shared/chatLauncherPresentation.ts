export type MobileChatLauncherPresentation = "compact" | "expanded";

/** An active or recently scrolled chat launcher earns a full label; otherwise it stays out of the way. */
export function getMobileChatLauncherPresentation(chatIsOpen: boolean, pageRecentlyScrolled: boolean): MobileChatLauncherPresentation {
  return chatIsOpen || pageRecentlyScrolled ? "expanded" : "compact";
}
