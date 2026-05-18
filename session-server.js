const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 3456;
const CLAW_DIR = path.join(process.env.HOME, '.claude');
const PROJECTS_DIR = path.join(CLAW_DIR, 'projects');
const SESSIONS_DIR = path.join(CLAW_DIR, 'sessions');
const SESSION_DATA_DIR = path.join(CLAW_DIR, 'session-data');

const MAX_TURNS = 20;

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json'
};

async function getActiveSessions() {
    const sessions = [];
    
    try {
        const files = await fs.promises.readdir(SESSIONS_DIR);
        const sessionFiles = files.filter(f => f.endsWith('.json'));
        
        for (const file of sessionFiles) {
            try {
                const content = await fs.promises.readFile(path.join(SESSIONS_DIR, file), 'utf-8');
                const session = JSON.parse(content);
                
                const projectPath = session.cwd || '/unknown';
                const projectName = path.basename(projectPath);
                
                // Get detailed session info using session ID
                const sessionInfo = await getSessionDetails(session.sessionId, projectPath);
                
                sessions.push({
                    id: session.sessionId,
                    name: projectName,
                    path: projectPath,
                    pid: session.pid,
                    turn: sessionInfo.turnCount,
                    maxTurns: MAX_TURNS,
                    health: calculateHealth(sessionInfo.turnCount),
                    status: session.status || 'unknown',
                    lastActivity: sessionInfo.lastActivity,
                    startedAt: new Date(session.startedAt).toISOString(),
                    currentTask: sessionInfo.currentTask,
                    recentActions: sessionInfo.recentActions,
                    modifiedFiles: sessionInfo.modifiedFiles,
                    taskHistory: sessionInfo.taskHistory
                });
            } catch (e) {
                console.error(`Error parsing session file ${file}:`, e.message);
            }
        }
    } catch (e) {
        console.error('Error reading sessions directory:', e.message);
    }
    
    return sessions.sort((a, b) => a.health - b.health);
}

