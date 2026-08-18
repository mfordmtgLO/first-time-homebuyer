# Mobile Mortgage Chat Follow-Up Debug Record

## 2026-08-18 — Follow-up prompt placement

An actual 375×812 mobile inspection of the first follow-up question measured a 263px transcript viewport and a 164px current-question card. The existing bottom-aligned snapping behavior used `scrollTop=377`, which can cause taller follow-up prompts to lose their first lines above the transcript viewport.

Follow-up prompts now align 56px below the transcript top. When any message content still extends below the visible transcript, a small tappable down-arrow appears at the transcript’s lower-right edge and scrolls the visitor to the remaining content. The cue is absent when the transcript is already at its bottom.

An 80px transcript trailing spacer lets the final visible follow-up question scroll down to the same 56px top gutter instead of being constrained against the transcript’s bottom edge. The conditional cue subtracts that intentional spacer, so it appears only for real message content below the viewport.
