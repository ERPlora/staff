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
import { MEMBER_STATUS_KEY, enumLabel } from '../../lib/enums';
import { majorToMinor, minorToInput, moneyStep } from '../../lib/hub-currency';
import esLocale from '../../../locales/es.json';
import enLocale from '../../../locales/en.json';
const CATALOG: Record<string, unknown> = { es: esLocale, en: enLocale };

interface ErploraClientLike extends ListClient {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  /** Optional integration (ADR-0127): `undefined` ONLY when the owner module is not installed. */
  queryOptional<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T | undefined>;
  queryPage<R = unknown>(name: string, params: ListParams): Promise<ListPage<R>>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
  on(event: string, cb: (payload: unknown) => void): () => void;
  locale: string;
  t(catalog: Record<string, unknown>, key: string, params?: Record<string, unknown>): string;
  /** Dinero (ADR-0123): `formatMoney` recibe CÉNTIMOS y divide según la moneda. */
  currency: string;
  formatMoney(cents: number, opts?: { currency?: string; locale?: string }): string;
  /** Show/hide ONLY — the runtime is what enforces a permission (module-sdk). */
  hasPermission(permission: string): boolean;
}

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  role_id: string | null;
  role_name: string | null;
  /** Usuario del Hub del que cuelga la ficha (ADR-0192); `null` = ficha sin acceso al Hub. */
  user_id: string | null;
  status: string;
  is_bookable: number;
  hourly_rate: string;
}

interface StaffRole {
  id: string;
  name: string;
}

/** Full record (`staff.members.get`, staff#4). Compensation travels apart (`staff.members.compensation`). */
interface StaffMemberDetail extends StaffMember {
  employee_id: string;
  hire_date: string | null;
  color: string;
  booking_buffer: number;
  bio: string;
  specialties: string;
}

/** The record form: create and edit share it (staff#4). Money is typed in EUROS here and sent in
 *  CENTS (ADR-0007/0123); `role_id`/`user_id` '' = none (create) / clear (update). */
interface MemberForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  employee_id: string;
  role_id: string;
  user_id: string;
  status: string;
  is_bookable: boolean;
  booking_buffer: string;
  color: string;
  hire_date: string;
  bio: string;
  specialties: string;
  hourly_rate: string;
  commission_rate: string;
}

const EMPTY_FORM: MemberForm = {
  first_name: '', last_name: '', email: '', phone: '', employee_id: '', role_id: '', user_id: '',
  status: 'active', is_bookable: true, booking_buffer: '', color: '', hire_date: '', bio: '', specialties: '',
  hourly_rate: '', commission_rate: '',
};

/** Statuses a person can SET. `terminated` is not one of them: only Terminate gets there. */
const STATUS_OPTIONS = ['active', 'inactive', 'on_leave'] as const;

/** A service the professional performs (`staff.services.list_for_member`, staff#9). */
interface MemberService {
  id: string;
  service_id: string;
  service_name: string;
  custom_duration: number | null;
  custom_price: number | null;
  is_primary: number;
  is_active: number;
}

/** A catalogue entry of the `services` module (its PUBLIC `services.services.list`). */
interface CatalogService {
  id: string;
  name: string;
  duration_minutes?: number;
  price?: number;
  is_bookable?: number;
}

/**
 * Usuario del Hub (core). Llega por `hub.users.list`, el namespace RESERVADO del dispatcher
 * (ADR-0192): un módulo no habla con las rutas HTTP del core, así que la identidad se le sirve como
 * una query más. Trae lo justo para vincular — sin email ni vía de acceso.
 */
interface HubUser {
  id: string;
  name: string;
  role: string;
  is_active: boolean;
}

/** Panel lateral de la tabla (drawer): el «+» de la barra y la acción «editar» abren el MISMO. */
interface DataTablePanel {
  open(panel?: 'filters' | 'create' | 'edit', opts?: { title?: string }): void;
  close(): void;
}

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

export class ErpStaffMembers extends LitElement {
  static styles = css`
    /* Cadena de altura: sin ella, el modo fill de la tabla no tiene alto que llenar. */
    :host { display:flex; flex-direction:column; height:100%; min-height:0; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    .page { display:flex; flex-direction:column; min-height:0; flex:1 1 auto; }
    .page > ok-data-table { flex:1 1 auto; min-height:0; }
    /* El alta vive en el panel lateral de la tabla: columna estrecha, no fila que se desborda. */
    .form { display:flex; flex-direction:column; gap:.7rem; }
    .form ion-button { align-self:flex-end; }
    .hint { margin:-.35rem 0 0; font-size:.8rem; line-height:1.35; color: var(--ion-color-medium, #6b6b6b); }
    .err { color:#d9480f; font-weight:600; }
    /* Two columns when the panel is wide enough (tablet/desktop), one on a phone. */
    .grid2 { display:grid; grid-template-columns:repeat(auto-fit, minmax(11rem, 1fr)); gap:.6rem; align-items:center; border-top:1px solid var(--ion-border-color, #e5e3dd); padding-top:.6rem; }
    .grid2 ion-textarea { grid-column:1 / -1; }
    /* Services performed (staff#9): a compact list inside the same panel, 44px rows for touch. */
    .services { display:flex; flex-direction:column; gap:.4rem; border-top:1px solid var(--ion-border-color, #e5e3dd); padding-top:.6rem; }
    .services h4 { margin:0; font-size:.85rem; font-weight:600; opacity:.8; }
    .services ul { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:.25rem; }
    .services li { display:flex; align-items:center; gap:.4rem; min-height:44px; }
    .services li .name { flex:1 1 auto; }
    .services li .meta { font-size:.75rem; opacity:.7; }
    .services .assign { display:flex; flex-wrap:wrap; gap:.4rem; align-items:center; }
    .services .assign ion-select { flex:1 1 100%; }
    .services .assign ion-input { flex:1 1 40%; }
    /* pm#392: color= is a document-level rule Ionic cannot apply inside this shadow root; the
       tone is read from the theme token here instead. */
    ion-button.tone-medium[fill] { --color: var(--ion-color-medium, #636469); }
    .hint { font-size:.8rem; opacity:.75; }
  `;

