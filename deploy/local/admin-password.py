#!/usr/bin/env python3
"""Prompt for a new first-admin password without exposing it in shell history."""
from pathlib import Path
import getpass
import os

ROOT = Path(__file__).resolve().parent
private = ROOT / 'private'
target = private / 'admin_password'
if private.is_symlink() or not private.is_dir() or (private.stat().st_mode & 0o077):
    raise SystemExit('private 必须是权限为 0700 的本地目录；请先运行 setup.py。')
if target.exists() or target.is_symlink():
    raise SystemExit('管理员密码文件已存在，为保护原文件拒绝覆盖。')
first = getpass.getpass('输入自己设置的管理员密码（14–72 UTF-8 字节）: ')
second = getpass.getpass('再次输入管理员密码: ')
if first != second or not 14 <= len(first.encode('utf-8')) <= 72 or any(c in first for c in '\r\n\0'):
    raise SystemExit('两次输入不一致或密码不符合要求，未创建文件。')
fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, 'O_NOFOLLOW', 0), 0o444)
os.fchmod(fd, 0o444)
with os.fdopen(fd, 'w', encoding='utf-8') as f:
    f.write(first + '\n')
print('已创建受 private/ 目录保护的只读文件。管理员创建成功后请立即删除 private/admin_password。')
