#!/usr/bin/env python3
"""Build a plugin ZIP from an explicit, credential-free file list."""
import hashlib
import json
import sys
from pathlib import Path
import zipfile

package = Path(__file__).resolve().parents[1]
name = sys.argv[1] if len(sys.argv) > 1 else 'clawd'
plugin = package / 'plugins' / name
manifest = json.loads((plugin / 'plugin.json').read_text())
overlay = json.loads((plugin / '.codex-plugin' / 'plugin.json').read_text())
portable_mcp = json.loads((plugin / 'mcp.json').read_text())
legacy_mcp = json.loads((plugin / '.mcp.json').read_text())
assert manifest['name'] == overlay['name'] == plugin.name
assert manifest['version'] == overlay['version']
assert portable_mcp['mcpServers'][name]['url'] == legacy_mcp['mcpServers'][name]['url']
assert portable_mcp['mcpServers'][name]['type'] == 'streamable-http'
assert set(portable_mcp['mcpServers'][name]) == {'type', 'url'}
assert set(legacy_mcp['mcpServers'][name]) == {'type', 'url'}

files = [
    'plugin.json', 'mcp.json', '.codex-plugin/plugin.json', '.mcp.json',
    'README.md', 'submission.md', 'assets/logo.png', f'skills/{name}/SKILL.md',
]
release = package / 'releases'
release.mkdir(exist_ok=True)
archive = release / f"{name}-{manifest['version']}.zip"
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
    for filename in files:
        source = plugin / filename
        if source.is_symlink() or not source.is_file():
            raise ValueError(f'Missing or symlinked release file: {filename}')
        entry = zipfile.ZipInfo(f'{name}/{filename}', date_time=(2026, 1, 1, 0, 0, 0))
        entry.compress_type = zipfile.ZIP_DEFLATED
        entry.external_attr = 0o100644 << 16
        bundle.writestr(entry, source.read_bytes())
with zipfile.ZipFile(archive) as bundle:
    assert bundle.testzip() is None
    assert len(bundle.namelist()) == len(files)
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(archive.with_suffix('.zip.sha256')).write_text(f'{digest}  {archive.name}\n')
print(f'Built {archive.name}: {len(files)} files; SHA-256 {digest}')

skills_archive = release / f"{name}-skills-{manifest['version']}.zip"
with zipfile.ZipFile(skills_archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
    for filename in files:
        if not filename.startswith('skills/'):
            continue
        entry = zipfile.ZipInfo(filename.removeprefix('skills/'), date_time=(2026, 1, 1, 0, 0, 0))
        entry.compress_type = zipfile.ZIP_DEFLATED
        entry.external_attr = 0o100644 << 16
        bundle.writestr(entry, (plugin / filename).read_bytes())
with zipfile.ZipFile(skills_archive) as bundle:
    assert bundle.testzip() is None
    assert f'{name}/SKILL.md' in bundle.namelist()
skills_digest = hashlib.sha256(skills_archive.read_bytes()).hexdigest()
skills_archive.with_suffix('.zip.sha256').write_text(f'{skills_digest}  {skills_archive.name}\n')
print(f'Built {skills_archive.name}; SHA-256 {skills_digest}')
