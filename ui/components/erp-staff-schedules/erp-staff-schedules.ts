import { LitElement, html, css, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-inline-feedback';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn, DataTableAction } from '@erplora/outfitkit';
import type { ListClient, ListParams, ListPage } from '@erplora/module-sdk';
import { domainMessage } from '../../lib/domain-error';
import { formatDate } from '../../lib/enums';
import { formatWallTime, parseWallTime } from '../../lib/wall-time';
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

/** One weekday of a template (`staff.schedules.hours_for_member`, staff#2). */
interface WorkingHours {
  id: string;
  schedule_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
  is_working: number;
}

/** `HH:MM:SS` (DB) → the stored `HH:MM` of the form. */
const hhmm = (t: string | null | undefined): string => (t ? String(t).slice(0, 5) : '');

/** Fila editable del horario semanal (day_of_week 0=Lunes..6=Domingo, como la BD). */
interface DayRow {
  day: number;
  working: boolean;
  start: string;
  end: string;
  breakStart: string;
  breakEnd: string;
}

/** The four time fields of a day (staff#86). */
type DayTimeField = 'start' | 'end' | 'breakStart' | 'breakEnd';
const DAY_TIME_FIELDS: readonly DayTimeField[] = ['start', 'end', 'breakStart', 'breakEnd'];

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

  /** What went wrong saving the form: painted INSIDE the form (staff#72). */
  @state() formError = '';
  /** What went wrong loading the list or in a row action (no panel open): painted on the page. */
  @state() pageError = '';

  @state() saving = false;

  @state() newName = '';

  @state() newDefault = true;

  @state() effectiveFrom = '';

  @state() effectiveUntil = '';

  @state() week: DayRow[] = defaultWeek();

  /** staff#86 — the text being typed into a time field, by `<day>:<field>`, kept apart from the
   *  week (which only ever holds a valid 'HH:MM' or ''). Emptied whenever another week is loaded
   *  into the form, so a half-typed text is never painted over somebody else's hour. */
  @state() private timeDrafts: Record<string, string> = {};

  /** Intervals of every template of the member (staff#2), grouped by `schedule_id` on render. */
  @state() hours: WorkingHours[] = [];

  /** Template being edited in the panel; empty = the panel is creating (same panel, two modes). */
  @state() editingId = '';

  /** Delete asks first: the row is parked here and the ion-alert decides. */
  @state() pendingDelete: { id: string; label: string } | null = null;

  private unsub?: () => void;

  private get columns(): DataTableColumn[] {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return [
    { key: 'name', header: t('ui.colSchedule'), sortable: true },
    { key: 'is_default', header: t('ui.colDefault'), sortable: true, format: (r) => (Number(r.is_default) ? t('ui.valYes') : '—') },
    { key: 'effective_from', header: t('ui.colFrom'), sortable: true, format: (r) => formatDate(r.effective_from) || '—' },
    { key: 'effective_until', header: t('ui.colTo'), sortable: true, format: (r) => formatDate(r.effective_until) || '—' },
    { key: 'is_active', header: t('ui.colActive'), sortable: true, format: (r) => (Number(r.is_active) ? t('ui.valYes') : t('ui.valNo')) },
    // The week at a glance (staff#2): «Mon 09:00-18:00 (13:00-14:00) · Wed 10:00-16:00».
    { key: 'hours', header: t('ui.colHours'), sortable: false, format: (r) => this.hoursSummary(String(r.id)) },
  ];
  }

  private get actions(): DataTableAction[] {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return [
      { id: 'edit', label: t('ui.actionEdit'), icon: 'create-outline' },
      { id: 'toggle', label: t('ui.actionToggleActive'), icon: 'power-outline' },
      { id: 'delete', label: t('ui.actionDelete'), icon: 'trash-outline', color: 'danger' },
    ];
  }

  private hoursSummary(scheduleId: string): string {
    const rows = this.hours
      .filter((h) => h.schedule_id === scheduleId && Number(h.is_working) === 1)
      .sort((a, b) => a.day_of_week - b.day_of_week);
    if (!rows.length) return '—';
    return rows
      .map((h) => {
        const brk = h.break_start && h.break_end ? ` (${this.fmtTime(h.break_start)}-${this.fmtTime(h.break_end)})` : '';
        return `${this.dayLabel(h.day_of_week)} ${this.fmtTime(h.start_time)}-${this.fmtTime(h.end_time)}${brk}`;
      })
      .join(' · ');
  }

  /** A stored time in the hub's clock (staff#86): list and form read the same hour. */
  private fmtTime(time: string | null | undefined): string {
    return formatWallTime(hhmm(time), erplora().locale);
  }

  /** Localized day label (0=Monday..6=Sunday) — ADR-0055. */
  private dayLabel(day: number): string {
    return erplora().t(CATALOG, DAY_KEYS[day]);
  }

  private readonly onLocaleChange = (): void => this.requestUpdate();

  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
    await this.loadMembers();
    try {
      const reload = () => this.loadSchedules();
      const off1 = erplora().on('staff.schedule.created', reload);
      const off2 = erplora().on('staff.schedule.updated', reload);
      const off3 = erplora().on('staff.schedule.deleted', reload);
      this.unsub = () => {
        off1();
        off2();
        off3();
      };
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
      this.pageError = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errLoadMembers');
    }
  }

  private async loadSchedules() {
    if (!this.staffId) {
      this.schedules = [];
      return;
    }
    this.loading = true;
    try {
      const [schedules, hours] = await Promise.all([
        erplora().query<Schedule[]>('staff.schedules.list_for_member', { staff_id: this.staffId }),
        erplora().query<WorkingHours[]>('staff.schedules.hours_for_member', { staff_id: this.staffId }),
      ]);
      this.schedules = schedules ?? [];
      this.hours = hours ?? [];
    } catch (e) {
      this.pageError = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errLoadSchedules');
    } finally {
      this.loading = false;
    }
  }

  private async onMemberChange(id: string) {
    this.staffId = id;
    this.pageError = '';
    await this.loadSchedules();
  }

  private patchDay(day: number, patch: Partial<DayRow>) {
    this.week = this.week.map((d) => (d.day === day ? { ...d, ...patch } : d));
  }

  /** staff#86 — what a time field shows: the raw text while it is being typed (a half-typed
   *  «14:» stays on screen), the stored hour in the hub's clock otherwise. */
  private timeFieldValue(d: DayRow, field: DayTimeField): string {
    return this.timeDrafts[`${d.day}:${field}`] ?? formatWallTime(d[field], erplora().locale);
  }

  /** staff#86 — `ionInput`: the text is kept as the draft and the stored hour follows it exactly,
   *  back to '' while it is not (yet) a time — a half-typed hour never saves the last valid one. */
  private onTimeInput(day: number, field: DayTimeField, text: string): void {
    this.timeDrafts = { ...this.timeDrafts, [`${day}:${field}`]: text };
    this.patchDay(day, { [field]: parseWallTime(text) ?? '' });
  }

  /** staff#86 — blur/Enter (`ionChange`): forget the draft so the field repaints the stored hour
   *  in the hub's clock. An unreadable text stays, so the save can say why it refuses. */
  private commitTimeDraft(day: number, field: DayTimeField): void {
    const key = `${day}:${field}`;
    const text = this.timeDrafts[key];
    if (text === undefined || (text.trim() && !parseWallTime(text))) return;
    const { [key]: _gone, ...rest } = this.timeDrafts;
    this.timeDrafts = rest;
  }

  /** staff#86 — a time pasted in any spelling the parser reads is stored and repainted in the hub
   *  clock at once. Anything else is left to the browser's own paste. */
  private onTimePaste(day: number, field: DayTimeField, e: Event): void {
    const time = parseWallTime((e as ClipboardEvent).clipboardData?.getData('text') ?? '');
    if (!time) return;
    e.preventDefault();
    const { [`${day}:${field}`]: _gone, ...rest } = this.timeDrafts;
    this.timeDrafts = rest;
    this.patchDay(day, { [field]: time });
  }

  /** staff#86 — a field whose text cannot be read as a time: blank in the week, so without this a
   *  break typed «13:» would be saved as «no break» without a word. */
  private hasUnreadableTime(day: number): boolean {
    return DAY_TIME_FIELDS.some((field) => {
      const text = this.timeDrafts[`${day}:${field}`];
      return text !== undefined && text.trim() !== '' && parseWallTime(text) === null;
    });
  }

  /** Valida en cliente lo mismo que el handler WASM para dar feedback inmediato. */
  private validateWeek(): string {
    const t = (k: string, p?: Record<string, unknown>): string => erplora().t(CATALOG, k, p);
    const active = this.week.filter((d) => d.working);
    if (!active.length) return t('ui.valNeedWorkingDay');
    for (const d of active) {
      const day = this.dayLabel(d.day);
      if (this.hasUnreadableTime(d.day)) return t('ui.valTimeUnreadable', { day });
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

  /** Row actions (staff#2): edit loads the template + ITS week into the panel; toggle flips
   *  `is_active`; delete parks the row for the confirmation alert. */
  async onRowAction(ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>): Promise<void> {
    const row = ev.detail.row as unknown as Schedule;
    this.formError = '';
    this.pageError = '';
    if (ev.detail.actionId === 'edit') {
      this.editingId = row.id;
      this.newName = row.name ?? '';
      this.newDefault = Number(row.is_default) === 1;
      this.effectiveFrom = row.effective_from ?? '';
      this.effectiveUntil = row.effective_until ?? '';
      const mine = this.hours.filter((h) => h.schedule_id === row.id);
      this.timeDrafts = {};
      this.week = DAY_KEYS.map((_k, day) => {
        const h = mine.find((x) => x.day_of_week === day && Number(x.is_working) === 1);
        return h
          ? { day, working: true, start: hhmm(h.start_time), end: hhmm(h.end_time), breakStart: hhmm(h.break_start), breakEnd: hhmm(h.break_end) }
          : { day, working: false, start: '09:00', end: '18:00', breakStart: '', breakEnd: '' };
      });
      this.dataTable()?.open('edit', { title: erplora().t(CATALOG, 'ui.panelEdit', { name: this.newName }) });
      return;
    }
    if (ev.detail.actionId === 'toggle') {
      try {
        await erplora().command('staff.schedules.set_active', { schedule_id: row.id, is_active: Number(row.is_active) ? 0 : 1 });
        await this.loadSchedules();
      } catch (e) {
        this.pageError = domainMessage(e, erplora().locale, erplora().t(CATALOG, 'ui.errUpdateSchedule'));
      }
      return;
    }
    if (ev.detail.actionId === 'delete') {
      this.pendingDelete = { id: row.id, label: row.name ?? '' };
    }
  }

  async onDeleteDismiss(ev: CustomEvent<{ role?: string }>): Promise<void> {
    const pending = this.pendingDelete;
    this.pendingDelete = null;
    if (ev.detail?.role !== 'confirm' || !pending) return;
    try {
      await erplora().command('staff.schedules.delete', { schedule_id: pending.id });
      if (this.editingId === pending.id) this.resetForm();
      await this.loadSchedules();
    } catch (e) {
      this.pageError = domainMessage(e, erplora().locale, erplora().t(CATALOG, 'ui.errUpdateSchedule'));
    }
  }

  private resetForm(): void {
    this.editingId = '';
    this.newName = '';
    this.newDefault = true;
    this.effectiveFrom = '';
    this.effectiveUntil = '';
    this.week = defaultWeek();
    this.timeDrafts = {};
  }

  /** pm#450: the table's «Add» emits no event and keeps our form state; after an edit it would
   *  show the edited schedule under a «New» header, and the submit would UPDATE it. */
  private onTableClick(e: Event): void {
    if (!this.editingId) return;
    const addId = 'staff-schedules-table-add';
    if (e.composedPath().some((n) => n instanceof HTMLElement && n.dataset.testid === addId)) this.resetForm();
  }

  /** Wired natively, not with a Lit `@click` on the tag: `<ok-data-table>` carries `testid`, not
   *  `data-testid` (outfitkit#143), and a template binding would read as an action element that
   *  demands one. */
  firstUpdated(): void {
    this.renderRoot.querySelector('ok-data-table')?.addEventListener('click', (e) => this.onTableClick(e));
  }

  /** Header of the table panel. The title comes from open('edit', { title }) (pm#450,
   *  outfitkit#150); this `newRecord` override is the fallback for OutfitKit < 0.1.94, which
   *  ignores the title and paints `newRecord` for the edit panel too — without it, editing a
   *  schedule reads «New» and saving looks like it creates another one. */
  private get panelLabels(): { newRecord: string } {
    const t = (k: string, p?: Record<string, unknown>): string => erplora().t(CATALOG, k, p);
    return { newRecord: this.editingId ? t('ui.panelEdit', { name: this.newName }) : t('ui.panelNew') };
  }

  /** Referencia al panel lateral de la tabla: guardar lo cierra. */
  private dataTable(): { open(p?: 'filters' | 'create' | 'edit', opts?: { title?: string }): void; close(): void } | null {
    return this.renderRoot.querySelector('ok-data-table') as
      | { open(p?: 'filters' | 'create' | 'edit', opts?: { title?: string }): void; close(): void }
      | null;
  }

  /** Create and edit share the panel: `editingId` decides the command (create ↔ update). The
   *  update REPLACES the week — the client validates the same rules the handler enforces. */
  async createSchedule(ev: Event) {
    ev.preventDefault();
    if (!this.staffId) return;
    if (this.effectiveFrom && this.effectiveUntil && this.effectiveFrom > this.effectiveUntil) {
      this.formError = erplora().t(CATALOG, 'ui.valRangeOrder');
      return;
    }
    const err = this.validateWeek();
    if (err) {
      this.formError = err;
      return;
    }
    this.saving = true;
    this.formError = '';
    const body = {
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
    };
    try {
      if (this.editingId) {
        await erplora().command('staff.schedules.update', { schedule_id: this.editingId, ...body });
      } else {
        await erplora().command('staff.schedules.create', { staff_id: this.staffId, ...body });
      }
      // A save that went fine retires the refusal of an earlier row action (staff#72 review).
      this.pageError = '';
      this.resetForm();
      this.dataTable()?.close();
      await this.loadSchedules();
    } catch (e) {
      this.formError = domainMessage(e, erplora().locale, erplora().t(CATALOG, this.editingId ? 'ui.errUpdateSchedule' : 'ui.errCreateSchedule'));
    } finally {
      this.saving = false;
    }
  }

  /** staff#72: a refusal appears ABOVE the button that was pressed, at the foot of a long form —
   *  on a phone that pushes it half off the sheet. Bring it into view once it has painted itself:
   *  scrolled before, the banner still measures 0 px and ends up under the tab bar. */
  updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('formError') && this.formError) void this.revealFormError();
  }

  private async revealFormError(): Promise<void> {
    const banner = this.renderRoot.querySelector('[data-testid="staff-schedules-form-error"]') as
      | (HTMLElement & { updateComplete?: Promise<unknown> })
      | null;
    await banner?.updateComplete;
    banner?.scrollIntoView?.({ block: 'center' });
  }

  render() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return html`<div class="page">
        <!-- El selector de miembro NO es un campo del alta: es el ÁMBITO de la lista
             (list_for_member no lista nada sin staff_id) → por eso se queda fuera de la tabla. -->
        <header>
          <ion-select data-testid="staff-schedules-member" mode="md" fill="outline" label-placement="floating" label=${t('ui.colMember')} .value=${this.staffId} @ionChange=${(e: any) => this.onMemberChange(e.target.value)}>${this.members.map((m) => html`<ion-select-option .value=${m.id}>${m.full_name}</ion-select-option>`)}</ion-select>
        </header>
        ${this.pageError ? html`<ok-inline-feedback data-testid="staff-schedules-page-error" tone="danger" icon="alert-circle-outline">${this.pageError}</ok-inline-feedback>` : nothing}
        ${!this.members.length ? html`<p data-testid="staff-schedules-no-members" class="hint">${t('ui.hintNoMembers')}</p>` : nothing}
        <!-- The «Edit» button is not the only door: rowClickable makes the whole row open the
             same edit panel (outfitkit#67 — the actions column can be off-screen at 1440 px). -->
        <ok-data-table testid="staff-schedules-table" .fill=${true} .addable=${true} .labels=${this.panelLabels} .columns=${this.columns} .views=${true} .cardTitle=${(r: Record<string, unknown>) => String(r.name ?? '—')} .cardIcon=${() => 'calendar-number-outline'} .actions=${this.actions} .rowClickable=${true} .rows=${this.schedules} .searchable=${false} .emptyMessage=${this.loading ? t('ui.loading') : t('ui.emptySchedules')} @rowAction=${(e: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => this.onRowAction(e)} @rowClick=${(e: CustomEvent<{ row: Record<string, unknown> }>) => this.onRowAction({ detail: { actionId: 'edit', row: e.detail.row } } as CustomEvent<{ actionId: string; row: Record<string, unknown> }>)}>
          <!-- El formulario se proyecta SIEMPRE en el panel: si solo se pintara al abrirlo, el «+»
               abriría un panel vacío (la tabla no re-renderiza a sus hijos de luz). La semana va
               DENTRO: sus días viajan en el mismo staff.schedules.create, no son otro alta. -->
          <form data-testid="staff-schedules-form" slot="create" class="form" @submit=${(e: Event) => this.createSchedule(e)}>
            <ion-input data-testid="staff-schedules-name" mode="md" fill="outline" label-placement="floating" label=${t('ui.colSchedule')} placeholder=${t('ui.phScheduleName')} .value=${this.newName} @ionInput=${(e: any) => (this.newName = e.target.value)}></ion-input>
            <ion-input data-testid="staff-schedules-effective-from" mode="md" fill="outline" type="date" label=${t('ui.labelEffectiveFrom')} label-placement="floating" .value=${this.effectiveFrom} @ionInput=${(e: any) => (this.effectiveFrom = e.target.value)}></ion-input>
            <ion-input data-testid="staff-schedules-effective-until" mode="md" fill="outline" type="date" label=${t('ui.labelEffectiveUntil')} label-placement="floating" .value=${this.effectiveUntil} @ionInput=${(e: any) => (this.effectiveUntil = e.target.value)}></ion-input>
            <ion-checkbox data-testid="staff-schedules-default" label-placement="end" .checked=${this.newDefault} @ionChange=${(e: any) => (this.newDefault = e.detail.checked)}>${t('ui.labelDefault')}</ion-checkbox>
            <!-- staff#86: TEXT time fields painted in the hub's clock, never type="time": the browser
                 paints a native time field with its own (operating system) clock. -->
            <div class="week">
              ${this.week.map(
                (d) => html`<div class="day">
                  <ion-checkbox data-testid=${`staff-schedules-day-working-${d.day}`} justify="start" label-placement="end" .checked=${d.working} @ionChange=${(e: any) => this.patchDay(d.day, { working: e.detail.checked })}><span class="name">${this.dayLabel(d.day)}</span></ion-checkbox>
                  ${d.working
                    ? html`<ion-input data-testid=${`staff-schedules-day-start-${d.day}`} data-role="day-time" mode="md" fill="outline" type="text" inputmode="numeric" autocomplete="off" placeholder=${t('ui.timePlaceholder')} aria-label=${t('ui.ariaStart')} .value=${this.timeFieldValue(d, 'start')} @ionInput=${(e: any) => this.onTimeInput(d.day, 'start', String(e.target.value ?? ''))} @ionChange=${() => this.commitTimeDraft(d.day, 'start')} @paste=${(e: Event) => this.onTimePaste(d.day, 'start', e)}></ion-input>
                        <span class="sep">${t('ui.sepTo')}</span>
                        <ion-input data-testid=${`staff-schedules-day-end-${d.day}`} data-role="day-time" mode="md" fill="outline" type="text" inputmode="numeric" autocomplete="off" placeholder=${t('ui.timePlaceholder')} aria-label=${t('ui.ariaEnd')} .value=${this.timeFieldValue(d, 'end')} @ionInput=${(e: any) => this.onTimeInput(d.day, 'end', String(e.target.value ?? ''))} @ionChange=${() => this.commitTimeDraft(d.day, 'end')} @paste=${(e: Event) => this.onTimePaste(d.day, 'end', e)}></ion-input>
                        <span class="sep">${t('ui.sepBreak')}</span>
                        <ion-input data-testid=${`staff-schedules-day-break-start-${d.day}`} data-role="day-time" mode="md" fill="outline" type="text" inputmode="numeric" autocomplete="off" placeholder=${t('ui.timePlaceholder')} aria-label=${t('ui.ariaBreakStart')} .value=${this.timeFieldValue(d, 'breakStart')} @ionInput=${(e: any) => this.onTimeInput(d.day, 'breakStart', String(e.target.value ?? ''))} @ionChange=${() => this.commitTimeDraft(d.day, 'breakStart')} @paste=${(e: Event) => this.onTimePaste(d.day, 'breakStart', e)}></ion-input>
                        <span class="sep">${t('ui.sepTo')}</span>
                        <ion-input data-testid=${`staff-schedules-day-break-end-${d.day}`} data-role="day-time" mode="md" fill="outline" type="text" inputmode="numeric" autocomplete="off" placeholder=${t('ui.timePlaceholder')} aria-label=${t('ui.ariaBreakEnd')} .value=${this.timeFieldValue(d, 'breakEnd')} @ionInput=${(e: any) => this.onTimeInput(d.day, 'breakEnd', String(e.target.value ?? ''))} @ionChange=${() => this.commitTimeDraft(d.day, 'breakEnd')} @paste=${(e: Event) => this.onTimePaste(d.day, 'breakEnd', e)}></ion-input>`
                    : html`<span class="sep">${t('ui.notWorking')}</span>`}
                </div>`,
              )}
            </div>
            <!-- staff#72: the refusal travels WITH the form — on a phone the panel is a full-screen sheet
                 and a banner on the page underneath it is never seen. -->
            ${this.formError ? html`<ok-inline-feedback data-testid="staff-schedules-form-error" tone="danger" icon="alert-circle-outline">${this.formError}</ok-inline-feedback>` : nothing}
            <ion-button data-testid="staff-schedules-submit" type="submit" size="small" ?disabled=${this.saving || !this.staffId}>${this.saving ? t('ui.actionSaving') : this.editingId ? t('ui.actionSave') : t('ui.actionCreateSchedule')}</ion-button>
          </form>
        </ok-data-table>
        <ion-alert
          data-testid="staff-schedules-delete-alert"
          .isOpen=${this.pendingDelete !== null}
          header=${t('ui.deleteScheduleTitle')}
          message=${erplora().t(CATALOG, 'ui.deleteScheduleMessage', { name: this.pendingDelete?.label ?? '' })}
          .buttons=${[
            { text: t('ui.cancel'), role: 'cancel', htmlAttributes: { 'data-testid': 'staff-schedules-delete-cancel' } },
            { text: t('ui.actionDelete'), role: 'confirm', cssClass: 'alert-button-danger', htmlAttributes: { 'data-testid': 'staff-schedules-delete-submit' } },
          ]}
          @ionAlertDidDismiss=${(e: CustomEvent<{ role?: string }>) => this.onDeleteDismiss(e)}
        ></ion-alert>
      </div>`;
  }
}

define('erp-staff-schedules', ErpStaffSchedules);
