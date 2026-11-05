# PROJECT: FAIRSHARE
## Shared Household Management Web Application

Act as a senior full-stack software engineer, UI/UX designer, database architect, and application security engineer.

Build a complete, functional, responsive web application called **FAIRSHARE**.

Do not create merely a landing page, static prototype, or collection of non-functional dashboard components. Build a working application with a properly structured frontend, backend, database, authentication, validation, expense calculations, and notification infrastructure.

If a requested integration requires external credentials or services, implement the application architecture and clearly document the required configuration. Do not pretend that an integration works when it has not been configured.

Prioritise correctness, simplicity, usability, financial accuracy, privacy, and maintainable code.

---

# 1. PRODUCT VISION

FAIRSHARE is a shared-house management platform that helps housemates manage their finances, rent, bills, vehicle expenses, and household cleaning responsibilities in one place.

The central concept is:

**One household. Multiple individual accounts. Shared responsibilities. Transparent expenses. Automatic calculations.**

A household may contain five members, ten members, or more. Do not hardcode a maximum of five members.

Every member has an individual account connected to the household.

Members should be able to record expenses, choose who benefited from them, automatically calculate each person's share, review financial balances, manage assigned responsibilities, and receive relevant reminders.

The initial target audience is people sharing rental accommodation in Australia.

Use Australian English, Australian dollars (AUD), Australian date formatting, and the Australia/Sydney timezone by default. Make the timezone configurable.

The application should work well on desktop computers, tablets, and mobile phones.

---

# 2. TECHNOLOGY STACK

Use the following technology stack unless there is a compelling technical reason to change it.

## Frontend
- Next.js with TypeScript.
- React.
- Tailwind CSS.
- A consistent component library such as shadcn/ui.
- Lucide icons.
- React Hook Form for complex forms.
- Zod for client-side and shared form validation.
- Recharts for financial charts where useful.

## Backend
- Next.js server-side functionality or a clearly separated backend API.
- TypeScript throughout the application.
- Server-side validation for every important operation.
- Proper authentication and authorisation checks.

## Database and authentication
Use Supabase for:
- PostgreSQL database.
- Authentication.
- File storage for receipts, bills, and fuel-price photographs.
- Row Level Security (RLS).
- Realtime updates where appropriate.

Use Supabase's supported authentication methods and a secure session-management approach.

Never expose the Supabase service-role key or other secrets in browser code.

## Deployment
Prepare the application for deployment on Vercel with Supabase as the backend.

Include:
- An environment variable example file.
- Database migrations.
- Database seed data for development.
- Setup instructions.
- Deployment instructions.
- A README.
- Basic automated tests.

Use current, mutually compatible stable package versions.

Do not store application data exclusively in browser local storage. The database must be the authoritative source of financial and household records.

---

# 3. BRAND IDENTITY AND DESIGN

The product name is FAIRSHARE.

Create a modern, polished, trustworthy interface suitable for a real consumer SaaS product.

## Design direction

The design should feel:
- Modern.
- Minimal.
- Friendly.
- Financially trustworthy.
- Organised.
- Premium without being unnecessarily complicated.

Use a restrained colour palette:
- Deep forest green as the primary brand colour.
- White and soft off-white backgrounds.
- Dark charcoal text.
- Muted grey for secondary information.
- Soft green for completed or positive states.
- Amber for pending items.
- Red for overdue items and errors.

Avoid excessive gradients, unnecessary animations, oversized headings, cluttered layouts, and generic AI-generated dashboard aesthetics.

Use generous spacing, consistent typography, clear visual hierarchy, attractive cards, subtle borders, and accessible contrast.

Use a consistent border radius and spacing system.

The interface must look professionally designed even when the database contains no records.

## Layout

On desktop:
- A persistent sidebar.
- A compact top navigation area.
- A main content region.
- A responsive layout for smaller screens.

