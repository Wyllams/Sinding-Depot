import http from 'http';
import fs from 'fs/promises';
import path from 'path';

const PORT = 3333;
const PLANNING_DIR = path.join(process.cwd(), '.planning');

async function safeReadFile(filename) {
    try {
        return await fs.readFile(path.join(PLANNING_DIR, filename), 'utf8');
    } catch (e) {
        return `*File not found or empty: ${filename}*`;
    }
}

const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GSD Command Center</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: {
              black: '#050505',
              dark: '#0f172a',
              panel: '#1e293b',
              blue: '#00d2ff',
              light: '#e0f2fe'
            }
          }
        }
      }
    }
  </script>
  <style>
    body { background-color: #050505; color: #f8fafc; font-family: ui-sans-serif, system-ui, sans-serif; }
    .glass { background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(0, 210, 255, 0.15); }
    
    /* Markdown Styles */
    .prose { color: #cbd5e1; font-size: 0.95rem; line-height: 1.6; }
    .prose h1, .prose h2, .prose h3 { color: #00d2ff; font-weight: 600; margin-top: 2em; margin-bottom: 0.75em; border-bottom: 1px solid rgba(0, 210, 255, 0.1); padding-bottom: 0.3em; }
    .prose h1 { font-size: 1.75rem; margin-top: 1em; }
    .prose h2 { font-size: 1.4rem; }
    .prose h3 { font-size: 1.1rem; border-bottom: none; }
    .prose p { margin-bottom: 1.2em; }
    .prose ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1.2em; }
    .prose ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1.2em; }
    .prose li { margin-bottom: 0.4em; }
    .prose a { color: #00d2ff; text-decoration: none; border-bottom: 1px dashed rgba(0,210,255,0.5); }
    .prose a:hover { border-bottom-style: solid; }
    .prose code { background: rgba(0, 210, 255, 0.1); color: #00d2ff; padding: 0.2em 0.4em; border-radius: 4px; font-size: 0.85em; font-family: monospace; }
    .prose pre { background: #0f172a; border: 1px solid rgba(0, 210, 255, 0.2); padding: 1.2em; border-radius: 8px; overflow-x: auto; margin-bottom: 1.5em; }
    .prose pre code { background: transparent; color: #e2e8f0; padding: 0; font-size: 0.9em; border: none; }
    .prose blockquote { border-left: 3px solid #00d2ff; padding-left: 1em; color: #94a3b8; font-style: italic; background: rgba(0,210,255,0.05); padding-top: 0.5em; padding-bottom: 0.5em; margin-bottom: 1.2em; border-radius: 0 8px 8px 0; }
    
    /* Tables */
    .prose table { width: 100%; border-collapse: collapse; margin-bottom: 1.5em; font-size: 0.9em; }
    .prose th, .prose td { border: 1px solid rgba(0, 210, 255, 0.2); padding: 0.75em 1em; text-align: left; }
    .prose th { background: rgba(0, 210, 255, 0.1); color: #00d2ff; font-weight: 600; }
    .prose tr:nth-child(even) { background: rgba(255,255,255,0.02); }
    
    /* UI States */
    .nav-item.active { background: rgba(0, 210, 255, 0.1); border-right: 3px solid #00d2ff; color: #00d2ff; }
    .cmd-btn { transition: all 0.2s; }
    .cmd-btn:hover { border-color: #00d2ff; background: rgba(0, 210, 255, 0.1); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,210,255,0.1); }
    .cmd-btn:active { transform: translateY(0); }
    
    /* Checkboxes in markdown (like [ ] or [x]) */
    .prose input[type="checkbox"] { accent-color: #00d2ff; margin-right: 0.5em; }
    
    /* Scrollbar */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #050505; }
    ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #00d2ff; }
    
    .toast {
      position: fixed; bottom: 24px; right: 24px;
      background: #00d2ff; color: #050505;
      padding: 12px 24px; border-radius: 8px;
      font-weight: bold; transform: translateY(100px);
      opacity: 0; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 50;
      box-shadow: 0 10px 25px rgba(0,210,255,0.3);
    }
    .toast.show { transform: translateY(0); opacity: 1; }
  </style>
</head>
<body class="h-screen flex overflow-hidden selection:bg-brand-blue/30 selection:text-white">
  
  <!-- Sidebar Navigation -->
  <aside class="w-64 glass flex flex-col h-full border-r border-brand-blue/20 z-10">
    <div class="p-6 border-b border-brand-blue/20 flex items-center gap-4">
      <div class="w-10 h-10 rounded-lg bg-brand-blue/10 border border-brand-blue/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,210,255,0.2)]">
        <i class="fa-solid fa-rocket text-brand-blue text-xl"></i>
      </div>
      <div>
        <h1 class="font-bold text-lg tracking-wider text-slate-100">GSD</h1>
        <p class="text-[10px] text-brand-blue uppercase tracking-widest font-semibold">Command Center</p>
      </div>
    </div>
    
    <nav class="flex-1 py-6 flex flex-col gap-2">
      <button onclick="switchTab('roadmap')" id="tab-roadmap" class="nav-item flex items-center gap-3 px-6 py-3 text-slate-400 hover:bg-brand-blue/5 hover:text-slate-200 transition-colors text-left text-sm font-medium">
        <i class="fa-solid fa-map-location-dot w-5 text-center"></i> Roadmap
      </button>
      <button onclick="switchTab('state')" id="tab-state" class="nav-item flex items-center gap-3 px-6 py-3 text-slate-400 hover:bg-brand-blue/5 hover:text-slate-200 transition-colors text-left text-sm font-medium">
        <i class="fa-solid fa-bolt w-5 text-center"></i> Current State
      </button>
      <button onclick="switchTab('project')" id="tab-project" class="nav-item flex items-center gap-3 px-6 py-3 text-slate-400 hover:bg-brand-blue/5 hover:text-slate-200 transition-colors text-left text-sm font-medium">
        <i class="fa-solid fa-book-open w-5 text-center"></i> Project Vision
      </button>
      <button onclick="switchTab('requirements')" id="tab-requirements" class="nav-item flex items-center gap-3 px-6 py-3 text-slate-400 hover:bg-brand-blue/5 hover:text-slate-200 transition-colors text-left text-sm font-medium">
        <i class="fa-solid fa-list-check w-5 text-center"></i> Requirements
      </button>
    </nav>
    
    <div class="p-6 border-t border-brand-blue/20 bg-brand-dark/30">
      <button onclick="fetchData()" class="w-full py-2.5 bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue border border-brand-blue/30 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-semibold shadow-inner shadow-brand-blue/10">
        <i class="fa-solid fa-arrows-rotate"></i> Refresh Data
      </button>
      <p class="text-xs text-center text-slate-500 mt-3 flex items-center justify-center gap-1">
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-brand-blue"></span>
        </span>
        Auto-sync active (30s)
      </p>
    </div>
  </aside>

  <!-- Main Content Area -->
  <main class="flex-1 flex flex-col h-full overflow-hidden bg-brand-black relative">
    <!-- Background Glow effect -->
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-blue/5 blur-[120px] rounded-full pointer-events-none"></div>

    <!-- Header -->
    <header class="h-16 glass border-b border-brand-blue/20 flex items-center px-10 justify-between shrink-0 z-10 bg-brand-black/50">
      <h2 id="page-title" class="text-xl font-bold text-slate-100 flex items-center gap-3">
        Roadmap
      </h2>
      <div class="flex items-center gap-4 text-sm text-slate-400">
        Project: <span class="text-brand-blue font-mono border border-brand-blue/20 px-2 py-0.5 rounded bg-brand-blue/5">Siding Depot</span>
      </div>
    </header>

    <!-- Markdown Content Viewer -->
    <div class="flex-1 overflow-y-auto p-10 relative z-10 scroll-smooth">
      <div id="content" class="prose max-w-4xl mx-auto bg-brand-panel/30 p-8 rounded-2xl border border-brand-blue/10 shadow-xl backdrop-blur-sm">
        <div class="flex items-center justify-center h-40 text-brand-blue/50">
          <i class="fa-solid fa-circle-notch fa-spin text-3xl"></i>
        </div>
      </div>
    </div>
  </main>

  <!-- Right Sidebar: Command Palette -->
  <aside class="w-80 glass flex flex-col h-full border-l border-brand-blue/20 bg-brand-dark/60 z-10">
    <div class="p-6 border-b border-brand-blue/20 bg-brand-panel/50">
      <h2 class="font-bold text-slate-100 flex items-center gap-2 text-lg">
        <i class="fa-solid fa-terminal text-brand-blue"></i> Command Palette
      </h2>
      <p class="text-xs text-slate-400 mt-1.5">Click any command to copy it for the chat.</p>
    </div>
    
    <div class="flex-1 overflow-y-auto p-5 space-y-8">
      
      <!-- Section: Main Flow -->
      <div>
        <h3 class="text-[10px] font-bold text-brand-blue uppercase tracking-widest mb-3 flex items-center gap-2">
          <i class="fa-solid fa-play"></i> Core Workflow
        </h3>
        <div class="space-y-2.5">
          <button onclick="copyCmd('/gsd-progress')" class="cmd-btn w-full text-left p-3.5 rounded-xl bg-brand-black border border-slate-800 group">
            <div class="font-mono text-sm text-slate-200 mb-1 flex justify-between items-center">
              <span>/gsd-progress</span>
              <i class="fa-regular fa-copy text-slate-600 group-hover:text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity"></i>
            </div>
            <div class="text-xs text-slate-500 group-hover:text-slate-400">Ver progresso e próximos passos</div>
          </button>
          
          <button onclick="copyCmd('/gsd-plan-phase ')" class="cmd-btn w-full text-left p-3.5 rounded-xl bg-brand-black border border-slate-800 group">
            <div class="font-mono text-sm text-slate-200 mb-1 flex justify-between items-center">
              <span>/gsd-plan-phase [N]</span>
              <i class="fa-regular fa-copy text-slate-600 group-hover:text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity"></i>
            </div>
            <div class="text-xs text-slate-500 group-hover:text-slate-400">Planejar a fase N</div>
          </button>
          
          <button onclick="copyCmd('/gsd-execute-phase ')" class="cmd-btn w-full text-left p-3.5 rounded-xl bg-brand-black border border-slate-800 group">
            <div class="font-mono text-sm text-slate-200 mb-1 flex justify-between items-center">
              <span>/gsd-execute-phase [N]</span>
              <i class="fa-regular fa-copy text-slate-600 group-hover:text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity"></i>
            </div>
            <div class="text-xs text-slate-500 group-hover:text-slate-400">Executar a fase N</div>
          </button>
        </div>
      </div>

      <!-- Section: Quick Actions -->
      <div>
        <h3 class="text-[10px] font-bold text-brand-blue uppercase tracking-widest mb-3 flex items-center gap-2">
          <i class="fa-solid fa-bolt"></i> Quick Actions
        </h3>
        <div class="space-y-2.5">
          <button onclick="copyCmd('/gsd-do ')" class="cmd-btn w-full text-left p-3.5 rounded-xl bg-brand-black border border-slate-800 group">
            <div class="font-mono text-sm text-slate-200 mb-1 flex justify-between items-center">
              <span>/gsd-do [tarefa]</span>
              <i class="fa-regular fa-copy text-slate-600 group-hover:text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity"></i>
            </div>
            <div class="text-xs text-slate-500 group-hover:text-slate-400">Deixar a IA escolher o comando</div>
          </button>

          <button onclick="copyCmd('/gsd-fast ')" class="cmd-btn w-full text-left p-3.5 rounded-xl bg-brand-black border border-slate-800 group">
            <div class="font-mono text-sm text-slate-200 mb-1 flex justify-between items-center">
              <span>/gsd-fast [tarefa]</span>
              <i class="fa-regular fa-copy text-slate-600 group-hover:text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity"></i>
            </div>
            <div class="text-xs text-slate-500 group-hover:text-slate-400">Correção rápida inline (typos, etc)</div>
          </button>
          
          <button onclick="copyCmd('/gsd-quick')" class="cmd-btn w-full text-left p-3.5 rounded-xl bg-brand-black border border-slate-800 group">
            <div class="font-mono text-sm text-slate-200 mb-1 flex justify-between items-center">
              <span>/gsd-quick</span>
              <i class="fa-regular fa-copy text-slate-600 group-hover:text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity"></i>
            </div>
            <div class="text-xs text-slate-500 group-hover:text-slate-400">Tarefa ad-hoc sem criar roadmap</div>
          </button>
        </div>
      </div>

      <!-- Section: Session & Roadmap -->
      <div>
        <h3 class="text-[10px] font-bold text-brand-blue uppercase tracking-widest mb-3 flex items-center gap-2">
          <i class="fa-regular fa-bookmark"></i> Session & Mgmt
        </h3>
        <div class="space-y-2.5">
          <button onclick="copyCmd('/gsd-resume-work')" class="cmd-btn w-full text-left p-3.5 rounded-xl bg-brand-black border border-slate-800 group">
            <div class="font-mono text-sm text-slate-200 mb-1 flex justify-between items-center">
              <span>/gsd-resume-work</span>
              <i class="fa-regular fa-copy text-slate-600 group-hover:text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity"></i>
            </div>
            <div class="text-xs text-slate-500 group-hover:text-slate-400">Restaurar contexto anterior</div>
          </button>
          
          <button onclick="copyCmd('/gsd-pause-work')" class="cmd-btn w-full text-left p-3.5 rounded-xl bg-brand-black border border-slate-800 group">
            <div class="font-mono text-sm text-slate-200 mb-1 flex justify-between items-center">
              <span>/gsd-pause-work</span>
              <i class="fa-regular fa-copy text-slate-600 group-hover:text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity"></i>
            </div>
            <div class="text-xs text-slate-500 group-hover:text-slate-400">Salvar contexto e pausar fase</div>
          </button>

          <button onclick="copyCmd('/gsd-insert-phase ')" class="cmd-btn w-full text-left p-3.5 rounded-xl bg-brand-black border border-slate-800 group">
            <div class="font-mono text-sm text-slate-200 mb-1 flex justify-between items-center">
              <span>/gsd-insert-phase N</span>
              <i class="fa-regular fa-copy text-slate-600 group-hover:text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity"></i>
            </div>
            <div class="text-xs text-slate-500 group-hover:text-slate-400">Inserir fase extra (ex: 5.1)</div>
          </button>
        </div>
      </div>

    </div>
  </aside>

  <div id="toast" class="toast flex items-center gap-3">
    <div class="bg-brand-black text-brand-blue rounded-full w-6 h-6 flex items-center justify-center text-sm">
      <i class="fa-solid fa-check"></i>
    </div>
    Command Copied to Clipboard!
  </div>

  <script>
    let appData = {};
    let currentTab = 'roadmap';

    async function fetchData() {
      try {
        const res = await fetch('/api/data');
        appData = await res.json();
        renderTab();
      } catch (e) {
        document.getElementById('content').innerHTML = '<div class="text-center py-20"><i class="fa-solid fa-triangle-exclamation text-rose-500 text-5xl mb-4"></i><h2 class="text-xl text-slate-200 font-bold mb-2">Connection Lost</h2><p class="text-slate-400">Ensure the Node.js server is running.</p></div>';
      }
    }

    function switchTab(tab) {
      currentTab = tab;
      
      // Update Sidebar UI
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      document.getElementById('tab-' + tab).classList.add('active');
      
      // Update Header
      const titles = {
        roadmap: '<i class="fa-solid fa-map-location-dot text-brand-blue mr-1"></i> Project Roadmap',
        state: '<i class="fa-solid fa-bolt text-brand-blue mr-1"></i> Current State',
        project: '<i class="fa-solid fa-book-open text-brand-blue mr-1"></i> Project Vision',
        requirements: '<i class="fa-solid fa-list-check text-brand-blue mr-1"></i> Requirements'
      };
      document.getElementById('page-title').innerHTML = titles[tab];
      
      // Render Content
      renderTab();
    }

    function renderTab() {
      if(!appData[currentTab]) return;
      
      marked.setOptions({ gfm: true, breaks: true });
      let html = marked.parse(appData[currentTab]);
      
      // Wrap tables for scrolling
      html = html.replace(/<table>/g, '<div class="overflow-x-auto rounded-lg border border-brand-blue/20 mb-6"><table class="w-full text-sm text-left m-0">');
      html = html.replace(/<\\/table>/g, '</table></div>');
      
      // Add checkboxes style
      html = html.replace(/\\[ \\]/g, '<input type="checkbox" disabled>');
      html = html.replace(/\\[x\\]/gi, '<input type="checkbox" checked disabled>');
      html = html.replace(/\\[\\/\\]/g, '<i class="fa-solid fa-spinner fa-spin text-brand-blue mr-2"></i>');

      document.getElementById('content').innerHTML = html;
    }

    function copyCmd(cmd) {
      navigator.clipboard.writeText(cmd);
      const toast = document.getElementById('toast');
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2500);
    }

    // Init App
    fetchData();
    switchTab('roadmap');
    
    // Auto refresh data every 30s
    setInterval(fetchData, 30000);
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
    // API Route for data
    if (req.url === '/api/data') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const project = await safeReadFile('PROJECT.md');
        const roadmap = await safeReadFile('ROADMAP.md');
        const state = await safeReadFile('STATE.md');
        const requirements = await safeReadFile('REQUIREMENTS.md');
        
        res.end(JSON.stringify({ project, roadmap, state, requirements }));
        return;
    }

    // Serve HTML Template
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(htmlTemplate);
        return;
    }

    res.writeHead(404);
    res.end();
});

server.listen(PORT, () => {
    console.log('');
    console.log('\x1b[36m============================================\x1b[0m');
    console.log('\x1b[1m\x1b[36m 🚀 GSD Command Center Online\x1b[0m');
    console.log('\x1b[36m============================================\x1b[0m');
    console.log('');
    console.log(` \x1b[32m➜\x1b[0m  Local:   \x1b[4mhttp://localhost:${PORT}\x1b[0m`);
    console.log('');
    console.log('\x1b[90m Pressione Ctrl+C para encerrar.\x1b[0m');
    console.log('');
});