async function getSessionDetails(sessionId, projectPath) {
    const info = {
        turnCount: 0,
        lastActivity: 'Unknown',
        currentTask: null,
        recentActions: [],
        modifiedFiles: [],
        taskHistory: []
    };
    
    const shortId = sessionId.substring(0, 8);
    
    try {
        const files = await fs.promises.readdir(SESSION_DATA_DIR);
        const tmpFiles = files.filter(f => f.endsWith('-session.tmp'));
        
        // Sort by date, most recent first
        tmpFiles.sort().reverse();
        
        for (const file of tmpFiles) {
            try {
                const content = await fs.promises.readFile(path.join(SESSION_DATA_DIR, file), 'utf-8');
                
                // Primary match: by project path
                // Secondary match: by short session ID in filename (e.g., d38369fc)
                const fileShortId = file.match(/-([a-f0-9]+)-session\.tmp$/)?.[1];
                
                // fileShortId appears at the END of the full sessionId
                // If tmp filename has a shortId, it MUST match (strict mode to avoid cross-match)
                const needsIdMatch = fileShortId; // tmp filename contains shortId
                const idMatches = needsIdMatch ? sessionId.endsWith(fileShortId) : true;
                // When tmp has shortId in filename, id MUST match, not just path
                const pathMatches = content.includes(projectPath);

                if (needsIdMatch && !idMatches) continue; // strict: shortId in filename must match
                if (!pathMatches) continue;
                
                // Extract turn count
                const turnMatch = content.match(/Total user messages:\s*(\d+)/);
                if (turnMatch) {
                    info.turnCount = Math.min(parseInt(turnMatch[1]), MAX_TURNS);
                }
                
                // Extract tasks
                const tasksMatch = content.match(/### Tasks\n([\s\S]*?)(?=### Files|$)/);
                if (tasksMatch) {
                    const tasksContent = tasksMatch[1];
                    const tasks = tasksContent.match(/(?:^|\n)-\s+(.+)/g) || [];
                    info.taskHistory = tasks.map(t => t.replace(/^\s*-\s+/, '').trim()).filter(Boolean);
                    
                    if (info.taskHistory.length > 0) {
                        info.currentTask = info.taskHistory[info.taskHistory.length - 1];
                    }
                }
                
                // Extract modified files
                const filesMatch = content.match(/### Files Modified\n([\s\S]*?)(?=### Tools|$)/);
                if (filesMatch) {
                    const filesContent = filesMatch[1];
                    const files = filesContent.match(/(?:^|\n)-\s+(.+)/g) || [];
                    info.modifiedFiles = files.map(f => {
                        const filePath = f.replace(/^\s*-\s+/, '').trim();
                        return filePath.split('/').pop();
                    }).filter(Boolean);
                }
                
                // Extract last updated
                const updatedMatch = content.match(/\*\*Last Updated:\*\*\s*(.+)/);
                if (updatedMatch) {
                    info.lastActivity = updatedMatch[1].trim();
                }
                
                break;
            } catch (e) {}
        }
    } catch (e) {}
    
    // Fallback: check project JSONL for turn count
    if (info.turnCount === 0) {
        const projectHash = hashProjectPath(projectPath);
        const projectDir = path.join(PROJECTS_DIR, projectHash);
        
        if (fs.existsSync(projectDir)) {
            const sessionFile = path.join(projectDir, `${sessionId}.jsonl`);
            if (fs.existsSync(sessionFile)) {
                try {
                    const stats = await fs.promises.stat(sessionFile);
                    info.turnCount = Math.min(Math.ceil(stats.size / 200), MAX_TURNS);
                } catch (e) {}
            }
        }
    }
    
    return info;
}

function hashProjectPath(projectPath) {
    return Buffer.from(projectPath).toString('base64')
        .replace(/[/+=]/g, '_').substring(0, 50);
}

function calculateHealth(turnCount) {
    if (turnCount >= MAX_TURNS) return 0;
    if (turnCount >= 18) return 20;
    if (turnCount >= 15) return 40;
    if (turnCount >= 10) return 60;
    return 100 - (turnCount * 3);
}

async function triggerHandoff(sessionId, projectPath) {
    const handoffPath = path.join(projectPath, 'handoff.md');
    const info = await getSessionDetails(sessionId, projectPath);
    
    const handoffContent = `---
name: session-handoff
generated: true
sessionId: ${sessionId}
generatedAt: ${new Date().toISOString()}
---

# Session Handoff

## Session Meta
- Project: ${path.basename(projectPath)}
- Date: ${new Date().toISOString()}
- Session ID: ${sessionId.substring(0, 8)}...
- Turn Count: ${info.turnCount}
- Reason: Manual handoff triggered from session monitor

## Current Task
${info.currentTask || 'Not specified'}

## Task History
${info.taskHistory.length > 0 ? info.taskHistory.map((t, i) => `${i + 1}. ${t}`).join('\n') : 'No tasks recorded'}

## Modified Files
${info.modifiedFiles.length > 0 ? info.modifiedFiles.map(f => `- ${f}`).join('\n') : 'No files modified'}

## Next Steps
- Priority 1: Resume from current task
- Priority 2: Review modified files  
- Priority 3: Continue with task history
`;

    try {
        await fs.promises.writeFile(handoffPath, handoffContent);

        // Launch new claude session in the project directory
        const startupPrompt = `请阅读当前目录的 handoff.md 文件，了解上一个会话的状态和任务历史，然后继续执行其中的任务。`;

        spawn('claude', ['-p', startupPrompt], {
            cwd: projectPath,
            detached: true,
            stdio: 'ignore'
        }).unref();

        return { success: true, path: handoffPath, newSession: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function parseUrl(url) {
    const [pathname, query] = url.split('?');
    const segments = pathname.split('/').filter(Boolean);
    return { pathname, segments, query };
}

const server = http.createServer(async (req, res) => {
    const url = req.url === '/' ? '/session-monitor.html' : req.url;
    const { pathname, segments } = parseUrl(url);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    try {
        if (pathname === '/api/sessions' && req.method === 'GET') {
            const sessions = await getActiveSessions();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(sessions));
            return;
        }
        
        if (pathname === '/api/session' && segments[2] && req.method === 'GET') {
            const sessions = await getActiveSessions();
            const session = sessions.find(s => s.id === segments[2]);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(session || { error: 'Session not found' }));
            return;
        }
        
        if (pathname === '/api/handoff' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { sessionId, projectPath } = JSON.parse(body);
                    const result = await triggerHandoff(sessionId, projectPath);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: e.message }));
                }
            });
            return;
        }
        
        if (pathname === '/api/refresh' && req.method === 'GET') {
            const sessions = await getActiveSessions();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ refreshed: true, sessions }));
            return;
        }
        
        const filePath = path.join('/Users/xueancao/Projects/QoderProjects/star-river', url.split('?')[0]);
        
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath);
            const contentType = MIME_TYPES[ext] || 'text/plain';
            const content = await fs.promises.readFile(filePath);
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
            return;
        }
        
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        
    } catch (e) {
        console.error('Server error:', e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
    }
});

server.listen(PORT, () => {
    console.log(`Session Monitor Server running at http://localhost:${PORT}`);
});
