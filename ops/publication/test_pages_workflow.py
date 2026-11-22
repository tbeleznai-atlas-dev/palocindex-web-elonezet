from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / ".github" / "workflows" / "palocindex-pages.yml"


class PagesWorkflowTests(unittest.TestCase):
    def test_main_deploys_a_preview_before_custom_domain_is_ready(self):
        workflow = WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'", workflow)
        self.assertIn('base_path=/palocindex-web-elonezet/', workflow)
        self.assertIn('indexing_flag=', workflow)

    def test_custom_domain_release_is_indexable_only_behind_domain_gate(self):
        workflow = WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("vars.PALOCINDEX_CUSTOM_DOMAIN_READY", workflow)
        self.assertIn('base_path=/', workflow)
        self.assertIn('indexing_flag=--allow-indexing', workflow)
        self.assertIn("--base-path \"${{ steps.mode.outputs.base_path }}\"", workflow)
        self.assertIn("${{ steps.mode.outputs.indexing_flag }}", workflow)

    def test_pages_permissions_are_scoped_to_deployment_job(self):
        workflow = WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("pages: write", workflow)
        self.assertIn("id-token: write", workflow)
        self.assertIn("contents: read", workflow)


if __name__ == "__main__":
    unittest.main()

