/*
# Parcel Log Pro - Database Schema

## Overview
Creates the full schema for the Parcel Log Pro delivery manifest and pay tracking system
for Australia Post contractors. Drivers sign up, log daily parcel deliveries (weekday and
Saturday shifts), track transfers from other drivers, and generate monthly invoices.

## New Tables

### driver_profiles
- `id` (uuid, PK, references auth.users)
- `full_name` (text, not null) - driver's display name
- `vehicle_type` (text) - e.g. "Van", "Motorbike", "Car"
- `created_at` (timestamptz)

### entries
- `id` (uuid, PK)
- `user_id` (uuid, not null, references auth.users, defaults to auth.uid())
- `date` (date, not null) - the delivery date
- `normal` (int, default 0) - standard parcel count
- `express` (int, default 0) - express parcel count
- `transfer_type` (text) - 'Normal' or 'Express' or null
- `transfer_qty` (int, default 0) - parcels transferred from another driver
- `transferred_from` (text) - name of the driver who transferred the parcels
- `is_saturday` (boolean, default false) - whether this is a Saturday shift
- `start_time` (text) - shift start time for Saturday entries
- `end_time` (text) - shift end time for Saturday entries
- `hours_worked` (numeric) - computed hours for Saturday shifts
- `break_deducted` (boolean, default false) - whether 30min break was deducted
- `delivery_login` (text) - the login/account used for this delivery
- `is_paid` (boolean, default false) - whether this entry has been paid
- `created_at` (timestamptz)

### settings
- `id` (uuid, PK)
- `user_id` (uuid, not null, references auth.users, defaults to auth.uid())
- `normal_rate` (numeric, default 1.60) - rate per standard parcel
- `express_rate` (numeric, default 3.60) - rate per express parcel
- `saturday_hourly_rate` (numeric, default 48.14) - hourly rate for Saturday shifts
- `theme` (text, default 'light') - UI theme preference
- `updated_at` (timestamptz)

## Security
- RLS enabled on all tables
- Owner-scoped CRUD policies on entries and settings (auth.uid() = user_id)
- Driver profiles: users can read/update only their own profile
*/

-- Driver profiles table
CREATE TABLE IF NOT EXISTS driver_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  vehicle_type text DEFAULT 'Van',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON driver_profiles;
CREATE POLICY "select_own_profile" ON driver_profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON driver_profiles;
CREATE POLICY "insert_own_profile" ON driver_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON driver_profiles;
CREATE POLICY "update_own_profile" ON driver_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Entries table
CREATE TABLE IF NOT EXISTS entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  normal int NOT NULL DEFAULT 0,
  express int NOT NULL DEFAULT 0,
  transfer_type text,
  transfer_qty int NOT NULL DEFAULT 0,
  transferred_from text,
  is_saturday boolean NOT NULL DEFAULT false,
  start_time text,
  end_time text,
  hours_worked numeric,
  break_deducted boolean NOT NULL DEFAULT false,
  delivery_login text,
  is_paid boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_entries" ON entries;
CREATE POLICY "select_own_entries" ON entries FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_entries" ON entries;
CREATE POLICY "insert_own_entries" ON entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_entries" ON entries;
CREATE POLICY "update_own_entries" ON entries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_entries" ON entries;
CREATE POLICY "delete_own_entries" ON entries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  normal_rate numeric NOT NULL DEFAULT 1.60,
  express_rate numeric NOT NULL DEFAULT 3.60,
  saturday_hourly_rate numeric NOT NULL DEFAULT 48.14,
  theme text NOT NULL DEFAULT 'light',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_settings" ON settings;
CREATE POLICY "select_own_settings" ON settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_settings" ON settings;
CREATE POLICY "insert_own_settings" ON settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_settings" ON settings;
CREATE POLICY "update_own_settings" ON settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_settings" ON settings;
CREATE POLICY "delete_own_settings" ON settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_entries_user_date ON entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_entries_user_paid ON entries(user_id, is_paid);
