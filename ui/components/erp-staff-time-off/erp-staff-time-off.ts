import { LitElement, html, css, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-inline-feedback';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn, DataTableAction } from '@erplora/outfitkit';
import { createListController } from '@erplora/module-sdk';
import type { ListController, ListClient, ListParams, ListPage } from '@erplora/module-sdk';
import { domainMessage } from '../../lib/domain-error';
import { LEAVE_TYPE_KEY, REQUEST_STATUS_KEY, enumLabel, enumOptions, formatDate } from '../../lib/enums';
import { formatCalendarDate, isUnreadableDate, parseCalendarDate } from '../../lib/calendar-date';
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
  /** Show/hide ONLY — the runtime is what enforces a permission (module-sdk). */
  hasPermission(permission: string): boolean;
}

/** A staff member, for the picker of the create form (`staff.members.list`). */
interface StaffMember {
  id: string;
  full_name: string;
}

/** Panel lateral de la tabla: el «+» de la barra lo abre, guardar lo cierra. */
interface DataTablePanel {
  open(panel?: 'filters' | 'create'): void;
  close(): void;
}

/** What the create form holds while it is being typed (dates as `YYYY-MM-DD`, times as `HH:MM`). */
interface TimeOffDraft {
  staff_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  is_full_day: boolean;
  start_time: string;
  end_time: string;
  reason: string;
}

/** staff#87 — the two date fields of an absence. */
type DateField = 'start_date' | 'end_date';
const DATE_FIELDS: readonly DateField[] = ['start_date', 'end_date'];

const EMPTY_DRAFT: TimeOffDraft = {
  staff_id: '', leave_type: 'vacation', start_date: '', end_date: '',
  is_full_day: true, start_time: '', end_time: '', reason: '',
};

interface TimeOff {
  id: string;
  staff_id: string;
  staff_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  is_full_day: number;
  status: string;
  // No `reason`/`notes`: this list is the operational view — who is off and when. The motive of an
  // absence (a sick leave is one) travels in `staff.time_off.detail`, behind
  // `staff.view_time_off_detail`, which an `employee` does not have (staff#10).
}

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

export class ErpStaffTimeOff extends LitElement {
  static styles = css`
    :host { display:block; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    header { display:flex; gap:.5rem; align-items:center; margin-bottom:.75rem; }
    h2 { margin:0; font-size:1.15rem; flex:1; }
    /* El alta vive en el panel lateral de la tabla: columna estrecha, no fila que se desborda. */
    .form { display:flex; flex-direction:column; gap:.7rem; }
    .form ion-button { align-self:flex-end; }
    /* Two columns when the panel is wide enough (tablet/desktop), one on a phone. */
    .grid2 { display:grid; grid-template-columns:repeat(auto-fit, minmax(11rem, 1fr)); gap:.6rem; align-items:center; }
    .err { color:#d9480f; font-weight:600; }
  `;

  /** What went wrong saving the form: painted INSIDE the form (staff#72). */
  @state() formError = '';
  /** What went wrong in a row action (approve/reject, no panel open): painted on the page. */
  @state() pageError = '';

  @state() busyId = '';

  @state() tick = 0;

  /** Miembros del hub, para elegir de quién es la ausencia. */
  @state() members: StaffMember[] = [];

  /** The absence being typed in the panel (staff#36). */
  @state() draft: TimeOffDraft = { ...EMPTY_DRAFT };

  /** staff#87 — the text being typed into a date field, kept apart from the draft (which only ever
   *  holds a real 'YYYY-MM-DD' or ''): a half-typed «24/12» stays on screen. Emptied with the draft
   *  after a save. */
  @state() private dateDrafts: Partial<Record<DateField, string>> = {};

  @state() saving = false;

  private ctrl!: ListController<TimeOff>;

  private unsub?: () => void;

  /** Show/hide only: the runtime revalidates `staff.manage_time_off` on the command itself. */
  private get canManage(): boolean {
    return erplora().hasPermission?.('staff.manage_time_off') === true;
  }

