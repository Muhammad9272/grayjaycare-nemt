# Tidio customer-help setup

The website integration loads Tidio on public pages. The remaining chatbot behaviour is configured in the Tidio dashboard, not in this repository.

## Knowledge topics

Configure the bot to answer these topics from the published Gray Jay Care content:

- Services: wheelchair, stretcher, ambulatory, bariatric, stair-chair, oxygen support, and attendant options.
- Booking: online booking steps, address selection, passenger requirements, payment arrangements, and account access after submission.
- Status: customers receive a confirmation email and can review the trip in their portal.
- Delays: "Delays can occasionally occur due to traffic, weather, or unforeseen circumstances. If there is a delay, we will keep you informed and provide updates as soon as possible."
- Changes and cancellations: direct the customer to call `(519) 933-5090` for time-sensitive changes.
- Oxygen: supported selections are No, Yes, and Not sure; online requests accept up to 5 L/min and are confirmed by dispatch.
- Passenger assistance: stair-chair, bariatric assistance, no special assistance, or not sure.
- Payments: cash, debit/credit, e-transfer, direct deposit, invoice, direct billing, insurance, OPGT, or another arrangement.

## Safety and escalation

- Begin every medical-emergency response with: "Call 911. Gray Jay Care provides non-emergency medical transportation."
- Never diagnose, give medical advice, or promise a booking time or final fare.
- Offer a human handoff and `(519) 933-5090` whenever the bot is uncertain or the customer describes urgency, a booking change, a complaint, or a safety concern.
- Do not request medical documents, card numbers, passwords, or other sensitive information in chat.

## Live acceptance check

After publishing the Tidio configuration, test in a normal Chrome window with tracking protection and extensions temporarily disabled:

1. Confirm the launcher is visible on `https://grayjaycare.com/` and `/book` on desktop and mobile.
2. Ask one question from each knowledge topic above.
3. Confirm emergency wording and human handoff.
4. Confirm the launcher does not cover the persistent Call Us button or booking controls.
5. Confirm the Tidio inbox receives the test conversation.
