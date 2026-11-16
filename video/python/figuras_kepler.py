"""Figuras en Python para la escena 10 del video (Órbitas keplerianas · Grupo 14).

Genera, con NumPy y Matplotlib, las tres visualizaciones que se muestran en el video:

  1. orbita_polar.png        Órbitas r(θ) = p / (1 + e cos θ) en coordenadas polares.
  2. potencial_3d_NN.jpg     Superficie U(x, y) = −μ / √(x² + y²) (varios ángulos de cámara).
  3. campo_vectorial.png     Campo −∇U con curvas de nivel del potencial.

Uso:  python3 python/figuras_kepler.py          (desde la carpeta video/)
Salida: video/public/python/

Si el grupo ya tiene sus propias figuras, basta con reemplazar los archivos de esa carpeta
conservando los nombres (ver README) y volver a renderizar.
"""
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

SALIDA = Path(__file__).resolve().parent.parent / "public" / "python"
SALIDA.mkdir(parents=True, exist_ok=True)

# Paleta de la web del proyecto
FONDO, PANEL, TEXTO, TENUE = "#0b1322", "#0e1829", "#dce6f4", "#8a9cb7"
CIAN, AZUL, NARANJA, VIOLETA, GRILLA = "#5cdaea", "#59a9ff", "#ffb166", "#a59ae7", "#2b3a50"

plt.rcParams.update({
    "figure.facecolor": FONDO, "axes.facecolor": PANEL, "savefig.facecolor": FONDO,
    "text.color": TEXTO, "axes.labelcolor": TEXTO, "axes.edgecolor": GRILLA,
    "xtick.color": TENUE, "ytick.color": TENUE, "grid.color": GRILLA,
    "font.family": "DejaVu Sans", "font.size": 15, "axes.titlesize": 19, "axes.titleweight": "bold",
    "mathtext.fontset": "cm",
})
MU = 1.0  # modelo normalizado, igual que en la web


def radio(theta, p, e):
    """Ecuación orbital r(θ) = p / (1 + e cos θ)."""
    return p / (1.0 + e * np.cos(theta))


def potencial(x, y):
    """U(x, y) = −μ / √(x² + y²)."""
    return -MU / np.sqrt(x**2 + y**2)


def campo(x, y):
    """−∇U = −μ (x, y) / (x² + y²)^(3/2)."""
    r3 = (x**2 + y**2) ** 1.5
    return -MU * x / r3, -MU * y / r3


def figura_orbita_polar():
    theta = np.linspace(0, 2 * np.pi, 800)
    fig = plt.figure(figsize=(9.6, 7.2), dpi=125)
    ax = fig.add_subplot(111, projection="polar")
    for e, color, ancho in [(0.0, VIOLETA, 2.0), (0.3, AZUL, 2.2), (0.65, CIAN, 3.2)]:
        ax.plot(theta, radio(theta, 3.0, e), color=color, lw=ancho, label=f"e = {e:.2f}".replace(".", ","))
    ax.plot([0], [0], "o", color=NARANJA, ms=13, zorder=5)
    ax.annotate("foco", xy=(0, 0), xytext=(np.radians(250), 1.7), color=NARANJA, fontsize=14)
    ax.set_rlabel_position(112)
    ax.grid(True, lw=0.9)
    ax.set_title(r"Órbitas en coordenadas polares:  $r(\theta)=\dfrac{p}{1+e\cos\theta}$,  $p=3$", pad=26)
    ax.legend(loc="upper right", bbox_to_anchor=(1.19, 1.1), frameon=True, facecolor=FONDO, edgecolor=GRILLA)
    fig.tight_layout()
    fig.savefig(SALIDA / "orbita_polar.png")
    plt.close(fig)


