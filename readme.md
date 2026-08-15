# Accounts Receivable Dashboard

A small finance dashboard built as a learning project. It tracks customers, invoices and payments, then shows what is still due and overdue.

Live demo: https://ar-dashboard.cfapps.us10-001.hana.ondemand.com

## What it shows

- Total open receivables
- Total overdue amount
- Amount due this month
- Aging categories from Not Due to 90+
- Overdue customers
- Invoice list with search and filtering
- Customer details

## How it works

- SAPUI5 displays the dashboard in the browser.
- A CAP service calculates balances and overdue days.
- SQLite stores the sample data locally and in the current demo.
- Cloud Foundry hosts the live demo on SAP BTP Trial.

## Run it locally

```bash
npm install
npx cds deploy
npm start
```

Open http://localhost:4004

## Sample data

The app includes five fictional customers and example invoices in every aging category. Fully paid invoices are marked as Paid and are not treated as overdue.

The demo database is recreated from the sample data whenever the cloud app starts. This is intentional for a demo project.

## Built with

- Node.js
- SAP CAP
- SAPUI5
- SQLite
- SAP BTP Cloud Foundry

## AI assistance

I used AI as a learning and pair-programming tool while building this project. It helped me understand CAP, review code and iterate on the user interface. I made the final choices about the app structure and business rules.

## Next ideas

- Store data in SAP HANA Cloud
- Add user roles and sign-in
- Allow users to add payments
