const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Aceita JSON e texto puro
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: '*/*' }));

// Armazenamento simples em memória
const receivedEvents = [];

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Webhook Receiver</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background: #0f172a;
          color: #e2e8f0;
          margin: 0;
          padding: 32px;
        }
        .container {
          max-width: 900px;
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
        h1, h2 { margin-top: 0; }
        code {
          background: #1e293b;
          padding: 2px 6px;
          border-radius: 6px;
        }
        pre {
          background: #020617;
          color: #93c5fd;
          padding: 16px;
          border-radius: 12px;
          overflow: auto;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .pill {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 999px;
          background: #1d4ed8;
          color: white;
          font-size: 14px;
          margin-bottom: 12px;
        }
        .muted {
          color: #94a3b8;
        }
        button {
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 10px;
          padding: 12px 18px;
          cursor: pointer;
          font-weight: bold;
        }
        button:hover { background: #1d4ed8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="pill">Webhook ativo</div>
          <h1>Receiver de Emails via Webhook</h1>
          <p class="muted">
            Endpoint para receber emails.
          </p>
          <p><strong>Endpoint:</strong> <code>POST /webhook</code></p>
          <p><strong>URL:</strong> <code>${req.protocol}://${req.get('host')}/webhook</code></p>
        </div>

        <div class="card">
          <h2>Eventos recebidos</h2>
          <button onclick="loadEvents()">Atualizar</button>
          <pre id="events">Carregando...</pre>
        </div>
      </div>

      <script>
        async function loadEvents() {
          const res = await fetch('/events');
          const data = await res.json();
          document.getElementById('events').textContent = JSON.stringify(data, null, 2);
        }
        loadEvents();
      </script>
    </body>
    </html>
  `);
});

app.post('/webhook', (req, res) => {
  const body = req.body;

  // 🔥 Normaliza os dados recebidos
  const event = {
    receivedAt: new Date().toISOString(),

    // Compatível com seu formato atual
    from: body.from || body.username || null,

    // Se ainda estiver usando content (subject + body juntos)
    subject: body.subject || null,
    text: body.text || body.content || null,

    raw: body
  };

  receivedEvents.unshift(event);

  // Limite de memória
  if (receivedEvents.length > 50) {
    receivedEvents.pop();
  }

  console.log('Novo webhook processado:');
  console.log(JSON.stringify(event, null, 2));

  res.status(200).json({
    ok: true
  });
});

app.get('/events', (req, res) => {
  res.json(receivedEvents);
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Webhook: http://localhost:${PORT}/webhook`);
});