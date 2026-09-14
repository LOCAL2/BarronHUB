const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Get git remote URL to construct raw loadstring URLs
function getGitInfo() {
    try {
        const url = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
        let branch = 'main';
        try {
            branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
            if (branch === 'HEAD') branch = 'main';
        } catch (_) {}

        const match = url.match(/github\.com[:\/]([^\/]+)\/([^\/\.]+)(\.git)?$/i);
        if (match) {
            const owner = match[1];
            const repo = match[2];
            return {
                owner,
                repo,
                branch,
                rawBaseUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}`
            };
        }
    } catch (_) {}
    return null;
}

// 2. Format filename to human readable map name
function getMapName(filename) {
    let base = path.parse(filename).name;
    if (base.endsWith('Hub')) {
        base = base.slice(0, -3);
    }
    const formatted = base.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
    return formatted.trim();
}

// 3. Obfuscation helper (Byte-array loader wrapper)
function obfuscateCode(originalCode, scriptName) {
    let cleanCode = originalCode;
    if (cleanCode.charCodeAt(0) === 0xFEFF) {
        cleanCode = cleanCode.slice(1);
    }

    let buffer = Buffer.from(cleanCode, 'utf8');
    if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
        buffer = buffer.slice(3);
    }

    const byteList = [];
    for (let i = 0; i < buffer.length; i++) {
        byteList.push(buffer[i]);
    }

    return `-- [ BarronHUB Protected Build - ${scriptName} ]
local _b = {${byteList.join(',')}}
local _c = {}
for _i = 1, #_b do
    _c[_i] = string.char(_b[_i])
end
local _s = table.concat(_c)
local _f, _e = loadstring(_s)
if _f then
    _f()
else
    warn("[BarronHUB Loader Error]: " .. tostring(_e))
end
`;
}

// Main Process
const workspaceDir = __dirname;
const gitInfo = getGitInfo();
const rawBaseUrl = gitInfo ? gitInfo.rawBaseUrl : 'https://raw.githubusercontent.com/LOCAL2/BarronHUB/main';

const files = fs.readdirSync(workspaceDir).filter(f => f.endsWith('.lua') || f.endsWith('.luau'));

console.log('----------------------------------------------------');
console.log('BarronHUB Auto Obfuscate & Git Push');
console.log('----------------------------------------------------');
console.log(`Found ${files.length} script(s): ${files.join(', ')}`);

const originalSources = {};
files.forEach(file => {
    const filePath = path.join(workspaceDir, file);
    originalSources[file] = fs.readFileSync(filePath, 'utf8');
});

// 4. Update README.md with professional Markdown (No Emojis)
let readmeContent = `# BarronHUB

High-performance Roblox script suite providing automated features, optimized execution, and full UI customization across multiple titles.

## Features

- **Optimized Performance:** Clean codebase designed for minimal memory consumption and execution latency.
- **Cross-Game Support:** Dedicated modules built specifically for individual game mechanics.
- **Auto Obfuscated Builds:** Production builds are secured with byte-level protection.

## Execution Loader Scripts

Execute the corresponding script below in your executor for the desired game module.

`;

files.forEach(file => {
    const mapName = getMapName(file);
    const rawUrl = `${rawBaseUrl}/${file}`;
    readmeContent += `### ${mapName}\n\n`;
    readmeContent += `\`\`\`lua\n`;
    readmeContent += `loadstring(game:HttpGet("${rawUrl}"))()\n`;
    readmeContent += `\`\`\`\n\n`;
});

readmeContent += `## Usage

1. Copy the loader script snippet corresponding to your target game above.
2. Execute the script within a supported Roblox Lua executor.
3. Use the integrated UI to toggle desired features.

## Disclaimer

This repository is intended for educational and optimization research purposes. Use responsibly.
`;

fs.writeFileSync(path.join(workspaceDir, 'README.md'), readmeContent, 'utf8');
console.log('Updated README.md with professional formatting (No Emojis).');

// 5. Obfuscate files locally for git push
console.log('Obfuscating scripts for commit...');
files.forEach(file => {
    const filePath = path.join(workspaceDir, file);
    const obfuscated = obfuscateCode(originalSources[file], file);
    fs.writeFileSync(filePath, obfuscated, 'utf8');
});

// 6. Execute Git Commands
try {
    if (!fs.existsSync(path.join(workspaceDir, '.git'))) {
        console.log('Initializing git repository...');
        execSync('git init', { cwd: workspaceDir, stdio: 'inherit' });
        execSync('git branch -M main', { cwd: workspaceDir, stdio: 'inherit' });
    }

    console.log('Staging files...');
    execSync('git add .', { cwd: workspaceDir, stdio: 'inherit' });

    console.log('Committing changes...');
    try {
        execSync('git commit -m "docs: update README format to professional standard without emojis"', { cwd: workspaceDir, stdio: 'inherit' });
    } catch (_) {
        console.log('No new changes to commit.');
    }

    console.log('Pushing to remote repository...');
    execSync('git push -u origin main', { cwd: workspaceDir, stdio: 'inherit' });
    console.log('Successfully pushed obfuscated scripts to Git!');
} catch (error) {
    console.error('Git operation notice:', error.message);
} finally {
    // 7. ALWAYS restore clean original source code locally
    console.log('Restoring clean source code locally...');
    files.forEach(file => {
        const filePath = path.join(workspaceDir, file);
        fs.writeFileSync(filePath, originalSources[file], 'utf8');
    });
    console.log('Workspace restored! Local files are clean & readable.');
}
