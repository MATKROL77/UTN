/** Create a new Pages project, or reuse only one already deployed from this
 * repository's history. Authentication stays in the runner's environment. */
import { appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const token = process.env.CLOUDFLARE_API_TOKEN;
const projectName = "kepler-grupo14-utn";
if (!token)
  throw new Error(
    "Falta CLOUDFLARE_API_TOKEN en el Environment o en los secretos del repositorio.",
  );
async function api(path, options = {}) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  if (response.status === 404 && options.allow404) return null;
  const data = await response.json();
  if (!response.ok || !data.success) {
    const error = (data.errors || [])
      .map((e) => `${e.code}: ${e.message}`)
      .join("; ")
      .replaceAll(token, "[REDACTED]");
    throw new Error(
      `Cloudflare HTTP ${response.status}: ${error || "Solicitud rechazada."}`,
    );
  }
  return data.result;
}
let accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!accountId) {
  const accounts = await api("/accounts?per_page=50");
  if (accounts.length !== 1)
    throw new Error(
      `El token permite ver ${accounts.length} cuentas. Configurá CLOUDFLARE_ACCOUNT_ID como variable del Environment para elegir la cuenta de destino.`,
    );
  accountId = accounts[0].id;
}
if (!/^[a-f0-9]{32}$/i.test(accountId))
  throw new Error(
    "CLOUDFLARE_ACCOUNT_ID debe ser un identificador de cuenta de 32 caracteres hexadecimales.",
  );
const endpoint = `/accounts/${accountId}/pages/projects/${projectName}`;
let project = await api(endpoint, { allow404: true });
if (!project) {
  project = await api(`/accounts/${accountId}/pages/projects`, {
    method: "POST",
    body: { name: projectName, production_branch: "main" },
  });
  console.log(`Proyecto nuevo creado: ${project.name}`);
} else {
  const commit =
    project.canonical_deployment?.deployment_trigger?.metadata?.commit_hash;
  const result = /^[a-f0-9]{40}$/i.test(commit || "")
    ? spawnSync("git", ["merge-base", "--is-ancestor", commit, "HEAD"])
    : null;
  if (!result || result.status !== 0)
    throw new Error(
      `El proyecto ${projectName} ya existe y no tiene un despliegue reconocible de este repositorio. Se detuvo la publicación para no sobrescribir otro proyecto.`,
    );
  console.log(`Proyecto de este repositorio verificado: ${project.name}`);
}
appendFileSync(process.env.GITHUB_ENV, `CLOUDFLARE_ACCOUNT_ID=${accountId}\n`);
appendFileSync(
  process.env.GITHUB_OUTPUT,
  `project=${projectName}\nurl=https://${project.subdomain}\n`,
);