On mobile:
- A compact navigation bar or accessible mobile menu.
- Full-width cards.
- Touch-friendly controls.
- Easy access to frequently used actions.

Include:
- Loading states.
- Empty states.
- Error states.
- Success messages.
- Confirmation dialogs for destructive operations.
- Accessible form labels.
- Keyboard navigation.
- Clear focus indicators.

Use realistic sample data in development previews, but clearly distinguish sample data from actual records.

---

# 4. PUBLIC WEBSITE

Create a public landing page for FAIRSHARE.

Include:

## Hero section
Headline:
"Shared living. Sorted."

Supporting text:
"Manage household expenses, split bills, track car costs, and keep cleaning responsibilities fair, all in one place."

Primary button:
"Get Started"

Secondary button:
"See How It Works"

## Feature sections
Explain:
1. Automatic expense splitting.
2. Household bills and rent reminders.
3. Shared car and fuel-cost tracking.
4. Rotating cleaning schedules.
5. Transparent household balances.

## How it works
Present a simple three-step explanation:
1. Create your household.
2. Invite your housemates.
3. Share expenses and responsibilities automatically.

## Additional sections
- Product screenshots or polished application mockups.
- A privacy and security section.
- A frequently asked questions section.
- A footer with links to privacy, terms, support, and contact pages.

Do not invent testimonials, customer numbers, awards, or claims about existing users.

The public landing page must have working navigation and authentication buttons.

---

# 5. AUTHENTICATION AND ONBOARDING

Implement a complete authentication flow.

Users should be able to:
- Create an account.
- Sign in.
- Sign out.
- Reset their password.
- Verify their email where supported.
- Access protected application pages only after authentication.

Use secure authentication practices.

## Household onboarding

After signing in, the user should see two choices:

1. Create a new household.
2. Join an existing household using an invitation.

When creating a household, collect:
- Household name.
- Optional description.
- General household settings.
- Currency, defaulting to AUD.
- Timezone, defaulting to Australia/Sydney.

The creator becomes the household administrator.

Generate secure, expiring invitations for new members.

Allow administrators to invite members by email or through a secure invitation link.

Invitation tokens must not expose sensitive household information.

A user must explicitly accept an invitation before becoming a household member.

Do not allow an unauthorised user to join a household simply by guessing its identifier.

---

# 6. HOUSEHOLD MEMBERS AND PERMISSIONS

Each household contains multiple individual user accounts.

Store household membership separately from user authentication records.

A user should be able to belong to more than one household, provided the interface and permissions correctly separate each household's data.

For the initial version, allow each user to select their active household.

## Roles

Implement these roles:

### Household administrator
Can:
- Update household settings.
- Invite members.
- Manage household membership.
- Assign administrative roles.
- Configure rent and recurring bills.
- Manage shared vehicles and cleaning schedules.
- View household financial records according to the household's privacy settings.

### Household member
Can:
- View their own financial obligations.
- Record expenses they paid.
- View transactions relevant to them.
- Record repayments.
- View assigned bills and cleaning tasks.
- Participate in vehicle trips.
- Upload receipts for transactions they are authorised to manage.

Apply role checks on the server and in database policies.

Hiding a button in the frontend is not sufficient authorisation.

## Membership changes

When someone leaves a household:
- Preserve historical transactions.
- Preserve payment records.
- Prevent unauthorised access to future household information.
- Handle outstanding balances transparently.
- Do not silently delete or reassign their financial history.

Require confirmation for membership removal.

---

# 7. MAIN APPLICATION DASHBOARD

Create a household dashboard displaying the most useful information at a glance.

Include:

## Financial summary
- Total outstanding amount owed by the current user.
- Total amount others owe the current user.
- Upcoming rent.
- Upcoming bills.
- Recent transactions.

## Household summary
- Number of active members.
- Upcoming cleaning tasks.
- Overdue tasks.
- Registered household vehicles.
- Recent household activity.

