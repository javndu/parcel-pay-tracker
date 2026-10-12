import os
import sys
import csv
import webview
import database
import exporter

APP_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_LOG_PATH = os.path.join(APP_DIR, "manifest_log.csv")

def sync_csv():
    """Auto-save a human-readable CSV alongside the database after every change."""
    try:
        entries = database.get_all_entries()
        settings = database.get_settings()
        rates = settings.get("rates", {"normal": 1.60, "express": 3.60, "saturdayHourly": 48.14})

        with open(CSV_LOG_PATH, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                "Date", "Type", "Standard", "Express",
                "Transfer Type", "Transfer Qty", "Transferred From",
                "Start Time", "End Time", "Hours Worked", "Break Deducted",
                "Delivery Login", "Pay ($)", "Rate ($/hr)", "Status"
            ])
            for e in entries:
                hours = float(e.get("hoursWorked", 0))
                if e.get("isSaturday"):
                    pay = hours * rates.get("saturdayHourly", 48.14)
                    entry_type = "Saturday Shift"
                else:
                    pay = (e.get("normal", 0) * rates.get("normal", 1.60)
                         + e.get("express", 0) * rates.get("express", 3.60))
                    tt = e.get("transferType", "None")
                    tq = e.get("transferQty", 0)
                    if tt == "Normal":
                        pay += tq * rates.get("normal", 1.60)
                    elif tt == "Express":
                        pay += tq * rates.get("express", 3.60)
                    entry_type = "Weekday"

                rate_per_hr = f"{(pay / hours):.2f}" if hours > 0 else ""

                writer.writerow([
                    e.get("date", ""),
                    entry_type,
                    e.get("normal", 0),
                    e.get("express", 0),
                    e.get("transferType", "None"),
                    e.get("transferQty", 0),
                    e.get("transferredFrom", ""),
                    e.get("startTime", ""),
                    e.get("endTime", ""),
                    f"{hours:.1f}" if hours > 0 else "",
                    "Yes" if e.get("breakDeducted") else "",
                    e.get("deliveryLogin", ""),
                    f"{pay:.2f}",
                    rate_per_hr,
                    "PAID" if e.get("paid") else "UNPAID"
                ])
    except Exception as err:
        print(f"CSV sync error: {err}")


class ManifestApi:
    def __init__(self):
        database.init_db()

    def get_entries(self):
        return database.get_all_entries()

    def add_entry(self, entry):
        database.add_entry(entry)
        sync_csv()
        return database.get_all_entries()

    def toggle_paid(self, entry_id):
        database.toggle_paid(entry_id)
        sync_csv()
        return database.get_all_entries()

    def mark_all_paid(self):
        entries = database.get_all_entries()
        for e in entries:
            if not e.get("paid"):
                database.toggle_paid(e["id"])
        sync_csv()
        return database.get_all_entries()

    def delete_entry(self, entry_id):
        database.delete_entry(entry_id)
        sync_csv()
        return database.get_all_entries()

    def clear_all_entries(self):
        database.clear_all_entries()
        sync_csv()
        return []

    def get_settings(self):
        return database.get_settings()

    def save_rates(self, rates):
        database.save_rates(rates)
        sync_csv()
        return True

    def save_theme(self, theme):
        database.save_theme(theme)
        return True

    def export_excel(self):
        try:
            # Regular Excel button exports ALL entries
            entries = database.get_all_entries()
            settings = database.get_settings()
            rates = settings.get("rates", {"normal": 1.60, "express": 3.60, "saturdayHourly": 48.14})
            file_path = exporter.export_entries_to_excel(entries, rates, filename_prefix="Parcel_Delivery_Manifest")
            try:
                os.startfile(file_path)
            except Exception:
                pass
            return {
                "success": True,
                "path": file_path,
                "filename": os.path.basename(file_path),
                "count": len(entries)
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def export_invoice(self):
        try:
            # Invoice button exports UNPAID entries only
            entries = [e for e in database.get_all_entries() if not e.get("paid")]
            settings = database.get_settings()
            rates = settings.get("rates", {"normal": 1.60, "express": 3.60, "saturdayHourly": 48.14})
            file_path = exporter.export_entries_to_excel(entries, rates, filename_prefix="Invoice_Unpaid")
            try:
                os.startfile(file_path)
            except Exception:
                pass
            return {
                "success": True,
                "path": file_path,
                "filename": os.path.basename(file_path),
                "count": len(entries)
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    # Window control methods for frameless window
    def minimize_window(self):
        for w in webview.windows:
            w.minimize()

    def toggle_maximize(self):
        for w in webview.windows:
            try:
                if getattr(w, '_maximized', False):
                    w.restore()
                    w._maximized = False
                else:
                    w.maximize()
                    w._maximized = True
            except Exception:
                try:
                    w.toggle_fullscreen()
                except Exception:
                    pass

    def close_window(self):
        for w in webview.windows:
            w.destroy()



def main():
    database.init_db()
    sync_csv()
    api = ManifestApi()

    html_candidates = [
        os.path.join(APP_DIR, "ui", "index.html"),
        os.path.join(APP_DIR, "Webpage", "ui", "index.html"),
        os.path.join(APP_DIR, "Webpage", "bolt-loggerPost-main", "dist", "index.html"),
        os.path.join(APP_DIR, "Webpage", "bolt-loggerPost-main", "index.html"),
    ]
    html_path = next((p for p in html_candidates if os.path.isfile(p)), os.path.join(APP_DIR, "ui", "index.html"))

    import ctypes
    try:
        user32 = ctypes.windll.user32
        screen_w = user32.GetSystemMetrics(0)
        screen_h = user32.GetSystemMetrics(1)
    except Exception:
        screen_w, screen_h = 1920, 1080

    win_w = min(900, screen_w - 60)
    win_h = min(700, screen_h - 60)
    x_pos = (screen_w - win_w) // 2
    y_pos = (screen_h - win_h) // 2

    icon_path = os.path.join(APP_DIR, "app_icon.ico")

    window = webview.create_window(
        title="Parcel Log Pro",
        url=html_path,
        js_api=api,
        width=win_w,
        height=win_h,
        x=x_pos,
        y=y_pos,
        min_size=(min(800, screen_w), 500),
        frameless=False,
        easy_drag=True,
        background_color="#0F1216"
    )

    webview.start(debug=False, icon=icon_path if os.path.exists(icon_path) else None)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        import traceback
        with open(os.path.join(APP_DIR, "error.log"), "w", encoding="utf-8") as f:
            traceback.print_exc(file=f)
        try:
            import ctypes
            ctypes.windll.user32.MessageBoxW(0, f"Error starting app:\n\n{e}\n\nCheck error.log for full details.", "Parcel Log Pro - Error", 0x10)
        except Exception:
            pass
