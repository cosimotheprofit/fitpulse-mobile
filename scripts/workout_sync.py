#!/usr/bin/env python3
"""
Antigravity Workout Sync Tool
Push planned routines to your phone, and pull completed gym logs and analytics.
"""

import sys
import os
import json
import argparse
import urllib.request
import urllib.error

DEFAULT_URL = os.environ.get("WORKOUT_APP_URL", "http://localhost:3000")
DEFAULT_SECRET = os.environ.get("API_SECRET", "")

def make_request(endpoint: str, method: str = "GET", data: dict = None, url_base: str = DEFAULT_URL, secret: str = DEFAULT_SECRET):
    url = f"{url_base.rstrip('/')}{endpoint}"
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Antigravity-WorkoutSync/1.0"
    }
    if secret:
        headers["x-api-key"] = secret
        headers["Authorization"] = f"Bearer {secret}"

    req_data = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(err_body)
            print(f"❌ Server Error ({e.code}): {parsed.get('error', err_body)}", file=sys.stderr)
        except Exception:
            print(f"❌ Server Error ({e.code}): {err_body}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"❌ Connection Error: Could not connect to {url_base}. ({e.reason})", file=sys.stderr)
        print("💡 Ensure the Next.js app or cloud deployment is running.", file=sys.stderr)
        sys.exit(1)

def push_workout(args):
    if args.file:
        with open(args.file, "r") as f:
            payload = json.load(f)
    elif args.json:
        payload = json.loads(args.json)
    else:
        print("❌ Error: Must specify either --file <path> or --json '<json>'", file=sys.stderr)
        sys.exit(1)

    result = make_request("/api/workout/push", method="POST", data=payload, url_base=args.url, secret=args.secret)
    print("========================================")
    print("  🚀 WORKOUT PUSHED TO PHONE APP")
    print("========================================")
    print(f" Title:        {payload.get('title')}")
    print(f" Date:         {result.get('date')}")
    print(f" Workout ID:   {result.get('workout_id')}")
    print(f" Exercises:    {result.get('exercise_count')}")
    print("----------------------------------------")
    print("✅ Ready! Open the app on your phone at the gym to start logging sets.")

def pull_workout(args):
    query_params = []
    if args.workout_id:
        query_params.append(f"workout_id={args.workout_id}")
    if args.date:
        query_params.append(f"date={args.date}")
    
    endpoint = "/api/workout/pull"
    if query_params:
        endpoint += "?" + "&".join(query_params)

    result = make_request(endpoint, method="GET", url_base=args.url, secret=args.secret)
    workout = result.get("workout")

    if not workout:
        print("ℹ️ No workouts found.")
        return

    if args.raw:
        print(json.dumps(workout, indent=2))
        return

    print("==================================================")
    print(f"  📊 WORKOUT RESULTS: {workout['title'].upper()}")
    print("==================================================")
    print(f" Date:          {workout['date']}")
    print(f" Status:        {workout['status'].upper()}")
    print(f" Completed At:  {workout.get('completed_at') or 'In Progress'}")
    if workout.get("notes"):
        print(f" Notes:         {workout['notes']}")
    print("--------------------------------------------------")
    summary = workout.get("summary", {})
    print(f" Total Volume:  {summary.get('total_volume_lbs', 0):,} lbs")
    print(f" Sets Logged:   {summary.get('completed_sets', 0)} completed sets")
    print(f" Exercises:     {summary.get('total_exercises', 0)}")
    print("==================================================")

    exercises = workout.get("exercises", {})
    for ex_name, ex_data in exercises.items():
        max_wt = ex_data.get("max_weight", 0)
        e1rm = ex_data.get("best_estimated_1rm", 0)
        vol = ex_data.get("total_volume", 0)
        print(f"\n🏋️  {ex_name}")
        print(f"    Volume: {vol:,} lbs | Max: {max_wt} lbs | Est 1RM: {e1rm} lbs")
        print("    " + "-" * 42)
        print("    Set   Weight     Reps    Done   Volume")
        for s in ex_data.get("sets", []):
            done_mark = "✅" if s["completed"] else "❌"
            print(f"    #{s['set_number']:<4} {s['weight']:>5} lbs   {s['reps']:>4}    {done_mark}   {s['volume']:>6} lbs")

    print("\n")

def main():
    parser = argparse.ArgumentParser(description="Antigravity Workout Sync (Push & Pull)")
    parser.add_argument("--url", default=DEFAULT_URL, help=f"Base URL of mobile app (default: {DEFAULT_URL})")
    parser.add_argument("--secret", default=DEFAULT_SECRET, help="API Secret key if configured")

    subparsers = parser.add_subparsers(dest="command", required=True)

    # Push command
    push_parser = subparsers.add_parser("push", help="Push a planned workout routine to the app")
    push_parser.add_argument("--file", "-f", help="Path to workout JSON file")
    push_parser.add_argument("--json", "-j", help="Inline JSON string")

    # Pull command
    pull_parser = subparsers.add_parser("pull", help="Pull completed workout results and stats")
    pull_parser.add_argument("--workout-id", type=int, help="Specific workout ID to pull")
    pull_parser.add_argument("--date", help="Specific date (YYYY-MM-DD)")
    pull_parser.add_argument("--raw", action="store_true", help="Output raw JSON format")

    args = parser.parse_args()

    if args.command == "push":
        push_workout(args)
    elif args.command == "pull":
        pull_workout(args)

if __name__ == "__main__":
    main()
