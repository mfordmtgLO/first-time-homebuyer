# Public Navigator Debug Record

## 2026-08-18 — 2-1 Buydown mobile interaction

Live interaction testing from the Cost of Waiting section showed that the public **2-1 Buydown** control scrolls to the correct buydown calculator. The observed defect is the active-section indicator: it incorrectly switches to **Loan Programs** at the calculator because the indicator selects the last qualifying item in menu order, while the page order is Cost of Waiting → Loan Programs → 2-1 Buydown. The fix must select the closest section above the fixed-header offset by its rendered vertical position, not by navigation-item order.

Follow-up inspection measured the Buydown page-level wrapper at **160px** from the top after the navigation tap. The previous 156px active-section threshold excluded it by four pixels, leaving Loan Programs active. The active threshold is therefore calibrated to 192px, which tracks the fixed header and floating navigator without obscuring the visible calculator heading.
