import qrcode
from PIL import Image, ImageDraw, ImageFont
from fpdf import FPDF
import os

# === CONFIG ===
BASE_URL = "https://moving-boxes-ten.vercel.app/"
NUM_IDS = 49

# === Sizes in mm and px ===
BLOCK_MM = 40              # Full QR+label block = 4cm square
QR_MM = 30                 # QR only = 3cm square
LABEL_MM = 10              # Label area under QR
BORDER_WIDTH_PX = 3        # border thickness

# For 300 DPI: 1 mm ≈ 11.8 px → round to 12 px
MM_TO_PX = 12
QR_PX = QR_MM * MM_TO_PX
BLOCK_PX = BLOCK_MM * MM_TO_PX
LABEL_PX = BLOCK_PX - QR_PX

FONT_SIZE = 24
FONT_PATH = "/System/Library/Fonts/Supplemental/Arial.ttf"  # macOS; adjust if needed

# === Layout ===
LABELS_PER_ROW = 5
LABELS_PER_COL = 7
MARGIN_MM = 5

PAGE_WIDTH_MM = 210
PAGE_HEIGHT_MM = 297

OUTPUT_FOLDER = "qr_labels"
PDF_OUTPUT = "QR_Labels.pdf"

# === Generate Deterministic QR IDs ===
def generate_ids(n):
    return [f"b{i+1:06}" for i in range(n)]

# === Create a 40mm x 40mm block with 3cm QR + label + border ===
def create_label_block(qr_id):
    url = BASE_URL + qr_id
    qr_img = qrcode.make(url).resize((QR_PX, QR_PX))

    block = Image.new("RGB", (BLOCK_PX, BLOCK_PX), "white")
    draw = ImageDraw.Draw(block)

    # Paste QR top-centered
    qr_x = (BLOCK_PX - QR_PX) // 2
    qr_y = 0
    block.paste(qr_img, (qr_x, qr_y))

    # Draw label below QR, 5mm padding
    font = ImageFont.truetype(FONT_PATH, FONT_SIZE)
    bbox = draw.textbbox((0, 0), qr_id, font=font)
    text_width = bbox[2] - bbox[0]

    text_x = (BLOCK_PX - text_width) // 2
    text_y = QR_PX

    draw.text((text_x, text_y), qr_id, font=font, fill="black")

    path = os.path.join(OUTPUT_FOLDER, f"{qr_id}.png")
    block.save(path)
    return path

# === Main Execution ===
os.makedirs(OUTPUT_FOLDER, exist_ok=True)
ids = generate_ids(NUM_IDS)
label_paths = {qr_id: create_label_block(qr_id) for qr_id in ids}

pdf = FPDF(orientation="P", unit="mm", format="A4")
pdf.set_auto_page_break(False)

row = 0
pdf.add_page()

for qr_id in ids:
    if row >= LABELS_PER_COL:
        pdf.add_page()
        row = 0

    y = MARGIN_MM + row * BLOCK_MM
    for col in range(LABELS_PER_ROW):
        x = MARGIN_MM + col * BLOCK_MM
        pdf.image(label_paths[qr_id], x=x, y=y, w=BLOCK_MM, h=BLOCK_MM)
    row += 1

pdf.output(PDF_OUTPUT)
print(f"✅ Done. PDF saved: {PDF_OUTPUT} with {NUM_IDS * LABELS_PER_ROW} QR codes.")