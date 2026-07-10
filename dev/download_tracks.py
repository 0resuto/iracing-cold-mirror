import urllib.request
import re
import json
import os
import concurrent.futures

BASE_URL = "https://raw.githubusercontent.com/iTelemetry/iracing-tracks/main/svgs/{}.svg"
OUTPUT_FILE = os.path.join("frontend", "src", "assets", "track_paths.json")

def extract_path(svg_text):
    match = re.search(r'<path[^>]*class="track-surface"[^>]*d="([^"]+)"', svg_text)
    if match: return match.group(1)
    match = re.search(r'<path[^>]*d="([^"]+)"', svg_text)
    if match: return match.group(1)
    return None

def download_track(track_id):
    url = BASE_URL.format(track_id)
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            svg_content = response.read().decode('utf-8')
            path_d = extract_path(svg_content)
            if path_d:
                return str(track_id), path_d
    except:
        pass
    return None, None

def main():
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    paths = {}
    
    print("Fetching list of all SVGs from iTelemetry repository...")
    try:
        req = urllib.request.Request('https://api.github.com/repos/iTelemetry/iracing-tracks/contents/svgs', headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            track_ids = []
            for item in data:
                name = item.get('name', '')
                if name.endswith('.svg'):
                    track_ids.append(name.replace('.svg', ''))
    except Exception as e:
        print("Failed to fetch track list:", e)
        return

    print(f"Found {len(track_ids)} tracks. Downloading in parallel...")
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        results = executor.map(download_track, track_ids)
        for track_id, path_d in results:
            if track_id:
                paths[track_id] = path_d
                
    print(f"Successfully downloaded {len(paths)} track paths.")
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(paths, f, indent=2)
    print(f"Saved paths to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
