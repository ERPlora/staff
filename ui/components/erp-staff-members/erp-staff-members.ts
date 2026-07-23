import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-inline-feedback';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn, DataTableAction } from '@erplora/outfitkit';
import { createListController } from '@erplora/module-sdk';
import type { ListController, ListClient, ListParams, ListPage } from '@erplora/module-sdk';
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
  /** Dinero (ADR-0123): `formatMoney` recibe CÉNTIMOS y divide según la moneda. */
  currency: string;
  formatMoney(cents: number, opts?: { currency?: string; locale?: string }): string;
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
  status: string;
  is_bookable: number;
  hourly_rate: string;
}

interface StaffRole {
  id: string;
  name: string;
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
  `;

  @state() roles: StaffRole[] = [];

  @state() formError = '';

  @state() newFirst = '';

  @state() newLast = '';

  @state() newEmail = '';

  @state() newRole = '';

  /** Id del miembro en edición; vacío = el panel está dando de ALTA (mismo panel, dos modos). */
  @state() editingId = '';

  @state() saving = false;

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
    {
      key: 'hourly_rate',
      header: t('ui.colHourlyRate'),
      align: 'right',
      sortable: true,
      filterable: true,
      filterType: 'range',
      // Céntimos/hora (ADR-0123) → formatMoney divide. toFixed(2) pintaba 1500 → «1500.00».
      format: (r) => erplora().formatMoney(Number(r.hourly_rate || 0)),
    },
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
    this.formError = '';
    this.dataTable()?.open('create');
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
    await Promise.all([this.ctrl.load(), this.loadRoles()]);
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
        });
      } else {
        await erplora().command('staff.members.create', {
          first_name: this.newFirst.trim(),
          last_name: this.newLast.trim(),
          email: this.newEmail.trim(),
          role_id: this.newRole || null,
          is_bookable: 1,
          status: 'active',
        });
      }
      this.editingId = '';
      this.newFirst = '';
      this.newLast = '';
      this.newEmail = '';
      this.newRole = '';
      this.dataTable()?.close();
      await this.ctrl.load();
    } catch (e) {
      this.formError = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errCreateMember');
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
            <ion-button type="submit" size="small" ?disabled=${this.saving || !this.newFirst || !this.newLast}>${this.saving ? t('ui.actionSaving') : this.editingId ? t('ui.actionSave') : t('ui.actionAdd')}</ion-button>
          </form>
        </ok-data-table>
      </div>`;
  }
}

define('erp-staff-members', ErpStaffMembers);
