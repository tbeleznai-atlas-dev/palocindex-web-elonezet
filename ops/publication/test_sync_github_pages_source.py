import json
from pathlib import Path
import tempfile
import unittest

from ops.publication.sync_github_pages_source import sync_source


class GitHubPagesSourceSyncTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.source = self.root / "dist"
        self.target = self.root / "pages-source"
        self.source.mkdir()
        for name in (
            "index.html", "onkormanyzatok.html", "hirdetesek.html", "kerdesek.html",
            "adatkezeles.html", "site.js", "v9.css", "nograd-telepulesek.json",
            "robots.txt", "sitemap.xml",
        ):
            (self.source / name).write_text("placeholder", encoding="utf-8")
        districts = [f"Járás {index}" for index in range(1, 7)]
        towns = [
            {"name": f"Település {index:03d}", "district": districts[(index - 1) % 6]}
            for index in range(1, 132)
        ]
        (self.source / "nograd-telepulesek.json").write_text(json.dumps({
            "official_reference": {"verified_town_count": 131, "verified_district_count": 6},
            "towns": towns,
        }, ensure_ascii=False), encoding="utf-8")
        (self.source / "index.html").write_text('<script src="/site.js"></script>', encoding="utf-8")
        (self.source / "site.js").write_text('fetch("/nograd-telepulesek.json");', encoding="utf-8")
        (self.source / "v9.css").write_text(".x{color:#123}", encoding="utf-8")
        (self.source / "assets-v5").mkdir()
        (self.source / "assets-v5" / "icon.svg").write_text("<svg/>", encoding="utf-8")
        (self.source / "server").mkdir()
        (self.source / "server" / "index.js").write_text("private", encoding="utf-8")

    def tearDown(self):
        self.temp.cleanup()

    def test_sync_copies_only_validated_public_files(self):
        result = sync_source(self.source, self.target, "/palocindex-web-elonezet/")

        self.assertEqual(result["file_count"], 11)
        self.assertEqual((self.target / "site.js").read_bytes(), (self.source / "site.js").read_bytes())
        self.assertTrue((self.target / "assets-v5" / "icon.svg").is_file())
        self.assertFalse((self.target / "server").exists())

    def test_failed_validation_preserves_previous_source(self):
        self.target.mkdir()
        marker = self.target / "keep.txt"
        marker.write_text("previous valid source", encoding="utf-8")
        registry = json.loads((self.source / "nograd-telepulesek.json").read_text(encoding="utf-8"))
        registry["towns"].pop()
        (self.source / "nograd-telepulesek.json").write_text(json.dumps(registry), encoding="utf-8")

        with self.assertRaisesRegex(ValueError, "town registry"):
            sync_source(self.source, self.target, "/palocindex-web-elonezet/")

        self.assertEqual(marker.read_text(encoding="utf-8"), "previous valid source")

    def test_source_and_target_must_be_separate_directories(self):
        with self.assertRaisesRegex(ValueError, "separate"):
            sync_source(self.source, self.source / "generated", "/palocindex-web-elonezet/")


if __name__ == "__main__":
    unittest.main()
