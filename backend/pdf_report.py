import io
import os
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle

FONTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fonts')
# Dung Noto Sans (thay vi font he thong Windows) de PDF chay duoc tren moi OS, ca server Linux khi deploy.
pdfmetrics.registerFont(TTFont('Arial', os.path.join(FONTS_DIR, 'NotoSans-Regular.ttf')))
pdfmetrics.registerFont(TTFont('Arial-Bold', os.path.join(FONTS_DIR, 'NotoSans-Bold.ttf')))

RISK_COLOR = {'Thấp': colors.HexColor('#16a34a'), 'Trung bình': colors.HexColor('#ea580c'), 'Cao': colors.HexColor('#dc2626')}


def build_credit_report_pdf(data: dict) -> bytes:
    """data: { ten_cong_ty, pd_percent, risk_level, color, shap_top5, benchmark, ai_comment, history } """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=18 * mm, bottomMargin=15 * mm,
                             leftMargin=18 * mm, rightMargin=18 * mm)

    title_style = ParagraphStyle('title', fontName='Arial-Bold', fontSize=16, leading=20,
                                  textColor=colors.HexColor('#1B2A4A'), spaceAfter=8)
    h2_style = ParagraphStyle('h2', fontName='Arial-Bold', fontSize=12, textColor=colors.HexColor('#00B4D8'), spaceBefore=10, spaceAfter=6)
    normal = ParagraphStyle('normal', fontName='Arial', fontSize=10, leading=14)
    small = ParagraphStyle('small', fontName='Arial', fontSize=8, textColor=colors.grey)

    elems = []
    elems.append(Paragraph('BÁO CÁO TÍN DỤNG — ĐÁNH GIÁ XÁC SUẤT VỠ NỢ (PD)', title_style))
    elems.append(Paragraph(f"Ngày tạo: {datetime.now().strftime('%d/%m/%Y %H:%M')}", small))
    elems.append(Spacer(1, 10))

    risk_color = RISK_COLOR.get(data['risk_level'], colors.grey)
    summary_table = Table([
        ['Doanh nghiệp', data['ten_cong_ty']],
        ['PD Score', f"{data['pd_percent']}%"],
        ['Mức rủi ro', data['risk_level']],
    ], colWidths=[45 * mm, 120 * mm])
    summary_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Arial'),
        ('FONTNAME', (0, 0), (0, -1), 'Arial-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('TEXTCOLOR', (1, 1), (1, 1), risk_color),
        ('FONTNAME', (1, 1), (1, 2), 'Arial-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
    ]))
    elems.append(summary_table)

    elems.append(Paragraph('Top yếu tố ảnh hưởng (SHAP)', h2_style))
    shap_rows = [['Chỉ số', 'Mức tác động', 'Chiều']]
    for s in data.get('shap_top5', []):
        direction = 'Tăng rủi ro' if s['direction'] == 'tang_rui_ro' else 'Giảm rủi ro'
        shap_rows.append([s['feature'], f"{s['impact']:+.3f}", direction])
    shap_table = Table(shap_rows, colWidths=[60 * mm, 40 * mm, 50 * mm])
    shap_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Arial-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'Arial'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1B2A4A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#e2e8f0')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    elems.append(shap_table)

    if data.get('benchmark'):
        elems.append(Paragraph(f"So sánh với trung vị ngành \"{data['benchmark']['nganh']}\"", h2_style))
        b_rows = [['Chỉ số', 'Doanh nghiệp', 'Trung vị ngành']]
        for key, label in data['benchmark']['rows']:
            b_rows.append([label, str(key[0]), str(key[1])])
        b_table = Table(b_rows, colWidths=[60 * mm, 45 * mm, 45 * mm])
        b_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Arial-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Arial'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1B2A4A')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#e2e8f0')),
        ]))
        elems.append(b_table)

    if data.get('ai_comment'):
        elems.append(Paragraph('Nhận định AI Credit Analyst', h2_style))
        elems.append(Paragraph(data['ai_comment'].replace('\n', '<br/>'), normal))

    elems.append(Spacer(1, 16))
    elems.append(Paragraph('Báo cáo tạo tự động bởi PD Scoring Dashboard — chỉ mang tính tham khảo, không thay thế thẩm định tín dụng đầy đủ.', small))

    doc.build(elems)
    return buf.getvalue()
