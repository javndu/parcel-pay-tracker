import sqlite3
import os
import secrets
import json
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

DB_PATH = os.environ.get("DATABASE_PATH") or (
    os.path.join("/data", "parcel_tracker.db") if os.path.exists("/data") else os.path.join(os.path.dirname(os.path.abspath(__file__)), "parcel_tracker.db")
)

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL COLLATE NOCASE,
            email TEXT UNIQUE COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)

    # User entries table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_entries (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
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
            delivery_login TEXT NOT NULL DEFAULT '',
            paid INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_entries_uid ON user_entries(user_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_entries_date ON user_entries(date)")

    # User settings table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_settings (
            user_id INTEGER NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            PRIMARY KEY (user_id, key),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # Check if legacy entries table exists; if so and no users yet, migrate them to an initial 'lo' account
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='entries'")
    has_legacy = cursor.fetchone() is not None

    cursor.execute("SELECT COUNT(*) FROM users")
    user_count = cursor.fetchone()[0]

    if has_legacy and user_count == 0:
        # Create initial account for existing data
        admin_pw_hash = generate_password_hash(secrets.token_urlsafe(32))
        now_str = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO users (username, email, password_hash, created_at)
            VALUES (?, ?, ?, ?)
        """, ("lo", "lo@ausipost.local", admin_pw_hash, now_str))
        default_user_id = cursor.lastrowid

        # Migrate settings
        cursor.execute("SELECT key, value FROM settings")
        for srow in cursor.fetchall():
            cursor.execute("""
                INSERT OR REPLACE INTO user_settings (user_id, key, value)
                VALUES (?, ?, ?)
            """, (default_user_id, srow["key"], srow["value"]))

        # Migrate legacy entries
        cursor.execute("""
            SELECT id, date, normal, express, transfer_type, transfer_qty, transferred_from,
                   is_saturday, start_time, end_time, hours_worked, break_deducted,
                   delivery_login, paid, created_at
            FROM entries
        """)
        for erow in cursor.fetchall():
            cursor.execute("""
                INSERT OR IGNORE INTO user_entries (
                    id, user_id, date, normal, express, transfer_type, transfer_qty, transferred_from,
                    is_saturday, start_time, end_time, hours_worked, break_deducted,
                    delivery_login, paid, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                erow["id"], default_user_id, erow["date"], erow["normal"], erow["express"],
                erow["transfer_type"], erow["transfer_qty"], erow["transferred_from"],
                erow["is_saturday"], erow["start_time"], erow["end_time"], erow["hours_worked"],
                erow["break_deducted"], erow["delivery_login"] if "delivery_login" in erow.keys() else "",
                erow["paid"], erow["created_at"]
            ))

    conn.commit()
    
    # Ensure default user exists for disabled authentication
    cursor.execute("SELECT COUNT(*) FROM users WHERE id = 1")
    if cursor.fetchone()[0] == 0:
        pw_hash = generate_password_hash(secrets.token_urlsafe(32))
        now_str = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO users (id, username, email, password_hash, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (1, "Contractor", "contractor@ausipost.local", pw_hash, now_str))
        
        # Set default rates for the default user
        default_rates = json.dumps({"normal": 1.60, "express": 3.60, "saturdayHourly": 48.14})
        cursor.execute("INSERT INTO user_settings (user_id, key, value) VALUES (?, 'rates', ?)", (1, default_rates))
        cursor.execute("INSERT INTO user_settings (user_id, key, value) VALUES (?, 'theme', 'dark')", (1,))
        conn.commit()
    conn.close()

# ═══════════ USER AUTHENTICATION ═══════════

def register_user(username, password, email=None):
    username = username.strip()
    if not username:
        return {"success": False, "error": "Username cannot be blank"}
    if len(password) < 6:
        return {"success": False, "error": "Password must be at least 6 characters"}
    
    conn = get_connection()
    cursor = conn.cursor()
    try:
        pw_hash = generate_password_hash(password)
        now_str = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO users (username, email, password_hash, created_at)
            VALUES (?, ?, ?, ?)
        """, (username, email.strip() if email else None, pw_hash, now_str))
        user_id = cursor.lastrowid

        # Set default rates for the new user
        default_rates = json.dumps({"normal": 1.60, "express": 3.60, "saturdayHourly": 48.14})
        cursor.execute("INSERT INTO user_settings (user_id, key, value) VALUES (?, 'rates', ?)", (user_id, default_rates))
        cursor.execute("INSERT INTO user_settings (user_id, key, value) VALUES (?, 'theme', 'dark')", (user_id,))
        
        conn.commit()
        return {
            "success": True,
            "user": {"id": user_id, "username": username, "email": email}
        }
    except sqlite3.IntegrityError:
        return {"success": False, "error": "Username or email is already taken"}
    finally:
        conn.close()

def authenticate_user(username_or_email, password):
    login_str = username_or_email.strip()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, username, email, password_hash FROM users
        WHERE username = ? OR email = ?
    """, (login_str, login_str))
    user_row = cursor.fetchone()
    conn.close()

    if not user_row:
        return None
    
    if check_password_hash(user_row["password_hash"], password):
        return {
            "id": user_row["id"],
            "username": user_row["username"],
            "email": user_row["email"]
        }
    return None

