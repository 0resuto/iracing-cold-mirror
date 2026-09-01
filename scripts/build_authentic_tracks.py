import json
import math
from pathlib import Path

TRACKS_DIR = Path("data/tracks")


def generate_normalized_svg_path(
    coords: list[dict], width: float = 100.0, height: float = 100.0, padding: float = 8.0
) -> str:
    if not coords or len(coords) < 3:
        return ""

    avg_lat = sum(p["lat"] for p in coords) / len(coords)
    lon_scale = math.cos(math.radians(avg_lat))

    projected = [(p["lon"] * lon_scale, p["lat"]) for p in coords]

    min_x = min(p[0] for p in projected)
    max_x = max(p[0] for p in projected)
    min_y = min(p[1] for p in projected)
    max_y = max(p[1] for p in projected)

    span_x = max(max_x - min_x, 1e-6)
    span_y = max(max_y - min_y, 1e-6)

    avail_w = width - padding * 2
    avail_h = height - padding * 2

    scale = min(avail_w / span_x, avail_h / span_y)
    off_x = (width - span_x * scale) / 2
    off_y = (height - span_y * scale) / 2

    screen_pts = []
    for x, y in projected:
        sx = round((x - min_x) * scale + off_x, 2)
        sy = round(height - ((y - min_y) * scale + off_y), 2)
        screen_pts.append((sx, sy))

    n = len(screen_pts)
    if n < 3:
        return ""

    d = [f"M {screen_pts[0][0]} {screen_pts[0][1]}"]
    for i in range(n):
        p0 = screen_pts[(i - 1 + n) % n]
        p1 = screen_pts[i]
        p2 = screen_pts[(i + 1) % n]
        p3 = screen_pts[(i + 2) % n]

        c1x = round(p1[0] + (p2[0] - p0[0]) / 6, 2)
        c1y = round(p1[1] + (p2[1] - p0[1]) / 6, 2)
        c2x = round(p2[0] - (p3[0] - p1[0]) / 6, 2)
        c2y = round(p2[1] - (p3[1] - p1[1]) / 6, 2)

        d.append(f"C {c1x} {c1y}, {c2x} {c2y}, {p2[0]} {p2[1]}")

    d.append("Z")
    return " ".join(d)


# Bounding boxes for OSM Overpass extraction of authentic raceways
OSM_TRACK_BOUNDS = {
    "cadwell_full": (53.308, -0.065, 53.315, -0.052),
    "knockhill_intl": (56.128, -3.510, 56.135, -3.495),
    "snetterton_300": (52.460, 0.940, 52.470, 0.955),
    "donington_gp": (52.825, -1.385, 52.835, -1.370),
    "brands_hatch_gp": (51.352, 0.255, 51.362, 0.270),
    "monza_gp": (45.615, 9.275, 45.630, 9.295),
    "spa_gp": (50.430, 5.960, 50.450, 5.985),
    "silverstone_gp": (52.065, -1.025, 52.078, -1.008),
    "suzuka_gp": (34.840, 136.530, 34.850, 136.545),
    "redbull_ring_gp": (47.218, 14.760, 47.228, 14.770),
    "interlagos_gp": (-23.705, -46.700, -23.695, -46.690),
    "hungaroring_gp": (47.580, 19.245, 47.586, 19.255),
    "zandvoort_gp": (52.385, 4.535, 52.392, 4.545),
    "cota_gp": (30.130, -97.645, 30.140, -97.630),
    "barcelona_gp": (41.565, 2.255, 41.575, 2.265),
    "imola_gp": (44.340, 11.710, 44.347, 11.720),
    "hockenheim_gp": (49.325, 8.560, 49.333, 8.575),
    "laguna_seca_full": (36.580, -121.758, 36.588, -121.750),
    "limerock_gp": (41.925, -73.389, 41.933, -73.380),
    "road_america_full": (43.795, -87.995, 43.810, -87.980),
    "road_atlanta_full": (34.145, -83.820, 34.155, -83.810),
    "vir_full": (36.555, -79.210, 36.565, -79.200),
    "watkins_glen_full": (42.330, -76.930, 42.342, -76.920),
    "daytona_road": (29.180, -81.075, 29.190, -81.060),
    "sebring_intl": (27.450, -81.355, 27.460, -81.340),
    "lemans_24h": (47.930, 0.200, 47.960, 0.250),
    "bathurst_mount_panorama": (-33.460, 149.545, -33.445, 149.560),
    "jerez_gp": (36.705, -6.035, 36.713, -6.025),
    "aragon_gp": (41.075, -0.210, 41.085, -0.198),
    "algarve_gp": (37.225, -8.635, 37.235, -8.625),
    "misano_gp": (43.958, 12.680, 43.965, 12.690),
    "mugello_gp": (43.995, 11.365, 44.005, 11.378),
    "magnycours_gp": (46.860, 3.160, 46.867, 3.170),
    "rudskogen": (59.365, 11.255, 59.375, 11.265),
    "sachsenring": (50.788, 12.685, 50.795, 12.695),
    "longbeach": (33.760, -118.195, 33.768, -118.188),
    "belleisle": (42.335, -82.975, 42.342, -82.965),
    "fuji_gp": (35.368, 138.922, 35.375, 138.932),
    "okayama_full": (34.912, 134.218, 34.920, 134.225),
    "oschersleben_gp": (52.025, 11.275, 52.032, 11.285),
    "indianapolis_road": (39.790, -86.240, 39.800, -86.230),
    "nurburgring_nordschleife": (50.330, 6.940, 50.380, 7.010),
}

# Process each track JSON file
updated_count = 0
for json_file in sorted(TRACKS_DIR.glob("*.json")):
    track_slug = json_file.stem
    with open(json_file, "r", encoding="utf-8") as f:
        track = json.load(f)

    centerline = track.get("centerline", [])

    # Generate normalized svg_path from existing clean centerline or compute it
    if centerline and len(centerline) >= 3:
        track["svg_path"] = generate_normalized_svg_path(centerline)
        track["track_width_m"] = track.get("track_width_m", 12.0)

        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(track, f, indent=2, ensure_ascii=False)

        updated_count += 1
        print(
            f"[{updated_count}/43] {track_slug}: svg_path generated ({len(track['svg_path'])} chars, {len(centerline)} nodes)"
        )

print(f"\nCompleted authentic SVG path precomputation for all {updated_count} tracks!")
