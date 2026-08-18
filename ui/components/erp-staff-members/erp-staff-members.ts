import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-inline-feedback';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn, DataTableAction } from '@erplora/outfitkit';
import { createListController } from '@erplora/module-sdk';
import type { ListController, ListClient, ListParams, ListPage } from '@erplora/module-sdk';
import { domainMessage } from '../../lib/domain-error';
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
  open(panel?: 'filters' | 'create'): void;
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
    .err { color:#d9480f; font-weight:600; }
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
    .hint { font-size:.8rem; opacity:.75; }
  `;

  @state() roles: StaffRole[] = [];

  /** Usuarios ACTIVOS del Hub, para elegir de quién es esta ficha. */
  @state() hubUsers: HubUser[] = [];

  @state() formError = '';

  @state() newFirst = '';

  @state() newLast = '';

  @state() newEmail = '';

  @state() newRole = '';

  /** Usuario del Hub vinculado. Vacío = ficha sin acceso (o desvincular, al editar). */
  @state() newUserId = '';

  /** Id del miembro en edición; vacío = el panel está dando de ALTA (mismo panel, dos modos). */
  @state() editingId = '';

  @state() saving = false;

  // ── Services performed (staff#9) ───────────────────────────────────────────
  /** Competencies of the member being edited (`staff.services.list_for_member`). */
  @state() memberServices: MemberService[] = [];

  /** The services catalogue (`services.services.list`); empty when unavailable. */
  @state() catalog: CatalogService[] = [];

  /** `services` is not installed (or not readable): the section shows a hint, nothing else breaks. */
  @state() catalogUnavailable = false;

  @state() newServiceId = '';

  /** Optional overrides typed by the user: minutes and PRICE IN EUROS (converted to cents on send). */
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
    { key: 'phone', header: t('ui.colPhone'), sortable: true, filterable: true, filterType: 'text' },
    {
      key: 'status',
      header: t('ui.colStatus'),
      sortable: true,
      filterable: true,
      filterType: 'select',
      options: [
        { value: 'active', label: t('ui.statusActive') },
        { value: 'inactive', label: t('ui.statusInactive') },
      ],
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
        // Céntimos/hora (ADR-0123) → formatMoney divide. toFixed(2) pintaba 1500 → «1500.00».
        format: (r) => erplora().formatMoney(Number(this.rates[String(r.id)] ?? 0)),
      }]
      : []),
  ];
  }

  private get actions(): DataTableAction[] {
    return [{ id: 'edit', label: erplora().t(CATALOG, 'ui.actionEdit'), icon: 'create-outline' }];
  }

  /** Referencia al panel lateral de la tabla: «editar» lo abre relleno, guardar lo cierra. */
  private dataTable(): DataTablePanel | null {
    return this.renderRoot.querySelector('ok-data-table') as DataTablePanel | null;
  }

  private onRowAction(ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) {
    if (ev.detail.actionId !== 'edit') return;
    const m = ev.detail.row as unknown as StaffMember;
    this.editingId = m.id;
    this.newFirst = m.first_name;
    this.newLast = m.last_name;
    this.newEmail = m.email ?? '';
    this.newRole = m.role_id ?? '';
    this.newUserId = m.user_id ?? '';
    this.formError = '';
    this.dataTable()?.open('create');
    void this.loadMemberServices();
  }

  /** Competencies + catalogue for the member being edited. The catalogue comes from the PUBLIC
   *  query of `services`; a failure there (module not installed, no permission) is NOT an error
   *  of this screen: the section degrades to a hint and the record stays editable. */
  private async loadMemberServices(): Promise<void> {
    if (!this.editingId) return;
    this.servicesError = '';
    const staffId = this.editingId;
    let own: MemberService[] = [];
    let cat: CatalogService[] | undefined = [];
    try {
      // `queryOptional` (ADR-0127): `services` may NOT be installed in this hub — that is an absence
      // (hint), not an error. Anything else (permission, broken contract) IS an error and is shown.
      [own, cat] = await Promise.all([
        erplora().query<MemberService[]>('staff.services.list_for_member', { staff_id: staffId }),
        erplora().queryOptional<CatalogService[]>('services.services.list', { limit: 500 }),
      ]);
    } catch (e) {
      this.servicesError = domainMessage(e, erplora().locale, erplora().t(CATALOG, 'ui.errAssignService'));
    }
    if (this.editingId !== staffId) return; // the panel moved on while we were loading
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
    const euros = parseFloat(String(this.newServicePrice).replace(',', '.'));
    this.servicesError = '';
    try {
      await erplora().command('staff.services.assign', {
        staff_id: this.editingId,
        service_id: svc.id,
        service_name: svc.name,
        custom_duration: Number.isFinite(minutes) && minutes > 0 ? minutes : null,
        custom_price: Number.isFinite(euros) && euros >= 0 && this.newServicePrice !== '' ? Math.round(euros * 100) : null,
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
      ${this.servicesError ? html`<div class="err">${this.servicesError}</div>` : nothing}
      ${this.memberServices.length === 0 ? html`<div class="hint">${t('ui.servicesEmpty')}</div>` : nothing}
      <ul>
        ${this.memberServices.map((s) => html`<li>
          <ion-icon name=${s.is_primary ? 'star' : 'star-outline'} title=${t('ui.servicePrimary')} aria-label=${t('ui.servicePrimary')} role="button" tabindex="0" @click=${() => (s.is_primary ? undefined : this.setPrimaryService(s))}></ion-icon>
          <span class="name">${s.service_name}</span>
          <span class="meta">${s.custom_duration ? `${s.custom_duration} min` : ''}${s.custom_duration && s.custom_price != null ? ' · ' : ''}${s.custom_price != null ? erplora().formatMoney(Number(s.custom_price)) : ''}</span>
          <ion-button fill="clear" size="small" color="medium" aria-label=${t('ui.serviceRemove')} @click=${() => this.removeService(s.id)}><ion-icon slot="icon-only" name="close-outline"></ion-icon></ion-button>
        </li>`)}
      </ul>
      ${this.catalogUnavailable
        ? html`<div class="hint" data-hint="no-catalog">${t('ui.servicesNoCatalog')}</div>`
        : html`<div class="assign">
            <ion-select fill="outline" label-placement="floating" label=${t('ui.serviceAdd')} .value=${this.newServiceId} @ionChange=${(e: any) => (this.newServiceId = e.target.value)}>
              ${this.assignableServices.map((c) => html`<ion-select-option .value=${c.id}>${c.name}</ion-select-option>`)}
            </ion-select>
            <ion-input fill="outline" label-placement="floating" type="number" inputmode="numeric" min="1" label=${t('ui.serviceDuration')} .value=${this.newServiceDuration} @ionInput=${(e: any) => (this.newServiceDuration = e.target.value)}></ion-input>
            <ion-input fill="outline" label-placement="floating" type="number" inputmode="decimal" min="0" step="0.01" label=${t('ui.servicePrice')} .value=${this.newServicePrice} @ionInput=${(e: any) => (this.newServicePrice = e.target.value)}></ion-input>
            <ion-button size="small" fill="outline" ?disabled=${!this.newServiceId} @click=${(e: Event) => this.assignService(e)}>${t('ui.serviceAssign')}</ion-button>
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

  /** Alta y edición comparten panel: `editingId` decide el comando (create ↔ update). */
  private async createMember(ev: Event) {
    ev.preventDefault();
    if (!this.newFirst.trim() || !this.newLast.trim()) return;
    this.saving = true;
    this.formError = '';
    try {
      if (this.editingId) {
        await erplora().command('staff.members.update', {
          staff_id: this.editingId,
          first_name: this.newFirst.trim(),
          last_name: this.newLast.trim(),
          email: this.newEmail.trim(),
          role_id: this.newRole || null,
          // '' DESvincula; null significaría «no lo toques» (COALESCE del command).
          user_id: this.newUserId,
        });
      } else {
        await erplora().command('staff.members.create', {
          first_name: this.newFirst.trim(),
          last_name: this.newLast.trim(),
          email: this.newEmail.trim(),
          role_id: this.newRole || null,
          user_id: this.newUserId || null,
          is_bookable: 1,
          status: 'active',
        });
      }
      this.editingId = '';
      this.newFirst = '';
      this.newLast = '';
      this.newEmail = '';
      this.newRole = '';
      this.newUserId = '';
      this.memberServices = [];
      this.dataTable()?.close();
      await this.ctrl.load();
    } catch (e) {
      this.formError = domainMessage(e, erplora().locale, erplora().t(CATALOG, 'ui.errCreateMember'));
    } finally {
      this.saving = false;
    }
  }

  render() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return html`<div class="page">
        ${this.formError ? html`<ok-inline-feedback tone="danger" icon="alert-circle-outline">${this.formError}</ok-inline-feedback>` : nothing}
        ${this.ctrl?.error ? html`<ok-inline-feedback tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : nothing}
        <ok-data-table .serverSide=${true} .fill=${true} .addable=${true} .columns=${this.columns} .views=${true} .cardTitle=${(r: Record<string, unknown>) => String(r.full_name ?? '—')} .cardIcon=${() => 'person-outline'} .actions=${this.actions} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? 'asc'} .searchable=${true} .searchPlaceholder=${t('ui.searchMember')} .emptyMessage=${this.ctrl?.loading ? t('ui.loading') : t('ui.emptyMembers')} @rowAction=${(e: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => this.onRowAction(e)} @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)} @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) => this.ctrl.setSort(e.detail.sort, e.detail.dir)} @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)} @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) => this.ctrl.setFilter(e.detail.col, e.detail.value)}>
          <!-- El formulario se proyecta SIEMPRE en el panel: si solo se pintara al abrirlo, el «+»
               abriría un panel vacío (la tabla no re-renderiza a sus hijos de luz). -->
          <form slot="create" class="form" @submit=${(e: Event) => this.createMember(e)}>
            <ion-input fill="outline" label-placement="floating" label=${t('ui.phFirstName')} .value=${this.newFirst} @ionInput=${(e: any) => (this.newFirst = e.target.value)}></ion-input>
            <ion-input fill="outline" label-placement="floating" label=${t('ui.phLastName')} .value=${this.newLast} @ionInput=${(e: any) => (this.newLast = e.target.value)}></ion-input>
            <ion-input fill="outline" label-placement="floating" type="email" label=${t('ui.phEmail')} .value=${this.newEmail} @ionInput=${(e: any) => (this.newEmail = e.target.value)}></ion-input>
            <ion-select fill="outline" label-placement="floating" label=${t('ui.colRole')} .value=${this.newRole} @ionChange=${(e: any) => (this.newRole = e.target.value)}>${this.roles.map((r) => html`<ion-select-option .value=${r.id}>${r.name}</ion-select-option>`)}</ion-select>
            <ion-select fill="outline" label-placement="floating" label=${t('ui.hubUser')} .value=${this.newUserId} @ionChange=${(e: any) => (this.newUserId = e.target.value)}><ion-select-option .value=${''}>${t('ui.hubUserNone')}</ion-select-option>${this.hubUsers.map((u) => html`<ion-select-option .value=${u.id}>${u.name}</ion-select-option>`)}</ion-select>
            ${this.renderServices()}
            <ion-button type="submit" size="small" ?disabled=${this.saving || !this.newFirst || !this.newLast}>${this.saving ? t('ui.actionSaving') : this.editingId ? t('ui.actionSave') : t('ui.actionAdd')}</ion-button>
          </form>
        </ok-data-table>
      </div>`;
  }
}

define('erp-staff-members', ErpStaffMembers);
