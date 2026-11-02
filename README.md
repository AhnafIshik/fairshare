# FAIRSHARE — Shared Household Management Prototype

FAIRSHARE is a responsive, browser-based prototype for managing shared household expenses, bills, rent, vehicle fuel costs, and cleaning tasks.

## Run it

### Simplest option
1. Download and extract the project ZIP.
2. Open the `fairshare` folder.
3. Double-click `index.html` to open it in a modern browser.

### Recommended local server
If you have Python 3 installed, open Terminal in the project folder and run:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

Stop the server with `Ctrl+C`.

## Features in this prototype

- Responsive desktop and mobile layout.
- Dashboard with summary cards, recent expenses, upcoming tasks, housemates, and spending snapshot.
- Add and search expenses.
- Equal expense splitting among selected housemates.
- Expense breakdown and deletion.
- Household bills with selected participants and status changes.
- Rent settings and next-due display.
- Vehicle registration.
- Fuel price updates and a placeholder for receipt/photo selection.
- Trip fuel cost estimation using distance, km/L and fuel price.
- Optional tolls and parking.
- Cleaning task creation and completion.
- Add demo housemates.
- Household settings.
- Export current browser data to JSON.
- Data persists in this browser using localStorage.

## Important limitations

This is a **front-end prototype**, not a production-ready multi-user service.

- Data is stored only in the current browser profile. It does not sync between housemates or devices.
- There is no real sign-in, invitation email, cloud database, server-side permission system, or multi-user authentication.
- Rent and bill reminders are displayed in the interface but are not sent automatically by email, SMS, or push notification.
- Image/file inputs are demonstrations only. Files are not uploaded or stored.
- Equal splitting is implemented. Custom amounts and percentages are not yet available.
- Balance summaries are prototype calculations, not an authoritative accounting ledger. The sample dashboard is intended to demonstrate workflows and layout.
- The demo uses sample household data. Do not enter sensitive personal or financial information.
- There is no payment processing or bank integration.

## Before real users use FAIRSHARE

The next production stage should replace localStorage with a proper backend such as Supabase/PostgreSQL and implement:
- Real authentication and household invitations.
- Server-side authorisation and row-level security.
- A transaction ledger for expenses, allocations, repayments, and reversals.
- Validated monetary calculations on the server.
- Private receipt storage and signed access links.
- A reliable scheduled-job service for reminders.
- Email delivery configuration.
- Audit logging, backups, tests, and security review.

## Files

- `index.html` — page structure and UI.
- `styles.css` — responsive visual design.
- `app.js` — prototype interactions and browser data storage.
- `README.md` — setup and limitations.
- `assets/` — reserved for future icons/images.

No build step or package installation is required for this prototype.
