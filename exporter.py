import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from datetime import datetime

def export_entries_to_excel(entries, rates, output_path=None, filename_prefix="Parcel_Manifest_Unpaid"):
    return_bytes = (output_path == "bytes")
    if not output_path and not return_bytes:
        # Default to Downloads or current directory
        user_home = os.path.expanduser("~")
        downloads = os.path.join(user_home, "Downloads")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{filename_prefix}_{timestamp}.xlsx"
        output_path = os.path.join(downloads if os.path.exists(downloads) else os.path.dirname(__file__), filename)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Invoice (Unpaid)" if "Invoice" in filename_prefix else "Delivery Manifest"
    ws.views.sheetView[0].showGridLines = True

    # Styling Palette
    c_header_bg = "1B1F24"      # Dark slate
    c_header_txt = "FFFFFF"     # White
    c_zebra_bg = "F9FAFB"       # Light gray
    c_sat_yellow = "FFFF00"     # Saturday highlight yellow
    c_total_bg = "F3F4F6"       # Summary gray

    font_header = Font(name="Segoe UI", size=10, bold=True, color=c_header_txt)
    font_body = Font(name="Segoe UI", size=10)
    font_body_bold = Font(name="Segoe UI", size=10, bold=True)
    
    fill_header = PatternFill(start_color=c_header_bg, end_color=c_header_bg, fill_type="solid")
    fill_zebra = PatternFill(start_color=c_zebra_bg, end_color=c_zebra_bg, fill_type="solid")
    fill_saturday = PatternFill(start_color=c_sat_yellow, end_color=c_sat_yellow, fill_type="solid")
    fill_total = PatternFill(start_color=c_total_bg, end_color=c_total_bg, fill_type="solid")

    border_thin = Border(
        left=Side(style='thin', color='E5E7EB'),
        right=Side(style='thin', color='E5E7EB'),
        top=Side(style='thin', color='E5E7EB'),
        bottom=Side(style='thin', color='E5E7EB')
    )
    border_double_bottom = Border(
        top=Side(style='thin', color='9CA3AF'),
        bottom=Side(style='double', color='1B1F24'),
        left=Side(style='thin', color='E5E7EB'),
        right=Side(style='thin', color='E5E7EB')
    )

    headers = [
        "Date",
        "Normal",
        "Express",
        "Transfer Type",
        "Transfer Qty",
        "Transferred From",
        "Login / Account",
        "Day Total Parcels",
        "Total Pay ($)"
    ]

    # Row 1: Header row
    start_row = 1
    ws.row_dimensions[start_row].height = 26
    for col_num, header_title in enumerate(headers, 1):
        cell = ws.cell(row=start_row, column=col_num, value=header_title)
        cell.font = font_header
        cell.fill = fill_header
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    current_row = 2
    total_normal = 0
    total_express = 0
    total_transfer = 0
    total_parcels_all = 0
    total_earned = 0.0

    for i, e in enumerate(entries):
        dt_str = e.get("date", "")
        is_sat = bool(e.get("isSaturday", False))
        if not is_sat and dt_str:
            try:
                dt_obj = datetime.strptime(dt_str, "%Y-%m-%d")
                if dt_obj.weekday() == 5:
                    is_sat = True
            except Exception:
                pass

        norm = int(e.get("normal", 0))
        expr = int(e.get("express", 0))
        ttype = e.get("transferType", "None")
        tqty = int(e.get("transferQty", 0))
        tfrom = e.get("transferredFrom", "")
        hrs = float(e.get("hoursWorked", 0))

        # Calculate pay
        if is_sat:
            pay = hrs * rates.get("saturdayHourly", 48.14)
            day_total_parcels = norm + expr
        else:
            pay = norm * rates.get("normal", 1.60) + expr * rates.get("express", 3.60)
            if ttype == "Normal":
                pay += tqty * rates.get("normal", 1.60)
            elif ttype == "Express":
                pay += tqty * rates.get("express", 3.60)
            day_total_parcels = norm + expr + (tqty if ttype != "None" else 0)

        total_normal += norm
        total_express += expr
        total_transfer += (tqty if ttype != "None" else 0)
        total_parcels_all += day_total_parcels
        total_earned += pay

        if is_sat:
            row_fill = fill_saturday
        elif i % 2 == 1:
            row_fill = fill_zebra
        else:
            row_fill = None

        dlogin = e.get("deliveryLogin", "")

        row_data = [
            (dt_str, Alignment(horizontal="center")),
            (norm, Alignment(horizontal="center")),
            (expr, Alignment(horizontal="center")),
            (ttype if ttype != "None" else "-", Alignment(horizontal="center")),
            (tqty if ttype != "None" else "-", Alignment(horizontal="center")),
            (tfrom if tfrom else "-", Alignment(horizontal="left")),
            (dlogin if dlogin else "-", Alignment(horizontal="left")),
            (day_total_parcels, Alignment(horizontal="center")),
            (pay, Alignment(horizontal="right"))
        ]

        ws.row_dimensions[current_row].height = 20
        for col_idx, (val, align) in enumerate(row_data, 1):
            cell = ws.cell(row=current_row, column=col_idx, value=val)
            cell.font = font_body
            cell.alignment = align
            cell.border = border_thin
            if row_fill:
                cell.fill = row_fill
            
            # Format currency for pay column (now col 9)
            if col_idx == 9:
                cell.number_format = '"$"#,##0.00'
                cell.font = font_body_bold

        current_row += 1

    # Grand Totals Row
    summary_row = current_row
    ws.row_dimensions[summary_row].height = 24

    for col in range(1, 10):
        ws.cell(row=summary_row, column=col).fill = fill_total
        ws.cell(row=summary_row, column=col).border = border_double_bottom

    # Col 1: Date -> "GRAND TOTALS"
    tot_label = ws.cell(row=summary_row, column=1, value="GRAND TOTALS")
    tot_label.font = font_body_bold
    tot_label.alignment = Alignment(horizontal="center", vertical="center")

    # Col 2: Normal Total
    c_norm = ws.cell(row=summary_row, column=2, value=total_normal)
    c_norm.font = font_body_bold
    c_norm.alignment = Alignment(horizontal="center", vertical="center")

    # Col 3: Express Total
    c_expr = ws.cell(row=summary_row, column=3, value=total_express)
    c_expr.font = font_body_bold
    c_expr.alignment = Alignment(horizontal="center", vertical="center")

    # Col 4: Transfer Type -> empty/dash
    c_ttype = ws.cell(row=summary_row, column=4, value="-")
    c_ttype.font = font_body_bold
    c_ttype.alignment = Alignment(horizontal="center", vertical="center")

    # Col 5: Transfer Qty Total
    c_tqty = ws.cell(row=summary_row, column=5, value=total_transfer)
    c_tqty.font = font_body_bold
    c_tqty.alignment = Alignment(horizontal="center", vertical="center")

    # Col 6: Transferred From -> empty/dash
    c_tfrom = ws.cell(row=summary_row, column=6, value="-")
    c_tfrom.font = font_body_bold
    c_tfrom.alignment = Alignment(horizontal="center", vertical="center")

    # Col 7: Login / Account -> empty/dash
    c_dlogin = ws.cell(row=summary_row, column=7, value="-")
    c_dlogin.font = font_body_bold
    c_dlogin.alignment = Alignment(horizontal="center", vertical="center")

    # Col 8: Day Total Parcels Total
    c_parcels = ws.cell(row=summary_row, column=8, value=total_parcels_all)
    c_parcels.font = font_body_bold
    c_parcels.alignment = Alignment(horizontal="center", vertical="center")

    # Col 9: Total Pay Earned
    tot_pay_cell = ws.cell(row=summary_row, column=9, value=total_earned)
    tot_pay_cell.font = font_body_bold
    tot_pay_cell.alignment = Alignment(horizontal="right", vertical="center")
    tot_pay_cell.number_format = '"$"#,##0.00'

    # Auto-adjust column widths
    for col in ws.columns:
        col_letter = get_column_letter(col[0].column)
        max_len = 0
        for cell in col:
            val_str = str(cell.value or '')
            if len(val_str) > max_len:
                max_len = len(val_str)
        ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    if return_bytes:
        import io
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        return buf

    wb.save(output_path)
    return output_path
