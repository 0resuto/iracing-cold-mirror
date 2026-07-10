import urllib.request
import json

url = "https://raw.githubusercontent.com/Lovely-Sim-Racing/lovely-track-data/main/data/iracing/165.json"
try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print(f"Loaded track JSON")
        print(json.dumps(data, indent=2)[:1000])
except Exception as e:
    print("Error:", e)