## Quick actions
Provide prominent buttons for:
- Add expense.
- Add bill.
- Record car trip.
- Record repayment.
- View cleaning schedule.
- View transactions.

## Activity feed
Display relevant events, such as:
- An expense was added.
- A bill was recorded.
- A payment was confirmed.
- A cleaning task was completed.
- A new vehicle trip was recorded.

Do not expose a member's private information to unrelated household members.

Include sensible empty states for newly created households.

---

# 8. EXPENSE MANAGEMENT AND AUTOMATIC SPLITTING

This is one of the application's most important features.

Users must be able to record an expense and select exactly which housemates benefited from it.

## Expense fields

Each expense should support:
- Description.
- Total amount.
- Category.
- Date.
- Person who paid.
- Beneficiaries.
- Split method.
- Optional notes.
- Optional receipt photograph or document.
- Creation timestamp.
- Last updated timestamp.
- Created-by user identifier.

Suggested categories:
- Groceries.
- Household supplies.
- Food and dining.
- Transport.
- Fuel.
- Cleaning.
- Utilities.
- Entertainment.
- Other.

## Supported splitting methods

Implement:
1. Equal splitting.
2. Custom amounts.
3. Custom percentages.

The user should be able to select any number of eligible household members.

The expense should only be allocated to the selected beneficiaries.

## Example

Five people live in a household.

Member A buys groceries costing $90 for Members A, B, and C.

Member A paid the full $90.

With an equal split:
- Member A's own share is $30.
- Member B owes Member A $30.
- Member C owes Member A $30.
- Members D and E have no obligation for this purchase.

The application must record the original payment and the resulting obligations accurately.

Do not confuse the person who paid the expense with the people who owe their shares.

## Financial calculation rules

Use integer minor currency units, such as cents, or an appropriately precise decimal representation for money.

Do not use ordinary floating-point arithmetic for authoritative monetary calculations.

When dividing amounts:
- Allocate rounding differences deterministically.
- Ensure allocated shares add up exactly to the original amount.
- Never lose or create a cent.
- Validate custom amounts against the total.
- Validate custom percentages.
- Prevent negative or invalid values unless explicitly supported by a legitimate transaction type.

The server must calculate or independently verify the allocation. Never trust client-submitted calculated balances.

## Editing and deleting

Allow authorised users to edit an expense subject to permission checks.

Maintain an audit trail for important changes.

If a transaction has already been settled, do not silently rewrite its financial history. Use a correction, reversal, or adjustment transaction as appropriate.

Require confirmation before destructive actions.

## Transaction history

Create a searchable and filterable expense history.

Filters should include:
- Category.
- Date range.
- Paid by.
- Beneficiary.
- Amount range.

Allow users to open an expense and see how every person's share was calculated.

---

# 9. FINANCIAL BALANCES AND SETTLEMENTS

Create a clear household balance system.

The application should calculate how much each person owes and how much they are owed.

A transaction should distinguish:
- Original expense.
- Individual share.
- Amount paid by each participant.
- Outstanding obligation.
- Confirmed repayment.
- Remaining balance.

## Example

Member A pays $90 for three people.

Members A, B, and C each have a $30 share.

The application should show that B and C each owe A $30.

If B later pays A $30 and the payment is recorded as settled, B's outstanding obligation becomes zero.

## Repayment recording

Allow a member to record a repayment.

Support:
- Amount.
- Payer.
- Recipient.
- Date.
- Optional note.
- Optional payment evidence.
- Payment status.

For the initial version, repayments can be recorded manually.

Do not claim that a bank transfer has occurred merely because a user records it.

If repayments require confirmation by the recipient, implement a clear confirmation workflow.

Prevent the same repayment from being applied more than once.

## Balance calculation

Balances must be derived from the authoritative transaction and settlement records.

Do not maintain unrelated editable balance totals that can drift out of sync.