  private get columns(): DataTableColumn[] {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return [
    { key: 'staff_name', header: t('ui.colMember'), sortable: true, filterable: true, filterType: 'text' },
    // El valor CRUDO (`vacation`, `pending`, `2026-09-10`) no se enseña: la celda lee del mismo
    // catálogo que el desplegable del alta y que las opciones del filtro (staff#37).
    {
      key: 'leave_type',
      header: t('ui.colType'),
      sortable: true,
      filterable: true,
      filterType: 'select',
      options: enumOptions(LEAVE_TYPE_KEY),
      format: (r) => enumLabel(LEAVE_TYPE_KEY, r.leave_type),
    },
    { key: 'start_date', header: t('ui.colFrom'), sortable: true, filterable: true, filterType: 'daterange', format: (r) => formatDate(r.start_date) },
    { key: 'end_date', header: t('ui.colTo'), sortable: true, filterable: true, filterType: 'daterange', format: (r) => formatDate(r.end_date) },
    {
      key: 'status',
      header: t('ui.colStatus'),
      sortable: true,
      filterable: true,
      filterType: 'select',
      options: enumOptions(REQUEST_STATUS_KEY),
      format: (r) => enumLabel(REQUEST_STATUS_KEY, r.status),
    },
  ];
  }

  private get actions(): DataTableAction[] {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return [
    // Solo icono (ADR-0133): el `label` viaja como title + aria-label del botón, no como texto.
    { id: 'approve', label: t('ui.actionApprove'), icon: 'checkmark-circle-outline', color: 'primary' },
    { id: 'reject', label: t('ui.actionReject'), icon: 'close-circle-outline', color: 'medium' },
  ];
  }

  private readonly onLocaleChange = (): void => this.requestUpdate();

