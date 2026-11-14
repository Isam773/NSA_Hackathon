
from pathlib import Path
from urllib.request import urlopen
from urllib.error import HTTPError, URLError
from io import BytesIO
from PIL import Image

# NASA south-pole dataset
BASE_URL = (
    "https://trek.nasa.gov/tiles/Moon/NP/"
    "LRO_WAC_Mosaic_NPole60_100mp/1.0.0/"
    "default/default028mm"
)

ZOOM = 2
COLUMNS = 8
ROWS = 4
TILE_SIZE = 256

# Save inside CALLUNA's public folder
OUTPUT = Path("public/textures/moon-north-pole.png")

# Transparent image covering the entire tile grid
mosaic = Image.new(
    "RGBA",
    (COLUMNS * TILE_SIZE, ROWS * TILE_SIZE),
    (0, 0, 0, 0)
)

downloaded = 0
missing = 0

for row in range(ROWS):
    for col in range(COLUMNS):
        url = f"{BASE_URL}/{ZOOM}/{row}/{col}.png"

        print(f"Downloading row {row}, column {col}...")

        try:
            with urlopen(url, timeout=15) as response:
                image_data = response.read()

            tile = Image.open(BytesIO(image_data))
            tile = tile.convert("RGBA")

            # Position the tile in the full mosaic
            x = col * TILE_SIZE
            y = row * TILE_SIZE

            mosaic.paste(tile, (x, y))
            downloaded += 1

        except HTTPError as error:
            if error.code == 404:
                print("  Tile unavailable (404)")
                missing += 1
            else:
                raise

        except URLError as error:
            print(f"  Network error: {error}")
            missing += 1

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
mosaic.save(OUTPUT)

print()
print("Finished!")
print(f"Downloaded: {downloaded}")
print(f"Missing or failed: {missing}")
print(f"Saved to: {OUTPUT}")
print(f"Image size: {mosaic.width} x {mosaic.height}")
