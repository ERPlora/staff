import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn } from '@erplora/outfitkit';
import type { ListClient, ListParams, ListPage } from '@erplora/module-sdk';

interface ErploraClientLike extends ListClient {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  queryPage<R = unknown>(name: string, params: ListParams): Promise<ListPage<R>>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
  on(event: string, cb: (payload: unknown) => void): () => void;
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
  label: string;
  working: boolean;
  start: string;
  end: string;
  breakStart: string;
  breakEnd: string;
}

const DAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function defaultWeek(): DayRow[] {
  return DAY_LABELS.map((label, day) => ({
    day,
    label,
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
    :host { display:block; font-family: system-ui, sans-serif; color: var(--ink, #1c1b18); }
    header { display:flex; gap:.5rem; align-items:center; margin-bottom:.75rem; flex-wrap:wrap; }
    h2 { margin:0; font-size:1.15rem; flex:1; }
    h3 { margin:1rem 0 .5rem; font-size:1rem; }
    .form { display:flex; gap:.5rem; flex-wrap:wrap; align-items:end; margin:.5rem 0 1rem; }
    .form ion-input, .form ion-select, header ion-select { --background:var(--surface-2,#f7f4ec); border:1px solid var(--line,#e7e2d6); border-radius:8px; min-width:8rem; }
    .week { display:flex; flex-direction:column; gap:.25rem; margin:.5rem 0 1rem; }
    .day { display:flex; gap:.5rem; align-items:center; flex-wrap:wrap; }
    .day .name { width:6.5rem; font-weight:600; }
    .day ion-input { --background:var(--surface-2,#f7f4ec); border:1px solid var(--line,#e7e2d6); border-radius:8px; max-width:8rem; }
    .day .sep { color:var(--ink-soft,#6f6a5e); font-size:.85rem; }
    .err { color:#d9480f; font-weight:600; }
    .hint { color:var(--ink-soft,#6f6a5e); font-size:.9rem; }
  `;

  @state() members: StaffMember[] = [];

  @state() staffId = '';

  @state() schedules: Schedule[] = [];

  @state() loading = false;

  @state() formError = '';

  @state() saving = false;

  @state() newName = 'Horario habitual';

  @state() newDefault = true;

  @state() effectiveFrom = '';

  @state() effectiveUntil = '';

  @state() week: DayRow[] = defaultWeek();

  private unsub?: () => void;

  private columns: DataTableColumn[] = [
    { key: 'name', header: 'Horario', sortable: true },
    { key: 'is_default', header: 'Por defecto', sortable: true, format: (r) => (Number(r.is_default) ? 'Sí' : '—') },
    { key: 'effective_from', header: 'Desde', sortable: true, format: (r) => (r.effective_from as string) || '—' },
    { key: 'effective_until', header: 'Hasta', sortable: true, format: (r) => (r.effective_until as string) || '—' },
    { key: 'is_active', header: 'Activo', sortable: true, format: (r) => (Number(r.is_active) ? 'Sí' : 'No') },
  ];

  async connectedCallback() {
    super.connectedCallback();
    await this.loadMembers();
    try {
      this.unsub = erplora().on('staff.schedule.created', () => this.loadSchedules());
    } catch {
      /* sin SDK (preview) → sin reactividad en vivo */
    }
  }

  disconnectedCallback() {
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
      this.formError = e instanceof Error ? e.message : 'No se pudieron cargar los miembros';
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
      this.formError = e instanceof Error ? e.message : 'No se pudieron cargar los horarios';
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
    const active = this.week.filter((d) => d.working);
    if (!active.length) return 'Marca al menos un día de trabajo';
    for (const d of active) {
      if (!d.start || !d.end) return `${d.label}: indica hora de inicio y fin`;
      if (d.start >= d.end) return `${d.label}: la hora de inicio debe ser anterior a la de fin`;
      const hasBs = !!d.breakStart;
      const hasBe = !!d.breakEnd;
      if (hasBs !== hasBe) return `${d.label}: el descanso necesita inicio y fin (o ninguno)`;
      if (hasBs && !(d.start <= d.breakStart && d.breakStart < d.breakEnd && d.breakEnd <= d.end)) {
        return `${d.label}: el descanso debe caer dentro del intervalo de trabajo`;
      }
    }
    return '';
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
        name: this.newName.trim() || 'Horario habitual',
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
      this.newName = 'Horario habitual';
      this.newDefault = true;
      this.effectiveFrom = '';
      this.effectiveUntil = '';
      this.week = defaultWeek();
      await this.loadSchedules();
    } catch (e) {
      this.formError = e instanceof Error ? e.message : 'No se pudo crear el horario';
    } finally {
      this.saving = false;
    }
  }

  render() {
    return html`<div>
        <header>
          <h2>Horarios</h2>
          <ion-select placeholder="Miembro…" .value=${this.staffId} @ionChange=${(e: any) => this.onMemberChange(e.target.value)}>${this.members.map((m) => html`<ion-select-option .value=${m.id}>${m.full_name}</ion-select-option>`)}</ion-select>
        </header>
        ${this.formError ? html`<p class="err">${this.formError}</p>` : nothing}
        ${!this.members.length ? html`<p class="hint">Da de alta miembros del staff para poder asignarles horarios.</p>` : nothing}
        <ok-data-table .columns=${this.columns} .rows=${this.schedules} .searchable=${false} .emptyMessage=${this.loading ? 'Cargando…' : 'Este miembro aún no tiene horarios.'}></ok-data-table>

        <h3>Nuevo horario</h3>
        <form class="form" @submit=${(e: Event) => this.createSchedule(e)}>
          <ion-input placeholder="Nombre del horario" .value=${this.newName} @ionInput=${(e: any) => (this.newName = e.target.value)}></ion-input>
          <ion-input type="date" label="Vigente desde" label-placement="stacked" .value=${this.effectiveFrom} @ionInput=${(e: any) => (this.effectiveFrom = e.target.value)}></ion-input>
          <ion-input type="date" label="Vigente hasta" label-placement="stacked" .value=${this.effectiveUntil} @ionInput=${(e: any) => (this.effectiveUntil = e.target.value)}></ion-input>
          <ion-checkbox label-placement="end" .checked=${this.newDefault} @ionChange=${(e: any) => (this.newDefault = e.detail.checked)}>Por defecto</ion-checkbox>
          <ion-button type="submit" size="small" ?disabled=${this.saving || !this.staffId}>${this.saving ? 'Guardando…' : 'Crear horario'}</ion-button>
        </form>
        <div class="week">
          ${this.week.map(
            (d) => html`<div class="day">
              <ion-checkbox label-placement="end" .checked=${d.working} @ionChange=${(e: any) => this.patchDay(d.day, { working: e.detail.checked })}></ion-checkbox>
              <span class="name">${d.label}</span>
              ${d.working
                ? html`<ion-input type="time" aria-label="Inicio" .value=${d.start} @ionInput=${(e: any) => this.patchDay(d.day, { start: e.target.value })}></ion-input>
                    <span class="sep">a</span>
                    <ion-input type="time" aria-label="Fin" .value=${d.end} @ionInput=${(e: any) => this.patchDay(d.day, { end: e.target.value })}></ion-input>
                    <span class="sep">descanso</span>
                    <ion-input type="time" aria-label="Inicio descanso" .value=${d.breakStart} @ionInput=${(e: any) => this.patchDay(d.day, { breakStart: e.target.value })}></ion-input>
                    <span class="sep">a</span>
                    <ion-input type="time" aria-label="Fin descanso" .value=${d.breakEnd} @ionInput=${(e: any) => this.patchDay(d.day, { breakEnd: e.target.value })}></ion-input>`
                : html`<span class="sep">No trabaja</span>`}
            </div>`,
          )}
        </div>
      </div>`;
  }
}

define('erp-staff-schedules', ErpStaffSchedules);
