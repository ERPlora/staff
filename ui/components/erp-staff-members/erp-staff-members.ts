import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn } from '@erplora/outfitkit';
import { createListController } from '@erplora/module-sdk';
import type { ListController, ListClient, ListParams, ListPage } from '@erplora/module-sdk';

interface ErploraClientLike extends ListClient {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  queryPage<R = unknown>(name: string, params: ListParams): Promise<ListPage<R>>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
  on(event: string, cb: (payload: unknown) => void): () => void;
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

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

export class ErpStaffMembers extends LitElement {
  static styles = css`
    :host { display:block; font-family: system-ui, sans-serif; color: var(--ink, #1c1b18); }
    header { display:flex; gap:.5rem; align-items:center; margin-bottom:.75rem; }
    h2 { margin:0; font-size:1.15rem; flex:1; }
    .form { display:flex; gap:.5rem; flex-wrap:wrap; align-items:end; margin:.5rem 0 1rem; }
    .form ion-input, .form ion-select { --background:var(--surface-2,#f7f4ec); border:1px solid var(--line,#e7e2d6); border-radius:8px; min-width:8rem; }
    .err { color:#d9480f; font-weight:600; }
  `;

  @state() roles: StaffRole[] = [];

  @state() formError = '';

  @state() newFirst = '';

  @state() newLast = '';

  @state() newEmail = '';

  @state() newRole = '';

  @state() saving = false;

  @state() tick = 0;

  private ctrl!: ListController<StaffMember>;

  private unsub?: () => void;

  private columns: DataTableColumn[] = [
    { key: 'full_name', header: 'Nombre', sortable: true, filterable: true, filterType: 'text' },
    { key: 'role_name', header: 'Rol', sortable: true, filterable: true, filterType: 'text', format: (r) => (r.role_name as string) || '—' },
    { key: 'email', header: 'Email', sortable: true, filterable: true, filterType: 'text' },
    { key: 'phone', header: 'Teléfono', sortable: true, filterable: true, filterType: 'text' },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      filterable: true,
      filterType: 'select',
      options: [
        { value: 'active', label: 'Activo' },
        { value: 'inactive', label: 'Inactivo' },
      ],
    },
    {
      key: 'hourly_rate',
      header: '€/h',
      align: 'right',
      sortable: true,
      filterable: true,
      filterType: 'range',
      format: (r) => Number(r.hourly_rate).toFixed(2),
    },
  ];

  // TODO-LIT: componentWillLoad → connectedCallback. Recuerda: connectedCallback se dispara
  // en CADA reconexión al DOM (no solo en el primer montaje). Si la init debe correr una
  // sola vez tras el primer render, considera firstUpdated() en su lugar.
  async connectedCallback() {
    super.connectedCallback();
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
    super.disconnectedCallback();
    this.unsub?.();
  }

  private async loadRoles() {
    try {
      this.roles = (await erplora().query<StaffRole[]>('staff.roles.list')) ?? [];
    } catch { /* roles opcionales para el alta */ }
  }

  private async createMember(ev: Event) {
    ev.preventDefault();
    if (!this.newFirst.trim() || !this.newLast.trim()) return;
    this.saving = true;
    this.formError = '';
    try {
      await erplora().command('staff.members.create', {
        first_name: this.newFirst.trim(),
        last_name: this.newLast.trim(),
        email: this.newEmail.trim(),
        role_id: this.newRole || null,
        is_bookable: 1,
        status: 'active',
      });
      this.newFirst = '';
      this.newLast = '';
      this.newEmail = '';
      this.newRole = '';
      await this.ctrl.load();
    } catch (e) {
      this.formError = e instanceof Error ? e.message : 'No se pudo crear el miembro';
    } finally {
      this.saving = false;
    }
  }

  render() {
    return html`<div>
        <header>
          <h2>Staff</h2>
        </header>
        <form class="form" @submit=${(e) => this.createMember(e)}>
          <ion-input placeholder="Nombre" .value=${this.newFirst} @ionInput=${(e: any) => (this.newFirst = e.target.value)}></ion-input>
          <ion-input placeholder="Apellidos" .value=${this.newLast} @ionInput=${(e: any) => (this.newLast = e.target.value)}></ion-input>
          <ion-input type="email" placeholder="Email" .value=${this.newEmail} @ionInput=${(e: any) => (this.newEmail = e.target.value)}></ion-input>
          <ion-select placeholder="Rol…" .value=${this.newRole} @ionChange=${(e: any) => (this.newRole = e.target.value)}>${this.roles.map((r) => html`<ion-select-option .value=${r.id}>${r.name}</ion-select-option>`)}</ion-select>
          <ion-button type="submit" size="small" ?disabled=${this.saving || !this.newFirst || !this.newLast}>${this.saving ? 'Guardando…' : 'Añadir'}</ion-button>
        </form>
        ${this.formError ? html`<p class="err">${this.formError}</p>` : nothing}
        ${this.ctrl?.error ? html`<p class="err">${this.ctrl.error}</p>` : nothing}
        <ok-data-table .serverSide=${true} .columns=${this.columns} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? 'asc'} .searchable=${true} .searchPlaceholder=${"Buscar miembro…"} .emptyMessage=${this.ctrl?.loading ? 'Cargando…' : 'Sin miembros del staff.'} @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)} @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) => this.ctrl.setSort(e.detail.sort, e.detail.dir)} @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)} @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) => this.ctrl.setFilter(e.detail.col, e.detail.value)}></ok-data-table>
      </div>`;
  }
}

define('erp-staff-members', ErpStaffMembers);
