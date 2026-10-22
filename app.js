const presets = {
    preset_null: "",
    preset_null_hazards: `# Null hazard sample\nuser = None\nprint(user.name)\n\nconfig = {\"host\": \"localhost\"}\nprint(config[\"port\"])\n\nitems = None\nfor item in items:\n    print(item)\n`,
    preset_python: `import os\nimport sys\n\ndef load_user(user_id):\n    if user_id is None:\n        return None\n    return {\"id\": user_id, \"name\": \"Sam\"}\n\nuser = load_user(None)\nprint(user[\"name\"])\n\npath = \"/tmp/data.txt\"\nif not os.path.exists(path):\n    raise FileNotFoundError(path)\n\nvalue = \"\"\nprint(value.strip().lower())\n`,
    preset_c: `#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    int *ptr = NULL;\n    *ptr = 42;\n\n    char *buf = malloc(16);\n    if (buf == NULL) {\n        return 1;\n    }\n\n    sprintf(buf, \"demo\");\n    free(buf);\n    return 0;\n}`,
    preset_cpp: `#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string* name = nullptr;\n    cout << name->length() << endl;\n    return 0;\n}`,
    preset_java: `public class Main {\n    public static void main(String[] args) {\n        String name = null;\n        System.out.println(name.length());\n\n        String[] items = new String[3];\n        System.out.println(items[0].toUpperCase());\n    }\n}`,
    preset_js: `function getProfile(user) {\n  if (!user) return null;\n  return { name: user.name, email: user.email };\n}\n\nconst profile = getProfile(null);\nconsole.log(profile.name);\n\nconst items = undefined;\nfor (const item of items) {\n  console.log(item);\n}`,
    preset_ts: `type User = { name: string; email?: string };\n\nfunction getName(user: User | null) {\n  return user.name;\n}\n\nconst user: User | null = null;\nconsole.log(getName(user));\n`,
    preset_csharp: `using System;\n\nclass Demo {\n    static void Main() {\n        string name = null;\n        Console.WriteLine(name.Length);\n\n        string[] values = null;\n        Console.WriteLine(values[0]);\n    }\n}`,
    preset_go: `package main\n\nimport \"fmt\"\n\nfunc main() {\n    data := map[string]string{\n        \"name\": \"alice\",\n    }\n\n    fmt.Println(data[\"missing\"][0])\n    fmt.Println(data[\"name\"])\n}`,
    preset_rust: `fn main() {\n    let value = Some(String::from(\"demo\"));\n    let text = value.unwrap();\n    println!(\"{}\", text);\n\n    let maybe: Option<&str> = None;\n    println!(\"{}\", maybe.unwrap());\n}`,
    preset_sql: `SELECT * FROM users WHERE name = NULL;\nSELECT * FROM orders WHERE amount = NULL;\nSELECT * FROM customers WHERE id = 5 AND email = NULL;`,
    preset_20: `def login(user):\n    if not user:\n        return None\n    return user.get(\"name\")\n\nprofile = login({})\nprint(profile.upper())\n\nvalue = None\nprint(value[0])\n`,
    preset_200: `def process_order(order):\n    if not order:\n        return \"missing\"\n\n    total = order.get(\"amount\")\n    tax = total * 0.2\n    final = total + tax\n    return final\n\nuser = {\"name\": \"Ada\"}\nprint(user[\"profile\"][\"email\"])\n\nitems = None\nfor x in items:\n    print(x)\n\nresult = process_order({\"amount\": 100})\nprint(result)\n`,
    preset_500: `def build_app():\n    config = None\n    if config[\"db\"] == \"prod\":\n        print(\"bad\")\n\n    users = [{\"id\": 1, \"name\": \"A\"}, {\"id\": 2}]\n    for user in users:\n        if user.get(\"profile\") is None:\n            continue\n        print(user[\"profile\"][\"email\"])\n\n    data = {\"items\": [1, 2, 3]}\n    print(data[\"items\"][10])\n\n    return \"ok\"\n\nprint(build_app())\n`
};

const state = {
    currentFilter: 'all',
    issues: [],
    selectedLang: 'auto'
};

