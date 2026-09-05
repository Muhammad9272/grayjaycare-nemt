# Gray Jay Care platform — client demonstration guide

This guide follows the full operational story shown in the narrated walkthrough video. It is written so a presenter can repeat the demo later without needing to understand the implementation.

## Before the demonstration

1. Open `https://grayjaycare.org` in a private browser window.
2. Keep the role credentials in a separate private note. Never display or email the shared demo password.
3. Use clearly fictional details, such as “Training Patient,” and an `example.test` email address.
4. Remind viewers that Gray Jay Care is a non-emergency transportation service. For a medical emergency, the user must call 911.
5. Do not change pricing, deactivate users, approve drivers, change vehicle status, or submit vehicle logs during a client demo unless those changes have been planned in advance.

## The story to tell

The easiest way to explain the platform is to follow one request through every role:

`Website / phone / hospital booking → shared dispatch queue → driver and vehicle assignment → driver journey → accounting record → completed timeline`

This demonstrates that the portals are not separate mock-ups. They are role-specific views of the same booking and the same status history.

## Chapter 1 — Public website

Start on the landing page. Explain that the visitor immediately sees:

- the service purpose and 24/7 contact details;
- a clear Book Now action;
- hospital and community trust signals;
- ambulatory, wheelchair, and stretcher services;
- frequently asked questions, reviews, and contact information;
- a clear warning that emergencies must go to 911.

The landing page is intentionally simple for patients, family members, discharge teams, and other visitors who may be under pressure.

## Chapter 2 — Accounts and sign-in

Open the customer registration page. A customer can create a normal account with name, email, phone, and a strong password. Then briefly show the driver application page. A driver also supplies licence details and cannot use operational features until an administrator approves the application.

Explain the easier booking path: a first-time customer does not have to register before requesting transport. When a new email address is used in the booking form, the system creates a customer account, signs the user directly into the portal, and emails a secure password-setup link. The password itself is never sent by email.

Show the login and Forgot Password links. Every role uses the same secure sign-in page, but is redirected to the correct portal according to permission.

## Chapter 3 — Public booking

Open Book a Ride and complete the form from top to bottom.

### Contact information

This is first because dispatch must know who to contact even if the passenger is different from the person booking. Capture the contact name, phone number, optional extension, and email address.

### Trip details

Type a pickup and drop-off search. Select a Google suggestion rather than entering an uncertain address. The selected place is resolved to a standardized address and coordinates. Add hospital departments and room numbers when applicable.

Choose the date using day, full month name, and year. Then select a time preference:

- Specific time;
- First available, or ASAP;
- Any time that day.

Choose the service area and service type. Available trip types are one way, scheduled return, wait and return, and call when ready for return. A scheduled return creates a linked return leg and applies the configured discount.

### Patient and care information

Capture the patient name and optional medical record number. Demonstrate the operational fields: bariatric support, oxygen, extra attendant, escort count, isolation precautions, DNR paperwork, waiting time, passenger weight, payment preference, secure medical-document coordination, and driver or dispatcher notes.

As addresses, date, service, and add-ons change, the fare card recalculates from the active 2026 rate sheet. The estimate shows distance, base fare, distance cost, add-ons, discounts, and total. Dispatch still confirms availability and final pricing.

### Submission result

Submit the request once. Point out that the customer is taken directly to My Care Journeys. A confirmation email and secure password-setup email are also sent when email delivery is available. The booking starts as Request Submitted and receives a unique reference code.

## Chapter 4 — Customer portal

Open the booking reference. Explain the main sections:

- full pickup, destination, schedule, service, care needs, source, and fare;
- rider and booking-contact details;
- assigned driver and vehicle once dispatch completes assignment;
- an ordered status timeline;
- cancellation while the trip is in an allowed stage.

In Account & Security, the user can see their contact details and request a one-hour password setup or reset link. This is the preferred low-friction flow: direct access after booking, followed by a secure password chosen by the customer.

## Chapter 5 — Administration

Sign in as the super administrator. The overview combines key counts, pending driver verification, recent bookings, and the audit trail.

Open Staff to show role-based user management and staff invitation. Explain that administrator, dispatcher, driver, customer, hospital, and accountant accounts receive only the navigation and data needed for their work.

Open Fleet to show vehicle type, capacity, odometer, and operational status. A vehicle that is currently assigned to an active trip cannot be placed into maintenance, protecting dispatch integrity.

Open Pricing. The active rate sheet controls website quotes and new bookings. It includes separate wheelchair and stretcher rates, in-city and out-of-city distance bands, bariatric and oxygen charges, waiting, extra attendants, return discount, cancellation policy, tax, and night hours. During a demonstration, explain these values but do not save changes.