def get_user_by_id(user_id):
    # Handle default user for disabled authentication
    if user_id == "default_user":
        return {"id": 1, "username": "Contractor", "email": ""}
    
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, email FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {"id": row["id"], "username": row["username"], "email": row["email"]}
    return None

# ═══════════ USER ENTRIES ═══════════

def get_user_entries(user_id):
    # Map default user to user_id 1
    db_user_id = 1 if user_id == "default_user" else user_id
    
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, date, normal, express, transfer_type, transfer_qty, transferred_from,
               is_saturday, start_time, end_time, hours_worked, break_deducted,
               delivery_login, paid, created_at
        FROM user_entries
        WHERE user_id = ?
        ORDER BY date ASC, created_at ASC
    """, (db_user_id,))
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
            "deliveryLogin": r["delivery_login"] or "",
            "paid": bool(r["paid"]),
            "createdAt": r["created_at"]
        })
    return entries

def add_user_entry(user_id, entry):
    # Map default user to user_id 1
    db_user_id = 1 if user_id == "default_user" else user_id
    
    conn = get_connection()
    cursor = conn.cursor()
    created_at = entry.get("createdAt") or datetime.now().isoformat()
    entry_id = entry.get("id") or f"run_{datetime.now().strftime('%Y%m%d%H%M%S')}_{os.urandom(3).hex()}"

    cursor.execute("""
        INSERT OR REPLACE INTO user_entries (
            id, user_id, date, normal, express, transfer_type, transfer_qty, transferred_from,
            is_saturday, start_time, end_time, hours_worked, break_deducted,
            delivery_login, paid, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        entry_id,
        db_user_id,
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

def toggle_user_paid(user_id, entry_id):
    # Map default user to user_id 1
    db_user_id = 1 if user_id == "default_user" else user_id
    
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT paid FROM user_entries WHERE id = ? AND user_id = ?", (entry_id, db_user_id))
    row = cursor.fetchone()
    if row:
        new_val = 0 if row["paid"] else 1
        cursor.execute("UPDATE user_entries SET paid = ? WHERE id = ? AND user_id = ?", (new_val, entry_id, db_user_id))
        conn.commit()
    conn.close()

def mark_all_user_paid(user_id):
    # Map default user to user_id 1
    db_user_id = 1 if user_id == "default_user" else user_id
    
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE user_entries SET paid = 1 WHERE user_id = ? AND paid = 0", (db_user_id,))
    conn.commit()
    conn.close()

def delete_user_entry(user_id, entry_id):
    # Map default user to user_id 1
    db_user_id = 1 if user_id == "default_user" else user_id
    
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM user_entries WHERE id = ? AND user_id = ?", (entry_id, db_user_id))
    conn.commit()
    conn.close()

def clear_all_user_entries(user_id):
    # Map default user to user_id 1
    db_user_id = 1 if user_id == "default_user" else user_id
    
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM user_entries WHERE user_id = ?", (db_user_id,))
    conn.commit()
    conn.close()

# ═══════════ USER SETTINGS ═══════════

def get_user_settings(user_id):
    # Map default user to user_id 1
    db_user_id = 1 if user_id == "default_user" else user_id
    
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM user_settings WHERE user_id = ?", (db_user_id,))
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

def save_user_rates(user_id, rates):
    # Map default user to user_id 1
    db_user_id = 1 if user_id == "default_user" else user_id
    
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO user_settings (user_id, key, value)
        VALUES (?, 'rates', ?)
    """, (db_user_id, json.dumps(rates)))
    conn.commit()
    conn.close()

def save_user_theme(user_id, theme):
    # Map default user to user_id 1
    db_user_id = 1 if user_id == "default_user" else user_id
    
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO user_settings (user_id, key, value)
        VALUES (?, 'theme', ?)
    """, (db_user_id, theme))
    conn.commit()
    conn.close()