  @state() roles: StaffRole[] = [];

  /** Usuarios ACTIVOS del Hub, para elegir de quién es esta ficha. */
  @state() hubUsers: HubUser[] = [];

  /** What went wrong saving or loading the form: painted INSIDE the form (staff#72). */
  @state() formError = '';
  /** What went wrong in a row action (no panel open): painted on the page (staff#72). */
  @state() pageError = '';

  /** The record being typed (create) or edited. */
  @state() form: MemberForm = { ...EMPTY_FORM };

  /** Id del miembro en edición; vacío = el panel está dando de ALTA (mismo panel, dos modos). */
  @state() editingId = '';

  /** Deactivate / terminate ask first (staff#4): the row is parked here and the ion-alert decides. */
  @state() pendingAction: { kind: 'deactivate' | 'terminate'; id: string; label: string } | null = null;

  @state() saving = false;

  // ── Services performed (staff#9) ───────────────────────────────────────────
  /** Competencies of the member being edited (`staff.services.list_for_member`). */
  @state() memberServices: MemberService[] = [];

  /** The services catalogue (`services.services.list`); empty when unavailable. */
  @state() catalog: CatalogService[] = [];

  /** `services` is not installed (or not readable): the section shows a hint, nothing else breaks. */
  @state() catalogUnavailable = false;

  @state() newServiceId = '';

  /** Optional overrides typed by the user: minutes and PRICE in the hub currency (converted to its minor unit on send, staff#64). */
  @state() newServiceDuration = '';

  @state() newServicePrice = '';

  @state() servicesError = '';

  /** Compensation by member id, loaded ONLY when the session can read it (staff#10). The directory
   *  (`staff.members.list`) no longer carries it: it is open to `staff.view_staff_member`, which
   *  every `employee` has, so it handed the whole payroll to the whole team. */
  @state() private rates: Record<string, number> = {};

  private get canSeeCompensation(): boolean {
    return erplora().hasPermission?.('staff.view_compensation') === true;
  }

  /** pm#459: ticket of the latest «edit» opening; anything that bumps it (a new edit, «Add»,
   *  reset) retires the replies still in flight. */
  private editSeq = 0;

  private ctrl!: ListController<StaffMember>;

  private unsub?: () => void;

  private get columns(): DataTableColumn[] {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return [
    { key: 'full_name', header: t('ui.colName'), sortable: true, filterable: true, filterType: 'text' },
    {
      key: 'role_name',
      header: t('ui.colRole'),
      sortable: true,
      filterable: true,
      // Dominio cerrado: el rol se ELIGE entre los roles reales, no se teclea (el servidor filtra
      // `role_name` por `eq`, así que el valor de la opción es el nombre, no el id).
      filterType: 'select',
      options: this.roles.map((r) => ({ value: r.name, label: r.name })),
      format: (r) => (r.role_name as string) || '—',
    },
    { key: 'email', header: t('ui.colEmail'), sortable: true, filterable: true, filterType: 'text' },
    // Hidden by default so the table fits an 834 px tablet without a horizontal scroll; the user
    // can turn it back on from the column picker (ok-data-table `hidden`).
    { key: 'phone', header: t('ui.colPhone'), sortable: true, filterable: true, filterType: 'text', hidden: true },
    {
      key: 'status',
      header: t('ui.colStatus'),
      sortable: true,
      filterable: true,
      filterType: 'select',
      // El filtro sigue ofreciendo el dominio OPERATIVO (quién está y quién no); la celda, en
      // cambio, tiene que saber nombrar los cuatro estados que la fila puede traer (staff#37).
      options: [
        { value: 'active', label: enumLabel(MEMBER_STATUS_KEY, 'active') },
        { value: 'inactive', label: enumLabel(MEMBER_STATUS_KEY, 'inactive') },
      ],
      format: (r) => enumLabel(MEMBER_STATUS_KEY, r.status),
    },
    // The rate column only exists for a session that may read it. Leaving it in place would print
    // «0,00 €» next to every colleague — «nobody earns anything» reads worse than no column.
    ...(this.canSeeCompensation
      ? [{
        key: 'hourly_rate',
        header: t('ui.colHourlyRate'),
        align: 'right' as const,
        sortable: true,
        // Not server-filterable any more: the value no longer travels in the directory query.
        filterable: false,
        // Minor units per hour of the hub currency (ADR-0123) → formatMoney applies its scale.
        format: (r) => erplora().formatMoney(Number(this.rates[String(r.id)] ?? 0)),
      }]
      : []),
  ];
  }