Explain the calculation when users open their balance details.

Never silently change historical obligations when an old transaction is edited or a member leaves.

---

# 10. VEHICLE REGISTRATION AND FUEL INFORMATION

Create a dedicated Vehicles section.

A household may have multiple registered vehicles.

Each vehicle should have:
- Display name.
- Make and model, optionally.
- Registration identifier, optional.
- Fuel type.
- Fuel efficiency in kilometres per litre.
- Fuel tank capacity in litres.
- Owner.
- Optional notes.
- Active or inactive status.

The vehicle owner or an authorised administrator can update the vehicle details.

Do not assume that every household member owns a vehicle.

## Fuel efficiency

Allow the user to enter:
- Average fuel efficiency in km/L.
- Tank capacity in litres.

For example:
- Fuel efficiency: 12 km/L.
- Tank capacity: 60 L.

Estimated full-tank range:
60 × 12 = 720 km.

Display this as an estimate, not a guaranteed driving range.

Validate values and explain the units clearly.

## Fuel-price records

Allow users to record a fuel-price observation containing:
- Vehicle, where relevant.
- Fuel price per litre.
- Fuel type.
- Date observed.
- Person who recorded it.
- Optional photograph of the fuel-price display or receipt.

Store historical observations rather than overwriting previous values.

The photograph must be uploaded securely and associated with the relevant record.

Do not assume that a price photo has been independently verified.

When recording a trip, allow the user to select the applicable fuel-price record or enter an agreed price.

Never silently recalculate an old trip using a newer fuel price.

---

# 11. CAR TRIPS AND AUTOMATIC COST SHARING

Implement a dedicated form for recording household trips.

## Trip fields

Each trip should include:
- Vehicle.
- Driver.
- Trip date.
- Total distance in kilometres.
- Participants.
- Purpose or destination, optional.
- Fuel efficiency used for the calculation.
- Fuel price per litre used.
- Optional tolls.
- Optional parking costs.
- Split method.
- Optional notes.

For the initial version, support manually entered round-trip distance.

The trip must identify who benefited from the journey.

Do not automatically include every household member.

## Fuel calculation

Estimated fuel consumed:

Fuel consumed in litres = Total distance in kilometres ÷ Fuel efficiency in km/L.

Estimated fuel cost:

Fuel cost = Estimated fuel consumed × Recorded fuel price per litre.

## Example

A vehicle travels 63 km.

Fuel efficiency is 12 km/L.

Fuel price is $1.85/L.

Estimated fuel consumption:
63 ÷ 12 = 5.25 litres.

Estimated fuel cost:
5.25 × $1.85 = $9.7125.

Rounded total fuel cost: $9.71.

If four participants share the trip equally, divide the total cost among those four participants and distribute any rounding remainder deterministically.

The driver or vehicle owner must not automatically be charged the entire trip cost merely because they own the vehicle.

## Vehicle owner compensation

When the vehicle owner participates in the trip:
- Record the owner's share.
- Record the other participants' shares.
- Create the appropriate obligations between participants.
- Do not charge the owner for their own share twice.

If the owner does not participate, allow the household to define whether the owner receives reimbursement for the entire fuel cost or whether another agreed arrangement applies.

## Additional costs

Allow optional tolls and parking expenses.

Initially, split these among the people selected by the user.

Allow different beneficiary groups for fuel, tolls, and parking if practical.

Display the calculation transparently.

## Trip history

Create a history of trips with:
- Date.
- Vehicle.
- Participants.
- Distance.
- Fuel price used.
- Estimated fuel consumption.
- Total estimated cost.
- Each participant's share.

Provide filters by vehicle, member, and date.

Make it clear that fuel consumption is estimated from recorded efficiency and distance.

---

# 12. FORTNIGHTLY RENT MANAGEMENT

Create a Rent section.

