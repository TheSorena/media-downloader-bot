import sys, io, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import urllib.request

req = urllib.request.Request(
    "https://api.render.com/v1/services/srv-d8vpebegvqtc738pjil0/deploys?limit=3",
    headers={"Authorization": "Bearer rnd_c40piJLOMoeMqaHbq8htyRNGmBQr"}
)
resp = urllib.request.urlopen(req)
data = json.loads(resp.read())
for d in data:
    dd = d["deploy"]
    commit_msg = dd["commit"]["message"].split("\n")[0][:60]
    print(f"{dd['id']}: {dd['status']} | {commit_msg}")
