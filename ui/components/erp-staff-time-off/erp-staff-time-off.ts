import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn, DataTableAction } from '@erplora/outfitkit';
import { createListController } from '@erplora/module-sdk';
import type { ListController, ListClient, ListParams, ListPage } from '@erplora/module-sdk';

interface ErploraClientLike extends ListClient {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  queryPage<R = unknown>(name: string, params: ListParams): Promise<ListPage<R>>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
  on(event: string, cb: (payload: unknown) => void): () => void;
}

interface TimeOff {
  id: string;
  staff_id: string;
  staff_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  is_full_day: number;
  status: string;
  reason: string;
}

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

export class ErpStaffTimeOff extends LitElement {
  static styles = css`
    :host { display:block; font-family: system-ui, sans-serif; color: var(--ink, #1c1b18); }
    header { display:flex; gap:.5rem; align-items:center; margin-bottom:.75rem; }
    h2 { margin:0; font-size:1.15rem; flex:1; }
    .form { display:flex; gap:.5rem; flex-wrap:wrap; align-items:end; margin:.5rem 0 1rem; }
    .form ion-select { --background:var(--surface-2,#f7f4ec); border:1px solid var(--line,#e7e2d6); border-radius:8px; min-width:8rem; }
    .err { color:#d9480f; font-weight:600; }
  `;

  @state() formError = '';

  @state() busyId = '';

  @state() tick = 0;

  private ctrl!: ListController<TimeOff>;

  private unsub?: () => void;

  private columns: DataTableColumn[] = [
    { key: 'staff_name', header: 'Miembro', sortable: true, filterable: true, filterType: 'text' },
    { key: 'leave_type', header: 'Tipo', sortable: true, filterable: true, filterType: 'text' },
    { key: 'start_date', header: 'Desde', sortable: true, filterable: true, filterType: 'daterange' },
    { key: 'end_date', header: 'Hasta', sortable: true, filterable: true, filterType: 'daterange' },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      filterable: true,
      filterType: 'select',
      options: [
        { value: 'pending', label: 'Pendientes' },
        { value: 'approved', label: 'Aprobadas' },
        { value: 'rejected', label: 'Rechazadas' },
        { value: 'cancelled', label: 'Canceladas' },
      ],
    },
  ];

  private actions: DataTableAction[] = [
    { id: 'approve', label: 'Aprobar', color: 'primary' },
    { id: 'reject', label: 'Rechazar', color: 'medium' },
  ];

  // TODO-LIT: componentWillLoad → connectedCallback. Recuerda: connectedCallback se dispara
  // en CADA reconexión al DOM (no solo en el primer montaje). Si la init debe correr una
  // sola vez tras el primer render, considera firstUpdated() en su lugar.
  async connectedCallback() {
    super.connectedCallback();
    this.ctrl = createListController<TimeOff>(erplora(), 'staff.time_off.list', () => this.requestUpdate(), {
      pageSize: 50,
      sort: 'id',
      dir: 'asc',
    });
    await this.ctrl.load();
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
    super.disconnectedCallback();
    this.unsub?.();
  }

  private async onRowAction(actionId: string, row: Record<string, unknown>) {
    if ((row.status as string) !== 'pending') return;
    const status = actionId === 'approve' ? 'approved' : 'rejected';
    const id = row.id as string;
    this.busyId = id;
    this.formError = '';
    try {
      await erplora().command('staff.time_off.set_status', { time_off_id: id, status });
      await this.ctrl.load();
    } catch (e) {
      this.formError = e instanceof Error ? e.message : 'No se pudo cambiar el estado';
    } finally {
      this.busyId = '';
    }
  }

  render() {
    return html`<div>
        <header>
          <h2>Ausencias</h2>
        </header>
        ${this.formError ? html`<p class="err">${this.formError}</p>` : nothing}
        ${this.ctrl?.error ? html`<p class="err">${this.ctrl.error}</p>` : nothing}
        <ok-data-table .serverSide=${true} .columns=${this.columns} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? 'asc'} .searchable=${true} .actions=${this.actions} .searchPlaceholder=${"Buscar miembro…"} .emptyMessage=${this.ctrl?.loading ? 'Cargando…' : 'Sin solicitudes de ausencia.'} @rowAction=${(e: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) =>
            this.onRowAction(e.detail.actionId, e.detail.row)} @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)} @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) => this.ctrl.setSort(e.detail.sort, e.detail.dir)} @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)} @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) => this.ctrl.setFilter(e.detail.col, e.detail.value)}></ok-data-table>
      </div>`;
  }
}

define('erp-staff-time-off', ErpStaffTimeOff);
