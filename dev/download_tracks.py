import urllib.request
import re
import json
import os

TRACKS_TO_DOWNLOAD = {
    "Spa-Francorchamps": 165,
    "Nürburgring GP": 164, # Guessing ID, but we only need Spa for now
    "Monza": 149
}

BASE_URL = "https://raw.githubusercontent.com/iTelemetry/iracing-tracks/main/svgs/{}.svg"
OUTPUT_FILE = os.path.join("frontend", "src", "assets", "track_paths.json")

def extract_path(svg_text):
    # Find the <path class="track-surface" d="...">
    match = re.search(r'<path[^>]*class="track-surface"[^>]*d="([^"]+)"', svg_text)
    if match:
        return match.group(1)
    
    # Fallback to any path if no class
    match = re.search(r'<path[^>]*d="([^"]+)"', svg_text)
    if match:
        return match.group(1)
    
    return None

def main():
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    paths = {}
    
    for name, track_id in TRACKS_TO_DOWNLOAD.items():
        url = BASE_URL.format(track_id)
        print(f"Downloading {name} (ID: {track_id})...")
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                svg_content = response.read().decode('utf-8')
                path_d = extract_path(svg_content)
                if path_d:
                    paths[name] = path_d
                    print(f"  -> Successfully extracted path for {name}")
                else:
                    print(f"  -> Could not find <path> in SVG for {name}")
        except Exception as e:
            print(f"  -> Error downloading {name}: {e}")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(paths, f, indent=2)
    print(f"\nSaved paths to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
