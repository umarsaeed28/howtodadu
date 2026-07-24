"""CLI: run the server or a one-off feasibility from the terminal."""

from __future__ import annotations

import argparse
import json
import sys
from typing import List

from .config import load_settings
from .pipeline import run_feasibility
from .tools.registry import registry


def cmd_serve(args) -> int:
    import uvicorn

    settings = load_settings()
    host = args.host or settings.host
    port = args.port or settings.port
    mode = "mock" if settings.mock else "live"
    print(f"Pencil FDE serving on http://{host}:{port}  (mode: {mode})")
    uvicorn.run("fde.api:app", host=host, port=port, reload=args.reload)
    return 0


def cmd_feasibility(args) -> int:
    address = " ".join(args.address).strip()
    if not address:
        print("Provide an address.")
        return 2
    report = run_feasibility(address)
    if args.json:
        print(json.dumps(report.model_dump(), indent=2))
        return 0
    _print_report(report)
    return 0


def cmd_tools(args) -> int:
    for t in registry.describe():
        print(f"- {t['name']}: {t['description']}")
    return 0


def _print_report(report) -> None:
    print(f"\n=== Feasibility: {report.address}  ({report.mode} mode) ===")
    print(f"\n{report.summary}\n")
    ctx = report.property_context
    print(f"Zone: {ctx.zone or '?'}   Lot: {ctx.lot_sqft or '?'} sqft   "
          f"Near transit: {ctx.near_transit}   Parcel: {ctx.parcel_id or '?'}")
    if report.allowances:
        print("\nWhat's allowed:")
        for a in report.allowances:
            print(f"  • [{a.confidence}] {a.label} — {a.detail}")
    if report.scenarios:
        print("\nBuild scenarios:")
        for s in report.scenarios:
            u = f" ({s.units} units)" if s.units else ""
            print(f"  • {s.name}{u}: {s.summary}")
    if report.constraints:
        print("\nConstraints:")
        for c in report.constraints:
            print(f"  - {c}")
    print(f"\nConfidence: {report.confidence}")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="fde", description="Pencil FDE feasibility framework")
    sub = p.add_subparsers(dest="command", required=True)

    ps = sub.add_parser("serve", help="Run the web UI + API")
    ps.add_argument("--host", default=None)
    ps.add_argument("--port", type=int, default=None)
    ps.add_argument("--reload", action="store_true", help="Auto-reload (dev)")
    ps.set_defaults(func=cmd_serve)

    pf = sub.add_parser("feasibility", help="Run feasibility for an address")
    pf.add_argument("address", nargs="+")
    pf.add_argument("--json", action="store_true", help="Print raw JSON")
    pf.set_defaults(func=cmd_feasibility)

    pt = sub.add_parser("tools", help="List registered tools")
    pt.set_defaults(func=cmd_tools)

    return p


def main(argv: List[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        return args.func(args)
    except RuntimeError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
