#!/usr/bin/env python3
"""Apply or verify the curated country attribution of imported reference cards."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REFERENCE_PATH = ROOT / "src/data/items/reference.ts"
OVERRIDES_PATH = ROOT / "scripts/reference_country_overrides.json"
PREFIX = (
    "import type { TimelineItem } from '../../types';\n\n"
    "/** Events present in the supplied 2025 reference but absent from the authored base. */\n"
    "export const referenceItems: TimelineItem[] = "
)


def load_items() -> list[dict[str, object]]:
    source = REFERENCE_PATH.read_text(encoding="utf-8")
    start = source.index("= [") + 2
    return json.loads(source[start : source.rindex("]") + 1])


def main() -> None:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true", help="fail if generated data differs")
    mode.add_argument("--write", action="store_true", help="update generated data")
    args = parser.parse_args()

    items = load_items()
    overrides: dict[str, str] = json.loads(OVERRIDES_PATH.read_text(encoding="utf-8"))
    by_id = {str(item["id"]): item for item in items}
    missing = sorted(set(overrides) - set(by_id))
    if missing:
        raise SystemExit("Unknown reference ids in attribution overrides: " + ", ".join(missing))

    changed: list[tuple[str, str, str]] = []
    for identifier, country in overrides.items():
        item = by_id[identifier]
        current = str(item["country"])
        if current == country:
            continue
        changed.append((identifier, current, country))
        item["country"] = country

        tags = [str(tag) for tag in item.get("tags", [])]
        tags = [tag for tag in tags if tag != "всемирная история"]
        if country == "world" and "международные отношения" not in tags:
            tags.append("всемирная история")
        item["tags"] = tags[:4]

    if args.check:
        if changed:
            for identifier, current, expected in changed:
                print(f"{identifier}: {current} -> {expected}")
            raise SystemExit(f"Reference attribution is stale: {len(changed)} change(s) required")
        print(f"Reference attribution is current: {len(overrides)} audited override(s)")
        return

    REFERENCE_PATH.write_text(
        PREFIX + json.dumps(items, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    print(f"Updated {len(changed)} reference attribution(s)")


if __name__ == "__main__":
    main()