The household administrator should be able to configure:
- Total household rent.
- Payment frequency.
- Next due date.
- Individual contributions.
- Member responsible for paying the landlord.
- Reminder schedule.
- Payment status.
- Optional supporting documents.

Support equal and custom individual contributions.

## Reminder schedule

The required default schedule is:
- Wednesday: reminder that rent is due the following day.
- Thursday: rent-due notification.
- Repeat every fortnight.

The next due date must be configurable. Do not hardcode a specific calendar date.

Calculate recurring dates using a reliable scheduling approach and the household's configured timezone.

The recurrence must remain every 14 days from the configured due-date anchor, not every second occurrence of a particular weekday pattern if that would shift the schedule.

The default weekly notification configuration should correspond to the configured fortnightly rent cycle.

## Example

Suppose total fortnightly rent is $1,500 and five members contribute equally.

Each member's contribution is $300.

Each member should see their own rent obligation and relevant due date.

## Rent payment tracking

Support these statuses:
- Upcoming.
- Due.
- Paid.
- Overdue.
- Partially paid.

Allow authorised users to record payment details.

Do not automatically mark rent as paid merely because a reminder was sent.

Allow the administrator to review who has paid and which contributions remain outstanding.

Do not claim to transfer money to a landlord unless a real, separately configured payment integration exists.

## Notifications

Implement an extensible notification system.

The initial application may support in-app notifications.

Prepare the architecture for email notifications through a properly configured email provider.

A scheduled backend job or equivalent reliable scheduler must trigger recurring reminders.

Do not rely on a browser tab remaining open to send reminders.

Prevent duplicate notifications for the same reminder event.

---

# 13. HOUSEHOLD BILL MANAGEMENT

Create a Bills section for shared household expenses.

Supported bill categories:
- Electricity.
- Gas.
- Water.
- Lawn mowing.
- Cleaning services.
- Internet.
- Other shared expenses.

The leaseholder or authorised member can record a bill when it arrives.

## Bill fields

Each bill should support:
- Provider.
- Category.
- Description.
- Total amount.
- Issue date.
- Due date.
- Billing-period start and end.
- Document or photograph.
- Responsible members.
- Split method.
- Individual contributions.
- Payment status.
- Optional notes.

## Workflow

1. The leaseholder receives a bill.
2. They open FAIRSHARE.
3. They upload the bill or photograph.
4. They enter or confirm the amount and due date.
5. They select who is responsible.
6. FAIRSHARE calculates the shares.
7. Relevant members receive notifications.
8. Members record repayments or contributions.
9. The household dashboard updates the outstanding amounts.

Do not assume every bill is divided equally.

Support custom amounts, percentages, and selected beneficiaries.

For the first version, bill amounts can be entered manually. Do not invent automatic provider integrations.

## Bill reminders

Allow reminders based on each bill's due date.

Provide configurable reminders before and on the due date.

Show overdue bills prominently without sending unnecessary repeated notifications.

---

# 14. CLEANING SCHEDULE AND TASK ROTATION

Create a Cleaning section for recurring household responsibilities.

## Task fields

Each task should contain:
- Task title.
- Description.
- Assigned member.
- Frequency.
- Due date.
- Optional estimated duration.
- Optional agreed effort level.
- Status.
- Completion timestamp.
- Optional completion note.
- Optional photograph.
- Created-by user identifier.

Example tasks:
- Clean kitchen.
- Clean bathroom.
- Vacuum common areas.
- Mop floors.
- Take out rubbish.
- Clean refrigerator.
- Clean shared outdoor areas.

## Task frequency

Support:
- Daily.
- Weekly.
- Fortnightly.
- Monthly.
- Custom recurrence where practical.

## Automatic rotation

Allow administrators to create a rotation involving selected household members.

Example:

| Week | Kitchen | Bathroom | Vacuuming |
|---|---|---|---|
| 1 | A | B | C |
| 2 | B | C | D |
| 3 | C | D | E |
| 4 | D | E | A |
| 5 | E | A | B |

