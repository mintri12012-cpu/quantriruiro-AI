# PD Scoring Dashboard — Quản trị rủi ro AI

Hệ thống đánh giá xác suất vỡ nợ (PD) cho doanh nghiệp SME tại Việt Nam, dùng XGBoost + SHAP, dữ liệu thật qua `vnstock`, kết hợp AI Chatbot (Gemini) và các công cụ quản trị rủi ro (Stress Test, Expected Loss/VaR, Concentration risk, Heat Map, Radar so sánh...).

## Yêu cầu

- Python 3.10+ (đã test trên 3.14)
- Node.js 18+ (đã test trên 24)
- Gemini API key (lấy free tại https://aistudio.google.com/apikey)

## Cài đặt

```bash
git clone https://github.com/mintri12012-cpu/quantriruiro-AI.git
cd quantriruiro-AI

# 1. Cài Python dependencies
pip install -r requirements.txt

# 2. Build frontend
cd frontend
npm install
npm run build
cd ..
```

## Cấu hình API key

```powershell
# Windows PowerShell
$env:GEMINI_API_KEY = "your-key-here"

# macOS/Linux
export GEMINI_API_KEY="your-key-here"
```

## Chạy ứng dụng

```bash
cd backend
uvicorn main:app --host 127.0.0.1 --port 8123
```

Mở trình duyệt tại **http://127.0.0.1:8123**

## (Tùy chọn) Tái tạo dữ liệu & model từ đầu

Repo đã kèm sẵn `data/du_lieu.csv` và `models/*.pkl` nên có thể chạy ngay không cần làm lại bước này. Nếu muốn fetch dữ liệu mới / train lại:

```bash
python fetch_vnstock_data.py      # lấy dữ liệu BCTC thật qua vnstock (70 mã, ~10-15 phút do rate limit)
python feature_engineering.py     # tính 15 features + label
python prepare_data.py            # train/test split + scaler
python train_models.py            # train XGBoost + SHAP
python test_inference.py          # smoke test
```

## Cấu trúc project

```
backend/main.py          FastAPI server (API + serve frontend build)
frontend/                React + Vite + Tailwind
models/                  pd_model.pkl, scaler.pkl, features.pkl
data/                    du_lieu.csv, raw_vnstock.csv, risk_status.json
fetch_vnstock_data.py    Lấy dữ liệu thật qua vnstock
feature_engineering.py   Tính features + Altman-Z label
prepare_data.py          Train/test split + scaler
train_models.py          Train XGBoost + SHAP
update_scaler.py         Refit scaler không cần train lại model
test_inference.py        Smoke test pipeline
```

## Các trang chính

| Trang | Mô tả |
|---|---|
| `/` | Landing page |
| `/dashboard` | Nhập chỉ số → phân tích PD + SHAP + benchmark ngành |
| `/portfolio` | Danh mục toàn bộ doanh nghiệp |
| `/alerts` | Cảnh báo PD biến động đột ngột |
| `/risk-analytics` | Stress Test, Expected Loss/VaR, Concentration risk |
| `/overview` | Tổng quan: donut chart + bản đồ nhiệt (heat map) |
| `/approvals` | Phê duyệt / đóng / hủy hồ sơ rủi ro |
| `/documents` | Quản lý tài liệu theo doanh nghiệp |
| `/reports` | Xuất báo cáo CSV/Excel |
| `/compare` | Radar chart so sánh nhiều doanh nghiệp |
| `/demo` | Demo dẫn chuyện qua 3 doanh nghiệp mẫu |

Mỗi trang đều có chatbot AI nổi (góc dưới phải) hỗ trợ giải thích kết quả.
