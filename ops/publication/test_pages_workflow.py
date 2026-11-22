from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / ".github" / "workflows" / "palocindex-pages.yml"


class PagesWorkflowTests(unittest.TestCase):
    def test_production_deploy_waits_for_custom_domain_gate(self):
        workflow = WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("vars.PALOCINDEX_CUSTOM_DOMAIN_READY == 'true'", workflow)
        self.assertIn("github.ref == 'refs/heads/main'", workflow)
        self.assertIn("github.event_name != 'pull_request'", workflow)

    def test_pages_build_is_root_indexable_only_after_gate(self):
        workflow = WORKFLOW.read_text(encoding="utf-8")
        self.assertGreaterEqual(workflow.count("--base-path /"), 2)
        self.assertGreaterEqual(workflow.count("--allow-indexing"), 2)

    def test_pages_permissions_are_scoped_to_deployment_job(self):
        workflow = WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("pages: write", workflow)
        self.assertIn("id-token: write", workflow)
        self.assertIn("contents: read", workflow)


if __name__ == "__main__":
    unittest.main()
