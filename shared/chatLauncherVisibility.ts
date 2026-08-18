/** Keeps the initial hero calls to action unobstructed without hiding a resumable chat. */
export function shouldHideMobileChatLauncher(heroActionsVisible: boolean, chatIsOpen: boolean): boolean {
  return heroActionsVisible && !chatIsOpen;
}
