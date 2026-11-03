#!/usr/bin/env python3
"""本地公开前的基础阻断检查；不能代替人工、历史、镜像层及许可证审查。"""
from __future__ import annotations
import argparse
import json
import os
import re
from pathlib import Path

OMIT_DIRS = {'node_modules', '.expo', '.git'}
TEXT_EXTS = {'.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.yaml', '.yml', '.html', '.xml', '.txt', '.md', '.sh', '.env', '.plist', '.map', '.svg', '.css', '.gradle'}
RULES = {
    'private_key_material': re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----'),
    'github_token': re.compile(r'\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b'),
    'aws_access_key': re.compile(r'\bAKIA[0-9A-Z]{16}\b'),
    'github_fine_grained_token': re.compile(r'\bgithub_pat_[A-Za-z0-9_]{50,}\b'),
    'stripe_live_secret': re.compile(r'\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b'),
    'telegram_bot_token': re.compile(r'(?<![0-9])\d{7,12}:AA[A-Za-z0-9_-]{30,}\b'),
    'google_api_key': re.compile(r'\bAIza[A-Za-z0-9_-]{35}\b'),
    'slack_token': re.compile(r'\bxox[baprs]-[A-Za-z0-9-]{20,}\b'),
    'production_domain': re.compile(r'(?i)(?<![a-z0-9-])(?:[a-z0-9-]{1,63}\.){0,5}soulthread\.talk\b'),
}
KEY_SUFFIXES = {'.key', '.pem', '.p12', '.pfx', '.p8', '.jks', '.mobileprovision'}

def is_documented_identity_suffix(relative: str, rule: str, text: str, match: re.Match[str]) -> bool:
    """仅豁免已验证的邮箱身份后缀声明；不豁免该文件中的其他域名引用。"""
    if rule != 'production_domain' or relative not in {'src/utils/accountEmail.ts', 'apps/client/src/utils/accountEmail.ts'}:
        return False
    start = text.rfind('\n', 0, match.start()) + 1
    end = text.find('\n', match.end())
    if end < 0:
        end = len(text)
    return text[start:end].strip() == "const TELEGRAM_PLACEHOLDER_SUFFIX = '@telegram.users.soulthread.talk';" and match.group(0).lower() == 'telegram.users.soulthread.talk'

def scan(root: Path, include_artifacts: bool = False) -> list[dict[str, str]]:
    root = root.resolve(strict=True)
    if not root.is_dir():
        raise ValueError('扫描路径必须为目录')
    findings = []
    for current, dirs, files in os.walk(root, followlinks=False):
        dirs.sort(); files.sort()
        keep = []
        for name in dirs:
            path = Path(current, name)
            if path.is_symlink():
                findings.append({'path': str(path.relative_to(root)), 'rule': 'symlink_not_reviewed'})
            elif name not in OMIT_DIRS and not (path.parent == root and name in {'ios', 'android'}) and (include_artifacts or name not in {'dist', 'web-build'}):
                keep.append(name)
        dirs[:] = keep
        for name in files:
            path = Path(current, name)
            relative = str(path.relative_to(root))
            if path.is_symlink():
                findings.append({'path': relative, 'rule': 'symlink_not_reviewed'}); continue
            if name.startswith('.env') and name != '.env.example':
                findings.append({'path': relative, 'rule': 'environment_file'}); continue
            if path.suffix.lower() in KEY_SUFFIXES or name in {'GoogleService-Info.plist', 'google-services.json'}:
                findings.append({'path': relative, 'rule': 'credential_or_platform_file'}); continue
            if path.suffix.lower() not in TEXT_EXTS and name not in {'Dockerfile', '.env.example'}:
                continue
            try:
                # 增量读取，保留重叠区避免凭据恰好跨块时漏检。
                matched: set[str] = set()
                carry = ''
                with path.open('r', encoding='utf-8') as stream:
                    while chunk := stream.read(64 * 1024):
                        text = carry + chunk
                        for rule, pattern in RULES.items():
                            if rule in matched:
                                continue
                            for match in pattern.finditer(text):
                                if not is_documented_identity_suffix(relative, rule, text, match):
                                    matched.add(rule)
                                    break
                        carry = text[-512:]
                for rule in RULES:
                    if rule in matched:
                        findings.append({'path': relative, 'rule': rule})
            except (UnicodeError, OSError):
                findings.append({'path': relative, 'rule': 'unreadable_text'})
    return findings

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('path', type=Path)
    parser.add_argument('--include-artifacts', action='store_true', help='同时检查 dist / web-build；不会扫描 node_modules')
    args = parser.parse_args()
    try:
        findings = scan(args.path, args.include_artifacts)
    except (OSError, ValueError) as exc:
        print(json.dumps({'error': str(exc)}, ensure_ascii=False)); return 2
    print(json.dumps({'result': 'BLOCKED' if findings else 'NO_AUTOMATED_FINDINGS', 'findings': findings, 'notice': '仅为基础扫描，不等于安全或可公开'}, ensure_ascii=False, indent=2))
    return 1 if findings else 0

if __name__ == '__main__':
    raise SystemExit(main())
