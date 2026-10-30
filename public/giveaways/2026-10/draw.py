#!/usr/bin/env python3
"""DailyVAL 2026-10 giveaway draw. Standard library only.

Anyone can re-run it:
    python3 draw.py <drand-round>

1. Each pool is a CSV in pools/. Its SHA-256 was posted before the draw.
2. The random value is drand quicknet round <drand-round>, a public beacon
   produced every 3 s that nobody can predict in advance:
   https://api.drand.sh/52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971/public/<round>
3. Every entrant gets score = SHA-256("<randomness>|<pool>|<entrant_id>").
   Lowest scores win, the next ones are the alternates, in order.
4. Pools are drawn in the order of DRAWS. A pool with `skip_winners_of`
   passes over anyone who already won in those pools (one MyCard per person).
"""
import csv
import hashlib
import json
import sys
import urllib.request

CHAIN = "52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971"

DRAWS = [
    {"pool": "esports-rating", "winners": 3, "alternates": 5, "skip_winners_of": []},
    {"pool": "esports-comment", "winners": 3, "alternates": 5, "skip_winners_of": ["esports-rating"]},
    {"pool": "esports-threads", "winners": 1, "alternates": 5, "skip_winners_of": []},
    {"pool": "teamup-rooms", "winners": 1, "alternates": 3, "skip_winners_of": []},
]


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fetch_round(round_no: int) -> dict:
    url = f"https://api.drand.sh/{CHAIN}/public/{round_no}"
    with urllib.request.urlopen(url, timeout=20) as resp:
        beacon = json.load(resp)
    assert beacon["round"] == round_no, beacon
    return beacon


def load_pool(name: str):
    raw = open(f"pools/{name}.csv", "rb").read()
    rows = list(csv.DictReader(raw.decode("utf-8").splitlines()))
    return sha256_hex(raw), rows


def main() -> None:
    round_no = int(sys.argv[1])
    beacon = fetch_round(round_no)
    randomness = beacon["randomness"]
    result = {"drand_round": round_no, "randomness": randomness,
              "signature": beacon["signature"], "draws": []}
    won = {}
    for d in DRAWS:
        pool_hash, rows = load_pool(d["pool"])
        ranked = sorted(rows, key=lambda r: sha256_hex(f"{randomness}|{d['pool']}|{r['entrant_id']}".encode()))
        taken = {e for p in d["skip_winners_of"] for e in won[p]}
        picked, skipped = [], []
        for r in ranked:
            if len(picked) == d["winners"] + d["alternates"]:
                break
            if r["entrant_id"] in taken:
                skipped.append(r["entrant_id"])
                continue
            picked.append(r)
        won[d["pool"]] = [r["entrant_id"] for r in picked[:d["winners"]]]
        result["draws"].append({
            "pool": d["pool"], "pool_sha256": pool_hash, "entrants": len(rows),
            "winners": picked[:d["winners"]], "alternates": picked[d["winners"]:],
            "skipped_already_won": skipped,
        })
    json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
    print()


if __name__ == "__main__":
    main()
