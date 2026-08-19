# Oregon Agent Coverage Audit

## Observed source behavior

On August 19, 2026, the authorized Oregon Agent Leads directory reported **60 agents on record in Oregon**. Its protected export is implemented by filtering stored agent rows to `state = "Oregon"` and serializing those rows.

Principal-broker information currently appears as nested office-contact fields on an agent record. For example, the source directory shows **Mary Parsagian** with **Tiffany Johnson** as principal broker for the RE/MAX Integrity office. Tiffany is not necessarily a standalone stored agent row, so she is absent from the current direct export and cannot be selected independently in the first-time-homebuyer dashboard.

## Required repair direction

The Oregon source must derive and expose a separate, stable **principal/managing principal broker directory** from the nested office-contact fields. It should preserve broker name, title, phone, email, headshot, office, office ranking, source profile deep link, and a stable source identifier. The dashboard should then import both top-agent rows and derived broker rows, clearly label their record type, and keep all selection/filtering private until a co-marketing partner profile is deliberately created.

The current 57-item dropdown observation can also be explained in part by the dashboard’s **Only show uncreated profiles** filter: profiles already promoted to partners are intentionally hidden. This does not explain the absence of a principal broker who has no standalone source-agent record.
