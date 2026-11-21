"""Validate and atomically mirror public dist files into the Pages source folder."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile

from ops.publication.build_github_pages import _files, _validate_town_registry, build


def sync_source(source_dir: Path, target_dir: Path, base_path: str) -> dict[str, object]:
    source = source_dir.resolve(strict=True)
    target = target_dir.resolve(strict=False)
    if source == target or source.is_relative_to(target) or target.is_relative_to(source):
        raise ValueError("source and target must be separate directories")
    if target.is_symlink():
        raise ValueError("target directory must not be a symbolic link")
    if target.exists() and not target.is_dir():
        raise ValueError("target path exists and is not a directory")

    public_files = _files(source)
    _validate_town_registry(source)
    target.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix=".pages-source-sync-", dir=target.parent) as temp_name:
        temp = Path(temp_name)
        stage = temp / "stage"
        stage.mkdir()
        hashes: dict[str, str] = {}
        for source_file in public_files:
            relative = source_file.relative_to(source)
            destination = stage.joinpath(*relative.parts)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source_file, destination)
            hashes[relative.as_posix()] = hashlib.sha256(destination.read_bytes()).hexdigest()

        preflight = temp / "preflight"
        build(stage, preflight, base_path)

        previous = temp / "previous"
        had_previous = target.exists()
        if had_previous:
            os.replace(target, previous)
        try:
            os.replace(stage, target)
        except OSError:
            if had_previous and previous.exists():
                os.replace(previous, target)
            raise

    return {"file_count": len(hashes), "sha256": hashes, "target": str(target)}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--target-dir", type=Path, required=True)
    parser.add_argument("--base-path", required=True)
    args = parser.parse_args()
    try:
        result = sync_source(args.source_dir, args.target_dir, args.base_path)
        print(json.dumps(result, ensure_ascii=False))
    except (OSError, UnicodeError, ValueError) as error:
        print(f"PAGES_SOURCE_SYNC_FAILED: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
