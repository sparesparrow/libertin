#!/usr/bin/env python3
"""Install and verify the standalone Libertin preview on one explicit device."""

from __future__ import annotations

import argparse
import glob
import os
import re
import shutil
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path


PREVIEW_PACKAGE_PREFIX = "cz.libertin.preview"
REMOTE_HIERARCHY = "/sdcard/libertin_startup_smoke.xml"


class SmokeFailure(RuntimeError):
    pass


def is_allowed_preview_package(package: str) -> bool:
    """Accept the legacy preview id or a CI run/attempt-isolated test variant."""
    return package == PREVIEW_PACKAGE_PREFIX or re.fullmatch(
        r"cz\.libertin\.preview\.run\d+\.attempt\d+", package
    ) is not None


def resolve_launch_activity(output: str, package: str) -> str:
    """Return the package-owned launcher component from package-manager output."""
    for line in output.splitlines():
        component = line.strip()
        if component.startswith(f"{package}/"):
            return component
    raise SmokeFailure("Android did not resolve a launcher activity for the preview package")


def is_target_foreground(output: str, package: str) -> bool:
    """Check only for the test package; do not retain or report other activity names."""
    return any(
        re.search(rf"\bACTIVITY\s+{re.escape(package)}/", line) is not None
        for line in output.splitlines()
    )


def hierarchy_has_expected_text(hierarchy: str, package: str, expected_text: str) -> bool:
    """Require the expected accessible text to belong to the preview package."""
    try:
        root = ET.fromstring(hierarchy)
    except ET.ParseError:
        return False

    return any(
        node.attrib.get("package") == package
        and node.attrib.get("text") == expected_text
        for node in root.iter("node")
    )


