/** admin.html: totales de las métricas guardadas en este dispositivo y exportación CSV. */
import { CONFIG } from './content/config';
import { t } from './content/textos';
import { borrarEventos, leerEventos, Metrics } from './core/Metrics';
import { eventosACsv, resumir } from './core/MetricsResumen';
import { formatoTiempo } from './core/StageTimer';
import { registrarServiceWorker } from './pwa';

const $ = (id: string) => document.getElementById(id)!;

function escapar(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

function tabla(columnas: { titulo: string; num?: boolean }[], filas: (string | number)[][]): string {
  if (!filas.length) return `<div class="vacio">${escapar(t('admin.sinDatos'))}</div>`;
  const th = columnas.map((c) => `<th${c.num ? ' class="num"' : ''}>${escapar(c.titulo)}</th>`).join('');
  const tr = filas
    .map((f) => `<tr>${f.map((v, i) => `<td${columnas[i].num ? ' class="num"' : ''}>${escapar(String(v))}</td>`).join('')}</tr>`)
    .join('');
  return `<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
}

function mostrar(): void {
  const r = resumir(leerEventos());
  const dur = (s: number | null) => (s === null ? '—' : formatoTiempo(s));
  const totales: [string, string | number][] = [
    [t('admin.sesiones'), r.sesiones],
    [t('admin.completas'), r.completas],
    [t('admin.finalizacion'), `${r.finalizacionPct}%`],
    [t('admin.duracionPromedio'), dur(r.duracionPromedio)],
    [t('admin.duracionMaxima'), dur(r.duracionMaxima)],
    [t('admin.pendientes'), r.pendientesDeEnvio],
  ];
  $('totales').innerHTML = totales
    .map(([e, v]) => `<div class="total"><div class="valor">${escapar(String(v))}</div><div class="etiqueta">${escapar(e)}</div></div>`)
    .join('');
  $('etapas').innerHTML = tabla(
    [{ titulo: t('admin.colEtapa') }, { titulo: t('admin.colVeces'), num: true }, { titulo: t('admin.colTiempo'), num: true }, { titulo: t('admin.colTope'), num: true }],
    r.etapas.map((e) => [e.etapa, e.veces, e.tiempoPromedio, `${e.topePct}%`]),
  );
  $('misiones').innerHTML = tabla(
    [
      { titulo: t('admin.colEscena') },
      { titulo: t('admin.colMision') },
      { titulo: t('admin.colVeces'), num: true },
      { titulo: t('admin.colTiempo'), num: true },
      { titulo: t('admin.colPistas'), num: true },
      { titulo: t('admin.colAuto'), num: true },
    ],
    r.misiones.map((m) => [m.escena, m.mision, m.veces, m.tiempoPromedio, m.pistasPromedio, `${m.autocompletadaPct}%`]),
  );
}

function avisar(texto: string): void {
  $('aviso').textContent = texto;
}

function iniciar(): void {
  document.title = t('admin.titulo');
  $('titulo').textContent = t('admin.titulo');
  $('intro').textContent = t('admin.intro');
  $('tituloEtapas').textContent = t('admin.etapas');
  $('tituloMisiones').textContent = t('admin.misiones');
  $('descargar').textContent = t('admin.descargar');
  $('enviar').textContent = t('admin.enviar');
  $('borrar').textContent = t('admin.borrar');
  $('volver').textContent = t('admin.volver');

  $('descargar').addEventListener('click', () => {
    const blob = new Blob([eventosACsv(leerEventos())], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `la-gran-aventura-metricas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('enviar').addEventListener('click', async () => {
    if (!CONFIG.metricsEndpoint) {
      avisar(t('admin.sinEndpoint'));
      return;
    }
    await new Metrics(CONFIG.metricsEndpoint).enviar();
    mostrar();
    avisar(t('admin.enviado'));
  });
  $('borrar').addEventListener('click', () => {
    if (!confirm(t('admin.confirmarBorrar'))) return;
    borrarEventos();
    mostrar();
  });
  mostrar();
  registrarServiceWorker();
}

iniciar();