  private get canDelete(): boolean {
    return erplora().hasPermission?.('staff.delete_staff_member') === true;
  }

  private get actions(): DataTableAction[] {
    const t = (k: string): string => erplora().t(CATALOG, k);
    const out: DataTableAction[] = [{ id: 'edit', label: t('ui.actionEdit'), icon: 'create-outline' }];
    // Lifecycle (staff#4): shown only to a session that may delete — the runtime enforces, this is show/hide.
    if (this.canDelete) {
      out.push(
        { id: 'deactivate', label: t('ui.actionDeactivate'), icon: 'pause-circle-outline', disabled: (r) => r.status !== 'active' && r.status !== 'on_leave' },
        { id: 'terminate', label: t('ui.actionTerminate'), icon: 'person-remove-outline', color: 'danger' },
      );
    }
    return out;
  }

  /**
   * Panel header label (pm#450, outfitkit#150): the header now comes from `open('edit', { title })`.
   * This `newRecord` override is kept as the FALLBACK for shells running OutfitKit < 0.1.94, which
   * ignore that `title` and paint `newRecord` for the edit panel too (staff#38).
   *
   * In edit mode it carries the member's name, as Odoo, Dynamics 365 BC, Square Team and Fresha do:
   * the header identifies the record being touched, so nobody edits the wrong person.
   */
  private get panelLabels(): { newRecord: string } {
    const t = (k: string, p?: Record<string, unknown>): string => erplora().t(CATALOG, k, p);
    if (!this.editingId) return { newRecord: t('ui.panelNew') };
    const name = `${this.form.first_name} ${this.form.last_name}`.trim();
    return { newRecord: t('ui.panelEdit', { name }) };
  }

  /** Referencia al panel lateral de la tabla: «editar» lo abre relleno, guardar lo cierra. */
  private dataTable(): DataTablePanel | null {
    return this.renderRoot.querySelector('ok-data-table') as DataTablePanel | null;
  }

  async onRowAction(ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>): Promise<void> {
    const m = ev.detail.row as unknown as StaffMember;
    if (ev.detail.actionId === 'edit') {
      await this.openRecord(m);
      return;
    }
    if (ev.detail.actionId === 'deactivate' || ev.detail.actionId === 'terminate') {
      this.pendingAction = { kind: ev.detail.actionId, id: m.id, label: m.full_name ?? `${m.first_name} ${m.last_name}` };
    }
  }

  /** Open the record in the panel: what the row carries first (instant), then the FULL record
   *  (`staff.members.get`) and, for a session that may read it, its compensation (staff#4). */
  private async openRecord(m: Partial<StaffMember> & { id: string }): Promise<void> {
    const seq = ++this.editSeq;
    this.editingId = m.id;
    this.formError = '';
    this.form = {
      ...EMPTY_FORM,
      first_name: m.first_name ?? '', last_name: m.last_name ?? '', email: m.email ?? '', phone: m.phone ?? '',
      role_id: m.role_id ?? '', user_id: m.user_id ?? '', status: m.status ?? 'active',
      is_bookable: m.is_bookable === undefined ? true : Number(m.is_bookable) === 1,
    };
    const name = `${this.form.first_name} ${this.form.last_name}`.trim();
    this.dataTable()?.open('edit', { title: erplora().t(CATALOG, 'ui.panelEdit', { name }) });
    this.rememberLink(m.id);
    void this.loadMemberServices();
    try {
      const [detail, comp] = await Promise.all([
        erplora().query<StaffMemberDetail[]>('staff.members.get', { staff_id: m.id }),
        this.canSeeCompensation
          ? erplora().query<{ id: string; hourly_rate: number; commission_rate: number }[]>('staff.members.compensation', { staff_id: m.id })
          : Promise.resolve([]),
      ]);
      if (seq !== this.editSeq || this.editingId !== m.id) return;
      const d = detail?.[0];
      const c = comp?.[0];
      if (d) {
        this.form = {
          ...this.form,
          first_name: d.first_name, last_name: d.last_name, email: d.email ?? '', phone: d.phone ?? '',
          employee_id: d.employee_id ?? '', role_id: d.role_id ?? '', user_id: d.user_id ?? '',
          status: d.status ?? 'active', is_bookable: Number(d.is_bookable) === 1,
          booking_buffer: d.booking_buffer != null ? String(d.booking_buffer) : '',
          color: d.color ?? '', hire_date: d.hire_date ?? '', bio: d.bio ?? '', specialties: d.specialties ?? '',
        };
      }
      if (c) {
        this.form = {
          ...this.form,
          hourly_rate: minorToInput(Number(c.hourly_rate || 0)),
          commission_rate: String(Number(c.commission_rate || 0)),
        };
      }
    } catch (e) {
      if (seq !== this.editSeq) return;
      this.formError = domainMessage(e, erplora().locale, erplora().t(CATALOG, 'ui.errLoadMember'));
    }
  }

