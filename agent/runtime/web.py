from __future__ import annotations
from typing import AsyncGenerator

import asyncio
import json

from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from sse_starlette.sse import EventSourceResponse

from ..cli import build_agent


app = FastAPI()


@app.get("/")
async def index() -> HTMLResponse:
    html = """
<!doctype html>
<html>
  <head>
    <meta charset=\"utf-8\" />
    <title>Execute Agent</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 2rem; }
      #log { white-space: pre-wrap; border: 1px solid #ddd; padding: 1rem; border-radius: 8px; min-height: 200px; }
      input, button, select { font-size: 1rem; padding: 0.5rem; }
    </style>
  </head>
  <body>
    <h2>Execute Agent (SSE)</h2>
    <div>
      <label>Provider:
        <select id=\"provider\">
          <option value=\"echo\">echo</option>
          <option value=\"openai\">openai</option>
          <option value=\"ollama\">ollama</option>
        </select>
      </label>
      <label>Model: <input id=\"model\" placeholder=\"auto\" /></label>
    </div>
    <p><input id=\"q\" placeholder=\"Ask something...\" style=\"width: 60%\" /> <button onclick=\"go()\">Send</button></p>
    <div id=\"log\"></div>
    <script>
      function go(){
        const q = document.getElementById('q').value;
        const provider = document.getElementById('provider').value;
        const model = document.getElementById('model').value;
        const url = `/stream?provider=${encodeURIComponent(provider)}&model=${encodeURIComponent(model)}&q=${encodeURIComponent(q)}`;
        const log = document.getElementById('log');
        log.textContent = '';
        const evt = new EventSource(url);
        evt.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.delta) log.textContent += data.delta;
            if (data.tool_result) log.textContent += `\n[tool ${data.tool_result.name}] => ${JSON.stringify(data.tool_result.result)}`;
            if (data.done) evt.close();
          } catch (err) {
            log.textContent += `\n[err] ${e.data}`;
          }
        };
        evt.onerror = (e) => { log.textContent += `\n[connection error]`; evt.close(); };
      }
    </script>
  </body>
  </html>
    """
    return HTMLResponse(content=html)


@app.get("/stream")
async def stream(provider: str = "echo", model: str | None = None, q: str = "") -> EventSourceResponse:
    agent = build_agent(provider=provider, model_name=(model or None))

    async def gen() -> AsyncGenerator[str, None]:
        for chunk in agent.ask_stream(q):
            yield json.dumps(chunk)
            await asyncio.sleep(0)

    return EventSourceResponse(gen())
