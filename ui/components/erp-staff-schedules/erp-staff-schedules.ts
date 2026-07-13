import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn } from '@erplora/outfitkit';
import type { ListClient, ListParams, ListPage } from '@erplora/module-sdk';
import esLocale from '../../../locales/es.json';
import enLocale from '../../../locales/en.json';
const CATALOG: Record<string, unknown> = { es: esLocale, en: enLocale };

interface ErploraClientLike extends ListClient {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  queryPage<R = unknown>(name: string, params: ListParams): Promise<ListPage<R>>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
  on(event: string, cb: (payload: unknown) => void): () => void;
  locale: string;
  t(catalog: Record<string, unknown>, key: string, params?: Record<string, unknown>): string;
}

interface StaffMember {
  id: string;
  full_name: string;
  status: string;
}

interface Schedule {
  id: string;
  staff_id: string;
  name: string;
  is_default: number;
  effective_from: string | null;
  effective_until: string | null;
  is_active: number;
}

/** Fila editable del horario semanal (day_of_week 0=Lunes..6=Domingo, como la BD). */
interface DayRow {
  day: number;
  working: boolean;
  start: string;
  end: string;
  breakStart: string;
  breakEnd: string;
}

// Claves i18n por día (0=Lunes..6=Domingo, como la BD). El texto se resuelve reactivamente con
// `erplora.t()` (ADR-0055), no en carga del módulo (el cliente aún no existe entonces).
const DAY_KEYS = ['ui.dayMonday', 'ui.dayTuesday', 'ui.dayWednesday', 'ui.dayThursday', 'ui.dayFriday', 'ui.daySaturday', 'ui.daySunday'];

function defaultWeek(): DayRow[] {
  return DAY_KEYS.map((_key, day) => ({
    day,
    working: day < 5, // L-V por defecto
    start: '09:00',
    end: '18:00',
    breakStart: '',
    breakEnd: '',
  }));
}

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

/**
 * Horarios de trabajo por miembro: selector de miembro → lista de horarios
 * (`staff.schedules.list_for_member`) + alta con working_hours por día
 * (`staff.schedules.create`, handler WASM `create_schedule`).
 */
export class ErpStaffSchedules extends LitElement {
  static styles = css`
    /* Cadena de altura: sin ella, el modo fill de la tabla no tiene alto que llenar. */
    :host { display:flex; flex-direction:column; height:100%; min-height:0; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    .page { display:flex; flex-direction:column; min-height:0; flex:1 1 auto; }
    .page > ok-data-table { flex:1 1 auto; min-height:0; }
    header { display:flex; gap:.5rem; align-items:center; margin-bottom:.75rem; flex-wrap:wrap; }
    /* El alta vive en el panel lateral de la tabla: columna estrecha, no fila que se desborda. */
    .form { display:flex; flex-direction:column; gap:.7rem; }
    .form ion-button { align-self:flex-end; }
    header ion-select { flex:1 1 11rem; min-width:9rem; }
    .week { display:flex; flex-direction:column; gap:.25rem; margin:.25rem 0; }
    .day { display:flex; gap:.5rem; align-items:center; flex-wrap:wrap; }
    /* El nombre del día es la LABEL del checkbox (va slotteada dentro de él): así el texto es
       clicable y da nombre accesible al input. Ionic trunca esa label (white-space:nowrap en su
       shadow) → se vence por el shadow part, no con .ion-text-wrap. */
    .day ion-checkbox::part(label) { white-space:normal; }
    .day .name { display:block; width:6.5rem; font-weight:600; }
    .day ion-input { max-width:8rem; }
    .day .sep { color:var(--ion-color-medium,#6f6a5e); font-size:.85rem; }
    .err { color:#d9480f; font-weight:600; }
    .hint { color:var(--ion-color-medium,#6f6a5e); font-size:.9rem; }
  `;

  @state() members: StaffMember[] = [];

  @state() staffId = '';

  @state() schedules: Schedule[] = [];

  @state() loading = false;

  @state() formError = '';

  @state() saving = false;

  @state() newName = '';

  @state() newDefault = true;

  @state() effectiveFrom = '';

  @state() effectiveUntil = '';

  @state() week: DayRow[] = defaultWeek();

  private unsub?: () => void;