const codeEditor = document.getElementById('codeEditor');
const fileExt = document.getElementById('fileExt');
const languageSelect = document.getElementById('languageSelect');
const presetSelect = document.getElementById('presetSelect');
const analyzeBtn = document.getElementById('analyzeBtn');
const clearBtn = document.getElementById('clearBtn');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const issuesContainer = document.getElementById('issuesContainer');
const summaryPills = document.getElementById('summaryPills');
const toast = document.getElementById('toast');
const lineGutter = document.getElementById('lineGutter');
const statLines = document.getElementById('statLines');
const statChars = document.getElementById('statChars');
const statLangBadge = document.getElementById('statLangBadge');
const togglePanelBtn = document.getElementById('togglePanelBtn');
const resultsPanel = document.getElementById('resultsPanel');

const languageMap = {
    auto: '.auto',
    python: '.py',
    javascript: '.js',
    typescript: '.ts',
    go: '.go',
    c: '.c',
    cpp: '.cpp',
    java: '.java',
    csharp: '.cs',
    rust: '.rs',
    php: '.php',
    ruby: '.rb',
    kotlin: '.kt',
    swift: '.swift',
    sql: '.sql',
    html: '.html',
    generic: '.txt'
};

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timeoutId);
    showToast.timeoutId = setTimeout(() => toast.classList.remove('show'), 1800);
}