  // TODO-LIT: componentWillLoad → connectedCallback. Recuerda: connectedCallback se dispara
  // en CADA reconexión al DOM (no solo en el primer montaje). Si la init debe correr una
  // sola vez tras el primer render, considera firstUpdated() en su lugar.
  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
    this.ctrl = createListController<TimeOff>(erplora(), 'staff.time_off.list', () => this.requestUpdate(), {
      pageSize: 50,
      sort: 'id',
      dir: 'asc',
    });
    await Promise.all([this.ctrl.load(), this.loadMembers()]);
    try {
      const off1 = erplora().on('staff.time_off.created', () => this.ctrl.load());
      const off2 = erplora().on('staff.time_off.status_changed', () => this.ctrl.load());
      this.unsub = () => {
        off1();
        off2();
      };
    } catch {
      /* sin SDK (preview) */
    }
  }

  disconnectedCallback() {
    window.removeEventListener('erplora:locale-changed', this.onLocaleChange);
    super.disconnectedCallback();
    this.unsub?.();
  }

  /** Los miembros del hub para el selector del alta. Si no se pueden leer, el panel se queda sin
   *  opciones — pero la pantalla sigue aprobando y rechazando, que es lo que ya hacía. */
  private async loadMembers(): Promise<void> {
    try {
      this.members = (await erplora().query<StaffMember[]>('staff.members.list')) ?? [];
    } catch { /* sin permiso de directorio (o preview) → selector vacío */ }
  }

  private dataTable(): DataTablePanel | null {
    return this.renderRoot.querySelector('ok-data-table') as DataTablePanel | null;
  }

  private patch(p: Partial<TimeOffDraft>): void {
    this.draft = { ...this.draft, ...p };
  }

  /** staff#87 — what a date field shows: the raw text while it is being typed, the stored date in
   *  the hub's day/month order otherwise (never the browser's, as a native date field). */
  private dateFieldValue(field: DateField): string {
    return this.dateDrafts[field] ?? formatCalendarDate(this.draft[field], erplora().locale);
  }

  /** staff#87 — `ionInput`: the stored date follows the text exactly, back to '' while it is not
   *  (yet) a date — a half-typed date never keeps the last valid one. */
  private onDateInput(field: DateField, text: string): void {
    this.dateDrafts = { ...this.dateDrafts, [field]: text };
    this.patch({ [field]: parseCalendarDate(text, erplora().locale) ?? '' });
  }

  /** staff#87 — blur/Enter (`ionChange`): forget the draft so the field repaints the stored date in
   *  the hub's order. An unreadable text stays, so the save can say why it refuses. */
  private commitDateDraft(field: DateField): void {
    const text = this.dateDrafts[field];
    if (text === undefined || isUnreadableDate(text, erplora().locale)) return;
    const { [field]: _typed, ...rest } = this.dateDrafts;
    this.dateDrafts = rest;
  }

  /**
   * Lo que el usuario puede corregir se le dice AQUÍ, antes de gastar un viaje al servidor y de
   * leer un error crudo del handler. Lo que solo sabe el servidor —el solape con otra ausencia
   * `pending|approved`— no se adivina: se manda y se pinta su código de dominio traducido.
   *
   * Devuelve la clave i18n del primer problema, o `''` si el borrador es enviable.
   */
  private validationKey(): string {
    const d = this.draft;
    if (!d.staff_id) return 'ui.valTimeOffMember';
    // staff#87: a typed text that is not a date is named as such, not as a missing date.
    if (DATE_FIELDS.some((field) => isUnreadableDate(this.dateDrafts[field] ?? '', erplora().locale))) return 'ui.valDateUnreadable';
    if (!d.start_date || !d.end_date) return 'ui.valTimeOffDates';
    if (d.start_date > d.end_date) return 'ui.valTimeOffRange';
    if (!d.is_full_day) {
      if (!d.start_time || !d.end_time) return 'ui.valTimeOffHours';
      if (d.start_time >= d.end_time) return 'ui.valTimeOffHoursOrder';
    }
    return '';
  }

  /** Alta de una ausencia (staff#36): la puerta que le faltaba a `staff.time_off.create`. */
  async createTimeOff(ev: Event): Promise<void> {
    ev.preventDefault?.();
    const problem = this.validationKey();
    if (problem) {
      this.formError = erplora().t(CATALOG, problem);
      return;
    }
    const d = this.draft;
    this.saving = true;
    this.formError = '';
    try {
      await erplora().command('staff.time_off.create', {
        staff_id: d.staff_id,
        leave_type: d.leave_type || 'vacation',
        start_date: d.start_date,
        end_date: d.end_date,
        is_full_day: d.is_full_day ? 1 : 0,
        start_time: d.is_full_day ? null : d.start_time,
        end_time: d.is_full_day ? null : d.end_time,
        reason: d.reason,
      });
      // A save that went fine retires the refusal of an earlier row action (staff#72 review).
      this.pageError = '';
      this.draft = { ...EMPTY_DRAFT };
      this.dateDrafts = {};
      this.dataTable()?.close();
      await this.ctrl.load();
    } catch (e) {
      this.formError = domainMessage(e, erplora().locale, erplora().t(CATALOG, 'ui.errCreateTimeOff'));
    } finally {
      this.saving = false;
    }
  }

  private async onRowAction(actionId: string, row: Record<string, unknown>) {
    if ((row.status as string) !== 'pending') return;
    const status = actionId === 'approve' ? 'approved' : 'rejected';
    const id = row.id as string;
    this.busyId = id;
    this.pageError = '';
    try {
      await erplora().command('staff.time_off.set_status', { time_off_id: id, status });
      await this.ctrl.load();
    } catch (e) {
      this.pageError = domainMessage(e, erplora().locale, erplora().t(CATALOG, 'ui.errSetStatus'));
    } finally {
      this.busyId = '';
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
    const banner = this.renderRoot.querySelector('[data-testid="staff-time-off-form-error"]') as
      | (HTMLElement & { updateComplete?: Promise<unknown> })
      | null;
    await banner?.updateComplete;
    banner?.scrollIntoView?.({ block: 'center' });
  }

  render() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return html`<div>
        <header>
          <h2>${t('ui.timeOffTitle')}</h2>
        </header>
        ${this.pageError ? html`<ok-inline-feedback data-testid="staff-time-off-page-error" tone="danger" icon="alert-circle-outline">${this.pageError}</ok-inline-feedback>` : nothing}
        ${this.ctrl?.error ? html`<ok-inline-feedback data-testid="staff-time-off-load-error" tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : nothing}
        <ok-data-table testid="staff-time-off-table" .serverSide=${true} .addable=${this.canManage} .columns=${this.columns} .views=${true} .cardTitle=${(r: Record<string, unknown>) => String(r.staff_name ?? '—')} .cardIcon=${() => 'airplane-outline'} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? 'asc'} .searchable=${true} .actions=${this.actions} .searchPlaceholder=${t('ui.searchMember')} .emptyMessage=${this.ctrl?.loading ? t('ui.loading') : t('ui.emptyTimeOff')} @rowAction=${(e: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) =>
            this.onRowAction(e.detail.actionId, e.detail.row)} @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)} @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) => this.ctrl.setSort(e.detail.sort, e.detail.dir)} @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)} @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) => this.ctrl.setFilter(e.detail.col, e.detail.value)}>
          <!-- El alta se proyecta SIEMPRE en el panel: si solo se pintara al abrirlo, el «+»
               abriría un panel vacío (la tabla no re-renderiza a sus hijos de luz). -->
          ${this.renderCreateForm()}
        </ok-data-table>
      </div>`;
  }

  /** El alta (staff#36): «Miembro · Tipo · Desde · Hasta · Día completo · (horas) · Motivo», que es
   *  lo que ofrecen Fresha, Vagaro, Mangomint, Square Team, Odoo Empleados y BC. `mode="md"` en cada
   *  control con `fill`: el shell pinea Ionic en `ios` y ahí `fill` no pinta caja (staff#39/hub#760). */
  private renderCreateForm() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return html`<form data-testid="staff-time-off-form" slot="create" class="form" @submit=${(e: Event) => this.createTimeOff(e)}>
      <ion-select data-testid="staff-time-off-member" data-field="staff_id" mode="md" fill="outline" label-placement="floating" label=${t('ui.colMember')} .value=${this.draft.staff_id} @ionChange=${(e: any) => this.patch({ staff_id: e.target.value ?? '' })}>
        ${this.members.map((m) => html`<ion-select-option .value=${m.id}>${m.full_name}</ion-select-option>`)}
      </ion-select>
      <ion-select data-testid="staff-time-off-leave-type" data-field="leave_type" mode="md" fill="outline" label-placement="floating" label=${t('ui.colType')} .value=${this.draft.leave_type} @ionChange=${(e: any) => this.patch({ leave_type: e.target.value ?? 'vacation' })}>
        ${enumOptions(LEAVE_TYPE_KEY).map((o) => html`<ion-select-option .value=${o.value}>${o.label}</ion-select-option>`)}
      </ion-select>
      <div class="grid2">
        <!-- staff#87: TEXT date fields in the hub's day/month order, never type="date": the browser
             paints a native date field in its own (operating system) order. -->
        <ion-input data-testid="staff-time-off-start-date" data-field="start_date" mode="md" fill="outline" label-placement="floating" type="text" inputmode="numeric" autocomplete="off" placeholder=${t('ui.datePlaceholder')} label=${t('ui.colFrom')} .value=${this.dateFieldValue('start_date')} @ionInput=${(e: any) => this.onDateInput('start_date', String(e.target.value ?? ''))} @ionChange=${() => this.commitDateDraft('start_date')}></ion-input>
        <ion-input data-testid="staff-time-off-end-date" data-field="end_date" mode="md" fill="outline" label-placement="floating" type="text" inputmode="numeric" autocomplete="off" placeholder=${t('ui.datePlaceholder')} label=${t('ui.colTo')} .value=${this.dateFieldValue('end_date')} @ionInput=${(e: any) => this.onDateInput('end_date', String(e.target.value ?? ''))} @ionChange=${() => this.commitDateDraft('end_date')}></ion-input>
      </div>
      <ion-toggle data-testid="staff-time-off-full-day" data-field="is_full_day" label-placement="end" .checked=${this.draft.is_full_day} @ionChange=${(e: any) => this.patch({ is_full_day: !!e.detail.checked })}>${t('ui.fullDay')}</ion-toggle>
      ${this.draft.is_full_day
        ? nothing
        : html`<div class="grid2" data-section="hours">
            <ion-input data-testid="staff-time-off-start-time" data-field="start_time" mode="md" fill="outline" label-placement="floating" type="time" label=${t('ui.timeFrom')} .value=${this.draft.start_time} @ionInput=${(e: any) => this.patch({ start_time: e.target.value })}></ion-input>
            <ion-input data-testid="staff-time-off-end-time" data-field="end_time" mode="md" fill="outline" label-placement="floating" type="time" label=${t('ui.timeTo')} .value=${this.draft.end_time} @ionInput=${(e: any) => this.patch({ end_time: e.target.value })}></ion-input>
          </div>`}
      <ion-textarea data-testid="staff-time-off-reason" data-field="reason" mode="md" fill="outline" label-placement="floating" auto-grow label=${t('ui.reason')} .value=${this.draft.reason} @ionInput=${(e: any) => this.patch({ reason: e.target.value })}></ion-textarea>
      <!-- staff#72: the refusal travels WITH the form — on a phone the panel is a full-screen sheet
           and a banner on the page underneath it is never seen. -->
      ${this.formError ? html`<ok-inline-feedback data-testid="staff-time-off-form-error" tone="danger" icon="alert-circle-outline">${this.formError}</ok-inline-feedback>` : nothing}
      <ion-button data-testid="staff-time-off-submit" type="submit" size="small" ?disabled=${this.saving}>${this.saving ? t('ui.actionSaving') : t('ui.actionSave')}</ion-button>
    </form>`;
  }
}

define('erp-staff-time-off', ErpStaffTimeOff);
