# WNY Auto Rentals — GrillMe Handoff

## Current objective

Create a written Markdown implementation plan—not code—for a local, phone-friendly management app for WNY Auto Rentals in Buffalo, NY. The plan must be produced only after the GrillMe interview converges on the remaining design decisions.

## Repository state

- Repository: `C:\Users\mtalh\Projects\ie310`
- Branch: `talha`
- Current commit: `ca02310` (`Merge pull request #1 from optimatorlab/murray`)
- Recent commits: `fbd37c1 load skills`, `baf749e Initial commit`
- Worktree was clean before this handoff.
- Existing project content is only `README.md` plus the local `llm_skills` directory.
- No application code or implementation plan has been created yet.

## Agreed product constraints and decisions

- The user is not a developer and cannot be expected to debug or maintain a server.
- Local-only operation; no cloud account, hosted app, subscription, analytics, third-party APIs, payment processing, or automated texting/email.
- Data must remain on the user’s devices and be manually transferable/backed up as local files.
- The app must work in a phone browser for parking-lot handovers and on a laptop for reporting/editing.
- Phone: iPhone. The iPhone is the primary source of truth.
- Laptop can edit data and can log payments/issue receipts.
- Synchronization is manual through the iPhone Files app: export from iPhone, import/edit on laptop, export from laptop, import back to iPhone.
- Only one active editor at a time is expected.
- On import conflict: warn, automatically save a recovery export of the current iPhone data, then let the user choose whether to import the laptop file. Do not silently overwrite.
- Existing iPhone passcode/Face ID is sufficient; no additional app passcode required.
- Backups/exports containing sensitive data should be password-encrypted; password is stored separately by the user.
- One-click CSV export of everything.
- No hard deletes; archive records instead.
- Money is integer cents, never floating-point amounts.
- Dates and late calculations use America/New_York local time.
- Receipt numbers are sequential, never reused or skipped; both iPhone and laptop may issue receipts through the shared data file.

## Business scope

- Highest-value outcome: immediately know who is late and how much they owe.
- Initial phase should include: vehicles, renters, rentals, payment schedules, late-payment dashboard, payment logging, PDF receipts, copyable text receipts, encrypted import/export, and CSV export.
- Initial phase should use the eight partnership vehicles only. Six personally owned vehicles are deferred to a later phase, though the data model should be able to support ownership categories and separate reporting.
- Partner may edit data.
- Initial migration should include all active renters, vehicles, rentals, balances, deposits, and known payment history. Unknown historical details must be marked as imported/estimated rather than invented.
- No photo storage; license and vehicle-condition photos remain in the phone camera roll.
- Rental agreement generation is later-phase work and should produce a completed PDF from the existing Word template.

## Billing decisions

- First billing period charges a full period immediately, not a prorated amount.
- Partial payments are recorded immediately and leave the remaining balance owing.
- Payments apply to outstanding rent before late fees.
- Rate changes create effective-dated rate history; old rates and receipts never change.
- A vehicle change ends the old rental and starts a linked new rental.
- The $300 deposit is tracked separately, is not rental income, and is applied at closeout against damage, unpaid rent, fuel, etc.; remaining balance is refunded within 14 days.
- Late fee agreement: three-day grace period, then $20/day beginning day 4, capped at one full period’s rent per missed payment. The user confirmed rent is paid before late fees, but the exact handling of late-fee accrual after partial rent payment still needs confirmation.

## Tax decision

The original brief described future New York sales and passenger-car rental tax, but the user later explicitly selected option A: remove all tax functionality because these are private rentals with no LLC. The plan should therefore contain no tax toggle, tax lines, 12-month tax logic, or tax registration workflow unless the user reverses this decision.

## Seed partnership fleet

| Plate | Vehicle | Weekly rate | Payment day |
|---|---|---:|---|
| MGR7670 | Toyota Camry | not rented | — |
| MGR7671 | Toyota Corolla | $265 | Tuesday |
| MHV2116 | Volkswagen Passat | $292 | Saturday |
| MHV2117 | Honda Civic Hybrid | $300 | Thursday |
| MHV2167 | Honda HR-V | $300 | Friday |
| MHV3875 | Honda Odyssey | $315 | Sunday |
| MHV2119 | Toyota Prius | $270 | Saturday |
| MHV9366 | 2019 Honda Civic | $380 | Tuesday |

## Still unanswered — ask these first next session

1. For weekly rentals, should the payment due day be a recurring weekday, while monthly rentals use a day of month?
2. If a monthly due date falls on the 29th–31st in a shorter month, should it be due on the last day of that month?
3. When recording a payment, should the receipt show allocation details and should overpayments remain as renter credit rather than being silently applied?
4. Should the dashboard flag upcoming license, insurance, and registration expirations, such as 30 days in advance?
5. Should the eight partnership seed vehicles be entered exactly as listed, with MGR7670 available and the other seven rental/payment details entered as provided?

## Recommended next steps

1. Resume with the five unanswered questions above.
2. Continue GrillMe through remaining edge cases: recurring period boundaries, receipt correction/void rules, deposit closeout, rental overlap validation, archival behavior, encrypted-file recovery, and phone/laptop import/export UX.
3. Then write the requested implementation plan Markdown file in the repository with Goal, codebase context, agreed decisions, proposed design, implementation phases, testing/verification, risks/mitigations, and any remaining open questions.

