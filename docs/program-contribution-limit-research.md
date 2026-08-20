# Program Seller-Contribution Limit Research

**Purpose.** This note supports the private Program contribution limits settings design. It is an implementation reference, not a legal or underwriting determination. Corporate compliance and the lender’s current program guidance must approve any configured value before operational use.

| Program | Official guidance identified | Settings implication |
| --- | --- | --- |
| FHA | HUD states interested parties may contribute up to **6% of sales price** toward specified eligible costs; the limit includes temporary buydowns and points. | A 6% sales-price default can be shown as reviewable; the system should still label the result as an internal screen. |
| VA | VA states it does **not** limit credits for loan closing costs, but limits seller **concessions** to **4% of reasonable value**. | Do not present 4% as a blanket cap on all closing-cost credits. The private setting must distinguish concessions and retain an exception note. |
| USDA SFHGLP | USDA guidance limits seller contributions to **6% of sales price** for eligible loan purposes, with stated exclusions and special construction-to-permanent treatment. | A 6% sales-price default can be shown as reviewable, with an exception note. |
| Conventional (Fannie Mae) | Fannie Mae financing-concession limits vary: **3%** above 90% LTV/CLTV for principal/second homes, **6%** at 75.01–90%, **9%** at 75% or below, and **2%** for investment properties. | Do not use one universal conventional percentage. Store separate private tiers, or require the editor to choose the applicable conventional tier. |

## Design Decision

The dashboard will retain the existing property-specific internal dollar override, but it should add program-level defaults calculated from the saved property price. A property editor must declare the selected program/tier before the program default can be compared with the estimated 2-1 Buydown subsidy. Manual page-level overrides must remain visible as overrides. A generic public review notice may be displayed when the internal screen flags the illustration; program-limit values themselves stay private.

## Sources

1. [HUD FHA Resource Center: Interested-party contribution guidance](https://answers.hud.gov/FHA/s/article/What-costs-can-a-seller-or-other-interested-party-pay-on-behalf-of-the-Borrower)
2. [U.S. Department of Veterans Affairs: Funding fee and closing costs](https://www.va.gov/housing-assistance/home-loans/funding-fee-and-closing-costs/)
3. [USDA Rural Development: HB-1-3555 Chapter 6](https://www.rd.usda.gov/media/file/download/usda-rd-chapter-6-draft-11072024.pdf)
4. [Fannie Mae Selling Guide B3-4.1-02: Interested Party Contributions](https://selling-guide.fanniemae.com/sel/b3-4.1-02/interested-party-contributions-ipcs)