This is an illustration. Implement a real rotation algorithm that supports arbitrary numbers of members and tasks.

Avoid repeatedly assigning the same person to the same task when other eligible members are available.

Allow administrators to:
- Exclude a member temporarily.
- Reassign a task.
- Pause a rotation.
- Edit a future assignment.
- View previous assignments.

Changing future assignments must not erase historical task records.

## Completion

Members can mark tasks as completed.

Record:
- Who completed the task.
- When it was completed.
- Optional notes.
- Optional evidence photograph.

Provide clear statuses:
- Upcoming.
- Due soon.
- Due today.
- Overdue.
- Completed.

Allow optional reminders before a task is due.

## Fairness

Provide a simple household view of assigned and completed chores.

Optionally use agreed effort levels to help households discuss workload distribution.

Do not claim to objectively determine whether a household arrangement is fair.

Avoid turning chores into a punitive scoring system.

---

# 15. NOTIFICATION CENTRE

Create a central notification centre.

Possible notifications include:
- New expense recorded.
- Expense share assigned.
- New household bill.
- Bill approaching its due date.
- Rent reminder.
- Rent overdue.
- Cleaning task approaching.
- Cleaning task overdue.
- Task reassignment.
- Repayment recorded.
- Repayment awaiting confirmation.
- Household invitation.

Each notification should include:
- A clear message.
- Creation time.
- Read/unread status.
- A link to the relevant record.
- Appropriate access checks.

Users should be able to configure non-essential notification preferences.

Important financial reminders should not be silently disabled by unrelated settings.

Support in-app notifications first.

Design email or push notification integration as a separate, configurable capability.

Use a reliable server-side scheduler for recurring reminders.

---

# 16. TRANSACTION HISTORY AND REPORTS

Create an activity and transaction history.

Allow users to review:
- Expenses they paid.
- Expenses allocated to them.
- Bills.
- Rent obligations.
- Vehicle trips.
- Repayments.
- Cleaning assignments and completions.

Include filters for:
- Member.
- Category.
- Date range.
- Transaction type.
- Payment status.

Provide a household financial summary showing:
- Total recorded shared expenses.
- Outstanding obligations.
- Recorded repayments.
- Upcoming bills.
- Upcoming rent.

Do not confuse total expenses with outstanding debt.

Allow export of appropriate records to CSV.

Where practical, provide a downloadable household expense report.

Ensure exports contain only information the requesting user is authorised to access.

---

# 17. DATABASE DESIGN

Design a normalised PostgreSQL schema with appropriate foreign keys, indexes, constraints, and access policies.

Suggested tables include:

- profiles
- households
- household_members
- household_invitations
- expenses
- expense_participants
- repayments
- repayment_allocations
- vehicles
- fuel_price_records
- trips
- trip_participants
- trip_cost_allocations
- rent_configurations
- rent_obligations
- bills
- bill_participants
- cleaning_tasks
- cleaning_assignments
- notification_preferences
- notifications
- audit_logs

You may adjust the schema where necessary.

## Database requirements

Every household-owned record must have a clear household association.

Individual records must identify their creator where appropriate.

Use stable identifiers, preferably UUIDs.

Store timestamps consistently.

Use database constraints where they protect important business rules.

Create indexes for common queries.

Use soft deletion or archival where appropriate.

Preserve historical financial records.

Avoid storing sensitive information that the application does not need.

## Financial data model

Separate:
- Original expenses.
- Individual allocations.
- Repayments.
- Settlement allocations.
- Corrections and reversals.

Make sure balances can be reconstructed from authoritative records.

A change to an old transaction must not silently rewrite previously settled financial history.

Use database transactions when creating an expense and all its participant allocations.

If one part of an operation fails, do not leave a partially created financial transaction.

---

# 18. SECURITY AND PRIVACY

Security is a core requirement, not a later enhancement.

