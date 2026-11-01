# WNY Auto Rentals Management App — Implementation Plan

## Goal

Build a small, local-only management app for WNY Auto Rentals that makes the late-payment situation immediately visible and lets the owner log a payment and produce a receipt in seconds.

The first release must run from a Windows laptop with a one-click launcher and be usable from an iPhone browser over the same private Wi-Fi or hotspot. It must not require a cloud account, hosted backend, subscription, analytics, third-party API, payment processing, or automated messaging.

The app is an internal tool for the owner and business partner. It is not customer-facing.

## Context from codebase exploration

The repository is effectively empty: it contains only `README.md` and the local `llm_skills` directory. There is no existing framework, database, test suite, deployment setup, or code pattern to preserve. The implementation can therefore select a small, self-contained architecture optimized for local operation and simple maintenance.

## Agreed decisions

### Scope and ownership

- Phase one covers the eight partnership vehicles. Personal vehicles are deferred, but ownership must be represented in the data model for a later phase.
- Partnership reporting remains separate from future personal-vehicle reporting; partnership profit is split 50/50.
- The partner can edit records, log payments, and issue receipts.
- Both iPhone and laptop may create payments. Receipt sequencing is carried in the shared data file.
- There are no user accounts or customer-facing screens.

### Devices and data flow

- The laptop is Windows and runs the local app server through a one-click launcher.
- The iPhone connects through the same private Wi-Fi/hotspot. Remote access is out of scope for the first release.
- The iPhone remains the authoritative data store.
- The laptop imports an encrypted working copy, permits editing, and exports it for re-import on the iPhone.
- Only one active editor is expected at a time.
- Before an import, the iPhone compares the exported file’s source version with its current version. On mismatch it warns the user, saves a recovery export of the current iPhone data, and lets the user choose whether to continue.
- Backups/exports are password-encrypted. The password is not stored in the app or inside the backup.
- The existing iPhone passcode/Face ID is sufficient device protection.

### Records and accounting rules

- Money is stored as integer cents. No floating-point money calculations are permitted.
- Dates and late calculations use `America/New_York` local calendar dates.
- There are no tax features. No tax toggle, tax lines, passenger-rental tax, or 12-month tax logic should be implemented.
- No hard deletes. Records are archived and remain available in history, reports, and CSV exports.
- Historical payments transcribed from text messages are marked `historical/imported` and do not receive official receipt numbers. New receipts begin at number 1.
- Receipt numbers are sequential, never reused, and never skipped. A receipt number is allocated only when a payment is finalized.
- Payments are immutable. A mistake is corrected by voiding the original payment and creating a replacement payment with a new receipt number; the original remains visible in the audit history.
- Payment methods are Cash, Zelle, Cash App, and Other, with a free-text reference field.
- Payments apply to outstanding rent before late fees. Overpayments become renter credit rather than being silently discarded or applied unpredictably.

### Rentals and late fees

- Weekly rentals recur on a selected weekday.
- “Monthly” means a discounted weekly rental rate; it is not a calendar-month billing cycle.
- The first billing period is charged in full; it is not prorated.
- A vehicle change ends the old rental and starts a linked new rental.
- The $300 deposit is tracked separately from rental income, collected before vehicle release, and applied at closeout against damage, unpaid rent, fuel, or other approved charges. Any remaining balance is refunded within 14 days.
- Late fees use a three-day grace period, then $20 per local calendar day starting on day 4, capped at one full period’s rent per missed period.
- Late fees accrue only while that period’s rent remains unpaid. Once the period’s rent is fully paid, no additional late fee accrues; already-assessed late fees remain owing.
- A payment receipt shows how the payment was allocated between rent, late fees, and any credit.

### Dashboard and first screen

- The first page is a private, branded WNY Auto Rentals landing page with a clean rental-company style, not a public marketing site.
- It includes a short fleet/status summary and prominent actions such as Open Late Payments, Log Payment, and Manage Fleet.
- The late-payment view shows renter, vehicle, due date, rent owed, late-fee balance, total owed, days late, and a direct Log Payment action.
- The dashboard flags relevant vehicle and renter expirations, including driver license, renter insurance, vehicle insurance, and vehicle registration.
- Background checks are manually recorded per renter with status (`not checked`, `pending`, `passed`, `failed`), check date, and notes. No online background-check service is used.

### Documents and media

- Phase one produces both a printable/downloadable PDF receipt and a copyable text receipt message for manual sending.
- No photos are stored in the app. License and vehicle-condition photos remain in the phone’s camera roll.
- Agreement generation is deferred. A later phase will fill the existing Word template and produce a completed PDF.

## Proposed design

### Application shape

