from ultralytics import YOLO

def training_yolo():
    print("[INFO] Memuat model dasar YOLOv11 (yolo11n.pt)...")
    # Model dasar YOLOv11 memerlukan fine-tuning dengan dataset wajah Anda
    model = YOLO("yolo11n.pt")

    print("[INFO] Memulai training dengan dataset Roboflow...")
    results = model.train(
        data="data.yaml",
        epochs=30,
        imgsz=640,
        batch=16,
        device="cpu", # Ganti ke 0 jika menggunakan GPU NVIDIA
        name="model_wajah_roboflow"
    )
    print("[INFO] Selesai! Model terbaik tersimpan di: runs/detect/model_wajah_roboflow/weights/best.pt")

if __name__ == "__main__":
    training_yolo()