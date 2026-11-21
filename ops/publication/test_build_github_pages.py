import json
from pathlib import Path
import tempfile
import unittest

from ops.publication.build_github_pages import build


class GitHubPagesBuildTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.source = self.root / "site"
        self.source.mkdir()
        for name in (
            "index.html", "onkormanyzatok.html", "hirdetesek.html", "kerdesek.html",
            "adatkezeles.html", "site.js", "v9.css", "nograd-telepulesek.json",
            "robots.txt", "sitemap.xml",
        ):
            (self.source / name).write_text("placeholder", encoding="utf-8")
        districts = [f"Járás {index}" for index in range(1, 7)]
        towns = [
            {"name": f"Település {index:03d}", "district": districts[(index - 1) % len(districts)]}
            for index in range(1, 132)
        ]
        (self.source / "nograd-telepulesek.json").write_text(json.dumps({
            "official_reference": {"verified_town_count": 131, "verified_district_count": 6},
            "towns": towns,
        }, ensure_ascii=False), encoding="utf-8")
        (self.source / "index.html").write_text(
            '<link href="/v9.css"><a href="/">Kezdőlap</a>'
            '<a href="/hirdetesek#feltetelek">Hirdetés</a>'
            '<a href="/#idojaras">Időjárás</a><img src="/assets-v5/card.svg">',
            encoding="utf-8",
        )
        (self.source / "site.js").write_text(
            'fetch("/nograd-telepulesek.json"); fetch("/international-news.json");'
            'fetch("/weather-daily-metno.json"); image.src="/assets-v5/card.svg";',
            encoding="utf-8",
        )
        (self.source / "v9.css").write_text(
            ".card{background-image:url(/assets-v5/card.svg)}", encoding="utf-8",
        )
        (self.source / "assets-v5").mkdir()
        (self.source / "assets-v5" / "card.svg").write_text("<svg/>", encoding="utf-8")
        (self.source / "icon-192.png").write_bytes(b"icon")
        (self.source / "site.webmanifest").write_text(
            '{"start_url":"/","scope":"/","icons":[{"src":"/icon-192.png"}]}',
            encoding="utf-8",
        )
        (self.source / "server").mkdir()
        (self.source / "server" / "index.js").write_text("internal", encoding="utf-8")

    def tearDown(self):
        self.temp.cleanup()

    def test_build_rewrites_paths_checks_assets_and_excludes_worker(self):
        output = self.root / "artifact"
        result = build(self.source, output, "/palocindex-web-elonezet/")

        html = (output / "index.html").read_text(encoding="utf-8")
        self.assertIn('href="/palocindex-web-elonezet/v9.css"', html)
        self.assertIn('href="/palocindex-web-elonezet/"', html)
        self.assertIn('href="/palocindex-web-elonezet/hirdetesek.html#feltetelek"', html)
        self.assertIn('href="/palocindex-web-elonezet/#idojaras"', html)
        self.assertIn('src="/palocindex-web-elonezet/assets-v5/card.svg"', html)
        js = (output / "site.js").read_text(encoding="utf-8")
        self.assertIn('fetch("/palocindex-web-elonezet/nograd-telepulesek.json")', js)
        self.assertIn('fetch("/palocindex-web-elonezet/international-news.json")', js)
        self.assertIn("url(/palocindex-web-elonezet/assets-v5/card.svg)",
                      (output / "v9.css").read_text(encoding="utf-8"))
        manifest = json.loads((output / "site.webmanifest").read_text(encoding="utf-8"))
        self.assertEqual(manifest["start_url"], "/palocindex-web-elonezet/")
        self.assertEqual(manifest["scope"], "/palocindex-web-elonezet/")
        self.assertEqual(manifest["icons"][0]["src"], "/palocindex-web-elonezet/icon-192.png")
        self.assertFalse((output / "server").exists())
        self.assertEqual((output / "robots.txt").read_text(encoding="utf-8"), "User-agent: *\nDisallow: /\n")
        self.assertEqual(result["file_count"], len(result["sha256"]))

    def test_invalid_base_path_is_rejected_without_output(self):
        output = self.root / "artifact"
        with self.assertRaisesRegex(ValueError, "base path"):
            build(self.source, output, "/wrong path/")
        self.assertFalse(output.exists())

    def test_incomplete_town_registry_is_rejected(self):
        registry_path = self.source / "nograd-telepulesek.json"
        registry = json.loads(registry_path.read_text(encoding="utf-8"))
        registry["towns"].pop()
        registry_path.write_text(json.dumps(registry, ensure_ascii=False), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "town registry"):
            build(self.source, self.root / "artifact", "/palocindex-web-elonezet/")

    def test_root_domain_build_keeps_root_routes_and_assets(self):
        (self.source / "sitemap.xml").write_text(
            "<urlset><url><loc>https://palocindex.hu/hirdetesek</loc></url></urlset>",
            encoding="utf-8",
        )
        output = self.root / "root-artifact"
        result = build(self.source, output, "/")

        html = (output / "index.html").read_text(encoding="utf-8")
        self.assertIn('href="/v9.css"', html)
        self.assertIn('href="/"', html)
        self.assertIn('href="/hirdetesek.html#feltetelek"', html)
        self.assertIn('src="/assets-v5/card.svg"', html)
        self.assertIn("https://palocindex.hu/hirdetesek.html", (output / "sitemap.xml").read_text(encoding="utf-8"))
        self.assertEqual(result["base_path"], "/")

    def test_root_domain_indexing_is_explicit_and_preserves_robots_policy(self):
        robots = "User-agent: *\nAllow: /\nSitemap: https://palocindex.hu/sitemap.xml\n"
        (self.source / "robots.txt").write_text(robots, encoding="utf-8")
        output = self.root / "indexable-artifact"

        build(self.source, output, "/", allow_indexing=True)

        self.assertEqual((output / "robots.txt").read_text(encoding="utf-8"), robots)

    def test_indexing_requires_an_explicit_allow_all_robots_rule(self):
        output = self.root / "blocked-indexing-artifact"

        with self.assertRaisesRegex(ValueError, "robots.txt must explicitly allow indexing"):
            build(self.source, output, "/", allow_indexing=True)

        self.assertFalse(output.exists())

    def test_indexable_build_cannot_use_preview_subpath(self):
        with self.assertRaisesRegex(ValueError, "root domain path"):
            build(self.source, self.root / "wrong-indexable-artifact", "/palocindex-web-elonezet/", allow_indexing=True)


if __name__ == "__main__":
    unittest.main()