def adb(serial: str, *args: str, timeout: int = 30) -> str:
    result = subprocess.run(
        ["adb", "-s", serial, *args],
        check=False,
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    if result.returncode != 0:
        # Keep the failing subcommand and its device-side diagnostic visible in CI.
        detail = re.sub(r"\\s+", " ", result.stderr).strip()[:500]
        operation = " ".join(args)
        suffix = f": {detail}" if detail else ""
        raise SmokeFailure(
            f"ADB operation failed ({operation}, exit {result.returncode}){suffix}; "
            "no app data was cleared"
        )
    return result.stdout.strip()


def require_target_foreground(serial: str, package: str) -> None:
    output = adb(serial, "shell", "dumpsys", "activity", "top")
    if not is_target_foreground(output, package):
        raise SmokeFailure("The preview activity is not in the foreground")


def assert_accessible_screen(serial: str, package: str, expected_text: str) -> None:
    require_target_foreground(serial, package)
    adb(serial, "shell", "uiautomator", "dump", "--compressed", REMOTE_HIERARCHY)
    try:
        hierarchy = adb(serial, "exec-out", "cat", REMOTE_HIERARCHY)
    finally:
        adb(serial, "shell", "rm", "-f", REMOTE_HIERARCHY)

    if not hierarchy_has_expected_text(hierarchy, package, expected_text):
        raise SmokeFailure(
            "The preview accessibility tree does not contain its expected screen title"
        )


def parse_apk_application_id(output: str, tool_name: str) -> str:
    """Read an application id from apkanalyzer or aapt output."""
    if Path(tool_name).name == "aapt":
        for line in output.splitlines():
            match = re.match(r"^package: name='([^']+)'", line.strip())
            if match:
                return match.group(1)
        return ""
    return output.strip()


def apk_application_id(apk_path: Path) -> str:
    sdk_tools: dict[str, list[str | None]] = {
        "apkanalyzer": [shutil.which("apkanalyzer")],
        "aapt": [shutil.which("aapt")],
    }
    sdk_root = os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT")
    if sdk_root:
        for name, candidates in sdk_tools.items():
            candidates.extend(glob.glob(f"{sdk_root}/build-tools/*/{name}"))

    def tool_version(tool: str) -> tuple[int, ...]:
        return tuple(
            int(part) if part.isdigit() else 0
            for part in Path(tool).parent.name.split(".")
        )

    for name, args in (
        ("apkanalyzer", ["manifest", "application-id"]),
        ("aapt", ["dump", "badging"]),
    ):
        tools = sorted(
            {tool for tool in sdk_tools[name] if tool},
            key=tool_version,
            reverse=True,
        )
        for tool in tools:
            result = subprocess.run(
                [tool, *args, str(apk_path)],
                check=False,
                capture_output=True,
                text=True,
                timeout=30,
            )
            if result.returncode == 0:
                application_id = parse_apk_application_id(result.stdout, name)
                if application_id:
                    return application_id

    raise SmokeFailure(
        "apkanalyzer or aapt is required to verify the APK package before installation"
    )


def assert_stable(serial: str, package: str, seconds: int) -> None:
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        pid = adb(serial, "shell", "pidof", package)
        if not pid:
            raise SmokeFailure("The preview process exited during the foreground stability window")
        time.sleep(min(1.0, max(0.0, deadline - time.monotonic())))

    require_target_foreground(serial, package)


def launch(serial: str, activity: str) -> None:
    output = adb(serial, "shell", "am", "start", "-W", "-n", activity, timeout=60)
    if "Status: ok" not in output:
        raise SmokeFailure("Android did not report a successful preview activity launch")


def run_smoke(args: argparse.Namespace) -> None:
    if not is_allowed_preview_package(args.package):
        raise SmokeFailure("Only the legacy preview or a run-isolated preview package is permitted")
    if not args.serial.strip():
        raise SmokeFailure("An explicit ADB serial is required")
    apk_path = Path(args.apk).resolve()
    if not apk_path.is_file():
        raise SmokeFailure("The preview APK path does not identify a file")
    if apk_application_id(apk_path) != args.package:
        raise SmokeFailure("APK application id does not match the permitted preview package")

    evidence_dir = Path(args.evidence_dir)
    evidence_dir.mkdir(parents=True, exist_ok=True)
    evidence_dir.chmod(0o700)
    log_path = evidence_dir / "preview-app-logcat.txt"

    if adb(args.serial, "get-state") != "device":
        raise SmokeFailure("The explicitly selected ADB serial is not authorized and ready")

    # -r updates only this named preview package. A signing mismatch is an error;
    # the script never uninstalls the package or clears its data.
    install = subprocess.run(
        ["adb", "-s", args.serial, "install", "-r", str(apk_path)],
        check=False,
        capture_output=True,
        text=True,
        timeout=180,
    )
    if install.returncode != 0:
        raise SmokeFailure("Preview install failed; no uninstall or data reset was attempted")

    uid_output = adb(args.serial, "shell", "pm", "list", "packages", "-U", args.package)
    uid_match = re.search(rf"package:{re.escape(args.package)}\s+uid:(\d+)", uid_output)
    if not uid_match:
        raise SmokeFailure("Android did not report the preview package UID")

    activity_output = adb(
        args.serial,
        "shell",
        "cmd",
        "package",
        "resolve-activity",
        "--brief",
        "-c",
        "android.intent.category.LAUNCHER",
        args.package,
    )
    activity = resolve_launch_activity(activity_output, args.package)

    adb(args.serial, "shell", "am", "force-stop", args.package)
    with log_path.open("w", encoding="utf-8") as app_log:
        os.chmod(log_path, 0o600)
        logcat = subprocess.Popen(
            [
                "adb",
                "-s",
                args.serial,
                "logcat",
                "-v",
                "threadtime",
                f"--uid={uid_match.group(1)}",
                "-T",
                "1",
            ],
            stdout=app_log,
            stderr=subprocess.STDOUT,
            text=True,
        )
        try:
            time.sleep(0.5)
            if logcat.poll() is not None:
                raise SmokeFailure("Could not start app-UID-filtered log collection")
            launch(args.serial, activity)
            assert_stable(args.serial, args.package, args.duration_seconds)
            assert_accessible_screen(args.serial, args.package, args.expected_text)
            print(f"PASS: foreground stability ({args.duration_seconds}s) and accessible screen")

            adb(args.serial, "shell", "input", "keyevent", "KEYCODE_HOME")
            time.sleep(2)
            launch(args.serial, activity)
            assert_stable(args.serial, args.package, args.relaunch_seconds)
            assert_accessible_screen(args.serial, args.package, args.expected_text)
            print("PASS: background, foreground relaunch, and accessible screen")
        finally:
            logcat.terminate()
            try:
                logcat.wait(timeout=5)
            except subprocess.TimeoutExpired:
                logcat.kill()
                logcat.wait(timeout=5)

    print(f"App-scoped logcat saved privately at {log_path}")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--serial", required=True, help="explicit authorized ADB serial")
    parser.add_argument("--apk", required=True, help="standalone preview APK path")
    parser.add_argument(
        "--package",
        required=True,
        help="cz.libertin.preview or its run/attempt-isolated test variant",
    )
    parser.add_argument("--expected-text", default="Přihlášení")
    parser.add_argument("--duration-seconds", type=int, default=20)
    parser.add_argument("--relaunch-seconds", type=int, default=5)
    parser.add_argument("--evidence-dir", required=True, help="private local evidence directory")
    args = parser.parse_args(argv)
    if args.duration_seconds < 20:
        parser.error("--duration-seconds must be at least 20")
    if args.relaunch_seconds < 1:
        parser.error("--relaunch-seconds must be positive")
    return args


if __name__ == "__main__":
    try:
        run_smoke(parse_args())
    except (SmokeFailure, subprocess.TimeoutExpired) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        raise SystemExit(1) from None
