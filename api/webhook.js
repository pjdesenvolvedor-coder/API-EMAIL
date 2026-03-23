let receivedEvents = [];

function normalizeEmail(value) {
  if (!value) return null;
  return String(value).trim().toLowerCase();
}

function renderHtml(host) {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Leitor de Emails via Webhook</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: Arial, sans-serif;
          background: #0f172a;
          color: #e2e8f0;
          margin: 0;
          padding: 32px;
        }
        .container {
          max-width: 950px;
          margin: 0 auto;
        }
        .card {
          background: #111827;
          border: 1px solid #334155;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.25);
        }
        h1, h2, h3 { margin-top: 0; }
        .pill {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 999px;
          background: #1d4ed8;
          color: white;
          font-size: 14px;
          margin-bottom: 12px;
        }
        .muted { color: #94a3b8; }
        code {
          background: #1e293b;
          padding: 2px 6px;
          border-radius: 6px;
        }
        input {
          width: 100%;
          padding: 14px 16px;
          border-radius: 10px;
          border: 1px solid #334155;
          background: #020617;
          color: #e2e8f0;
          font-size: 16px;
          outline: none;
        }
        input:focus { border-color: #2563eb; }
        button {
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 10px;
          padding: 12px 18px;
          cursor: pointer;
          font-weight: bold;
          font-size: 15px;
          margin-right: 8px;
        }
        button:hover { background: #1d4ed8; }
        .status {
          margin-top: 14px;
          padding: 12px 14px;
          border-radius: 10px;
          background: #0b1220;
          border: 1px solid #243244;
          color: #cbd5e1;
        }
        .event {
          background: #020617;
          border: 1px solid #1e293b;
          border-radius: 12px;
          padding: 18px;
          margin-top: 16px;
        }
        .label {
          color: #93c5fd;
          font-size: 13px;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .value {
          margin-bottom: 16px;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .empty {
          color: #94a3b8;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="pill">Webhook ativo</div>
          <h1>Filtro de Emails por Remetente</h1>
          <p class="muted">
            Digite um email abaixo. O sistema atualiza sozinho e mostra apenas o último email recebido desse remetente.
          </p>
          <p><strong>Endpoint:</strong> <code>POST /api/webhook</code></p>
          <p><strong>URL:</strong> <code>https://${host}/api/webhook</code></p>
        </div>

        <div class="card">
          <h2>Buscar email</h2>
          <input id="emailInput" type="email" placeholder="Digite o email, ex: pedro@email.com" />
          <div style="margin-top:14px;">
            <button onclick="startTracking()">Acompanhar</button>
            <button onclick="clearTracking()">Limpar</button>
          </div>
          <div id="status" class="status">Digite um email para começar a acompanhar.</div>
        </div>

        <div class="card">
          <h2>Último email encontrado</h2>
          <div id="result" class="empty">Nenhum email selecionado.</div>
        </div>
      </div>

      <script>
        let trackedEmail = '';
        let pollingInterval = null;
        let lastRenderedId = '';

        function escapeHtml(text) {
          if (text === null || text === undefined) return '';
          return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        }

        function formatEvent(event) {
          return \`
            <div class="event">
              <div class="label">Recebido em</div>
              <div class="value">\${escapeHtml(event.receivedAt || '')}</div>

              <div class="label">Remetente</div>
              <div class="value">\${escapeHtml(event.from || '')}</div>

              <div class="label">Assunto</div>
              <div class="value">\${escapeHtml(event.subject || '(sem assunto)')}</div>

              <div class="label">Conteúdo</div>
              <div class="value">\${escapeHtml(event.text || '')}</div>
            </div>
          \`;
        }

        async function fetchLatestEmail() {
          if (!trackedEmail) return;

          try {
            const res = await fetch('/api/webhook?email=' + encodeURIComponent(trackedEmail));
            const data = await res.json();

            const status = document.getElementById('status');
            const result = document.getElementById('result');

            if (!data.found) {
              status.textContent = 'Aguardando email de: ' + trackedEmail;
              result.innerHTML = '<div class="empty">Ainda não chegou nenhum email desse remetente.</div>';
              lastRenderedId = '';
              return;
            }

            status.textContent = 'Último email encontrado para: ' + trackedEmail;

            const uniqueId = (data.event.receivedAt || '') + '|' + (data.event.from || '') + '|' + (data.event.text || '');

            if (uniqueId !== lastRenderedId) {
              result.innerHTML = formatEvent(data.event);
              lastRenderedId = uniqueId;
            }
          } catch (error) {
            document.getElementById('status').textContent = 'Erro ao consultar os emails.';
          }
        }

        function startTracking() {
          const input = document.getElementById('emailInput');
          trackedEmail = input.value.trim().toLowerCase();
          lastRenderedId = '';

          if (!trackedEmail) {
            document.getElementById('status').textContent = 'Digite um email válido.';
            document.getElementById('result').innerHTML = '<div class="empty">Nenhum email selecionado.</div>';
            return;
          }

          document.getElementById('status').textContent = 'Acompanhando: ' + trackedEmail;

          if (pollingInterval) clearInterval(pollingInterval);

          fetchLatestEmail();
          pollingInterval = setInterval(fetchLatestEmail, 2000);
        }

        function clearTracking() {
          trackedEmail = '';
          lastRenderedId = '';

          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }

          document.getElementById('emailInput').value = '';
          document.getElementById('status').textContent = 'Digite um email para começar a acompanhar.';
          document.getElementById('result').innerHTML = '<div class="empty">Nenhum email selecionado.</div>';
        }
      </script>
    </body>
    </html>
  `;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET' && !req.query.email) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(renderHtml(req.headers.host));
    }

    if (req.method === 'POST') {
      const body = req.body || {};

      const event = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
        receivedAt: new Date().toISOString(),
        from: normalizeEmail(body.from || body.username || null),
        subject: body.subject || null,
        text: body.text || body.content || null,
        raw: body
      };

      receivedEvents.unshift(event);

      if (receivedEvents.length > 200) {
        receivedEvents.pop();
      }

      console.log('Novo webhook recebido:');
      console.log(JSON.stringify(event, null, 2));

      return res.status(200).json({
        ok: true,
        message: 'Webhook recebido com sucesso'
      });
    }

    if (req.method === 'GET' && req.query.email) {
      const email = normalizeEmail(req.query.email);

      if (!email) {
        return res.status(200).json({
          found: false,
          message: 'Nenhum email informado'
        });
      }

      const latestMatch = receivedEvents.find(
        (event) => normalizeEmail(event.from) === email
      );

      if (!latestMatch) {
        return res.status(200).json({
          found: false,
          message: 'Nenhum email encontrado para esse remetente'
        });
      }

      return res.status(200).json({
        found: true,
        event: latestMatch
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Erro interno:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
}