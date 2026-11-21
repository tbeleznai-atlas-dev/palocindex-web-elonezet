"""Build a subpath-safe GitHub Pages artifact from public static site files."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import sys
from urllib.parse import unquote


PUBLISHABLE_SUFFIXES = {
    ".html", ".js", ".css", ".json", ".txt", ".xml", ".png", ".svg",
    ".webmanifest", ".jpg", ".jpeg", ".webp", ".ico", ".woff", ".woff2",
}
REQUIRED_FILES = {
    "index.html", "onkormanyzatok.html", "hirdetesek.html", "kerdesek.html",
    "adatkezeles.html", "site.js", "v9.css", "nograd-telepulesek.json",
    "robots.txt", "sitemap.xml",
}
PAGE_ROUTES = {
    "adatkezeles", "onkormanyzatok", "hirdetesek", "kerdesek",
    "vallalkozasok", "allasok", "aprohirdetesek",
}
MAX_FILES = 100
MAX_TOTAL_BYTES = 3_000_000
EXPECTED_TOWN_COUNT = 131
EXPECTED_DISTRICT_COUNT = 6
ROOT_URL = re.compile(r"(?P<quote>[\"'])(?P<url>/(?!/)[^\"'\s<>()]+)")
ROOT_ATTRIBUTE = re.compile(r"(?P<attribute>\b(?:href|src|action|poster)\s*=\s*[\"'])/(\s*[\"'])", re.IGNORECASE)
CSS_URL = re.compile(r"url\(\s*(?P<quote>[\"']?)(?P<url>/(?!/)[^)'\"\s]+)(?P=quote)\s*\)", re.IGNORECASE)
HTML_REFERENCE = re.compile(r"\b(?:href|src|action|poster)\s*=\s*[\"']([^\"']+)[\"']", re.IGNORECASE)
JS_REFERENCE = re.compile(r"(?:fetch\(\s*|\.src\s*=\s*)[\"']([^\"']+)[\"']")


def _validate_reference(url: str, output: Path, base_path: str, *, optional: set[str] | None = None) -> None:
    if not url.startswith("/") or url.startswith("//"):
        return
    if not url.startswith(base_path):
        raise ValueError(f"root-relative URL was not rewritten: {url}")
    relative = unquote(url[len(base_path):].split("?", 1)[0].split("#", 1)[0])
    if not relative:
        relative = "index.html"
    target = output.joinpath(*Path(relative).parts)
    if target.is_dir():
        target = target / "index.html"
    if not target.is_file() and not Path(relative).suffix:
        target = target.with_suffix(".html")
    if not target.is_file():
        if relative in (optional or set()):
            return
        raise ValueError(f"local URL does not resolve to a published file: {url}")


def _prefixed_url(url: str, base_path: str) -> str:
    if url == base_path or url.startswith(base_path):
        return url
    path, separator, suffix = url.partition("?")
    fragment = ""
    if "#" in path:
        path, fragment_part = path.split("#", 1)
        fragment = "#" + fragment_part
    if path == "/":
        rewritten = base_path
    else:
        relative = path.lstrip("/")
        if relative in PAGE_ROUTES:
            relative += ".html"
        rewritten = base_path + relative
    if separator:
        rewritten += "?" + suffix
    return rewritten + fragment


def rewrite_root_urls(text: str, base_path: str) -> str:
    """Prefix root-relative links, assets, and fetch paths for a project site."""
    text = ROOT_ATTRIBUTE.sub(lambda match: match.group("attribute") + base_path + match.group(2), text)
    text = ROOT_URL.sub(lambda match: match.group("quote") + _prefixed_url(match.group("url"), base_path), text)
    return CSS_URL.sub(
        lambda match: "url(" + match.group("quote") + _prefixed_url(match.group("url"), base_path)
        + match.group("quote") + ")",
        text,
    )


def _files(source: Path) -> list[Path]:
    if source.is_symlink() or not source.is_dir():
        raise ValueError("site source directory is missing or unsafe")
    result: list[Path] = []
    total = 0
    for path in source.rglob("*"):
        rel = path.relative_to(source)
        if path.is_symlink():
            raise ValueError(f"symbolic link is not allowed: {rel.as_posix()}")
        if path.is_dir():
            continue
        if rel.parts[0] == "server":
            continue
        if not path.is_file() or any(part.startswith(".") for part in rel.parts):
            raise ValueError(f"unsupported filesystem entry: {rel.as_posix()}")
        if path.suffix.casefold() not in PUBLISHABLE_SUFFIXES:
            raise ValueError(f"unsupported public file type: {rel.as_posix()}")
        total += path.stat().st_size
        if len(result) >= MAX_FILES or total > MAX_TOTAL_BYTES:
            raise ValueError("static site exceeds the file or size limit")
        result.append(path)
    present = {item.relative_to(source).as_posix() for item in result}
    if not REQUIRED_FILES.issubset(present):
        raise ValueError("static site is missing required public files")
    return sorted(result, key=lambda item: item.relative_to(source).as_posix())


def _validate_town_registry(source: Path) -> None:
    try:
        registry = json.loads((source / "nograd-telepulesek.json").read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise ValueError("town registry metadata or records are invalid") from error
    if not isinstance(registry, dict) or not isinstance(registry.get("towns"), list):
        raise ValueError("town registry metadata or records are invalid")
    towns = registry["towns"]
    reference = registry.get("official_reference")
    if not isinstance(reference, dict) or any(
        not isinstance(town, dict)
        or not isinstance(town.get("name"), str)
        or not town["name"].strip()
        or not isinstance(town.get("district"), str)
        or not town["district"].strip()
        for town in towns
    ):
        raise ValueError("town registry metadata or records are invalid")
    names = [town["name"] for town in towns]
    districts = {town["district"] for town in towns}
    if (
        not isinstance(towns, list)
        or len(towns) != EXPECTED_TOWN_COUNT
        or len(set(names)) != EXPECTED_TOWN_COUNT
        or len(districts) != EXPECTED_DISTRICT_COUNT
        or reference.get("verified_town_count") != EXPECTED_TOWN_COUNT
        or reference.get("verified_district_count") != EXPECTED_DISTRICT_COUNT
    ):
        raise ValueError("town registry must match the verified 131 towns and 6 districts")


def build(source_dir: Path, output_dir: Path, base_path: str) -> dict[str, object]:
    if not re.fullmatch(r"/[A-Za-z0-9._-]+/", base_path):
        raise ValueError("base path must look like /repository-name/")
    source = source_dir.resolve(strict=True)
    output = output_dir.absolute()
    if output.exists() or output.is_symlink():
        raise ValueError("output directory already exists")
    files = _files(source)
    _validate_town_registry(source)
    output.mkdir(parents=True)
    hashes: dict[str, str] = {}
    try:
        for source_file in files:
            relative = source_file.relative_to(source)
            destination = output.joinpath(*relative.parts)
            destination.parent.mkdir(parents=True, exist_ok=True)
            raw = source_file.read_bytes()
            if source_file.suffix.casefold() in {".html", ".js", ".css", ".webmanifest"}:
                content = rewrite_root_urls(raw.decode("utf-8"), base_path)
                if source_file.suffix.casefold() == ".webmanifest":
                    webmanifest = json.loads(content)
                    for field in ("start_url", "scope"):
                        if webmanifest.get(field) == "/":
                            webmanifest[field] = base_path
                    content = json.dumps(webmanifest, ensure_ascii=False, separators=(",", ":"))
                raw = content.encode("utf-8")
            destination.write_bytes(raw)
            hashes[relative.as_posix()] = hashlib.sha256(raw).hexdigest()
        (output / "robots.txt").write_text("User-agent: *\nDisallow: /\n", encoding="utf-8")
        hashes["robots.txt"] = hashlib.sha256((output / "robots.txt").read_bytes()).hexdigest()
        for html_file in output.glob("*.html"):
            for match in HTML_REFERENCE.finditer(html_file.read_text(encoding="utf-8")):
                _validate_reference(match.group(1), output, base_path)
        for script_file in output.glob("*.js"):
            for match in JS_REFERENCE.finditer(script_file.read_text(encoding="utf-8")):
                _validate_reference(
                    match.group(1), output, base_path,
                    optional={"international-news.json", "weather-daily-metno.json"},
                )
        for stylesheet in output.glob("*.css"):
            for match in CSS_URL.finditer(stylesheet.read_text(encoding="utf-8")):
                _validate_reference(match.group("url"), output, base_path)
        if (output / "server").exists():
            raise ValueError("internal server bundle leaked into the Pages artifact")
        return {"base_path": base_path, "file_count": len(hashes), "sha256": hashes}
    except Exception:
        shutil.rmtree(output, ignore_errors=True)
        raise


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--base-path", required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(build(args.source_dir, args.output_dir, args.base_path), ensure_ascii=False))
    except (OSError, UnicodeError, ValueError) as error:
        print(f"PAGES_BUILD_FAILED: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