Open All Trips to show central search and filtering, then open the training booking to show the same source data seen by the customer.

## Chapter 6 — Dispatch

Sign in as the dispatcher. The active board displays patient, contact, phone extension, MRN, time, route, fare, source, responsible dispatcher, and important care flags. Website, phone, and hospital requests all enter this shared queue in scheduled-time order; they are not silently restricted to one dispatcher.

Select an approved driver and a compatible active vehicle, then use Assign Trip to save both in one operation. The dispatcher who makes that resource assignment is recorded on the trip; a deliberate reassignment transfers the displayed responsibility to the new dispatcher. The booking becomes Assigned and immediately appears in the driver portal and customer timeline. Vehicle options are filtered for the selected service—for example, a stretcher request requires a stretcher-capable vehicle. Drivers with expired licences, unapproved profiles, or inactive accounts cannot be assigned; on-duty drivers are listed first.

The dispatcher can also open New Phone Booking for requests received by phone. It opens the same complete contact-first form, Google-assisted address flow, long-date controls, care fields, return-trip options, and live fare breakdown used on the public site. The resulting trip is marked Phone and returns directly to the shared board.

Drivers are not permanently owned by a particular dispatcher. All authorized dispatchers work from the same approved driver pool, which avoids missed requests during shift changes. The trip records exactly which dispatcher made the current assignment. If the business later wants fixed teams, territories, or shift-specific dispatcher ownership, that would be a separate scheduling rule rather than an assumption hidden in the booking flow.

## Chapter 7 — Driver

Sign in as the approved driver. My Trips shows only work assigned to that driver and includes the pickup, destination, contact number, scheduled time, mobility type, care flags, and notes.

Demonstrate the ordered status buttons:

1. Start Trip — En Route
2. Arrived at Pickup
3. Passenger Picked Up — In Progress
4. Complete Trip

Each change adds a time-stamped event. Invalid status jumps and unauthorized updates are blocked. When completed, the trip moves out of the active list and into Trip History, and a draft invoice is created from the final fare.

Open Vehicle & Logs. Drivers can record inspections, mileage, and fuel against their assigned vehicle. These entries support fleet safety, cost tracking, and reporting. Show the forms without saving sample entries during a normal client demonstration.

## Chapter 8 — Accounting

Sign in as the accountant. The reporting dashboard summarizes revenue, completed trips, cancellations, no-shows, average fare, driver utilization, vehicle utilization, and completed-trip details for the selected long-date range.

The CSV export provides the same trip data for bookkeeping or further analysis. Accountants can view relevant trip details but do not receive administration or dispatch controls.

## Chapter 9 — Hospital portal

Sign in as the hospital contact. The hospital sees its organization plus upcoming and historical patient trips. Book a Trip for a Patient opens the exact same complete contact-first workflow and live fare breakdown used for public and dispatcher bookings, so no facility, return, clinical, or pricing field is lost between channels. After submission, the user returns directly to the hospital portal and the trip appears in the shared dispatch queue. Hospital-created trips are marked as Hospital Portal bookings and are visible only to that hospital and authorized Gray Jay Care staff.

## Chapter 10 — Closing the loop

Return to the original customer portal. The one booking now shows Completed. Open it and point out the complete timeline from Submitted through Assigned, En Route, Arrived, In Progress, and Completed. The final fare, driver, and vehicle are visible from the same reference.

Close by showing the responsive mobile layout. The same booking and status information works on a phone, where many patients and family members will access it.

## Common scenario explanations

### “Does a customer need to make an account first?”

No. They can book immediately. A new customer account is provisioned from the booking email, the customer is signed in directly, and a secure setup link is emailed.

### “Why not email a password?”

Emailing a reusable password is unsafe. Gray Jay Care sends a time-limited password-setup link instead. The customer chooses their own password.

### “What if Google cannot calculate the route?”

The form offers a manual estimated-distance field so dispatch can still accept and price the request.

### “Can a customer cancel?”

Yes, while the trip is in an allowed early status. The configured cancellation window determines whether a late-cancellation fee applies. Dispatch can also cancel with an audit note.

### “Can a driver skip directly to Completed?”

No. The system enforces the valid operational order and records each change.

### “Can users see another customer’s trip?”

No. Customer, driver, and hospital access is ownership-scoped. Staff access is also limited by role.

### “Is the fare hard-coded?”

No. Administrators manage the active rate sheet. New public, phone, and hospital bookings use the same pricing service.

### “What should be tested before a live client demo?”

Confirm the health endpoint, Google suggestions, one role login, and that no previous training booking remains on the dispatch board. Use a private browser window and avoid saving administrative changes.