def figura_potencial_3d(cuadros=36):
    r = np.linspace(0.32, 5.0, 70)
    a = np.linspace(0, 2 * np.pi, 96)
    R, A = np.meshgrid(r, a)
    X, Y = R * np.cos(A), R * np.sin(A)
    Z = potencial(X, Y)
    fig = plt.figure(figsize=(9.6, 7.2), dpi=125)
    ax = fig.add_subplot(111, projection="3d")
    ax.set_facecolor(FONDO)
    ax.plot_surface(X, Y, Z, cmap="viridis", rstride=1, cstride=1, linewidth=0.15, edgecolor="#0b1322", antialiased=True, alpha=0.96)
    ax.contour(X, Y, Z, levels=[-1 / 0.75, -1 / 1.5, -1 / 2.5, -1 / 4], zdir="z", offset=-3.3, colors=CIAN, linewidths=1.3, linestyles="solid")
    ax.set_zlim(-3.3, 0.1)
    ax.set_xlabel("x", labelpad=8)
    ax.set_ylabel("y", labelpad=8)
    ax.set_zlabel("U(x, y)", labelpad=8)
    fig.suptitle(r"Potencial gravitatorio  $U(x,y)=-\dfrac{\mu}{\sqrt{x^2+y^2}}$,  $\mu=1$", fontsize=19, fontweight="bold", y=0.955)
    for eje in (ax.xaxis, ax.yaxis, ax.zaxis):
        eje.set_pane_color((0.055, 0.094, 0.161, 1.0))
        eje._axinfo["grid"]["color"] = GRILLA
    fig.subplots_adjust(left=0.0, right=0.97, bottom=0.0, top=0.9)
    # Pequeño recorrido de cámara alrededor de la superficie (ida y vuelta suave).
    for i in range(cuadros):
        u = 0.5 - 0.5 * np.cos(2 * np.pi * i / cuadros)
        ax.view_init(elev=24 + 6 * u, azim=-62 + 44 * u)
        fig.savefig(SALIDA / f"potencial_3d_{i:02d}.jpg", pil_kwargs={"quality": 90})
    plt.close(fig)


def figura_campo():
    fig, ax = plt.subplots(figsize=(9.6, 7.2), dpi=125)
    lim = 5.0
    gx, gy = np.meshgrid(np.linspace(-lim, lim, 400), np.linspace(-lim * 0.75, lim * 0.75, 300))
    with np.errstate(divide="ignore"):
        U = potencial(gx, gy)
    radios = np.array([0.75, 1.5, 2.5, 4.0])
    curvas = ax.contour(gx, gy, U, levels=np.sort(-1 / radios), colors=CIAN, linewidths=1.6, linestyles="solid")
    ax.clabel(curvas, fmt=lambda v: f"U = {v:.2f}".replace(".", ","), fontsize=11, colors=CIAN)
    qx, qy = np.meshgrid(np.linspace(-lim, lim, 21), np.linspace(-lim * 0.75, lim * 0.75, 16))
    dist = np.hypot(qx, qy)
    m = dist > 0.55
    fx, fy = campo(qx[m], qy[m])
    modulo = np.hypot(fx, fy)
    q = ax.quiver(qx[m], qy[m], fx / modulo, fy / modulo, modulo, cmap="plasma", norm=matplotlib.colors.LogNorm(vmin=0.04, vmax=3), scale=34, width=0.0042, pivot="mid")
    barra = fig.colorbar(q, ax=ax, fraction=0.035, pad=0.02)
    barra.set_label(r"intensidad  $|-\nabla U|=\mu/R^2$")
    ax.plot(0, 0, "o", color=NARANJA, ms=15, zorder=5)
    ax.set_aspect("equal")
    ax.set_xlim(-lim, lim)
    ax.set_ylim(-lim * 0.75, lim * 0.75)
    ax.set_xlabel("x")
    ax.set_ylabel("y")
    ax.grid(True, lw=0.6, alpha=0.6)
    ax.set_title(r"Campo gravitatorio  $-\nabla U$  y curvas de nivel")
    fig.tight_layout()
    fig.savefig(SALIDA / "campo_vectorial.png")
    plt.close(fig)


if __name__ == "__main__":
    figura_orbita_polar()
    figura_potencial_3d()
    figura_campo()
    print(f"Figuras generadas en {SALIDA}")
