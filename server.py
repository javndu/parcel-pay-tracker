import os
import secrets
import sys
from datetime import timedelta, datetime
from functools import wraps
from flask import Flask, request, jsonify, session, send_file, send_from_directory

import auth_database
import exporter

APP_DIR = os.path.dirname(os.path.abspath(__file__))
UI_DIR = os.path.join(APP_DIR, "webpage", "dist")
PUBLIC_DIR = os.path.join(APP_DIR, "webpage", "bolt-loggerPost-main", "public")

app = Flask(__name__, static_folder=UI_DIR, static_url_path="")
app.secret_key = os.environ.get("SECRET_KEY") or secrets.token_hex(32)
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=30)

# Initialize database
auth_database.init_db()

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Authentication disabled - use default user_id
        user_id = "default_user"
        return f(user_id, *args, **kwargs)
    return decorated_function

# ═══════════ STATIC FILE SERVING ═══════════

@app.route("/")
def index():
    return send_from_directory(UI_DIR, "index.html")

@app.route("/assets/<path:filename>")
def serve_assets(filename):
    return send_from_directory(os.path.join(UI_DIR, "assets"), filename)

@app.route("/images/<path:filename>")
def serve_images(filename):
    return send_from_directory(os.path.join(UI_DIR, "images"), filename)

# Catch-all route for SPA routing (must be last)
@app.route("/<path:path>")
def catch_all(path):
    if path.startswith("api/"):
        return "Not found", 404
    return send_from_directory(UI_DIR, "index.html")

@app.route("/public/<path:filename>")
def serve_public(filename):
    return send_from_directory(PUBLIC_DIR, filename)

# ═══════════ AUTHENTICATION ENDPOINTS ═══════════

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")
    email = data.get("email", "").strip()

    if not username:
        return jsonify({"success": False, "error": "Please enter a username"}), 400
    if not password:
        return jsonify({"success": False, "error": "Please enter a password"}), 400

    res = auth_database.register_user(username, password, email if email else None)
    if not res.get("success"):
        return jsonify(res), 400

    session.permanent = True
    session["user_id"] = res["user"]["id"]
    return jsonify({
        "success": True,
        "authenticated": True,
        "user": res["user"]
    })

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"success": False, "error": "Username and password required"}), 400

    user = auth_database.authenticate_user(username, password)
    if not user:
        return jsonify({"success": False, "error": "Invalid username or password"}), 401

    session.permanent = True
    session["user_id"] = user["id"]
    return jsonify({
        "success": True,
        "authenticated": True,
        "user": user
    })

@app.route("/api/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True, "authenticated": False})

@app.route("/api/auth/me", methods=["GET"])
def me():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"authenticated": False})
    user = auth_database.get_user_by_id(user_id)
    if not user:
        session.clear()
        return jsonify({"authenticated": False})
    return jsonify({
        "authenticated": True,
        "user": user
    })

# ═══════════ MANIFEST ENTRIES CRUD ═══════════

@app.route("/api/entries", methods=["GET"])
@login_required
def get_entries(user_id):
    entries = auth_database.get_user_entries(user_id)
    settings = auth_database.get_user_settings(user_id)
    return jsonify({
        "success": True,
        "entries": entries,
        "settings": settings
    })

@app.route("/api/entries", methods=["POST"])
@login_required
def add_entry(user_id):
    entry = request.get_json() or {}
    if not entry.get("date"):
        return jsonify({"success": False, "error": "Delivery date is required"}), 400

    auth_database.add_user_entry(user_id, entry)
    entries = auth_database.get_user_entries(user_id)
    return jsonify({"success": True, "entries": entries})

@app.route("/api/entries/<entry_id>/toggle-paid", methods=["POST"])
@login_required
def toggle_paid(user_id, entry_id):
    auth_database.toggle_user_paid(user_id, entry_id)
    entries = auth_database.get_user_entries(user_id)
    return jsonify({"success": True, "entries": entries})

@app.route("/api/entries/mark-all-paid", methods=["POST"])
@login_required
def mark_all_paid(user_id):
    auth_database.mark_all_user_paid(user_id)
    entries = auth_database.get_user_entries(user_id)
    return jsonify({"success": True, "entries": entries})

@app.route("/api/entries/<entry_id>", methods=["DELETE"])
@login_required
def delete_entry(user_id, entry_id):
    auth_database.delete_user_entry(user_id, entry_id)
    entries = auth_database.get_user_entries(user_id)
    return jsonify({"success": True, "entries": entries})

@app.route("/api/entries/clear-all", methods=["DELETE"])
@login_required
def clear_all(user_id):
    auth_database.clear_all_user_entries(user_id)
    return jsonify({"success": True, "entries": []})

# ═══════════ USER SETTINGS ═══════════

@app.route("/api/settings", methods=["GET"])
@login_required
def get_settings(user_id):
    settings = auth_database.get_user_settings(user_id)
    return jsonify({"success": True, "settings": settings})

@app.route("/api/settings", methods=["POST"])
@login_required
def save_settings(user_id):
    data = request.get_json() or {}
    rates = data.get("rates")
    theme = data.get("theme")
    if rates:
        auth_database.save_user_rates(user_id, rates)
    if theme:
        auth_database.save_user_theme(user_id, theme)
    return jsonify({"success": True, "settings": auth_database.get_user_settings(user_id)})

# ═══════════ EXCEL / INVOICE EXPORTS (IN-MEMORY STREAMING) ═══════════

@app.route("/api/export/excel", methods=["GET"])
@login_required
def export_excel(user_id):
    user = auth_database.get_user_by_id(user_id)
    username = user["username"] if user else "Contractor"
    entries = auth_database.get_user_entries(user_id)
    settings = auth_database.get_user_settings(user_id)
    rates = settings.get("rates", {"normal": 1.60, "express": 3.60, "saturdayHourly": 48.14})

    buf = exporter.export_entries_to_excel(
        entries=entries,
        rates=rates,
        output_path="bytes",
        filename_prefix=f"Parcel_Manifest_{username}"
    )

    filename = f"Parcel_Manifest_{username}_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    return send_file(
        buf,
        as_attachment=True,
        download_name=filename,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

@app.route("/api/export/invoice", methods=["GET"])
@login_required
def export_invoice(user_id):
    user = auth_database.get_user_by_id(user_id)
    username = user["username"] if user else "Contractor"
    all_entries = auth_database.get_user_entries(user_id)
    unpaid_entries = [e for e in all_entries if not e.get("paid")]
    settings = auth_database.get_user_settings(user_id)
    rates = settings.get("rates", {"normal": 1.60, "express": 3.60, "saturdayHourly": 48.14})

    buf = exporter.export_entries_to_excel(
        entries=unpaid_entries,
        rates=rates,
        output_path="bytes",
        filename_prefix=f"Invoice_Unpaid_{username}"
    )

    filename = f"Invoice_Unpaid_{username}_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    return send_file(
        buf,
        as_attachment=True,
        download_name=filename,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Parcel Log Pro Web Server running at http://0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
