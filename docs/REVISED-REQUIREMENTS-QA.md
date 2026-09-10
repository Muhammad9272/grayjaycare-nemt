# Revised Gray Jay Care requirements — QA traceability

Source reviewed: `Revised Document For Gray Jay Care.pdf`, supplied 10 September 2026.

This document records acceptance coverage for the revised public site and unified booking workflow. Automated checks live in `tests/e2e/release.spec.ts` and `tests/unit/booking-validation.test.ts`.

## Public website

| Requirement | Automated acceptance check |
| --- | --- |
| A Call Us action is available throughout the public website | Desktop and mobile tests verify the accessible telephone link on the home, booking, careers, login, and registration pages. |
| Hospital/long-term-care logo strip is removed | Home-page test verifies the old trust/logo strip and representative logo text are absent. |
| No inherited health-and-beauty template copy remains | Home-page test rejects `Nature`, `Rodva`, and template `Homepage` copy. |
| FAQ delay question and complete answer | Exact question and complete approved answer are asserted. |
| Updated, moving Google reviews and retained review link | Review link, recent review cards, and carousel/slider semantics are checked. |
| Approved Contact Us paragraph and lowercase support email | Exact paragraph and lowercase visible email are asserted. |
| Responsive presentation | Mobile viewport checks horizontal overflow, essential calls to action, section order, and conditional field usability. |

## Unified booking form

The public, dispatcher, and hospital entry points must all open the same `/book` implementation. Tests assert the same ordered sections and fields at each entry point.

| Area | Automated acceptance check |
| --- | --- |
| Contact | Approved dispatcher and confirmation wording. |
| Patient | Improved assistance copy; optional MRN helper; over-250 question with No/Yes/Not sure; weight and unit conditional; companion choices and exact count conditional for 3+. |
| Trip | Approved pickup wording; optional department/unit labels; one-way, wait-and-return and scheduled-later choices; old call-when-ready option removed; wait hours/minutes controls and notice. |
| Transportation | Exact ambulatory, wheelchair, and stretcher descriptions; bariatric control is not shown here. |
| Passenger requirements | Oxygen No/Yes/Not sure; required flow when Yes; maximum 5 L/min; revised DNR question and required pickup-document confirmation; special assistance conditional branches. |
| Payment | Only the seven approved methods are offered; method-specific fields and validation are asserted for Invoice, Direct Billing, Insurance, OPGT, and Other; card/e-transfer instructions are checked. |
| Belongings and notes | No/Yes/Not sure, conditional belongings detail, additional notes, and removal of Medical Documents Available. |
| API/data | A complete revised request is submitted and each new value is checked against the persisted trip. Invalid conditional combinations must return HTTP 400. |

## Release gate

The change is releasable only after Prisma validation, lint, type-check, unit tests, production build, and the complete Playwright suite pass. Production deployment and outbound email delivery are deliberately outside this local QA task.
