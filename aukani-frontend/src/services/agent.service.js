const AGENT_URL = "http://localhost:9876"

async function call(method, path, body) {
  try {
    const res = await fetch(`${AGENT_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(3000), // 3s timeout
    })
    return await res.json()
  } catch {
    return { ok: false, error: "Agente no disponible" }
  }
}

export const agentService = {
  status:      ()       => call("GET",  "/status"),
  openDrawer:  ()       => call("POST", "/open-drawer"),
  print:       (html, printer) => call("POST", "/print", { html, printer }),
  printers:    ()       => call("GET",  "/printers"),
  saveConfig:  (config) => call("POST", "/config", config),
}