from PIL import Image
import numpy as np
import os

SRC = "src/assets/playnivo-icon.png"  # Playnivo navy square app icon (1024x1024)
base = "android/app/src/main/res"

img = Image.open(SRC).convert("RGBA")
bgc = np.array(img[:20, :20]).astype(np.float32)[..., :3].reshape(-1, 3).mean(axis=0)

# chroma-key the navy background out of the emblem for adaptive foreground
arr = np.array(img).astype(np.float32)
d = np.sqrt(((arr[..., :3] - bgc) ** 2).sum(axis=-1))
arr[..., 3] = np.clip((d - 18.0) / (55.0 - 18.0), 0, 1) * 255
emblem = Image.fromarray(arr.astype(np.uint8))

fg = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
e = emblem.resize((614, 614), Image.Resampling.LANCZOS)
fg.paste(e, ((1024 - 614) // 2, (1024 - 614) // 2), e)

launcher = Image.new("RGBA", (1024, 1024), (int(bgc[0]), int(bgc[1]), int(bgc[2]), 255))
launcher.paste(e, ((1024 - 614) // 2, (1024 - 614) // 2), e)

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
    img.resize((size, size), Image.Resampling.LANCZOS).save(os.path.join(path, "ic_launcher.png"))
    img.resize((size, size), Image.Resampling.LANCZOS).save(os.path.join(path, "ic_launcher_round.png"))
    fg.resize((size, size), Image.Resampling.LANCZOS).save(os.path.join(path, "ic_launcher_foreground.png"))

print("Playnivo icons updated successfully!")
