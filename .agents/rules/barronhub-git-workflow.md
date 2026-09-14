# BarronHUB Git & Deployment Workflow

Whenever the user asks to push, deploy, commit, or update the BarronHUB repository:

1. **Obfuscate & Push Automation Script (`obfuscate_and_push.js`):**
   - ALWAYS run `node obfuscate_and_push.js` to execute the build, documentation, and push process.
   - Do NOT run manual `git commit` or `git push` on clean Lua files directly.

2. **README Generation Requirements:**
   - `README.md` must be automatically generated/updated by `obfuscate_and_push.js` on every run.
   - Must present loadstrings separated by game/map.
   - Must use a clean, professional format with **NO EMOJIS**.
   - URL format for loadstring: `loadstring(game:HttpGet("https://raw.githubusercontent.com/LOCAL2/BarronHUB/main/<filename>"))()`

3. **Local Workspace Code Integrity:**
   - Local `.lua` and `.luau` files in the workspace MUST ALWAYS remain clean, readable, and unobfuscated.
   - Obfuscation is applied ONLY during staging/committing to GitHub, and local files are restored immediately in the `finally` block of `obfuscate_and_push.js`.