  /** A record is linkable (staff#4): `?member=<id>` in the URL opens it, and opening one writes it. */
  private rememberLink(id: string): void {
    try {
      const url = new URL(window.location.href);
      if (id) url.searchParams.set('member', id);
      else url.searchParams.delete('member');
      window.history.replaceState(window.history.state, '', url.toString());
    } catch { /* no history (preview) */ }
  }

  private linkedMemberId(): string {
    try {
      return new URLSearchParams(window.location.search).get('member') ?? '';
    } catch {
      return '';
    }
  }

  private patch(p: Partial<MemberForm>): void {
    this.form = { ...this.form, ...p };
  }

  /** The alert decided (staff#4). Terminate carries the values typed in the alert inputs. */
  async onActionDismiss(ev: CustomEvent<{ role?: string; data?: { values?: Record<string, string> } }>): Promise<void> {
    const pending = this.pendingAction;
    this.pendingAction = null;
    if (ev.detail?.role !== 'confirm' || !pending) return;
    this.pageError = '';
    try {
      if (pending.kind === 'deactivate') {
        await erplora().command('staff.members.deactivate', { staff_id: pending.id });
      } else {
        const values = ev.detail?.data?.values ?? {};
        await erplora().command('staff.members.delete', {
          staff_id: pending.id,
          termination_date: values.termination_date || null,
          reason: values.reason || null,
        });
      }
      if (this.editingId === pending.id) this.resetForm();
      await this.ctrl.load();
    } catch (e) {
      this.pageError = domainMessage(e, erplora().locale, erplora().t(CATALOG, 'ui.errLifecycle'));
    }
  }

  private resetForm(): void {
    this.editSeq++;
    this.editingId = '';
    // pm#459 (review): an error already painted for the edit we leave is not the create form's.
    this.formError = '';
    this.servicesError = '';
    this.form = { ...EMPTY_FORM };
    this.memberServices = [];
    this.rememberLink('');
  }

  /** pm#450: the table's «Add» emits no event and keeps our form state; after an edit it would
   *  show the edited member under a «New» header, and the submit would UPDATE it. */
  private onTableClick(e: Event): void {
    const addId = 'staff-members-table-add';
    if (!e.composedPath().some((n) => n instanceof HTMLElement && n.dataset.testid === addId)) return;
    // pm#459: retire an edit still loading too, so its late replies do not land on the fresh «Add».
    if (this.editingId) this.resetForm();
    else this.editSeq++;
  }

  /** Wired natively, not with a Lit `@click` on the tag: `<ok-data-table>` carries `testid`, not
   *  `data-testid` (outfitkit#143), and a template binding would read as an action element that
   *  demands one. */
  firstUpdated(): void {
    const table = this.renderRoot.querySelector('ok-data-table');
    table?.addEventListener('click', (e) => this.onTableClick(e));
    // staff#70: closing the panel (X, backdrop, Escape — outfitkit#195, ≥0.1.97) retires the edit
    // still loading, so its late reply neither fills the closed form nor paints an error. Older
    // shells never emit it and keep today's behaviour.
    table?.addEventListener('panelClose', () => this.editSeq++);
  }

  /** Competencies + catalogue for the member being edited. The catalogue comes from the PUBLIC
   *  query of `services`; a failure there (module not installed, no permission) is NOT an error
   *  of this screen: the section degrades to a hint and the record stays editable. */
  private async loadMemberServices(): Promise<void> {
    if (!this.editingId) return;
    this.servicesError = '';
    const staffId = this.editingId;
    const seq = this.editSeq;
    let own: MemberService[] = [];
    let cat: CatalogService[] | undefined = [];
    let failure: unknown = null;
    try {
      // `queryOptional` (ADR-0127): `services` may NOT be installed in this hub — that is an absence
      // (hint), not an error. Anything else (permission, broken contract) IS an error and is shown.
      [own, cat] = await Promise.all([
        erplora().query<MemberService[]>('staff.services.list_for_member', { staff_id: staffId }),
        erplora().queryOptional<CatalogService[]>('services.services.list', { limit: 500 }),
      ]);
    } catch (e) {
      failure = e;
    }
    // pm#459: a retired load (a later «edit»/«Add»/reset already bumped editSeq) drops here — its
    // data AND its error, so a late reply cannot land on a panel the user already left.
    if (seq !== this.editSeq || this.editingId !== staffId) return; // the panel moved on while we were loading
    if (failure) {
      this.servicesError = domainMessage(failure, erplora().locale, erplora().t(CATALOG, 'ui.errAssignService'));
    }
    this.memberServices = own ?? [];
    this.catalog = cat ?? [];
    this.catalogUnavailable = cat === undefined;
  }

  /** Catalogue entries not yet assigned to this member (what the picker offers). */
  private get assignableServices(): CatalogService[] {
    const have = new Set(this.memberServices.map((s) => s.service_id));
    return this.catalog.filter((c) => !have.has(c.id));
  }

