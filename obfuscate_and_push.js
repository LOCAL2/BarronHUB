const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Map Information Configuration (Links & Thumbnails)
const mapMetadata = {
    'ArsenalHub.lua': {
        name: 'Arsenal',
        link: 'https://www.roblox.com/games/286090429/Arsenal',
        image: 'https://assetgame.roblox.com/Game/Tools/ThumbnailAsset.ashx?aid=286090429&fmt=png&wd=420&ht=230'
    },
    'CleanAllTheLeavesHub.lua': {
        name: 'Clean All The Leaves',
        link: 'https://www.roblox.com/games/16474136661/Clean-All-The-Leaves',
        image: 'https://assetgame.roblox.com/Game/Tools/ThumbnailAsset.ashx?aid=16474136661&fmt=png&wd=420&ht=230'
    },
    'HeroesRNG.luau': {
        name: 'Heroes RNG',
        link: 'https://www.roblox.com/games/16773539194/Heroes-RNG',
        image: 'https://assetgame.roblox.com/Game/Tools/ThumbnailAsset.ashx?aid=16773539194&fmt=png&wd=420&ht=230'
    }
};

// 2. Get git remote URL to construct raw loadstring URLs
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

// 3. Fallback map name formatter
function getMapName(filename) {
    let base = path.parse(filename).name;
    if (base.endsWith('Hub')) {
        base = base.slice(0, -3);
    }
    const formatted = base.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
    return formatted.trim();
}

// 4. Obfuscation helper (Byte-array loader wrapper)
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

// 5. Build minimal, professional README containing ONLY map sections with links & images
let readmeContent = `# BarronHUB\n\n`;

files.forEach(file => {
    const meta = mapMetadata[file] || {
        name: getMapName(file),
        link: `https://www.roblox.com/discover`,
        image: ''
    };
    const rawUrl = `${rawBaseUrl}/${file}`;

    readmeContent += `## ${meta.name}\n\n`;
    if (meta.image) {
        readmeContent += `[![${meta.name}](${meta.image})](${meta.link})\n\n`;
    }
    readmeContent += `[Game Link](${meta.link})\n\n`;
    readmeContent += `\`\`\`lua\n`;
    readmeContent += `loadstring(game:HttpGet("${rawUrl}"))()\n`;
    readmeContent += `\`\`\`\n\n`;
});

fs.writeFileSync(path.join(workspaceDir, 'README.md'), readmeContent, 'utf8');
console.log('Updated README.md with map sections, links, and images (No extra sections / emojis).');

// 6. Obfuscate files locally for git push
console.log('Obfuscating scripts for commit...');
files.forEach(file => {
    const filePath = path.join(workspaceDir, file);
    const obfuscated = obfuscateCode(originalSources[file], file);
    fs.writeFileSync(filePath, obfuscated, 'utf8');
});

// 7. Execute Git Commands
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
        execSync('git commit -m "docs: simplify README to map sections with images and links only"', { cwd: workspaceDir, stdio: 'inherit' });
    } catch (_) {
        console.log('No new changes to commit.');
    }

    console.log('Pushing to remote repository...');
    execSync('git push -u origin main', { cwd: workspaceDir, stdio: 'inherit' });
    console.log('Successfully pushed obfuscated scripts to Git!');
} catch (error) {
    console.error('Git operation notice:', error.message);
} finally {
    // 8. ALWAYS restore clean original source code locally
    console.log('Restoring clean source code locally...');
    files.forEach(file => {
        const filePath = path.join(workspaceDir, file);
        fs.writeFileSync(filePath, originalSources[file], 'utf8');
    });
    console.log('Workspace restored! Local files are clean & readable.');
}
