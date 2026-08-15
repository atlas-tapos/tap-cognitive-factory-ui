const API_URL = "https://naffdaxyizjbqcwkawju.supabase.co/functions/v1/tap-cognitive-factory";

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));
const pill = (value) => `<span class="pill ${esc(value)}">${esc(value)}</span>`;
const rows = (items, render) => items.length ? items.map(render).join("") : '<div class="empty">No records.</div>';

function setState(message, tone = "neutral") {
  const health = document.querySelector("#health");
  health.textContent = message;
  health.dataset.tone = tone;
}

function render(data) {
  const divergent = data.workflows.filter((item) => item.reconciliation_status === "divergent").length;
  document.querySelector("#metrics").innerHTML = [
    ["Platforms", data.platforms.length], ["Capabilities", data.capabilities.length],
    ["Workflows", data.workflows.length], ["Agents", data.agents.length], ["Divergence", divergent],
  ].map(([label, value]) => `<article class="metric"><b>${value}</b><span>${label}</span></article>`).join("");
  document.querySelector("#agents").innerHTML = rows(data.agents, (agent) =>
    `<div class="row"><div><strong>${esc(agent.name)}</strong><small>${esc(agent.responsibility)}</small></div>${pill(agent.lifecycle_state)}</div>`);
  document.querySelector("#recon").innerHTML = rows(data.reconciliations, (item) =>
    `<div class="row"><div><strong>${esc(item.source_system)}</strong><small>${esc(item.completed_at || item.started_at)}</small></div>${pill(item.status)}</div>`);
  document.querySelector("#capabilities").innerHTML = rows(data.capabilities, (capability) =>
    `<article><div>${pill(capability.authority_mode)}</div><h3>${esc(capability.name)}</h3><small>${esc(capability.operation_type)} · ${esc(capability.verification_status)}</small></article>`);
  document.querySelector("#workflows").innerHTML = rows(data.workflows.slice(0, 50), (workflow) =>
    `<div class="row"><div><strong>${esc(workflow.name)}</strong><small>${esc(workflow.observed_at || "Not observed")}</small></div>${pill(workflow.reconciliation_status)}</div>`);
  document.querySelector("#approvals").innerHTML = rows(data.approvals, (approval) =>
    `<div class="row"><strong>${esc(approval.id)}</strong>${pill(approval.state)}</div>`);
  document.querySelector("#audits").innerHTML = rows(data.audits.slice(0, 12), (event) =>
    `<div class="row"><div><strong>${esc(event.action)}</strong><small>${esc(event.actor)} · ${esc(event.correlation_id)}</small></div>${pill(event.result_status || "recorded")}</div>`);
}

async function connect() {
  const tokenInput = document.querySelector("#token");
  const button = document.querySelector("#connect");
  const token = tokenInput.value.trim();
  if (!token) { setState("Access token required", "error"); tokenInput.focus(); return; }
  button.disabled = true;
  button.textContent = "Connecting…";
  setState("Connecting", "loading");
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "x-correlation-id": crypto.randomUUID() },
      body: JSON.stringify({ operation: "dashboard" }),
    });
    if (!response.ok) throw new Error(response.status === 401 ? "Access denied" : `Service error (${response.status})`);
    const payload = await response.json();
    tokenInput.value = "";
    render(payload.data);
    document.querySelector("#content").classList.remove("restricted");
    setState("Production connected", "success");
  } catch (error) {
    setState(error instanceof Error ? error.message : "Connection failed", "error");
  } finally {
    button.disabled = false;
    button.textContent = "Connect";
  }
}

document.querySelector("#connect").addEventListener("click", connect);
document.querySelector("#token").addEventListener("keydown", (event) => { if (event.key === "Enter") connect(); });