  /** Assign: opaque `service_id` + name snapshot; overrides only when typed (null = catalogue). */
  async assignService(ev: Event): Promise<void> {
    ev.preventDefault();
    const svc = this.catalog.find((c) => c.id === this.newServiceId);
    if (!this.editingId || !svc) return;
    const minutes = parseInt(this.newServiceDuration, 10);
    const price = String(this.newServicePrice).replace(',', '.');
    const major = parseFloat(price);
    this.servicesError = '';
    try {
      await erplora().command('staff.services.assign', {
        staff_id: this.editingId,
        service_id: svc.id,
        service_name: svc.name,
        custom_duration: Number.isFinite(minutes) && minutes > 0 ? minutes : null,
        custom_price: Number.isFinite(major) && major >= 0 && this.newServicePrice !== '' ? majorToMinor(price) : null,
        is_primary: 0,
      });
      this.newServiceId = '';
      this.newServiceDuration = '';
      this.newServicePrice = '';
      await this.loadMemberServices();
    } catch (e) {
      this.servicesError = domainMessage(e, erplora().locale, erplora().t(CATALOG, 'ui.errAssignService'));
    }
  }

  async removeService(id: string): Promise<void> {
    this.servicesError = '';
    try {
      await erplora().command('staff.services.remove', { id });
      await this.loadMemberServices();
    } catch (e) {
      this.servicesError = domainMessage(e, erplora().locale, erplora().t(CATALOG, 'ui.errAssignService'));
    }
  }

  /** Mark as the member's primary service (the command demotes the previous one). */
  async setPrimaryService(row: { id: string }): Promise<void> {
    const current = this.memberServices.find((s) => s.id === row.id);
    this.servicesError = '';
    try {
      await erplora().command('staff.services.update', {
        id: row.id,
        custom_duration: current?.custom_duration ?? null,
        custom_price: current?.custom_price ?? null,
        is_primary: 1,
        is_active: current?.is_active ?? 1,
      });
      await this.loadMemberServices();
    } catch (e) {
      this.servicesError = domainMessage(e, erplora().locale, erplora().t(CATALOG, 'ui.errAssignService'));
    }
  }

