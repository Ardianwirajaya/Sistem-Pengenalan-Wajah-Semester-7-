import os
from collections import deque
import cv2
import numpy as np
from ultralytics import YOLO
from deepface import DeepFace


class SistemWajahTrainFolder:
    def __init__(self, model_path, folder_train="train", threshold=0.80, max_foto_per_orang=None):
        print(f"[INFO] Memuat model YOLOv11 dari: {model_path}")
        self.yolo_model = YOLO(model_path)
        self.folder_train = folder_train
        self.threshold = threshold
        self.max_foto_per_orang = max_foto_per_orang  # None = ambil semua foto di subfolder
        # Format: { "NamaOrang": [vec1_norm, vec2_norm, ...] }
        self.database_wajah = {}
        self.muat_dari_subfolder_train()

    def _ekstrak_norm_embedding(self, img_input):
        """Mengekstrak embedding ArcFace dan menormalisasinya (L2 norm)."""
        obj = DeepFace.represent(
            img_path=img_input,
            model_name="ArcFace",
            enforce_detection=False
        )
        if not obj or "embedding" not in obj[0]:
            return None

        vec = np.array(obj[0]["embedding"], dtype=np.float32)
        norm = np.linalg.norm(vec)
        if norm == 0:
            return None
        return vec / norm

    def muat_dari_subfolder_train(self):
        """
        Membaca seluruh subfolder nama orang di dalam folder 'train' (mengabaikan 'images' dan 'labels')
        dan menyimpan embedding dari foto-foto di dalamnya.
        """
        if not os.path.exists(self.folder_train):
            print(f"[ERROR] Folder '{self.folder_train}' tidak ditemukan.")
            return

        folder_diabaikan = {"images", "labels", "__pycache__"}
        format_valid = (".jpg", ".jpeg", ".png", ".webp")

        print(f"[INFO] Memindai subfolder orang di dalam '{self.folder_train}'...")
        jumlah_orang = 0

        for item in sorted(os.listdir(self.folder_train)):
            if item in folder_diabaikan:
                continue

            path_orang = os.path.join(self.folder_train, item)
            if not os.path.isdir(path_orang):
                continue

            nama_orang = item
            vectors_orang = []

            for file_foto in sorted(os.listdir(path_orang)):
                if not file_foto.lower().endswith(format_valid):
                    continue

                path_foto = os.path.join(path_orang, file_foto)
                try:
                    norm_vec = self._ekstrak_norm_embedding(path_foto)
                    if norm_vec is not None:
                        vectors_orang.append(norm_vec)
                        if self.max_foto_per_orang is not None and len(vectors_orang) >= self.max_foto_per_orang:
                            break
                except Exception:
                    continue

            if vectors_orang:
                self.database_wajah[nama_orang] = vectors_orang
                print(f"  [SUKSES] {nama_orang}: {len(vectors_orang)} embedding dimuat")
                jumlah_orang += 1
            else:
                print(f"  [PERINGATAN] Tidak ada foto valid untuk '{nama_orang}'.")

        print(f"[INFO] Total {jumlah_orang} nama berhasil dimuat ke database.\n")

    def cari_nama_terdekat(self, query_vector):
        """
        Mencocokkan embedding wajah di kamera dengan seluruh embedding di database.
        Mengambil jarak cosine terkecil (kemiripan tertinggi) untuk tiap orang.
        """
        if not self.database_wajah:
            return "Unknown", 0.0, False

        q_vec = np.array(query_vector, dtype=np.float32)
        q_norm = np.linalg.norm(q_vec)
        if q_norm == 0:
            return "Unknown", 0.0, False
        q_vec = q_vec / q_norm

        best_match = "Unknown"
        min_dist = float("inf")

        for nama, list_db_vector in self.database_wajah.items():
            for db_vector in list_db_vector:
                sim = float(np.dot(q_vec, db_vector))
                dist = 1.0 - sim
                if dist < min_dist:
                    min_dist = dist
                    best_match = nama

        similarity = max(0.0, 1.0 - min_dist)
        if min_dist < self.threshold:
            return best_match, similarity, True
        return f"Unknown ({best_match})", similarity, False

    def jalankan_kamera(self, padding=25, riwayat_frame=6, proses_tiap_n_frame=3):
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            print("[ERROR] Kamera tidak dapat diakses.")
            return

        print("[INFO] Kamera aktif! Posisikan wajah dengan jelas di tengah frame. Tekan 'q' untuk keluar.")
        riwayat_label = deque(maxlen=riwayat_frame)
        counter_frame = 0

        teks_tampil = "Unknown"
        warna_box = (0, 0, 255)

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            counter_frame += 1
            jalankan_arcface = (counter_frame % proses_tiap_n_frame == 0)

            # Fokus ke 1 bounding box terbaik agar tidak tumpang tindih
            results = self.yolo_model(frame, conf=0.65, iou=0.3, verbose=False)

            ada_wajah = False
            for r in results:
                boxes = r.boxes
                if len(boxes) > 0:
                    ada_wajah = True
                    best_box = max(boxes, key=lambda b: float(b.conf[0]))
                    x1, y1, x2, y2 = map(int, best_box.xyxy[0])

                    h, w, _ = frame.shape
                    x1 = max(0, x1)
                    y1 = max(0, y1)
                    x2 = min(w, x2)
                    y2 = min(h, y2)

                    x1_pad = max(0, x1 - padding)
                    y1_pad = max(0, y1 - padding)
                    x2_pad = min(w, x2 + padding)
                    y2_pad = min(h, y2 + padding)

                    wajah_crop = frame[y1_pad:y2_pad, x1_pad:x2_pad]

                    if jalankan_arcface and wajah_crop.size > 0:
                        try:
                            query_vector = self._ekstrak_norm_embedding(wajah_crop)
                            if query_vector is not None:
                                label_nama, skor, dikenali = self.cari_nama_terdekat(query_vector)
                                teks_mentah = f"{label_nama} ({skor:.2f})"
                                riwayat_label.append((teks_mentah, dikenali))
                        except Exception:
                            riwayat_label.append(("Processing...", False))

                    if riwayat_label:
                        teks_list = [item[0] for item in riwayat_label]
                        teks_tampil = max(set(teks_list), key=teks_list.count)
                        dikenali_stabil = any(
                            item[1] for item in riwayat_label if item[0] == teks_tampil
                        )
                        warna_box = (0, 255, 0) if dikenali_stabil else (0, 0, 255)

                    cv2.rectangle(frame, (x1, y1), (x2, y2), warna_box, 2)
                    text_y = y1 - 10 if y1 - 10 > 20 else y1 + 25
                    cv2.putText(
                        frame, teks_tampil, (x1, text_y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.65, warna_box, 2
                    )
                    break

            if not ada_wajah:
                riwayat_label.clear()
                teks_tampil = "Unknown"
                warna_box = (0, 0, 255)

            cv2.imshow("YOLOv11 + ArcFace", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    model_best_path = "runs/detect/model_wajah_roboflow/weights/best.pt"
    sistem = SistemWajahTrainFolder(
        model_path=model_best_path,
        folder_train="train",
        threshold=0.80,
        max_foto_per_orang=None
    )
    sistem.jalankan_kamera(
        padding=25,
        riwayat_frame=6,
        proses_tiap_n_frame=3
    )