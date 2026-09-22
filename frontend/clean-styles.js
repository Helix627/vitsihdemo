const fs = require('fs');
const path = require('path');

const filePaths = [
  path.join(__dirname, 'src', 'styles', 'graph.css'),
  path.join(__dirname, 'src', 'components', 'AnalystReviewPanel.jsx'),
  path.join(__dirname, 'src', 'components', 'InfrastructureDashboard.jsx'),
  path.join(__dirname, 'src', 'components', 'TimelineSlider.jsx'),
  path.join(__dirname, 'src', 'components', 'GraphView3D.jsx'),
  path.join(__dirname, 'src', 'components', 'ExportModal.jsx')
];

function processFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${filePath}, does not exist`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');

  // Regex replacements for legacy cyberpunk colors and styles

  // Purple / Neon
  content = content.replace(/#8b5cf6/gi, 'var(--brand-purple)');
  content = content.replace(/#a855f7/gi, 'var(--brand-purple)');
  content = content.replace(/rgba\(139,\s*92,\s*246,\s*0\.[0-9]+\)/gi, 'var(--accent-subtle)');
  content = content.replace(/rgba\(168,\s*85,\s*247,\s*0\.[0-9]+\)/gi, 'var(--accent-subtle)');
  content = content.replace(/0 0 15px rgba\(139, 92, 246, 0.4\)/gi, 'var(--shadow-soft)');

  // Cyan
  content = content.replace(/#06b6d4/gi, 'var(--brand-cyan)');
  content = content.replace(/#0ea5e9/gi, 'var(--brand-cyan)');
  content = content.replace(/rgba\(6,\s*182,\s*212,\s*0\.[0-9]+\)/gi, 'var(--bg-hover)');

  // Amber / Yellow
  content = content.replace(/#f59e0b/gi, 'var(--brand-amber)');
  content = content.replace(/#d97706/gi, 'var(--brand-amber)');
  content = content.replace(/rgba\(245,\s*158,\s*11,\s*0\.[0-9]+\)/gi, 'var(--bg-hover)');

  // Emerald / Green
  content = content.replace(/#10b981/gi, 'var(--brand-emerald)');
  content = content.replace(/rgba\(16,\s*185,\s*129,\s*0\.[0-9]+\)/gi, 'var(--bg-hover)');

  // Slate / Dark
  content = content.replace(/#0f172a/gi, 'var(--bg-primary)');
  content = content.replace(/#1e293b/gi, 'var(--bg-secondary)');
  content = content.replace(/#334155/gi, 'var(--border-soft)');
  content = content.replace(/#475569/gi, 'var(--border-soft)');
  content = content.replace(/#94a3b8/gi, 'var(--text-muted)');
  content = content.replace(/#cbd5e1/gi, 'var(--text-secondary)');
  content = content.replace(/#f1f5f9/gi, 'var(--text-primary)');
  content = content.replace(/#f8fafc/gi, 'var(--text-primary)');

  // Typography
  content = content.replace(/'Space Grotesk', sans-serif/gi, 'var(--font-heading)');
  content = content.replace(/"Space Grotesk", sans-serif/gi, 'var(--font-heading)');
  content = content.replace(/'Space Grotesk'/gi, 'var(--font-heading)');
  content = content.replace(/'Inter', sans-serif/gi, 'var(--font-body)');
  content = content.replace(/"IBM Plex Sans", monospace/gi, 'var(--font-mono)');
  content = content.replace(/'monospace'/gi, 'var(--font-mono)');
  content = content.replace(/monospace/gi, 'var(--font-mono)');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Processed ${filePath}`);
}

filePaths.forEach(processFile);