Implement:
- Server-side authorisation.
- Supabase Row Level Security policies.
- Secure authentication.
- Input validation.
- Protection against insecure direct object references.
- Safe file upload handling.
- Appropriate upload size limits.
- File type validation.
- Secure access to uploaded receipts and bills.
- Rate limiting where appropriate.
- Safe error messages.
- Audit logging for important financial changes.
- Protection against cross-site scripting and injection.
- CSRF protections where applicable to the chosen authentication architecture.
- Secure environment variable handling.

Never expose service-role keys or privileged credentials to the browser.

Never trust household IDs, member IDs, transaction amounts, or calculated balances supplied by the client without checking permissions and validity on the server.

Users must not be able to access another household's private records by modifying a URL or request.

Use private storage buckets and short-lived signed URLs for sensitive files where appropriate.

Do not expose uploaded receipts or household documents through public URLs.

Do not log passwords, access tokens, or unnecessary sensitive data.

Provide account deletion and household departure workflows that respect legitimate financial recordkeeping requirements.

Document the privacy implications of shared household information.

---

# 19. ACCESSIBILITY AND RESPONSIVE DESIGN

Support common desktop and mobile screen sizes.

Follow accessible design principles:
- Semantic HTML.
- Keyboard navigation.
- Accessible form labels.
- Visible focus indicators.
- Appropriate colour contrast.
- Clear validation messages.
- Accessible dialogs.
- Screen-reader-friendly status messages.

Financial information should not rely on colour alone.

Ensure tables and charts remain understandable on small screens.

Make common actions usable with one hand on mobile devices.

---

# 20. ERROR HANDLING AND DATA VALIDATION

Implement comprehensive validation for all important operations.

Examples:
- An expense must have a valid amount.
- Selected beneficiaries must be eligible members of the relevant household.
- Split allocations must total the original expense.
- A trip must have a positive distance.
- Fuel efficiency must be positive.
- Fuel price must be valid.
- A bill due date must be valid.
- A repayment must not exceed the remaining obligation unless an explicitly supported credit or adjustment is created.
- A user must not complete a task assigned to another member unless permitted.
- An invitation must not be reused after expiry or acceptance.

Provide useful error messages.

Do not expose internal database errors to end users.

Use idempotent operations where appropriate to prevent duplicate transactions or notifications.

---

# 21. TESTING

Create automated tests for important business rules.

At minimum, test the following scenarios.

## Expense tests
- Equal splitting.
- Custom amount splitting.
- Custom percentage splitting.
- Rounding differences.
- Selected beneficiaries only.
- Purchaser included as a beneficiary.
- Purchaser excluded from beneficiaries where supported.
- Invalid allocations.
- Duplicate submission prevention.

## Settlement tests
- Recording a repayment.
- Confirming a repayment.
- Partial repayment.
- Full settlement.
- Preventing duplicate settlement.
- Reconstructing outstanding balances.

## Vehicle tests
- Fuel consumption calculation.
- Fuel cost calculation.
- Currency rounding.
- Multiple participants.
- Historical fuel-price preservation.
- Optional tolls and parking.
- Invalid distances or fuel efficiency.

## Rent and bill tests
- Fortnightly due-date calculations.
- Wednesday reminders.
- Thursday reminders.
- Different household timezones.
- Partial payments.
- Overdue status.
- Duplicate notification prevention.

## Cleaning tests
- Recurring task generation.
- Member rotation.
- Arbitrary household sizes.
- Reassignment.
- Historical assignment preservation.

## Security tests
- Member cannot access an unrelated household.
- Member cannot change another member's permissions.
- Unauthorised user cannot modify expenses.
- Private files cannot be accessed without permission.
- Expired invitations cannot be reused.

Do not mark tests as passing unless they have actually been executed successfully.

---

# 22. DEVELOPMENT EXPERIENCE

