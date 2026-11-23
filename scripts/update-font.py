# /// script
# dependencies = ["fonttools", "brotli"]
# ///
"""Refresh the site's Song font after adding interface or community text."""

from io import BytesIO
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen
import json

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont


root = Path(__file__).resolve().parents[1]
fonts = root / "public/fonts"
records = json.loads((root / "src/data/records.json").read_text())
community_chars = set("".join(record["community"] for record in records))
source_files = sorted((root / "src").rglob("*.jsx")) + sorted((root / "src").rglob("*.js"))
site_text = "".join(path.read_text() for path in source_files + [root / "index.html"])
dataset_text = "".join(
    value for record in records for value in record.values() if isinstance(value, str)
)
chars = "".join(sorted({char for char in site_text + dataset_text if char.isprintable()}))
source = "https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifsc/" + quote("NotoSerifSC[wght].ttf")
license_url = "https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifsc/OFL.txt"
cached_source = root / ".cache/fonts/NotoSerifSC.ttf"


def get(url):
    return urlopen(Request(url, headers={"User-Agent": "residential-index-font-builder"}), timeout=45).read()


if not cached_source.is_file():
    cached_source.parent.mkdir(parents=True, exist_ok=True)
    cached_source.write_bytes(get(source))
font = TTFont(cached_source)
font = instantiateVariableFont(font, {"wght": (400, 600)})
subsetter = subset.Subsetter()
subsetter.populate(text=chars)
subsetter.subset(font)
font.flavor = "woff2"
buffer = BytesIO()
font.save(buffer)
data = buffer.getvalue()
saved_font = TTFont(BytesIO(data))
missing = community_chars.difference(map(chr, saved_font.getBestCmap()))
if missing:
    raise ValueError(f"Community characters missing from generated font: {''.join(sorted(missing))}")

name = "index-serif-400-600.woff2"
if not (fonts / "OFL.txt").is_file():
    (fonts / "OFL.txt").write_bytes(get(license_url))
(fonts / name).write_bytes(data)
(fonts / "fonts.css").write_text(f"""@font-face {{
  font-family: 'Index Serif';
  font-style: normal;
  font-weight: 400 600;
  font-display: swap;
  src: url(/fonts/{name}) format('woff2');
}}
""")
print(f"Font covers all {len(community_chars)} distinct community characters. WOFF2 size: {len(data):,} bytes.")
