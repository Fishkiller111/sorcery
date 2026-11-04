#!/usr/bin/env python3
"""Create one isolated local configuration. Never overwrite an existing instance."""
from pathlib import Path
import os
import secrets

ROOT = Path(__file__).resolve().parent

def create_exclusive(path: Path, content: str, mode: int) -> None:
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, 'O_NOFOLLOW', 0)
    fd = os.open(path, flags, mode)
    try:
        os.fchmod(fd, mode)
        with os.fdopen(fd, 'w', encoding='utf-8') as stream:
            stream.write(content)
    except BaseException:
        try: os.close(fd)
        except OSError: pass
        raise

def main() -> None:
    env = ROOT / '.env'
    config = ROOT / 'config.yaml'
    example = ROOT / 'config.example.yaml'
    private = ROOT / 'private'
    prompts = ROOT / 'prompts'
    if env.exists() or env.is_symlink() or config.exists() or config.is_symlink() or private.exists() or private.is_symlink():
        raise SystemExit('已有 .env、config.yaml 或 private 目录；为保护现有数据，未进行任何覆盖。')
    if example.is_symlink() or not example.is_file():
        raise SystemExit('缺少安全配置示例，未进行任何修改。')
    if prompts.is_symlink() or (prompts.exists() and not prompts.is_dir()):
        raise SystemExit('prompts 路径不是普通目录，未进行任何修改。')
    password = secrets.token_hex(24)
    project = 'sorcery-' + secrets.token_hex(4)
    values = {
        'COMPOSE_PROJECT_NAME': project,
        'SOULTHREAD_IMAGE': 'ghcr.io/fishkiller111/sorcery-backend:0.1.0-preview',
        'API_PORT': '18888',
        'DB_HOST': 'db', 'DB_USER': 'sorcery', 'DB_NAME': 'sorcery', 'DB_PASS': password,
        'REDIS_HOST': 'redis', 'REDIS_PASS': '',
        # Explicit operator approvals; empty means the covered AI requests are blocked.
        'SOULTHREAD_ALLOWED_AI_ENDPOINTS': '', 'SOULTHREAD_ALLOWED_AI_MODELS': '',
        'SOULTHREAD_ALLOWED_IMAGE_ORIGINS': '',
        'JWT_ACCESS_SECRET': secrets.token_hex(32), 'ADMIN_JWT_SECRET': secrets.token_hex(32),
        'SOULTHREAD_BOOTSTRAP_DATABASE_URL': f'postgres://sorcery:{password}@db:5432/sorcery?sslmode=disable',
    }
    try:
        private.mkdir(mode=0o700)
        os.chmod(private, 0o700)
        # Secret must be readable by the container UID; the host parent directory is 0700.
        create_exclusive(private / 'db_password', password + '\n', 0o444)
        create_exclusive(config, example.read_text(encoding='utf-8'), 0o600)
        create_exclusive(env, ''.join(f'{key}={value}\n' for key, value in values.items()), 0o600)
        prompts.mkdir(mode=0o755, exist_ok=True)
    except BaseException:
        # Preserve partial state rather than risk deleting a concurrently-created file.
        print('创建未完成；可能已生成部分配置，请人工检查，程序不会自动删除。')
        raise
    print('已创建独立配置和空 prompts 目录。请妥善保管 .env 和 private/。')
    print('项目名:', project)
    print('镜像地址为预设占位；发布前无法拉取，请先确认发行版本。')

if __name__ == '__main__':
    main()