  private get columns(): DataTableColumn[] {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return [
    { key: 'name', header: t('ui.colSchedule'), sortable: true },
    { key: 'is_default', header: t('ui.colDefault'), sortable: true, format: (r) => (Number(r.is_default) ? t('ui.valYes') : '—') },
    { key: 'effective_from', header: t('ui.colFrom'), sortable: true, format: (r) => (r.effective_from as string) || '—' },
    { key: 'effective_until', header: t('ui.colTo'), sortable: true, format: (r) => (r.effective_until as string) || '—' },
    { key: 'is_active', header: t('ui.colActive'), sortable: true, format: (r) => (Number(r.is_active) ? t('ui.valYes') : t('ui.valNo')) },
  ];
  }

  /** Etiqueta localizada del día (0=Lunes..6=Domingo) — ADR-0055. */
  private dayLabel(day: number): string {
    return erplora().t(CATALOG, DAY_KEYS[day]);
  }

  private readonly onLocaleChange = (): void => this.requestUpdate();

  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
    await this.loadMembers();
    try {
      this.unsub = erplora().on('staff.schedule.created', () => this.loadSchedules());
    } catch {
      /* sin SDK (preview) → sin reactividad en vivo */
    }
  }

  disconnectedCallback() {
    window.removeEventListener('erplora:locale-changed', this.onLocaleChange);
    super.disconnectedCallback();
    this.unsub?.();
  }

  private async loadMembers() {
    try {
      this.members = (await erplora().query<StaffMember[]>('staff.members.list')) ?? [];
      if (!this.staffId && this.members.length) {
        this.staffId = this.members[0].id;
        await this.loadSchedules();
      }
    } catch (e) {
      this.formError = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errLoadMembers');
    }
  }

  private async loadSchedules() {
    if (!this.staffId) {
      this.schedules = [];
      return;
    }
    this.loading = true;
    try {
      this.schedules = (await erplora().query<Schedule[]>('staff.schedules.list_for_member', { staff_id: this.staffId })) ?? [];
    } catch (e) {
      this.formError = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errLoadSchedules');
    } finally {
      this.loading = false;
    }
  }

  private async onMemberChange(id: string) {
    this.staffId = id;
    this.formError = '';
    await this.loadSchedules();
  }

  private patchDay(day: number, patch: Partial<DayRow>) {
    this.week = this.week.map((d) => (d.day === day ? { ...d, ...patch } : d));
  }

  /** Valida en cliente lo mismo que el handler WASM para dar feedback inmediato. */
  private validateWeek(): string {
    const t = (k: string, p?: Record<string, unknown>): string => erplora().t(CATALOG, k, p);
    const active = this.week.filter((d) => d.working);
    if (!active.length) return t('ui.valNeedWorkingDay');
    for (const d of active) {
      const day = this.dayLabel(d.day);
      if (!d.start || !d.end) return t('ui.valNeedStartEnd', { day });
      if (d.start >= d.end) return t('ui.valStartBeforeEnd', { day });
      const hasBs = !!d.breakStart;
      const hasBe = !!d.breakEnd;
      if (hasBs !== hasBe) return t('ui.valBreakBoth', { day });
      if (hasBs && !(d.start <= d.breakStart && d.breakStart < d.breakEnd && d.breakEnd <= d.end)) {
        return t('ui.valBreakInside', { day });
      }
    }
    return '';
  }

  /** Referencia al panel lateral de la tabla: guardar lo cierra. */
  private dataTable(): { open(p?: 'filters' | 'create'): void; close(): void } | null {
    return this.renderRoot.querySelector('ok-data-table') as
      | { open(p?: 'filters' | 'create'): void; close(): void }
      | null;
  }

  private async createSchedule(ev: Event) {
    ev.preventDefault();
    if (!this.staffId) return;
    const err = this.validateWeek();
    if (err) {
      this.formError = err;
      return;
    }
    this.saving = true;
    this.formError = '';
    try {
      await erplora().command('staff.schedules.create', {
        staff_id: this.staffId,
        name: this.newName.trim() || erplora().t(CATALOG, 'ui.defaultScheduleName'),
        is_default: this.newDefault ? 1 : 0,
        effective_from: this.effectiveFrom || null,
        effective_until: this.effectiveUntil || null,
        working_hours: this.week
          .filter((d) => d.working)
          .map((d) => ({
            day_of_week: d.day,
            start_time: d.start,
            end_time: d.end,
            break_start: d.breakStart || null,
            break_end: d.breakEnd || null,
            is_working: 1,
          })),
      });
      this.newName = '';
      this.newDefault = true;
      this.effectiveFrom = '';
      this.effectiveUntil = '';
      this.week = defaultWeek();
      this.dataTable()?.close();
      await this.loadSchedules();
    } catch (e) {
      this.formError = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errCreateSchedule');
    } finally {
      this.saving = false;
    }
  }

  render() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return html`<div class="page">
        <!-- El selector de miembro NO es un campo del alta: es el ÁMBITO de la lista
             (list_for_member no lista nada sin staff_id) → por eso se queda fuera de la tabla. -->
        <header>
          <ion-select fill="outline" label-placement="floating" label=${t('ui.colMember')} .value=${this.staffId} @ionChange=${(e: any) => this.onMemberChange(e.target.value)}>${this.members.map((m) => html`<ion-select-option .value=${m.id}>${m.full_name}</ion-select-option>`)}</ion-select>
        </header>
        ${this.formError ? html`<p class="err">${this.formError}</p>` : nothing}
        ${!this.members.length ? html`<p class="hint">${t('ui.hintNoMembers')}</p>` : nothing}
        <ok-data-table .fill=${true} .addable=${true} .columns=${this.columns} .rows=${this.schedules} .searchable=${false} .emptyMessage=${this.loading ? t('ui.loading') : t('ui.emptySchedules')}>
          <!-- El formulario se proyecta SIEMPRE en el panel: si solo se pintara al abrirlo, el «+»
               abriría un panel vacío (la tabla no re-renderiza a sus hijos de luz). La semana va
               DENTRO: sus días viajan en el mismo staff.schedules.create, no son otro alta. -->
          <form slot="create" class="form" @submit=${(e: Event) => this.createSchedule(e)}>
            <ion-input fill="outline" label-placement="floating" label=${t('ui.colSchedule')} placeholder=${t('ui.phScheduleName')} .value=${this.newName} @ionInput=${(e: any) => (this.newName = e.target.value)}></ion-input>
            <ion-input fill="outline" type="date" label=${t('ui.labelEffectiveFrom')} label-placement="floating" .value=${this.effectiveFrom} @ionInput=${(e: any) => (this.effectiveFrom = e.target.value)}></ion-input>
            <ion-input fill="outline" type="date" label=${t('ui.labelEffectiveUntil')} label-placement="floating" .value=${this.effectiveUntil} @ionInput=${(e: any) => (this.effectiveUntil = e.target.value)}></ion-input>
            <ion-checkbox label-placement="end" .checked=${this.newDefault} @ionChange=${(e: any) => (this.newDefault = e.detail.checked)}>${t('ui.labelDefault')}</ion-checkbox>
            <div class="week">
              ${this.week.map(
                (d) => html`<div class="day">
                  <ion-checkbox justify="start" label-placement="end" .checked=${d.working} @ionChange=${(e: any) => this.patchDay(d.day, { working: e.detail.checked })}><span class="name">${this.dayLabel(d.day)}</span></ion-checkbox>
                  ${d.working
                    ? html`<ion-input fill="outline" type="time" aria-label=${t('ui.ariaStart')} .value=${d.start} @ionInput=${(e: any) => this.patchDay(d.day, { start: e.target.value })}></ion-input>
                        <span class="sep">${t('ui.sepTo')}</span>
                        <ion-input fill="outline" type="time" aria-label=${t('ui.ariaEnd')} .value=${d.end} @ionInput=${(e: any) => this.patchDay(d.day, { end: e.target.value })}></ion-input>
                        <span class="sep">${t('ui.sepBreak')}</span>
                        <ion-input fill="outline" type="time" aria-label=${t('ui.ariaBreakStart')} .value=${d.breakStart} @ionInput=${(e: any) => this.patchDay(d.day, { breakStart: e.target.value })}></ion-input>
                        <span class="sep">${t('ui.sepTo')}</span>
                        <ion-input fill="outline" type="time" aria-label=${t('ui.ariaBreakEnd')} .value=${d.breakEnd} @ionInput=${(e: any) => this.patchDay(d.day, { breakEnd: e.target.value })}></ion-input>`
                    : html`<span class="sep">${t('ui.notWorking')}</span>`}
                </div>`,
              )}
            </div>
            <ion-button type="submit" size="small" ?disabled=${this.saving || !this.staffId}>${this.saving ? t('ui.actionSaving') : t('ui.actionCreateSchedule')}</ion-button>
          </form>
        </ok-data-table>
      </div>`;
  }
}

define('erp-staff-schedules', ErpStaffSchedules);
