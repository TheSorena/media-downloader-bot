import sys, io, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import urllib.request

# Get deploy events
deploy_id = "dep-d90fnirrjlhs73crsvlg"
req = urllib.request.Request(
    f"https://api.render.com/v1/services/srv-d8vpebegvqtc738pjil0/deploys/{deploy_id}",
    headers={"Authorization": "Bearer rnd_c40piJLOMoeMqaHbq8htyRNGmBQr"}
)
try:
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read())
    print(json.dumps(data, indent=2))
except Exception as e:
    print(f"Error: {e}")
