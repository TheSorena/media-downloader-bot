import os
import time
from config import DOWNLOAD_DIR


def cleanup_temp_directory(max_age_seconds: int = 3600):
    if not os.path.exists(DOWNLOAD_DIR):
        return
    now = time.time()
    for filename in os.listdir(DOWNLOAD_DIR):
        filepath = os.path.join(DOWNLOAD_DIR, filename)
        if os.path.isfile(filepath):
            file_age = now - os.path.getmtime(filepath)
            if file_age > max_age_seconds:
                try:
                    os.remove(filepath)
                except OSError:
                    pass
