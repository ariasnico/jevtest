#!/usr/bin/env python3
"""Check the Git index for common secrets without printing their values."""

import pathlib
import re
import subprocess
import sys


PATTERNS = [
    rb"apikey_[A-Za-z0-9]{16,}_[A-Za-z0-9]{16,}",
    rb"gh[pousr]_[A-Za-z0-9]{20,}",
    rb"github_pat_[A-Za-z0-9_]{20,}",
    rb"sk-[A-Za-z0-9_-]{20,}",
    rb"AKIA[A-Z0-9]{16}",
    rb"-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----",
    rb"(?im)^[ \t]*(?:export[ \t]+)?[A-Z0-9_]*(?:API_KEY|API_TOKEN|SECRET|PASSWORD)[ \t]*=[ \t]*[\"']?[^\s\"'#][^\r\n]*",
]


def main():
    paths = subprocess.check_output(["git", "ls-files", "--cached", "-z"])
    findings = []
    for raw_path in paths.split(b"\0"):
        if not raw_path:
            continue
        path = raw_path.decode("utf-8", errors="surrogateescape")
        file = pathlib.PurePosixPath(path)
        sensitive = (
            (file.name == ".env" or file.name.startswith(".env."))
            and file.name != ".env.example"
        ) or file.suffix.lower() in {".pem", ".key", ".p12", ".pfx"}
        sensitive = sensitive or bool({"secrets", ".secrets"} & set(file.parts))
        sensitive = sensitive or (
            file.name.startswith("credentials") and file.suffix == ".json"
        )
        if sensitive:
            findings.append((path, "archivo sensible"))
            continue
        content = subprocess.check_output(["git", "show", ":" + path])
        if any(re.search(pattern, content) for pattern in PATTERNS):
            findings.append((path, "posible credencial"))
    for path, reason in findings:
        print(f"BLOQUEADO: {path!r}: {reason}", file=sys.stderr)
    if findings:
        return 1
    print("Control de secretos: sin hallazgos en el índice de Git.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