  private renderServices() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    if (!this.editingId) return nothing;
    return html`<section class="services" data-section="services">
      <h4>${t('ui.servicesTitle')}</h4>
      ${this.servicesError ? html`<div data-testid="staff-members-services-error" class="err">${this.servicesError}</div>` : nothing}
      ${this.memberServices.length === 0 ? html`<div data-testid="staff-members-services-empty" class="hint">${t('ui.servicesEmpty')}</div>` : nothing}
      <ul>
        ${this.memberServices.map((s) => html`<li>
          <ion-icon data-testid=${`staff-members-service-primary-${s.service_id}`} name=${s.is_primary ? 'star' : 'star-outline'} title=${t('ui.servicePrimary')} aria-label=${t('ui.servicePrimary')} role="button" tabindex="0" @click=${() => (s.is_primary ? undefined : this.setPrimaryService(s))}></ion-icon>
          <span class="name">${s.service_name}</span>
          <span class="meta">${s.custom_duration ? `${s.custom_duration} min` : ''}${s.custom_duration && s.custom_price != null ? ' · ' : ''}${s.custom_price != null ? erplora().formatMoney(Number(s.custom_price)) : ''}</span>
          <ion-button data-testid=${`staff-members-service-remove-${s.service_id}`} fill="clear" size="small" class="tone-medium" data-action="remove-service" aria-label=${t('ui.serviceRemove')} @click=${() => this.removeService(s.id)}><ion-icon slot="icon-only" name="close-outline"></ion-icon></ion-button>
        </li>`)}
      </ul>
      ${this.catalogUnavailable
        ? html`<div data-testid="staff-members-services-no-catalog" class="hint" data-hint="no-catalog">${t('ui.servicesNoCatalog')}</div>`
        : html`<div class="assign">
            <ion-select data-testid="staff-members-service-add" mode="md" fill="outline" label-placement="floating" label=${t('ui.serviceAdd')} .value=${this.newServiceId} @ionChange=${(e: any) => (this.newServiceId = e.target.value)}>
              ${this.assignableServices.map((c) => html`<ion-select-option .value=${c.id}>${c.name}</ion-select-option>`)}
            </ion-select>
            <ion-input data-testid="staff-members-service-duration" mode="md" fill="outline" label-placement="floating" type="number" inputmode="numeric" min="1" label=${t('ui.serviceDuration')} .value=${this.newServiceDuration} @ionInput=${(e: any) => (this.newServiceDuration = e.target.value)}></ion-input>
            <ion-input data-testid="staff-members-service-price" mode="md" fill="outline" label-placement="floating" type="number" inputmode="decimal" min="0" step=${moneyStep()} label=${t('ui.servicePrice')} .value=${this.newServicePrice} @ionInput=${(e: any) => (this.newServicePrice = e.target.value)}></ion-input>
            <ion-button data-testid="staff-members-service-assign" size="small" fill="outline" ?disabled=${!this.newServiceId} @click=${(e: Event) => this.assignService(e)}>${t('ui.serviceAssign')}</ion-button>
          </div>`}
    </section>`;
  }

  /** Compensation, only for a session that may read it. A denied query is NOT an error to show:
   *  the column simply does not exist for that session, and the directory keeps working. */
  private async loadRates(): Promise<void> {
    if (!this.canSeeCompensation) return;
    try {
      const rows = await erplora().query<{ id: string; hourly_rate: number }[]>(
        'staff.members.compensation',
        { staff_id: '' },
      );
      this.rates = Object.fromEntries((rows ?? []).map((r) => [String(r.id), Number(r.hourly_rate || 0)]));
    } catch {
      this.rates = {};
    }
  }

  private readonly onLocaleChange = (): void => this.requestUpdate();

  // TODO-LIT: componentWillLoad → connectedCallback. Recuerda: connectedCallback se dispara
  // en CADA reconexión al DOM (no solo en el primer montaje). Si la init debe correr una
  // sola vez tras el primer render, considera firstUpdated() en su lugar.
  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
    this.ctrl = createListController<StaffMember>(erplora(), 'staff.members.list', () => this.requestUpdate(), {
      pageSize: 50,
      sort: 'id',
      dir: 'asc',
    });
    await Promise.all([this.ctrl.load(), this.loadRoles(), this.loadHubUsers(), this.loadRates()]);
    const linked = this.linkedMemberId();
    if (linked) {
      const row = this.ctrl.rows.find((r) => r.id === linked);
      void this.openRecord(row ?? { id: linked });
    }
    try {
      const off1 = erplora().on('staff.member.created', () => this.ctrl.load());
      const off2 = erplora().on('staff.member.updated', () => this.ctrl.load());
      const off3 = erplora().on('staff.member.terminated', () => this.ctrl.load());
      const off4 = erplora().on('staff.member.deactivated', () => this.ctrl.load());
      this.unsub = () => {
        off1();
        off2();
        off3();
        off4();
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

  private async loadRoles() {
    try {
      this.roles = (await erplora().query<StaffRole[]>('staff.roles.list')) ?? [];
    } catch { /* roles opcionales para el alta */ }
  }

  /** Usuarios del Hub para el selector. Solo los ACTIVOS: a un usuario de baja no se le asignan
   *  fichas nuevas. Si el core no responde, el selector queda vacío y la ficha se crea sin vínculo
   *  (el vínculo es opcional, no puede bloquear el alta). */
  private async loadHubUsers() {
    try {
      const users = (await erplora().query<HubUser[]>('hub.users.list')) ?? [];
      this.hubUsers = users.filter((u) => u.is_active);
    } catch { /* sin core (preview) → alta sin vínculo */ }
  }

  /** staff#55: a Hub user hangs from ONE record, and the refusal has to name the record that holds
   *  it. The error carries only the code, so the holder is read here; if that read fails, the
   *  message falls back to the runtime's sentence (which names it too, in English). */
  private async linkHolderVars(e: unknown, userId: string): Promise<Record<string, string>> {
    if ((e as { code?: unknown })?.code !== 'staff.user_already_linked' || !userId) return {};
    try {
      const rows = await erplora().query<{ first_name: string; last_name: string }[]>(
        'staff.members.by_user',
        { user_id: userId },
      );
      const holder = rows[0];
      return holder ? { name: `${holder.first_name} ${holder.last_name}`.trim() } : {};
    } catch {
      return {};
    }
  }

  /** Alta y edición comparten panel: `editingId` decide el comando (create ↔ update). The update
   *  is a FULL snapshot of what the form shows (staff#4): `''` clears role/user, money in the hub currency's minor unit,
   *  commission as %; compensation only travels when the session could read it (otherwise it would
   *  overwrite what it never saw). */
  async createMember(ev: Event) {
    ev.preventDefault();
    const f = this.form;
    if (!f.first_name.trim() || !f.last_name.trim()) return;
    this.saving = true;
    this.formError = '';
    const buffer = parseInt(f.booking_buffer, 10);
    const commission = parseFloat(String(f.commission_rate).replace(',', '.'));
    const common: Record<string, unknown> = {
      first_name: f.first_name.trim(),
      last_name: f.last_name.trim(),
      email: f.email.trim(),
      phone: f.phone.trim(),
      employee_id: f.employee_id.trim(),
      status: f.status || 'active',
      is_bookable: f.is_bookable ? 1 : 0,
      color: f.color.trim(),
      hire_date: f.hire_date || null,
      bio: f.bio,
      specialties: f.specialties,
    };
    if (this.canSeeCompensation) {
      common.hourly_rate = majorToMinor(String(f.hourly_rate).replace(',', '.'));
      common.commission_rate = Number.isFinite(commission) ? commission : 0;
    }
    try {
      if (this.editingId) {
        await erplora().command('staff.members.update', {
          staff_id: this.editingId,
          ...common,
          // '' CLEARS role and user; null would mean «keep» (COALESCE/CASE of the command).
          role_id: f.role_id,
          user_id: f.user_id,
          booking_buffer: Number.isFinite(buffer) ? buffer : 0,
        });
      } else {
        await erplora().command('staff.members.create', {
          ...common,
          role_id: f.role_id || null,
          user_id: f.user_id || null,
          notes: '',
        });
      }
      // A save that went fine retires the refusal of an earlier row action (staff#72 review).
      this.pageError = '';
      this.resetForm();
      this.dataTable()?.close();
      await Promise.all([this.ctrl.load(), this.loadRates()]);
    } catch (e) {
      const vars = await this.linkHolderVars(e, f.user_id);
      this.formError = domainMessage(e, erplora().locale, erplora().t(CATALOG, 'ui.errCreateMember'), vars);
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
    const banner = this.renderRoot.querySelector('[data-testid="staff-members-form-error"]') as
      | (HTMLElement & { updateComplete?: Promise<unknown> })
      | null;
    await banner?.updateComplete;
    banner?.scrollIntoView?.({ block: 'center' });
  }

  render() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return html`<div class="page">
        ${this.pageError ? html`<ok-inline-feedback data-testid="staff-members-page-error" tone="danger" icon="alert-circle-outline">${this.pageError}</ok-inline-feedback>` : nothing}
        ${this.ctrl?.error ? html`<ok-inline-feedback data-testid="staff-members-load-error" tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : nothing}
        <!-- The «Edit» button is not the only door: rowClickable makes the whole row open the
             same record panel (outfitkit#67 — the actions column can be off-screen at 1440 px). -->
        <ok-data-table testid="staff-members-table" .serverSide=${true} .fill=${true} .addable=${true} .labels=${this.panelLabels} .columns=${this.columns} .views=${true} .cardTitle=${(r: Record<string, unknown>) => String(r.full_name ?? '—')} .cardIcon=${() => 'person-outline'} .actions=${this.actions} .rowClickable=${true} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? 'asc'} .searchable=${true} .searchPlaceholder=${t('ui.searchMember')} .emptyMessage=${this.ctrl?.loading ? t('ui.loading') : t('ui.emptyMembers')} @rowAction=${(e: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => this.onRowAction(e)} @rowClick=${(e: CustomEvent<{ row: Record<string, unknown> }>) => this.onRowAction({ detail: { actionId: 'edit', row: e.detail.row } } as CustomEvent<{ actionId: string; row: Record<string, unknown> }>)} @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)} @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) => this.ctrl.setSort(e.detail.sort, e.detail.dir)} @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)} @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) => this.ctrl.setFilter(e.detail.col, e.detail.value)}>
          <!-- El formulario se proyecta SIEMPRE en el panel: si solo se pintara al abrirlo, el «+»
               abriría un panel vacío (la tabla no re-renderiza a sus hijos de luz). -->
          <form data-testid="staff-members-form" slot="create" class="form" @submit=${(e: Event) => this.createMember(e)}>
            <ion-input data-testid="staff-members-first-name" mode="md" fill="outline" label-placement="floating" label=${t('ui.phFirstName')} .value=${this.form.first_name} @ionInput=${(e: any) => this.patch({ first_name: e.target.value })}></ion-input>
            <ion-input data-testid="staff-members-last-name" mode="md" fill="outline" label-placement="floating" label=${t('ui.phLastName')} .value=${this.form.last_name} @ionInput=${(e: any) => this.patch({ last_name: e.target.value })}></ion-input>
            <ion-input data-testid="staff-members-email" mode="md" fill="outline" label-placement="floating" type="email" label=${t('ui.phEmail')} .value=${this.form.email} @ionInput=${(e: any) => this.patch({ email: e.target.value })}></ion-input>
            <ion-input data-testid="staff-members-phone" mode="md" fill="outline" label-placement="floating" type="tel" label=${t('ui.colPhone')} .value=${this.form.phone} @ionInput=${(e: any) => this.patch({ phone: e.target.value })}></ion-input>
            <ion-input data-testid="staff-members-employee-id" mode="md" fill="outline" label-placement="floating" label=${t('ui.employeeId')} .value=${this.form.employee_id} @ionInput=${(e: any) => this.patch({ employee_id: e.target.value })}></ion-input>
            <ion-select data-testid="staff-members-role" mode="md" fill="outline" label-placement="floating" label=${t('ui.colRole')} .value=${this.form.role_id} @ionChange=${(e: any) => this.patch({ role_id: e.target.value ?? '' })}><ion-select-option .value=${''}>${t('ui.roleNone')}</ion-select-option>${this.roles.map((r) => html`<ion-select-option .value=${r.id}>${r.name}</ion-select-option>`)}</ion-select>
            <ion-select data-testid="staff-members-hub-user" mode="md" fill="outline" label-placement="floating" label=${t('ui.hubUser')} .value=${this.form.user_id} @ionChange=${(e: any) => this.patch({ user_id: e.target.value ?? '' })}><ion-select-option .value=${''}>${t('ui.hubUserNone')}</ion-select-option>${this.hubUsers.map((u) => html`<ion-select-option .value=${u.id}>${u.name}</ion-select-option>`)}</ion-select>
            <!-- staff#46: without a link, what this person charges at the COUNTER is attributed to
                 the session user, not to their record, and does not count towards their commission.
                 Nobody is preselected: guessing the user ties one person's payroll to another's session. -->
            ${this.form.user_id
              ? nothing
              : html`<p data-testid="staff-members-hub-user-hint" class="hint" data-hint="hub-user">${t('ui.hubUserWhyLink')}</p>`}
            <!-- Operation (staff#4): status and bookable are EXPLICIT controls; terminated is not an option. -->
            <section data-section="operation" class="grid2">
              ${this.editingId
                ? html`<ion-select data-testid="staff-members-status" mode="md" fill="outline" label-placement="floating" label=${t('ui.colStatus')} .value=${this.form.status} @ionChange=${(e: any) => this.patch({ status: e.target.value })}>${STATUS_OPTIONS.map((st) => html`<ion-select-option .value=${st}>${enumLabel(MEMBER_STATUS_KEY, st)}</ion-select-option>`)}</ion-select>`
                : nothing}
              <ion-toggle data-testid="staff-members-bookable" label-placement="end" .checked=${this.form.is_bookable} @ionChange=${(e: any) => this.patch({ is_bookable: !!e.detail.checked })}>${t('ui.bookable')}</ion-toggle>
              <ion-input data-testid="staff-members-booking-buffer" mode="md" fill="outline" label-placement="floating" type="number" inputmode="numeric" min="0" label=${t('ui.bookingBuffer')} .value=${this.form.booking_buffer} @ionInput=${(e: any) => this.patch({ booking_buffer: e.target.value })}></ion-input>
              <ion-input data-testid="staff-members-hire-date" mode="md" fill="outline" label-placement="floating" type="date" label=${t('ui.hireDate')} .value=${this.form.hire_date} @ionInput=${(e: any) => this.patch({ hire_date: e.target.value })}></ion-input>
              <ion-input data-testid="staff-members-color" mode="md" fill="outline" label-placement="floating" type="color" label=${t('ui.colColor')} .value=${this.form.color || '#000000'} @ionInput=${(e: any) => this.patch({ color: e.target.value })}></ion-input>
              <ion-input data-testid="staff-members-specialties" mode="md" fill="outline" label-placement="floating" label=${t('ui.specialties')} .value=${this.form.specialties} @ionInput=${(e: any) => this.patch({ specialties: e.target.value })}></ion-input>
              <ion-textarea data-testid="staff-members-bio" mode="md" fill="outline" label-placement="floating" auto-grow label=${t('ui.bio')} .value=${this.form.bio} @ionInput=${(e: any) => this.patch({ bio: e.target.value })}></ion-textarea>
            </section>
            <!-- Compensation: PRIVATE — only for a session that may read it (staff#10 / staff#4). -->
            ${this.canSeeCompensation
              ? html`<section data-section="compensation" class="grid2">
                  <ion-input data-testid="staff-members-hourly-rate" mode="md" fill="outline" label-placement="floating" type="number" inputmode="decimal" min="0" step=${moneyStep()} label=${t('ui.hourlyRate')} .value=${this.form.hourly_rate} @ionInput=${(e: any) => this.patch({ hourly_rate: e.target.value })}></ion-input>
                  <ion-input data-testid="staff-members-commission-rate" mode="md" fill="outline" label-placement="floating" type="number" inputmode="decimal" min="0" max="100" step="0.1" label=${t('ui.commissionPct')} .value=${this.form.commission_rate} @ionInput=${(e: any) => this.patch({ commission_rate: e.target.value })}></ion-input>
                </section>`
              : nothing}
            ${this.renderServices()}
            <!-- staff#72: the refusal travels WITH the form — on a phone the panel is a full-screen
                 sheet and a banner on the page underneath it is never seen. -->
            ${this.formError ? html`<ok-inline-feedback data-testid="staff-members-form-error" tone="danger" icon="alert-circle-outline">${this.formError}</ok-inline-feedback>` : nothing}
            <ion-button data-testid="staff-members-submit" type="submit" size="small" ?disabled=${this.saving || !this.form.first_name || !this.form.last_name}>${this.saving ? t('ui.actionSaving') : t('ui.actionSave')}</ion-button>
          </form>
        </ok-data-table>
        <ion-alert
          data-testid="staff-members-action-alert"
          .isOpen=${this.pendingAction !== null}
          header=${this.pendingAction?.kind === 'terminate' ? t('ui.terminateTitle') : t('ui.deactivateTitle')}
          message=${erplora().t(CATALOG, this.pendingAction?.kind === 'terminate' ? 'ui.terminateMessage' : 'ui.deactivateMessage', { name: this.pendingAction?.label ?? '' })}
          .inputs=${this.pendingAction?.kind === 'terminate'
            ? [
                { name: 'termination_date', type: 'date', label: t('ui.terminationDate'), attributes: { 'data-testid': 'staff-members-terminate-date' } },
                { name: 'reason', type: 'text', placeholder: t('ui.terminationReason'), attributes: { 'data-testid': 'staff-members-terminate-reason' } },
              ]
            : []}
          .buttons=${[
            { text: t('ui.cancel'), role: 'cancel', htmlAttributes: { 'data-testid': 'staff-members-action-cancel' } },
            { text: this.pendingAction?.kind === 'terminate' ? t('ui.actionTerminate') : t('ui.actionDeactivate'), role: 'confirm', cssClass: 'alert-button-danger', htmlAttributes: { 'data-testid': 'staff-members-action-confirm' } },
          ]}
          @ionAlertDidDismiss=${(e: CustomEvent<{ role?: string; data?: { values?: Record<string, string> } }>) => this.onActionDismiss(e)}
        ></ion-alert>
      </div>`;
  }
}

define('erp-staff-members', ErpStaffMembers);
