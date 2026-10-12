# Ausi Post

A parcel delivery and pay tracker with a Python desktop app and a React web interface.

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

## Repository notes

Local databases, CSV records, historical delivery seed data, caches, and archives are excluded. The supplied app currently bypasses authentication for its main data endpoints; use it locally until access control is implemented. Publishing this repository does not deploy the app.

This is an independent project and is not an official Australia Post product.
