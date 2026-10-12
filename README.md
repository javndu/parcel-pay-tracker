# Parcel Pay Tracker — Delivery Log and Earnings Calculator

Parcel Pay Tracker is a parcel delivery tracker and earnings calculator for delivery drivers. Log standard and express parcels, record Saturday shifts, calculate delivery pay, track paid and unpaid entries, and export Excel reports and invoices.

Originally named Ausi Post, the project combines a Python desktop app with a Flask API and a React web interface. It is useful for keeping a courier delivery log, checking parcel-based earnings, and managing delivery work records in one place.

## Features

- Record standard and express parcel deliveries and transfers.
- Track Saturday shifts, working hours, and breaks.
- Calculate pay using configurable rates and mark entries as paid.
- Export records to Excel and invoices.
- Store records locally in SQLite.

## Desktop app

Install Python and the dependencies:

```sh
pip install -r requirements.txt
python app.py
```

On Windows, `Run_Parcel_Tracker.bat` launches the desktop app. The desktop interface is in `Webpage/ui`.

## Web app

Build the frontend and copy the generated `dist` directory to `Webpage/dist`, where the Flask server expects it:

```sh
cd Webpage/bolt-loggerPost-main
npm ci
npm run build
```

From the repository root, set `SECRET_KEY` to a random value in your environment and run:

```sh
python server.py
```

The frontend development server uses a proxy to the backend at `http://localhost:5000`.

## Project layout

- `app.py`, `database.py` — desktop app and local storage.
- `server.py`, `auth_database.py` — Flask API and web app storage.
- `exporter.py` — spreadsheet and invoice exports.
- `Webpage/ui` — desktop interface.
- `Webpage/bolt-loggerPost-main` — React, TypeScript, and Vite frontend.
- `render.yaml` — existing hosting configuration.

## Frequently asked questions

### Can I use this as a delivery driver pay calculator?

Yes. Configure the standard parcel rate, express parcel rate, and Saturday hourly rate. The tracker calculates earnings from delivery counts or Saturday hours, including transfers and break deductions.

### Can I track unpaid deliveries and export invoices?

Yes. Entries can be marked as paid or unpaid, and the app includes Excel and invoice exports. This helps maintain a parcel delivery log and reconcile delivery earnings.

### Is this an Australia Post parcel tracking app?

It tracks a driver's delivery work and pay. It does not track an individual package by its Australia Post tracking number or connect to Australia Post's tracking service.

### What technologies does the project use?

The desktop app uses Python and pywebview. The web app uses Flask, React, TypeScript, and Vite, with SQLite for local storage.

## Repository notes

Local databases, CSV records, historical delivery seed data, caches, and archives are excluded. The supplied app currently bypasses authentication for its main data endpoints; use it locally until access control is implemented. Publishing this repository does not deploy the app.

This is an independent project and is not an official Australia Post product.