Include:
- Clean project structure.
- Reusable UI components.
- Strong TypeScript types.
- Shared validation schemas where appropriate.
- Database migrations.
- Development seed scripts.
- Environment variable documentation.
- A clear README.
- Useful code comments for complex financial logic.
- No committed secrets.
- No unnecessary dependencies.
- No dead or duplicated components.

Use mock data only in clearly separated development and demonstration environments.

Do not mix demo records with real household records.

---

# 23. IMPLEMENTATION ORDER

Build the project incrementally.

### Phase 1: Foundation
- Project setup.
- Branding and layout.
- Authentication.
- Database connection.
- Household creation.
- Invitations.
- Household membership.

### Phase 2: Expenses
- Expense creation.
- Participant selection.
- Automatic splitting.
- Transaction history.
- Financial balances.
- Repayment recording.

### Phase 3: Rent and bills
- Rent configuration.
- Fortnightly reminders.
- Bill management.
- Individual obligations.
- Payment statuses.

### Phase 4: Vehicles
- Vehicle registration.
- Fuel-price history.
- Trip recording.
- Fuel cost calculation.
- Participant allocations.

### Phase 5: Cleaning
- Task creation.
- Recurring schedules.
- Rotation.
- Completion tracking.
- Reminders.

### Phase 6: Polish and reliability
- Notification centre.
- Reporting and exports.
- Accessibility.
- Security review.
- Automated tests.
- Deployment preparation.

Prioritise completing a small, end-to-end working feature over generating every page at once.

---

# 24. REQUIRED DELIVERABLES

Produce:

1. A working, responsive public website.
2. A functional authenticated application.
3. A complete household onboarding flow.
4. Database schema and migrations.
5. Secure access policies.
6. Functional expense splitting.
7. Financial balance and settlement calculations.
8. Rent and bill management.
9. Vehicle and fuel-cost tracking.
10. Cleaning schedules and rotation.
11. Notification infrastructure.
12. Automated tests.
13. Development seed data.
14. An environment variable template.
15. A comprehensive README.
16. Deployment instructions.

If external services require credentials, clearly identify which variables and configuration steps are required.

Do not invent credentials.

Do not claim email, push notifications, payments, or integrations are functional until they have been configured and tested.

---

# 25. FINAL ACCEPTANCE CRITERIA

The project is not complete merely because the homepage looks attractive.

The application must demonstrate the following end-to-end scenarios:

SCENARIO A:
A user creates a household, invites four other people, and all five can access the same household with their own accounts.

SCENARIO B:
One member pays $90 for three people. FAIRSHARE allocates $30 to each beneficiary and correctly records the resulting obligations.

SCENARIO C:
A member records a 63 km car trip using a vehicle with an efficiency of 12 km/L and a recorded fuel price of $1.85/L. The application estimates fuel consumption as 5.25 L and the total fuel cost as $9.71 before splitting it among the selected participants.

SCENARIO D:
The administrator configures fortnightly rent. The system calculates the correct due dates and generates Wednesday and Thursday reminders on the appropriate dates.

SCENARIO E:
The leaseholder records an electricity bill, attaches the document, selects the responsible members, and the application calculates their contributions.

SCENARIO F:
The administrator creates recurring cleaning tasks. FAIRSHARE assigns them according to the configured rotation and records completion history.

SCENARIO G:
A member records a repayment. The relevant outstanding obligation updates correctly without altering unrelated transactions.

SCENARIO H:
A user attempts to access another household's records without permission. The request is rejected by the backend and database access policies.

SCENARIO I:
A user opens the application on a mobile phone and can complete the principal workflows without layout problems.

SCENARIO J:
A scheduled reminder is delivered once, and a retry does not create duplicate notifications.

Build FAIRSHARE as a maintainable, secure application rather than a visual mockup.

Begin by establishing the project structure and database schema, then implement and test the core household and expense workflows before expanding into the remaining features.