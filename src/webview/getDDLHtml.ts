import { IndexInfo, ConstraintInfo, FKMapEntry } from '../db/queries';

const MONACO_VERSION = '0.45.0';
const MONACO_CDN = `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min/vs`;

export function getDDLHtml(params: {
  nonce: string;
  cspSource: string;
  schema: string;
  table: string;
  ddl: string;
  indexes: IndexInfo[];
  constraints: ConstraintInfo[];
  fkMap: FKMapEntry[];
}): string {
  const { nonce, cspSource, schema, table, ddl, indexes, constraints, fkMap } = params;

  const safeJson = JSON.stringify({ ddl, indexes, constraints, fkMap })
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             script-src 'nonce-${nonce}' https://cdn.jsdelivr.net;
             style-src ${cspSource} 'unsafe-inline' https://cdn.jsdelivr.net;
             font-src ${cspSource} https://cdn.jsdelivr.net data:;
             worker-src blob:;
             connect-src https://cdn.jsdelivr.net;">
  <title>DDL: ${schema}.${table}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      height: 100vh; display: flex; flex-direction: column; overflow: hidden;
    }
    .header {
      display: flex; align-items: center; gap: 10px; flex-shrink: 0;
      padding: 8px 14px; border-bottom: 1px solid var(--vscode-panel-border);
      background: var(--vscode-editorGroupHeader-tabsBackground);
    }
    .header-title { font-size: 13px; font-weight: 600; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .header-schema { font-size: 11px; color: var(--vscode-descriptionForeground); }
    .tab-bar {
      display: flex; flex-shrink: 0; border-bottom: 1px solid var(--vscode-panel-border);
      background: var(--vscode-editorGroupHeader-tabsBackground);
    }
    .tab {
      padding: 6px 16px; background: transparent; border: none;
      border-bottom: 2px solid transparent; cursor: pointer;
      color: var(--vscode-tab-inactiveForeground);
      font-size: var(--vscode-font-size); font-family: var(--vscode-font-family);
    }
    .tab.active { color: var(--vscode-tab-activeForeground); border-bottom-color: var(--vscode-focusBorder); }
    .tab:hover:not(.active) { background: var(--vscode-tab-hoverBackground); }
    .tab-content { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
    .tab-content.hidden { display: none; }
    #monaco-container { flex: 1; overflow: hidden; }
    .scroll-area { flex: 1; overflow-y: auto; padding: 16px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
      color: var(--vscode-descriptionForeground); margin-bottom: 8px; margin-top: 16px; }
    .section-title:first-child { margin-top: 0; }
    .info-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
    .info-table th {
      text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px;
      color: var(--vscode-descriptionForeground); padding: 4px 8px;
      border-bottom: 2px solid var(--vscode-panel-border); white-space: nowrap;
    }
    .info-table td { padding: 4px 8px; border-bottom: 1px solid rgba(128,128,128,0.1); vertical-align: top; }
    .info-table tr:hover { background: var(--vscode-list-hoverBackground); }
    .badge { display: inline-block; font-size: 9px; font-weight: 700; border-radius: 2px; padding: 1px 4px; line-height: 14px; }
    .badge-pk { background: #cca700; color: #000; }
    .badge-fk { background: #007acc; color: #fff; }
    .badge-uq { background: #6c8ebf; color: #fff; }
    .badge-ck { background: #82b366; color: #fff; }
    .code { font-family: var(--vscode-editor-font-family, monospace); font-size: 11px; color: var(--vscode-textPreformat-foreground); word-break: break-all; }
    .size-cell { white-space: nowrap; color: var(--vscode-descriptionForeground); }
    .fk-dir { font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 1px 5px; border-radius: 2px; white-space: nowrap; }
    .fk-out { background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
    .fk-in  { background: #68217a22; color: #c586c0; }
    .fk-nav { background: transparent; border: none; cursor: pointer; padding: 2px 6px;
      color: var(--vscode-textLink-foreground); font-size: 12px; font-family: inherit; border-radius: 2px; }
    .fk-nav:hover { background: var(--vscode-list-hoverBackground); text-decoration: underline; }
    .empty { color: var(--vscode-descriptionForeground); font-style: italic; padding: 8px 0; }
    .btn { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px;
      border: none; cursor: pointer; font-size: var(--vscode-font-size); font-family: inherit; border-radius: 2px; }
    .btn-secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
    .btn-secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-title">
      <span class="header-schema">${schema}.</span>${table}
    </div>
    <button class="btn btn-secondary" id="btn-copy">Copy DDL</button>
  </div>
  <div class="tab-bar">
    <button class="tab active" data-tab="ddl">DDL</button>
    <button class="tab" data-tab="indexes">Indexes &amp; Constraints</button>
    <button class="tab" data-tab="fkmap">FK Map</button>
  </div>

  <div class="tab-content" id="tab-ddl">
    <div id="monaco-container"></div>
  </div>

  <div class="tab-content hidden" id="tab-indexes">
    <div class="scroll-area" id="indexes-content"></div>
  </div>

  <div class="tab-content hidden" id="tab-fkmap">
    <div class="scroll-area" id="fkmap-content"></div>
  </div>

  <script type="application/json" id="page-data">${safeJson}</script>

  <script nonce="${nonce}" src="${MONACO_CDN}/loader.js"></script>
  <script nonce="${nonce}">
  (function () {
    var vscode = acquireVsCodeApi();
    var DATA = JSON.parse(document.getElementById('page-data').textContent);

    function esc(s) {
      return String(s).replace(/&/g, '&amp;').replace(/\x3c/g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ── Tab switching ─────────────────────────────────────────────────
    var tabs = document.querySelectorAll('.tab');
    tabs.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.dataset.tab;
        tabs.forEach(function (b) { b.classList.toggle('active', b.dataset.tab === id); });
        document.querySelectorAll('.tab-content').forEach(function (el) {
          el.classList.toggle('hidden', el.id !== 'tab-' + id);
        });
        if (id === 'indexes') renderIndexes();
        if (id === 'fkmap') renderFKMap();
        if (id === 'ddl' && window.monacoEditor) window.monacoEditor.layout();
      });
    });

    // ── Monaco (read-only DDL) ────────────────────────────────────────
    var MONACO_BASE = '${MONACO_CDN}';
    window.MonacoEnvironment = {
      getWorkerUrl: function () {
        var code = 'self.MonacoEnvironment={baseUrl:"' + MONACO_BASE + '/"};importScripts("' + MONACO_BASE + '/base/worker/workerMain.js");';
        return URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
      }
    };
    require.config({ paths: { vs: MONACO_BASE } });
    require(['vs/editor/editor.main'], function () {
      var isDark = document.body.classList.contains('vscode-dark') || document.body.classList.contains('vscode-high-contrast');
      window.monacoEditor = monaco.editor.create(document.getElementById('monaco-container'), {
        value: DATA.ddl,
        language: 'sql',
        theme: isDark ? 'vs-dark' : 'vs',
        readOnly: true,
        minimap: { enabled: false },
        lineNumbers: 'on',
        fontSize: 13,
        wordWrap: 'on',
        automaticLayout: true,
        scrollBeyondLastLine: false,
        contextmenu: false,
      });
    });

    // ── Copy DDL ──────────────────────────────────────────────────────
    document.getElementById('btn-copy').addEventListener('click', function () {
      navigator.clipboard.writeText(DATA.ddl).then(function () {
        var btn = document.getElementById('btn-copy');
        btn.textContent = 'Copied!';
        setTimeout(function () { btn.textContent = 'Copy DDL'; }, 1500);
      }).catch(function () {});
    });

    // ── Indexes & Constraints ─────────────────────────────────────────
    var indexesRendered = false;
    function renderIndexes() {
      if (indexesRendered) return;
      indexesRendered = true;
      var el = document.getElementById('indexes-content');
      var html = '';

      html += '<div class="section-title">Indexes</div>';
      if (!DATA.indexes.length) {
        html += '<div class="empty">No indexes found.</div>';
      } else {
        html += '<table class="info-table"><thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Definition</th></tr></thead><tbody>';
        DATA.indexes.forEach(function (ix) {
          var badge = ix.isPrimary ? '<span class="badge badge-pk">PK</span>' : ix.isUnique ? '<span class="badge badge-uq">UQ</span>' : '';
          html += '<tr><td>' + esc(ix.name) + '</td><td>' + badge + '</td>'
            + '<td class="size-cell">' + esc(ix.size) + '</td>'
            + '<td class="code">' + esc(ix.definition) + '</td></tr>';
        });
        html += '</tbody></table>';
      }

      html += '<div class="section-title">Constraints</div>';
      if (!DATA.constraints.length) {
        html += '<div class="empty">No constraints found.</div>';
      } else {
        html += '<table class="info-table"><thead><tr><th>Name</th><th>Type</th><th>Definition</th></tr></thead><tbody>';
        DATA.constraints.forEach(function (c) {
          var badgeClass = c.type === 'PRIMARY KEY' ? 'badge-pk' : c.type === 'FOREIGN KEY' ? 'badge-fk' : c.type === 'UNIQUE' ? 'badge-uq' : 'badge-ck';
          html += '<tr><td>' + esc(c.name) + '</td>'
            + '<td><span class="badge ' + badgeClass + '">' + esc(c.type) + '</span></td>'
            + '<td class="code">' + esc(c.definition) + '</td></tr>';
        });
        html += '</tbody></table>';
      }

      el.innerHTML = html;
    }

    // ── FK Map ────────────────────────────────────────────────────────
    var fkmapRendered = false;
    function renderFKMap() {
      if (fkmapRendered) return;
      fkmapRendered = true;
      var el = document.getElementById('fkmap-content');
      var outgoing = DATA.fkMap.filter(function (r) { return r.direction === 'outgoing'; });
      var incoming = DATA.fkMap.filter(function (r) { return r.direction === 'incoming'; });
      var html = '';

      html += '<div class="section-title">Outgoing (this table references)</div>';
      if (!outgoing.length) {
        html += '<div class="empty">No outgoing foreign keys.</div>';
      } else {
        html += '<table class="info-table"><thead><tr><th>Column</th><th>References</th><th>Constraint</th></tr></thead><tbody>';
        outgoing.forEach(function (r) {
          html += '<tr><td class="code">' + esc(r.column) + '</td>'
            + '<td><button class="fk-nav" data-schema="' + esc(r.foreignSchema) + '" data-table="' + esc(r.foreignTable) + '">'
            + esc(r.foreignSchema + '.' + r.foreignTable) + '.' + esc(r.foreignColumn) + '</button></td>'
            + '<td class="code" style="color:var(--vscode-descriptionForeground)">' + esc(r.constraintName) + '</td></tr>';
        });
        html += '</tbody></table>';
      }

      html += '<div class="section-title">Incoming (other tables reference this)</div>';
      if (!incoming.length) {
        html += '<div class="empty">No incoming foreign keys.</div>';
      } else {
        html += '<table class="info-table"><thead><tr><th>From</th><th>Column</th><th>Constraint</th></tr></thead><tbody>';
        incoming.forEach(function (r) {
          html += '<tr><td><button class="fk-nav" data-schema="' + esc(r.foreignSchema) + '" data-table="' + esc(r.foreignTable) + '">'
            + esc(r.foreignSchema + '.' + r.foreignTable) + '</button></td>'
            + '<td class="code">' + esc(r.foreignColumn) + '</td>'
            + '<td class="code" style="color:var(--vscode-descriptionForeground)">' + esc(r.constraintName) + '</td></tr>';
        });
        html += '</tbody></table>';
      }

      el.innerHTML = html;

      el.addEventListener('click', function (e) {
        var btn = e.target.closest('.fk-nav');
        if (!btn) return;
        vscode.postMessage({ command: 'navigateToTable', data: { schema: btn.dataset.schema, table: btn.dataset.table } });
      });
    }
  }());
  </script>
</body>
</html>`;
}
