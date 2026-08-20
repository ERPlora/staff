// staff#39 — «La ficha del empleado se pinta SIN cajas»: Tarifa por hora y Comisión son invisibles.
//
// `fill="outline"` en un control de formulario de Ionic **solo se honra en modo `md`**. Del propio
// fuente de Ionic 8.8 (`@ionic/core/dist/collection/components/input/input.js`):
//
//     const hasOutlineFill = mode === 'md' && this.fill === 'outline';
//
// El shell del Hub pinea `mode: 'ios'` (ADR-0143, hub#760), así que el atributo es un no-op
// silencioso: el control se pinta sin caja, sin borde y sin fondo — una etiqueta gris flotando
// sobre el panel. No lanza nada, no avisa de nada; el formulario simplemente parece texto estático.
// En esta ficha eso cae sobre la NÓMINA (tarifa por hora y % de comisión).
//
// Es un test de FUENTE a propósito, y es el mismo guarda que ya llevan el Hub
// (`hub/apps/web/src/theme/ionic-fill-needs-md.test.ts`) y el Cloud Portal
// (`saas/tests/unit/test_ionic_fill_needs_md.py`, saas#1080): un fallo de estilo que no levanta
// ningún error necesita algo que lo mire por ti, o vuelve a colarse en la siguiente pantalla.
import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const UI = join(__dirname, '..');

/** Etiqueta de apertura de un control de formulario, aunque sus atributos ocupen varias líneas. */
const CONTROL = /<ion-(?:input|select|textarea)(?=[\s/>])[^>]*>/gs;

function componentSources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...componentSources(full));
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) out.push(full);
  }
  return out;
}

function controlsWithDeadFill(source: string): string[] {
  const dead: string[] = [];
  for (const tag of source.match(CONTROL) ?? []) {
    if (!/\bfill=/.test(tag)) continue;
    if (/\bmode="md"/.test(tag)) continue;
    dead.push(tag.replace(/\s+/g, ' ').slice(0, 110));
  }
  return dead;
}

describe('un control que declara `fill` tiene que declarar mode="md" (staff#39, hub#760)', () => {
  it('Ionic solo trae el estilo `outline` para `md`, no para `ios`', () => {
    // Anclado a la dependencia, no a una copia suya: si un Ionic futuro empezara a pintar `fill`
    // en `ios`, este test avisa de que el guarda sobra, en vez de sobrevivir a su propia causa.
    const require = createRequire(import.meta.url);
    const core = dirname(require.resolve('@ionic/core/package.json'));
    const styles = join(core, 'dist/collection/components/input');
    const ios = readFileSync(join(styles, 'input.ios.css'), 'utf8');
    const md = readFileSync(join(styles, 'input.md.css'), 'utf8');

    expect(md, '`md` es el modo que se supone que pinta el recuadro').toContain('input-fill-outline');
    expect(ios, '`ios` no tiene estilo de outline: ahí `fill` es un no-op').not.toContain('input-fill-outline');
  });

  it('ningún ion-input / ion-select / ion-textarea del módulo declara un `fill` que nunca va a pintar', () => {
    const offenders: string[] = [];
    for (const file of componentSources(UI)) {
      for (const tag of controlsWithDeadFill(readFileSync(file, 'utf8'))) {
        offenders.push(`  ${relative(UI, file)}: ${tag}`);
      }
    }
    expect(
      offenders,
      ['estos controles se pintan SIN caja — añade mode="md" a cada uno:', ...offenders].join('\n'),
    ).toEqual([]);
  });

  it('el escaneo llega de verdad a los componentes — si no, pasaría sobre un conjunto vacío', () => {
    const total = componentSources(UI).reduce(
      (n, file) => n + (readFileSync(file, 'utf8').match(CONTROL) ?? []).length,
      0,
    );
    expect(total, 'no se han encontrado controles: un refactor los movió y este guarda dejó de guardar').toBeGreaterThan(25);
  });
});
