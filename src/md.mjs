// A deliberately small Markdown: paragraphs, *em*, **strong**, [text](https://…), - and 1.
// lists, > quotes. Text is escaped first, so nothing in content/ can inject markup; links
// must be https (or a /library path) and open with rel="noopener".

export function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function safeHref(u) {
  if (/^\/library\/[a-z0-9/#-]*$/.test(u)) return u;
  try { return new URL(u).protocol === 'https:' ? u : null; } catch { return null; }
}

export function inline(text) {
  let out = '';
  let rest = String(text);
  const link = /\[([^\]]+)\]\(([^)\s]+)\)/;
  let m;
  while ((m = link.exec(rest))) {
    out += emph(esc(rest.slice(0, m.index)));
    const href = safeHref(m[2]);
    const label = emph(esc(m[1]));
    if (!href) out += label;
    else if (href.startsWith('/')) out += '<a href="' + esc(href) + '">' + label + '</a>';
    else out += '<a href="' + esc(href) + '" rel="noopener" target="_blank">' + label + '</a>';
    rest = rest.slice(m.index + m[0].length);
  }
  return out + emph(esc(rest));
}

function emph(s) {
  return s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

export function md(src) {
  const blocks = String(src || '').replace(/\r\n?/g, '\n').trim().split(/\n{2,}/);
  return blocks.filter((b) => b.trim()).map((b) => {
    const lines = b.split('\n');
    if (lines.every((l) => /^\s*[-*] /.test(l))) return '<ul>' + lines.map((l) => '<li>' + inline(l.replace(/^\s*[-*] /, '')) + '</li>').join('') + '</ul>';
    if (lines.every((l) => /^\s*\d+\. /.test(l))) return '<ol>' + lines.map((l) => '<li>' + inline(l.replace(/^\s*\d+\. /, '')) + '</li>').join('') + '</ol>';
    if (lines.every((l) => /^> ?/.test(l))) return '<blockquote><p>' + inline(lines.map((l) => l.replace(/^> ?/, '')).join(' ')) + '</p></blockquote>';
    return '<p>' + inline(lines.join(' ')) + '</p>';
  }).join('\n');
}

// "---\nkey: value\n---\nbody" → { attrs, body }. Flat string values only.
export function frontmatter(src) {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(String(src).replace(/\r\n?/g, '\n'));
  if (!m) return { attrs: {}, body: String(src) };
  const attrs = {};
  m[1].split('\n').forEach((line) => {
    const kv = /^([a-zA-Z]+):\s*(.*?)\s*(?:#.*)?$/.exec(line);
    if (kv) attrs[kv[1]] = kv[2];
  });
  return { attrs, body: m[2] };
}
