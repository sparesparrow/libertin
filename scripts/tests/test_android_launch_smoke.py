import unittest

from scripts.android_launch_smoke import (
    hierarchy_has_expected_text,
    is_allowed_preview_package,
    is_target_foreground,
    resolve_launch_activity,
)


PACKAGE = "cz.libertin.preview.run52.attempt1"


class AndroidLaunchSmokeHelpersTest(unittest.TestCase):
    def test_allows_only_the_legacy_or_run_isolated_preview_package(self):
        self.assertTrue(is_allowed_preview_package("cz.libertin.preview"))
        self.assertTrue(is_allowed_preview_package(PACKAGE))
        self.assertFalse(is_allowed_preview_package("cz.libertin.app"))
        self.assertFalse(is_allowed_preview_package("cz.libertin.preview.run52"))

    def test_resolves_only_a_component_owned_by_the_preview_package(self):
        output = f"priority=0 preferredOrder=0\n{PACKAGE}/.MainActivity\n"
        self.assertEqual(resolve_launch_activity(output, PACKAGE), f"{PACKAGE}/.MainActivity")

    def test_rejects_missing_or_foreign_launcher_activity(self):
        with self.assertRaisesRegex(RuntimeError, "did not resolve"):
            resolve_launch_activity("com.example/.MainActivity", PACKAGE)

    def test_foreground_match_does_not_leak_an_unrelated_activity_name(self):
        target = f"  ACTIVITY {PACKAGE}/.MainActivity 123 pid=42"
        unrelated = "  ACTIVITY com.example.private/.Activity 123 pid=12"
        self.assertTrue(is_target_foreground(target, PACKAGE))
        self.assertFalse(is_target_foreground(unrelated, PACKAGE))

    def test_accessibility_assertion_requires_expected_text_in_preview_package(self):
        hierarchy = (
            f'<hierarchy><node package="{PACKAGE}" text="Přihlášení" />'
            '<node package="com.example.private" text="Přihlášení" /></hierarchy>'
        )
        self.assertTrue(hierarchy_has_expected_text(hierarchy, PACKAGE, "Přihlášení"))
        self.assertFalse(hierarchy_has_expected_text(hierarchy, PACKAGE, "Sign in"))
        self.assertFalse(
            hierarchy_has_expected_text(
                '<hierarchy><node package="com.example.private" text="Přihlášení" /></hierarchy>',
                PACKAGE,
                "Přihlášení",
            )
        )

    def test_malformed_accessibility_xml_fails_closed(self):
        self.assertFalse(hierarchy_has_expected_text("<hierarchy><node>", PACKAGE, "Přihlášení"))


if __name__ == "__main__":
    unittest.main()
