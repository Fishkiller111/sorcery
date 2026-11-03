#!/usr/bin/env python3
"""按哈希核对素材逐项分发授权；无证据、遗漏及变更均阻止发布。"""
from __future__ import annotations
import argparse
import csv
import hashlib
import json
import os
from pathlib import Path

ROOTS = ('app', 'src', 'assets', 'public')
EXTS = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif', '.ico', '.bmp', '.tif', '.tiff', '.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.mp4', '.webm', '.mov', '.ttf', '.otf', '.woff', '.woff2'}
FIELDS = ('path', 'size_bytes', 'sha256', 'rights_status', 'rights_evidence', 'attribution')

def inventory(root: Path) -> dict[str, dict[str, str]]:
    root = root.resolve(strict=True)
    result = {}
    for dirname in ROOTS:
        path = root / dirname
        if not path.exists(): continue
        if path.is_symlink(): raise ValueError(f'素材目录不能为链接: {dirname}')
        for current, dirs, files in os.walk(path, followlinks=False):
            for d in dirs:
                p = Path(current, d)
                if p.is_symlink(): raise ValueError(f'目录不能为链接: {p.relative_to(root)}')
            dirs.sort()
            for name in sorted(files):
                p = Path(current, name)
                if p.is_symlink(): raise ValueError(f'文件不能为链接: {p.relative_to(root)}')
                if p.suffix.lower() not in EXTS: continue
                rel = p.relative_to(root).as_posix()
                h = hashlib.sha256()
                with p.open('rb') as stream:
                    for chunk in iter(lambda: stream.read(1024 * 1024), b''): h.update(chunk)
                result[rel] = {'path': rel, 'size_bytes': str(p.stat().st_size), 'sha256': h.hexdigest()}
    return dict(sorted(result.items()))

def create(root: Path, csvfile: Path) -> int:
    entries = inventory(root)
    # 创建模式拒绝覆盖，避免抹去人工审批记录。
    with csvfile.open('x', encoding='utf-8', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=FIELDS); writer.writeheader()
        for data in entries.values():
            writer.writerow({**data, 'rights_status': 'UNREVIEWED', 'rights_evidence': '', 'attribution': ''})
    return len(entries)

def verify(root: Path, csvfile: Path) -> list[dict[str, str]]:
    present = inventory(root); findings = []; rows = {}
    with csvfile.open('r', encoding='utf-8-sig', newline='') as stream:
        reader = csv.DictReader(stream)
        if reader.fieldnames != list(FIELDS): raise ValueError('素材清单列不匹配')
        for row in reader:
            path = row['path']
            if not path or path in rows: raise ValueError(f'素材路径为空或重复: {path}')
            rows[path] = row
    for path, info in present.items():
        row = rows.get(path)
        if not row: findings.append({'path': path, 'rule': 'unlisted_asset'}); continue
        if row['sha256'] != info['sha256'] or row['size_bytes'] != info['size_bytes']:
            findings.append({'path': path, 'rule': 'asset_changed'}); continue
        if row['rights_status'].strip().upper() != 'APPROVED':
            findings.append({'path': path, 'rule': 'not_approved'}); continue
        if not row['rights_evidence'].strip():
            findings.append({'path': path, 'rule': 'missing_rights_evidence'})
    # 原清单中缺失的文件仅在标为 EXCLUDED 时允许，且不将缺失视为可运行。
    for path, row in rows.items():
        if path not in present and row['rights_status'].strip().upper() != 'EXCLUDED':
            findings.append({'path': path, 'rule': 'listed_asset_missing'})
    return findings

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=('generate', 'verify'))
    parser.add_argument('root', type=Path)
    parser.add_argument('csvfile', type=Path)
    args = parser.parse_args()
    try:
        if args.command == 'generate':
            print(json.dumps({'generated_unreviewed': create(args.root, args.csvfile)}, ensure_ascii=False)); return 0
        findings = verify(args.root, args.csvfile)
        print(json.dumps({'result': 'BLOCKED' if findings else 'ASSET_RECORDS_COMPLETE', 'findings': findings,
                          'notice': '仅核对登记资料和文件哈希，不可代替人工验证权利真实性'}, ensure_ascii=False, indent=2))
        return 1 if findings else 0
    except (OSError, ValueError, KeyError, csv.Error) as exc:
        print(json.dumps({'error': str(exc)}, ensure_ascii=False)); return 2

if __name__ == '__main__': raise SystemExit(main())
