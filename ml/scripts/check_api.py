import requests

resp = requests.get("http://localhost:8001/openapi.json")
data = resp.json()
print("AI 服务可用端点:")
for path in sorted(data.get('paths', {}).keys()):
    methods = list(data['paths'][path].keys())
    print(f"  {path}: {methods}")
