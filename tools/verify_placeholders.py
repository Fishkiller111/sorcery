#!/usr/bin/env python3
"""校验项目自制占位清单；不证明任意第三方图形、代码或内容的权利。"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from assets_audit import inventory

def verify(root: Path) -> list[dict[str,str]]:
    actual=inventory(root)
    manifest=json.loads((root/'assets/PLACEHOLDER-MANIFEST.json').read_text(encoding='utf-8'))
    if manifest.get('schema') != 'sorcery-synthetic-placeholders-v1' or not isinstance(manifest.get('assets'), list):
        raise ValueError('占位清单格式错误')
    expected={}
    for item in manifest['assets']:
        path=item['path']
        if path in expected:raise ValueError(f'重复条目: {path}')
        expected[path]=item
    findings=[]
    for path, info in actual.items():
        if path not in expected:findings.append({'path':path,'rule':'unlisted_media'});continue
        if info['sha256']!=expected[path].get('sha256') or int(info['size_bytes'])!=expected[path].get('size_bytes'):
            findings.append({'path':path,'rule':'changed_media'})
    for path in expected.keys()-actual.keys():findings.append({'path':path,'rule':'missing_media'})
    return sorted(findings,key=lambda x:(x['path'],x['rule']))

def main() -> int:
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('root',type=Path);a=p.parse_args()
    try:findings=verify(a.root)
    except (OSError,ValueError,KeyError,TypeError) as exc:
        print(json.dumps({'error':str(exc)},ensure_ascii=False));return 2
    print(json.dumps({'result':'BLOCKED' if findings else 'PLACEHOLDER_HASHES_MATCH','findings':findings,
                      'notice':'仅核对清单和哈希，不能代替权利审查'},ensure_ascii=False,indent=2))
    return 1 if findings else 0
if __name__=='__main__':raise SystemExit(main())
