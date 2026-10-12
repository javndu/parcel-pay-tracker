import sqlite3
import os
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "parcel_tracker.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Create entries table with Saturday shift support
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS entries (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            normal INTEGER NOT NULL DEFAULT 0,
            express INTEGER NOT NULL DEFAULT 0,
            transfer_type TEXT NOT NULL DEFAULT 'None',
            transfer_qty INTEGER NOT NULL DEFAULT 0,
            transferred_from TEXT NOT NULL DEFAULT '',
            is_saturday INTEGER NOT NULL DEFAULT 0,
            start_time TEXT NOT NULL DEFAULT '',
            end_time TEXT NOT NULL DEFAULT '',
            hours_worked REAL NOT NULL DEFAULT 0,
            break_deducted INTEGER NOT NULL DEFAULT 0,
            paid INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        )
    """)
    
    # Migration: add new columns to existing tables
    existing_cols = [row[1] for row in cursor.execute("PRAGMA table_info(entries)").fetchall()]
    migrations = {
        "is_saturday": "ALTER TABLE entries ADD COLUMN is_saturday INTEGER NOT NULL DEFAULT 0",
        "start_time": "ALTER TABLE entries ADD COLUMN start_time TEXT NOT NULL DEFAULT ''",
        "end_time": "ALTER TABLE entries ADD COLUMN end_time TEXT NOT NULL DEFAULT ''",
        "hours_worked": "ALTER TABLE entries ADD COLUMN hours_worked REAL NOT NULL DEFAULT 0",
        "break_deducted": "ALTER TABLE entries ADD COLUMN break_deducted INTEGER NOT NULL DEFAULT 0",
        "delivery_login": "ALTER TABLE entries ADD COLUMN delivery_login TEXT NOT NULL DEFAULT ''",
    }
    for col, sql in migrations.items():
        if col not in existing_cols:
            try:
                cursor.execute(sql)
            except Exception:
                pass
    
    # Create settings table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)
    
    # Initialize default settings
    cursor.execute("SELECT value FROM settings WHERE key = 'rates'")
    if not cursor.fetchone():
        default_rates = json.dumps({"normal": 1.60, "express": 3.60, "saturdayHourly": 48.14})
        cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('rates', ?)", (default_rates,))
    else:
        # Ensure saturdayHourly exists in existing rates
        cursor.execute("SELECT value FROM settings WHERE key = 'rates'")
        row = cursor.fetchone()
        if row:
            try:
                rates = json.loads(row[0])
                if "saturdayHourly" not in rates:
                    rates["saturdayHourly"] = 48.14
                    cursor.execute("UPDATE settings SET value = ? WHERE key = 'rates'", (json.dumps(rates),))
            except Exception:
                pass
        
    cursor.execute("SELECT value FROM settings WHERE key = 'theme'")
    if not cursor.fetchone():
        cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('theme', 'dark')")
        
    conn.commit()
    conn.close()

def get_all_entries():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, date, normal, express, transfer_type, transfer_qty, transferred_from,
               is_saturday, start_time, end_time, hours_worked, break_deducted,
               delivery_login, paid, created_at 
        FROM entries ORDER BY date ASC, created_at ASC
    """)
    rows = cursor.fetchall()
    conn.close()
    
    entries = []
    for r in rows:
        entries.append({
            "id": r["id"],
            "date": r["date"],
            "normal": int(r["normal"]),
            "express": int(r["express"]),
            "transferType": r["transfer_type"],
            "transferQty": int(r["transfer_qty"]),
            "transferredFrom": r["transferred_from"] or "",
            "isSaturday": bool(r["is_saturday"]),
            "startTime": r["start_time"] or "",
            "endTime": r["end_time"] or "",
            "hoursWorked": float(r["hours_worked"] or 0),
            "breakDeducted": bool(r["break_deducted"]),
            "deliveryLogin": r["delivery_login"] or "" if "delivery_login" in r.keys() else "",
            "paid": bool(r["paid"]),
            "createdAt": r["created_at"]
        })
    return entries

def add_entry(entry):
    conn = get_connection()
    cursor = conn.cursor()
    # Ensure we preserve created_at if provided, otherwise generate a new one
    created_at = entry.get("createdAt")
    if not created_at:
        created_at = datetime.now().isoformat()
    
    cursor.execute("""
        INSERT OR REPLACE INTO entries (id, date, normal, express, transfer_type, transfer_qty, transferred_from,
                             is_saturday, start_time, end_time, hours_worked, break_deducted,
                             delivery_login, paid, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        entry["id"],
        entry["date"],
        int(entry.get("normal", 0)),
        int(entry.get("express", 0)),
        entry.get("transferType", "None"),
        int(entry.get("transferQty", 0)),
        entry.get("transferredFrom", "").strip(),
        1 if entry.get("isSaturday", False) else 0,
        entry.get("startTime", ""),
        entry.get("endTime", ""),
        float(entry.get("hoursWorked", 0)),
        1 if entry.get("breakDeducted", False) else 0,
        entry.get("deliveryLogin", "").strip(),
        1 if entry.get("paid", False) else 0,
        created_at
    ))
    conn.commit()
    conn.close()

def toggle_paid(entry_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT paid FROM entries WHERE id = ?", (entry_id,))
    row = cursor.fetchone()
    if row:
        new_val = 0 if row["paid"] else 1
        cursor.execute("UPDATE entries SET paid = ? WHERE id = ?", (new_val, entry_id))
        conn.commit()
    conn.close()

def delete_entry(entry_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM entries WHERE id = ?", (entry_id,))
    conn.commit()
    conn.close()

def clear_all_entries():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM entries")
    conn.commit()
    conn.close()

def get_settings():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM settings")
    rows = cursor.fetchall()
    conn.close()
    
    settings = {
        "rates": {"normal": 1.60, "express": 3.60, "saturdayHourly": 48.14},
        "theme": "dark"
    }
    for r in rows:
        if r["key"] == "rates":
            try:
                settings["rates"] = json.loads(r["value"])
            except Exception:
                pass
        elif r["key"] == "theme":
            settings["theme"] = r["value"]
    return settings

def save_rates(rates):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('rates', ?)", (json.dumps(rates),))
    conn.commit()
    conn.close()

def save_theme(theme):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('theme', ?)", (theme,))
    conn.commit()
    conn.close()
