import { test, expect } from "@playwright/test";
test("all orbital controls, conics, animation, CSV and reset work", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Explorador de Órbitas",
  );
  const path = page.getByTestId("orbit-path");
  const initial = await path.getAttribute("d");
  for (const [name, value] of [
    ["Parámetro orbital", "4"],
    ["Excentricidad", ".8"],
    ["Rotación", "80"],
    ["Horizontal", "2"],
    ["Vertical", "-1"],
  ]) {
    await page.getByRole("slider", { name, exact: true }).fill(value);
    await expect(path).not.toHaveAttribute("d", initial!);
  }
  await page
    .getByRole("checkbox", { name: "Mostrar ejes locales rotados" })
    .uncheck();
  await expect(
    page.getByRole("checkbox", { name: "Mostrar ejes locales rotados" }),
  ).not.toBeChecked();
  for (const name of ["Parábola", "Hipérbola"]) {
    await page.getByRole("button", { name, exact: true }).click();
    expect((await path.getAttribute("d"))?.endsWith("Z")).toBe(false);
    await expect(
      page.getByRole("button", { name: "Animar órbita" }),
    ).toBeDisabled();
  }
  await page
    .getByRole("slider", { name: "Excentricidad", exact: true })
    .fill(".99");
  await expect(
    page.getByRole("slider", { name: "Excentricidad", exact: true }),
  ).toHaveValue(".99".replace(/^\./, "0."));
  await page
    .getByRole("button", { name: "Circunferencia", exact: true })
    .click();
  await page.getByRole("button", { name: "Animar órbita" }).click();
  await expect(page.getByRole("button", { name: "Pausar" })).toBeEnabled();
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: "Pausar" }).click();
  await page
    .getByLabel("Importar observaciones CSV")
    .setInputFiles({
      name: "observaciones.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("x,y\n1,2\n-2,3"),
    });
  await expect(page.getByText("observaciones.csv · 2 puntos")).toBeVisible();
  await page.getByRole("button", { name: "Quitar observaciones" }).click();
  await page
    .getByLabel("Importar observaciones CSV")
    .setInputFiles({
      name: "mal.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("x,y\ninvalid,2"),
    });
  await expect(page.getByRole("alert")).toContainText("se esperan dos números");
  await page.getByRole("button", { name: "Reiniciar parámetros" }).click();
  await expect(
    page.getByRole("slider", { name: "Excentricidad", exact: true }),
  ).toHaveValue("0.6");
  expect(errors).toEqual([]);
});
test("equal area sectors remain numerically equal after every control changes", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Segunda ley de Kepler" }).click();
  for (const [name, value] of [
    ["Excentricidad de la elipse", ".85"],
    ["Ángulo inicial azul", "90"],
    ["Amplitud del sector azul", "120"],
    ["Ángulo inicial naranja", "260"],
  ]) {
    await page.getByRole("slider", { name, exact: true }).fill(value);
    const a = Number(
        await page.getByTestId("blue-area").getAttribute("data-value"),
      ),
      b = Number(
        await page.getByTestId("orange-area").getAttribute("data-value"),
      );
    expect(Math.abs(a - b) / a).toBeLessThan(1e-9);
  }
  await page
    .getByRole("button", { name: "Cambiar e y mantener áreas iguales" })
    .click();
  expect(
    Number(await page.getByTestId("area-error").getAttribute("data-value")),
  ).toBeLessThan(0.000001);
  await page
    .getByRole("slider", { name: "Excentricidad de la elipse" })
    .fill("0");
  const delta = Number(
    await page
      .getByRole("slider", { name: "Amplitud del sector azul" })
      .inputValue(),
  );
  expect(
    parseFloat(
      (await page.getByTestId("orange-angle").innerText()).replace(",", "."),
    ),
  ).toBeCloseTo(delta, 2);
  await page.getByRole("button", { name: "Reiniciar parámetros" }).click();
  await expect(
    page.getByRole("slider", { name: "Excentricidad de la elipse" }),
  ).toHaveValue("0.65");
});
test("potential layers, singularity, QR dialog, and responsive SVG", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `/tmp/kepler-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Potencial gravitatorio" }).click();
  await page.getByRole("checkbox", { name: "Curvas de nivel" }).uncheck();
  await expect(
    page.getByRole("checkbox", { name: "Curvas de nivel" }),
  ).not.toBeChecked();
  await page.getByRole("checkbox", { name: "Flechas del campo" }).uncheck();
  await page.getByRole("button", { name: "Evaluar en el foco" }).click();
  await expect(page.getByText("U = No definido")).toBeVisible();
  const svg = page.getByRole("img", {
    name: "Curvas de nivel y campo gravitatorio alrededor del foco",
  });
  await svg.click({ position: { x: 100, y: 100 } });
  await expect(page.getByText("U = No definido")).not.toBeVisible();
  await page.getByRole("button", { name: "Compartir proyecto" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: "Código QR con la dirección actual del proyecto",
    }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
