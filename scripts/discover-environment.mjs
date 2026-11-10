/** Select the GitHub Environment that owns the deployment secret.
 * Reads metadata only. Secret values are supplied by GitHub to the deploy job. */
import { appendFileSync } from "node:fs";
const repository = process.env.GITHUB_REPOSITORY;
const githubToken = process.env.GH_TOKEN;
const configured = process.env.DEPLOY_ENVIRONMENT;
if (!repository || !githubToken)
  throw new Error("Este comando se ejecuta dentro de GitHub Actions.");
async function get(path) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok)
    throw new Error(
      `GitHub devolvió HTTP ${response.status} al consultar metadatos de Environments.`,
    );
  return response.json();
}
let selected = configured;
if (!selected) {
  const environments = [];
  for (let page = 1; ; page++) {
    const data = await get(
      `/repos/${repository}/environments?per_page=100&page=${page}`,
    );
    environments.push(...data.environments);
    if (data.environments.length < 100) break;
  }
  if (environments.length === 1) selected = environments[0].name;
  else if (environments.length === 0) {
    // Repository secrets remain available in a named production environment.
    selected = "production";
  } else {
    const matches = [];
    for (const environment of environments) {
      try {
        const data = await get(
          `/repos/${repository}/environments/${encodeURIComponent(environment.name)}/secrets`,
        );
        if (
          data.secrets.some((secret) => secret.name === "CLOUDFLARE_API_TOKEN")
        )
          matches.push(environment.name);
      } catch {
        /* Metadata permission may be narrower than deployment permission. */
      }
    }
    if (matches.length === 1) selected = matches[0];
    else
      throw new Error(
        `Hay varios Environments: ${environments.map((e) => e.name).join(", ")}. Configurá la variable CLOUDFLARE_ENVIRONMENT con el nombre que contiene el token, o elegilo al ejecutar este workflow manualmente.`,
      );
  }
}
if (/[\r\n]/.test(selected)) throw new Error("Nombre de Environment inválido.");
console.log(`Environment de despliegue: ${selected}`);
appendFileSync(process.env.GITHUB_OUTPUT, `environment=${selected}\n`);
