# WebMCP upstream (optional local clone)

This path is **not** a git submodule. The desk already vendors WebMCP sources
under `clawd-webmcp/src`. Mapping the upstream repo in desk-root `.gitmodules`
made Vercel recurse-clone it on every deploy.

To work against upstream locally:

```bash
scripts/clone-clawd-webmcp-extras.sh webmcp
# or:
git clone --depth 1 https://github.com/Solizardking/WebMCP.git clawd-webmcp/WebMCP
```

Do not `git add` the clone as a gitlink (mode `160000`). Keep it untracked or
gitignored on your machine.