Use one bundled web application served by a small packaged Windows local server:

- A self-contained Windows launcher starts the server, displays the local address/QR code, and opens the laptop browser.
- The server binds only to the private local network and has no internet-dependent runtime behavior.
- The iPhone opens the displayed local address in Safari. The laptop opens the same app in Chrome or Edge.
- The browser application stores the authoritative iPhone dataset in IndexedDB. The laptop has its own temporary working dataset after import.
- The app should work as a normal browser tab; adding it to the iPhone home screen may be offered but must not be required.
- The server should not contain a business database or silently synchronize devices. Its purpose is to deliver the bundled app and support the local workflow.

This preserves the user’s requested iPhone-authoritative model while making the Windows laptop usable for editing and reports.

### Data model

Use stable UUIDs for records and explicit schema versioning. At minimum define:

- `vehicle`: year, make, model, VIN, plate, mileage, ownership, status, rate, insurance expiry, registration expiry, notes, archived flag.
- `renter`: name, phone, email, address, license number, license expiry, own insurance carrier/policy, emergency contact, background-check status/date/notes, notes, archived flag.
- `rental`: renter ID, vehicle ID, start date, end date/ongoing state, rate history, billing label, weekly due weekday, deposit amount/status, status, linked replacement rental ID, archived flag.
- `rate_history`: rental ID, effective date, period rate in cents, billing label, reason/note.
- `billing_period`: rental ID, period start/end, due date, rent amount in cents, paid amount, outstanding rent, late-fee amount, status.
- `payment`: rental ID, date, amount in cents, method, reference, period allocations, receipt number if official, imported/historical flag, void/correction links, created/updated timestamps.
- `deposit_transaction`: rental ID, collection, application, refund, date, amount in cents, category, description.
- `expense` (schema-ready in phase one if inexpensive, UI deferred): vehicle ID, date, category, amount in cents, description, archived flag.
- `audit_event`: record ID/type, action, timestamp, before/after summary, source device label, and optional actor label (`owner`/`partner`).
- `app_metadata`: schema version, dataset UUID, dataset revision, next receipt number, last export/import metadata, and configuration.

All money fields use integer cents. Dates are stored as local calendar dates where time is not meaningful; timestamps include timezone information and are displayed in America/New_York.

### Encrypted data files

Export a versioned encrypted file format containing the complete dataset, metadata, and integrity information. Use the browser Web Crypto API with a password-derived encryption key and authenticated encryption. The file must include:

- format/schema version;
- dataset UUID and revision;
- export timestamp;
- source device label;
- encrypted payload;
- authentication/integrity data.

The import flow must validate the password, schema version, dataset identity, and revision before changing local data. Every iPhone import creates a recovery export first. Provide a visible manual Backup Now action as well.

CSV export is separate from encrypted backup because CSV is intentionally human-readable. It should export all entities, including archived and historical records, with separate files or a clearly labeled ZIP.

### Billing engine

Implement billing as deterministic functions that accept a rental, rate history, calendar date, and recorded payments and return billing periods, balances, and late fees. Do not infer balances from UI state.

Required test boundaries include:

- due date;
- grace days 1–3;
- late-fee day 4;
- daily accumulation;
- cap at one full period’s rent;
- partial rent payment;
- rent fully paid while late fees remain;
- payment allocation to rent before late fees;
- overpayment credit;
- rate change effective date;
- daylight-saving and month/year boundaries.

The weekly billing model should be explicit. “Monthly” is stored as a discounted weekly rate and therefore uses the same recurring weekday logic as weekly rentals.

### Receipt workflow

When a payment is finalized:

1. Validate amount, method, date, rental, and allocation.
2. Allocate rent first, then late fees, then credit if applicable.
3. Allocate the next official receipt number atomically within the local dataset.
4. Store the immutable payment and receipt snapshot.
5. Generate a printable PDF receipt from the stored snapshot.
6. Generate a copyable text receipt containing receipt number, renter, vehicle, payment date, amount, method, covered period, allocation, remaining balance, and credit if applicable.

Receipt rendering must use the saved snapshot, not current vehicle/rate/renter values, so later edits cannot rewrite historical receipts.

### Validation and archival

- Prevent overlapping active rentals for a vehicle.
- Warn when a renter is assigned two active vehicles, but allow it after explicit confirmation.
- Require a vehicle, renter, rate, billing rule, and start date before activating a rental.
- Require deposit status before marking a vehicle released.
- Archive instead of delete and exclude archived records from default operational lists.
- Preserve archived records in history, reports, exports, and audit history.

## Implementation steps

### Phase 0 — packaging and foundation

