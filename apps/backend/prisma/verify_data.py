import urllib.request
import json

url = 'http://127.0.0.1:3001/api/v1/clothing?limit=5'
try:
    with urllib.request.urlopen(url) as response:
        data = json.loads(response.read().decode())
        print(f'Total: {data.get("total", 0)} items')
        for item in data.get('items', [])[:5]:
            print(f'  - {item["name"][:50]} ({item["category"]})')
except Exception as e:
    print(f'Error: {e}')