function getDetectedLanguage(code) {
    const snippets = {
        python: /\b(def |import |from |print\()/,
        javascript: /(function\s|const\s|let\s|=>|console\.log)/,
        typescript: /interface\s|type\s|:\s*string|implements /,
        go: /package\s+main|func\s+main\(|fmt\./,
        c: /#include\s*<|int\s+main\s*\(/,
        cpp: /#include\s*<|std::|cout\s*<<|using\s+namespace/,
        java: /public\s+class\s+|System\.out|import\s+java\./,
        csharp: /using\s+System|class\s+\w+|Console\.WriteLine/,
        rust: /fn\s+main\(|println!|Option<|let\s+mut/,
        php: /<\?php|function\s+\w+\s*\(/,
        ruby: /def\s+\w+|puts\s+|end\b/,
        sql: /SELECT\s+|INSERT\s+INTO|UPDATE\s+|CREATE\s+TABLE/,
        html: /<html|<div|<script|<body/,
    };

    for (const [lang, pattern] of Object.entries(snippets)) {
        if (pattern.test(code)) return lang;
    }

    return 'generic';
}

function updateStats() {
    const code = codeEditor.value;
    const lines = code === '' ? 1 : Math.max(1, code.split('\n').length);
    const chars = code.length;

    statLines.textContent = `Lines: ${lines}`;
    statChars.textContent = `Chars: ${chars}`;

    const detectedLang = getDetectedLanguage(code);
    statLangBadge.textContent = (state.selectedLang === 'auto' ? detectedLang : state.selectedLang).toUpperCase();
    const ext = languageMap[state.selectedLang === 'auto' ? detectedLang : state.selectedLang] || '.txt';
    fileExt.textContent = ext;

    const gutter = [];
    for (let i = 1; i <= lines; i++) {
        gutter.push(`<div class="line-num">${i}</div>`);
    }
    lineGutter.innerHTML = gutter.join('');
}

function setEditorContent(content, mode = 'auto') {
    codeEditor.value = content;
    if (mode !== 'auto') {
        languageSelect.value = mode;
        state.selectedLang = mode;
    } else {
        languageSelect.value = 'auto';
        state.selectedLang = 'auto';
    }
    updateStats();
}

function parseIssueMatch(lineNumber, matchText, level, message, explanation) {
    const normalized = matchText.trim();
    if (!normalized) return null;
    return {
        id: `${level}-${lineNumber}-${Math.random().toString(16).slice(2, 8)}`,
        level,
        lineNumber,
        title: level === 'error' ? 'ERROR' : level === 'warning' ? 'WARNING' : 'INFO',
        message,
        explanation,
        match: normalized
    };
}

function analyzeCode() {
    const code = codeEditor.value;
    const lines = code.split('\n');
    const issues = [];

    if (!code.trim()) {
        issues.push({
            id: 'empty',
            level: 'info',
            lineNumber: 1,
            title: 'INFO',
            message: 'No executable code detected.',
            explanation: 'The editor is empty or only contains whitespace. Add source code to inspect for defects.'
        });
    }

    const patterns = [
        { regex: /\b(?:NULL|null|None|nil|nullptr)\b/gi, level: 'error', message: 'Null-like value encountered.', explanation: 'This value can trigger null pointer, null reference, or nil dereference issues.' },
        { regex: /\.(?:length|toUpperCase|trim|split|lower|upper)\s*\(/gi, level: 'warning', message: 'Method called on possibly null value.', explanation: 'Check whether the receiver is guaranteed to be initialized before invoking member methods.' },
        { regex: /\b(?:for|while)\s*\([^\)]*\b(?:in|of)\s+[^\)]*\b(?:undefined|null|None)\b/gi, level: 'warning', message: 'Loop over a potentially null or undefined collection.', explanation: 'Iterating over an uninitialized value can crash at runtime.' },
        { regex: /\[[^\]]+\]/g, level: 'info', message: 'Indexing operation detected.', explanation: 'Index access should be validated against array bounds or map keys.' },
        { regex: /(?:return\s+null|return\s+None|return\s+nil)/gi, level: 'warning', message: 'Function returns a null-like value.', explanation: 'Callers may fail to guard against null results and produce runtime exceptions.' },
        { regex: /(?:\bif\s*\([^\)]*==\s*(?:NULL|null|None|nil)\)|\b==\s*(?:NULL|null|None|nil)\b)/gi, level: 'info', message: 'Comparison against null-like value.', explanation: 'Be careful: equality checks against null are commonly a source of logic bugs in many languages.' },
        { regex: /(?:raise\s+FileNotFoundError|throw\s+new\s+Error|panic\(|fatal\()/gi, level: 'info', message: 'Exception or exit path identified.', explanation: 'This may be part of a valid error-handling flow, but it should be reviewed to confirm graceful recovery.' }
    ];

    lines.forEach((line, idx) => {
        const lineNumber = idx + 1;
        patterns.forEach((pattern) => {
            const match = line.match(pattern.regex);
            if (!match) return;
            const parsed = parseIssueMatch(lineNumber, match[0], pattern.level, pattern.message, pattern.explanation);
            if (parsed) issues.push(parsed);
        });
    });

    if (issues.length === 0) {
        issues.push({
            id: 'clean',
            level: 'info',
            lineNumber: 1,
            title: 'INFO',
            message: 'No obvious bug signatures found in the current source snippet.',
            explanation: 'This does not guarantee correctness; continue manual review for logic or edge-case problems.'
        });
    }

    state.issues = issues;
    renderIssues();
    updateSummary();
}

function updateSummary() {
    const counts = {
        all: state.issues.length,
        error: state.issues.filter(issue => issue.level === 'error').length,
        warning: state.issues.filter(issue => issue.level === 'warning').length,
        info: state.issues.filter(issue => issue.level === 'info').length
    };

    document.getElementById('countAll').textContent = counts.all;
    document.getElementById('countErrors').textContent = counts.error;
    document.getElementById('countWarnings').textContent = counts.warning;
    document.getElementById('countInfos').textContent = counts.info;

    const summaryItems = [];
    if (counts.error > 0) summaryItems.push(`<span class="pill pill-error">${counts.error} errors</span>`);
    if (counts.warning > 0) summaryItems.push(`<span class="pill pill-warning">${counts.warning} warnings</span>`);
    if (counts.info > 0) summaryItems.push(`<span class="pill pill-info">${counts.info} infos</span>`);
    if (summaryItems.length === 0) summaryItems.push('<span class="pill pill-idle">RUN TEST TO DETECT ERRORS</span>');

    summaryPills.innerHTML = summaryItems.join('');
}

function renderIssues() {
    const filter = state.currentFilter;
    const filtered = state.issues.filter(issue => filter === 'all' || issue.level === filter);

    if (filtered.length === 0) {
        issuesContainer.innerHTML = `
            <div class="empty-state">
                <div class="pixel-radar"></div>
                <p class="empty-title">NO MATCHES</p>
                <p class="empty-desc">No issues match the current filter. Try switching to a different severity band.</p>
            </div>
        `;
        return;
    }

    issuesContainer.innerHTML = filtered.map((issue) => `
        <div class="issue-item ${issue.level}">
            <div class="issue-marker">${issue.level === 'error' ? 'X' : issue.level === 'warning' ? '!' : 'i'}</div>
            <div class="issue-content">
                <div class="issue-header">
                    <span class="issue-type">${issue.title}</span>
                    <span class="issue-line">line ${issue.lineNumber}</span>
                </div>
                <p class="issue-message">${issue.message}</p>
                <span class="issue-explainer">${issue.explanation}</span>
            </div>
        </div>
    `).join('');
}

function bindEvents() {
    codeEditor.addEventListener('input', () => {
        updateStats();
    });

    codeEditor.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            analyzeCode();
        }
    });

    languageSelect.addEventListener('change', (event) => {
        state.selectedLang = event.target.value;
        updateStats();
    });

    presetSelect.addEventListener('change', (event) => {
        const presetKey = event.target.value;
        if (!presetKey) return;
        const content = presets[presetKey] ?? '';
        setEditorContent(content, 'auto');
        presetSelect.value = '';
        showToast('sample preset loaded');
    });

    analyzeBtn.addEventListener('click', analyzeCode);

    clearBtn.addEventListener('click', () => {
        codeEditor.value = '';
        updateStats();
        state.issues = [];
        renderIssues();
        updateSummary();
        showToast('editor cleared');
    });

    uploadBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result || '';
            const fileName = file.name.toLowerCase();
            let inferred = 'generic';

            if (fileName.endsWith('.py')) inferred = 'python';
            else if (fileName.endsWith('.js')) inferred = 'javascript';
            else if (fileName.endsWith('.ts')) inferred = 'typescript';
            else if (fileName.endsWith('.go')) inferred = 'go';
            else if (fileName.endsWith('.c')) inferred = 'c';
            else if (fileName.endsWith('.cpp') || fileName.endsWith('.cc')) inferred = 'cpp';
            else if (fileName.endsWith('.java')) inferred = 'java';
            else if (fileName.endsWith('.cs')) inferred = 'csharp';
            else if (fileName.endsWith('.rs')) inferred = 'rust';
            else if (fileName.endsWith('.sql')) inferred = 'sql';
            else if (fileName.endsWith('.html')) inferred = 'html';

            setEditorContent(content, inferred);
            showToast(`loaded ${file.name}`);
            event.target.value = '';
        };
        reader.readAsText(file);
    });

    document.querySelectorAll('.filter-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            state.currentFilter = btn.dataset.filter;
            document.querySelectorAll('.filter-btn').forEach((b) => b.classList.toggle('active', b === btn));
            renderIssues();
        });
    });

    togglePanelBtn.addEventListener('click', () => {
        const isMinimized = resultsPanel.style.maxHeight === '0px';
        resultsPanel.style.maxHeight = isMinimized ? 'none' : '0px';
        resultsPanel.style.overflow = 'hidden';
        togglePanelBtn.textContent = isMinimized ? '▲' : '▼';
    });

    window.addEventListener('load', () => {
        setEditorContent('// Paste your source code here\n// Click TEST CODE to begin scanning\n', 'auto');
        updateSummary();
        renderIssues();
        drawPixelLogo();
    });
}

function drawPixelLogo() {
    const canvas = document.getElementById('pixelCanvas');
    const ctx = canvas.getContext('2d');
    const size = 48;

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#0e1728';
    ctx.fillRect(0, 0, size, size);

    const pixels = [
        [0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0],
        [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1],
        [1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0],
        [0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ];

    const blockSize = 4;
    for (let y = 0; y < pixels.length; y++) {
        for (let x = 0; x < pixels[y].length; x++) {
            if (pixels[y][x] === 1) {
                ctx.fillStyle = '#75efff';
                ctx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
            }
        }
    }
}

bindEvents();