1. Select and document the bundled web stack and Windows launcher.
2. Build the local server launcher with a clear one-click start flow, local network address, QR code, and stop instructions.
3. Create the versioned in-browser data store, encryption/decryption module, import/export flow, recovery export, and CSV export.
4. Add schema migration support before adding business records.

### Phase 1 — late-payment MVP

Deliver this before broader features and demonstrate it working:

1. Seed the eight partnership vehicles exactly as provided, with MGR7670 available and the remaining rates/payment weekdays.
2. Add renter and rental forms.
3. Implement weekly billing, discounted-weekly “monthly” rentals, full first period, partial payments, late fees, credits, and deposits.
4. Build the branded landing page and late-payment dashboard.
5. Add fast payment entry optimized for iPhone use.
6. Add immutable payments, sequential receipt numbering, PDF receipt generation, and copyable text receipt generation.
7. Add local backup, encrypted import/export, conflict warning/recovery export, and CSV export.
8. Add expiration and background-check flags.

The acceptance demonstration should cover: opening the app, seeing a late renter, logging a payment in under 15 seconds, downloading the PDF, copying the message, exporting from iPhone, editing on laptop, exporting from laptop, and safely importing back.

### Phase 2 — operational records and reporting

1. Add full vehicle, renter, rental, archive, and audit-history screens.
2. Add deposit closeout and refund tracking.
3. Add expenses and per-vehicle profitability reporting.
4. Add days rented versus idle reporting.
5. Add partnership 50/50 reporting and ownership-aware report filters.

### Phase 3 — agreements and migration refinement

1. Map the existing Word template fields.
2. Generate a completed PDF agreement from the stored renter, vehicle, rental, rate, deposit, and payment terms.
3. Add a review screen before PDF generation to catch data-entry mistakes.
4. Add a guided historical-import workflow for the text-message records.

### Phase 4 — deferred personal fleet

1. Add the six personally owned vehicles.
2. Add ownership filters and personal-versus-partnership reporting.
3. Keep personal results separate from partnership profit calculations.

## Testing and verification

### Business-rule tests

- Integer-cent calculations never introduce floating-point rounding.
- Grace period and day-4 late-fee transitions are correct in America/New_York.
- Late-fee cap is exactly one period’s rent.
- Partial payments reduce rent before late fees.
- Fully paid rent stops further late-fee accrual.
- Overpayments become credit.
- Full first period is charged with no prorating.
- Weekly and discounted-weekly billing dates are correct.
- Rental replacement links preserve renter history.
- Deposit collections, applications, and refunds never appear as rental income.
- Receipt numbers are sequential, immutable, and never reused.
- Voided payments remain in history and replacement receipts are distinct.

### Data and security tests

- Wrong backup passwords fail without changing local data.
- Tampered files fail integrity validation.
- Importing an older revision creates a warning and recovery export.
- CSV export includes archived and historical records.
- No network request is made by the app except local-network access to the bundled app.
- No sensitive data is placed in URLs, analytics, logs, or browser console output.

### Device and workflow tests

- Windows one-click launch works from a clean machine with documented prerequisites.
- iPhone Safari can connect over a private hotspot/Wi-Fi.
- Payment entry is usable one-handed and completes in under 15 seconds for a normal payment.
- Laptop import/edit/export round-trip preserves all records, receipt sequence, audit history, and encrypted backups.
- Browser reloads and ordinary laptop restarts do not lose saved data.
- Backup recovery is demonstrated before any real customer data is entered.

## Risks and mitigations

- **iPhone browser storage limitations:** require explicit encrypted exports, provide a prominent Backup Now action, test Safari persistence, and treat the exported file as the durable backup.
- **Local-network setup confusion:** use a one-click Windows launcher, show the exact local address, display a QR code, and document private hotspot steps with screenshots.
- **Receipt-number collisions:** make the iPhone dataset revision and next receipt number authoritative; require a round-trip import/export before switching editors.
- **Password loss:** clearly state that encrypted backups cannot be recovered without the password. Allow the user to create a new backup password while retaining the current live dataset.
- **Billing disputes:** preserve effective-dated rates, immutable payment snapshots, allocation details, void/correction links, and audit events.
- **Scope expansion:** defer personal vehicles, expenses/profitability, agreement generation, and historical bulk import until the late-payment MVP is proven.
- **Private-network exposure:** bind only to the local interface/network, show a pairing/session token or equivalent local access protection, and never expose the server to the public internet.

## Open questions

No major product decisions remain. Before implementation, the developer should confirm the exact Windows packaging/runtime approach and validate iPhone Safari IndexedDB persistence over the local HTTP origin. If that validation fails, the architecture must be revisited before real data is entered.

