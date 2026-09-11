from PIL import Image
import os

src = "cricmaster-icon.png"
base = "android/app/src/main/res"

img = Image.open(src).convert("RGBA")

sizes = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

for folder, size in sizes.items():
    path = os.path.join(base, folder)
    os.makedirs(path, exist_ok=True)

    icon = img.resize((size, size), Image.Resampling.LANCZOS)

    icon.save(os.path.join(path, "ic_launcher.png"))
    icon.save(os.path.join(path, "ic_launcher_round.png"))
    icon.save(os.path.join(path, "ic_launcher_foreground.png"))

print("CRIC MASTER icons updated successfully!")
