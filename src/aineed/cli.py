"""Command-line interface for AiNeed."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import List, Optional

from . import __version__
from .registry import Registry
from .requirement import Category, Priority, Requirement

_DEFAULT_STORE = Path.home() / ".aineed" / "requirements.json"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _load_registry(store: Path) -> Registry:
    if store.exists():
        return Registry.load(store)
    return Registry()


def _save_registry(registry: Registry, store: Path) -> None:
    store.parent.mkdir(parents=True, exist_ok=True)
    registry.save(store)


def _print_requirements(requirements: List[Requirement]) -> None:
    if not requirements:
        print("No requirements found.")
        return
    for req in requirements:
        accepted_marker = ""
        if req.accepted is True:
            accepted_marker = " [✓]"
        elif req.accepted is False:
            accepted_marker = " [✗]"
        tags = f"  tags: {', '.join(req.tags)}" if req.tags else ""
        print(
            f"• {req.title}{accepted_marker}\n"
            f"  [{req.priority.value.upper()}] [{req.category.value}]\n"
            f"  {req.description}{tags}"
        )


# ---------------------------------------------------------------------------
# Sub-command implementations
# ---------------------------------------------------------------------------


def cmd_add(args: argparse.Namespace, store: Path) -> int:
    registry = _load_registry(store)
    req = Requirement(
        title=args.title,
        description=args.description,
        priority=Priority(args.priority),
        category=Category(args.category),
        tags=args.tags or [],
    )
    registry.add(req)
    _save_registry(registry, store)
    print(f"Added requirement: {req.title!r}")
    return 0


def cmd_list(args: argparse.Namespace, store: Path) -> int:
    registry = _load_registry(store)
    requirements = registry.filter(
        priority=Priority(args.priority) if args.priority else None,
        category=Category(args.category) if args.category else None,
        tag=args.tag if args.tag else None,
    )
    _print_requirements(requirements)
    return 0


def cmd_remove(args: argparse.Namespace, store: Path) -> int:
    registry = _load_registry(store)
    removed = registry.remove(args.title)
    if removed:
        _save_registry(registry, store)
        print(f"Removed requirement: {args.title!r}")
        return 0
    print(f"Requirement not found: {args.title!r}", file=sys.stderr)
    return 1


def cmd_export(args: argparse.Namespace, store: Path) -> int:
    registry = _load_registry(store)
    data = [req.to_dict() for req in registry.all()]
    output = json.dumps(data, indent=2)
    if args.output:
        Path(args.output).write_text(output, encoding="utf-8")
        print(f"Exported {len(data)} requirement(s) to {args.output!r}")
    else:
        print(output)
    return 0


# ---------------------------------------------------------------------------
# Parser construction
# ---------------------------------------------------------------------------


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="aineed",
        description="AiNeed – AI requirements gathering and planning assistant",
    )
    parser.add_argument(
        "--version", action="version", version=f"%(prog)s {__version__}"
    )
    parser.add_argument(
        "--store",
        metavar="FILE",
        help=f"Path to the requirements store (default: {_DEFAULT_STORE})",
    )

    sub = parser.add_subparsers(dest="command", metavar="COMMAND")

    # --- add ---
    p_add = sub.add_parser("add", help="Add a new requirement")
    p_add.add_argument("title", help="Short title for the requirement")
    p_add.add_argument("description", help="Detailed description")
    p_add.add_argument(
        "--priority",
        choices=[p.value for p in Priority],
        default=Priority.MEDIUM.value,
        help="Priority level (default: medium)",
    )
    p_add.add_argument(
        "--category",
        choices=[c.value for c in Category],
        default=Category.OTHER.value,
        help="Requirement category (default: other)",
    )
    p_add.add_argument(
        "--tags",
        nargs="*",
        metavar="TAG",
        help="Optional tags",
    )

    # --- list ---
    p_list = sub.add_parser("list", help="List requirements")
    p_list.add_argument("--priority", choices=[p.value for p in Priority])
    p_list.add_argument("--category", choices=[c.value for c in Category])
    p_list.add_argument("--tag", metavar="TAG")

    # --- remove ---
    p_remove = sub.add_parser("remove", help="Remove a requirement by title")
    p_remove.add_argument("title", help="Title of the requirement to remove")

    # --- export ---
    p_export = sub.add_parser("export", help="Export requirements as JSON")
    p_export.add_argument(
        "--output", "-o", metavar="FILE", help="Write output to FILE instead of stdout"
    )

    return parser


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main(argv: Optional[List[str]] = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    store = Path(args.store) if args.store else _DEFAULT_STORE

    handlers = {
        "add": cmd_add,
        "list": cmd_list,
        "remove": cmd_remove,
        "export": cmd_export,
    }

    if args.command is None:
        parser.print_help()
        return 0

    return handlers[args.command](args, store)


if __name__ == "__main__":
    sys.exit(main())
