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
    :host { display:block; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    header { display:flex; gap:.5rem; align-items:center; margin-bottom:.75rem; }
    h2 { margin:0; font-size:1.15rem; flex:1; }
    .form { display:flex; gap:.75rem; flex-wrap:wrap; align-items:end; margin:.5rem 0 1.25rem; }
    .form ion-select { flex:1 1 11rem; min-width:9rem; }
    .err { color:#d9480f; font-weight:600; }
  `;

  @state() formError = '';

  @state() busyId = '';

  @state() tick = 0;

  private ctrl!: ListController<TimeOff>;

  private unsub?: () => void;

  private get columns(): DataTableColumn[] {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return [
    { key: 'staff_name', header: t('ui.colMember'), sortable: true, filterable: true, filterType: 'text' },
    { key: 'leave_type', header: t('ui.colType'), sortable: true, filterable: true, filterType: 'text' },
    { key: 'start_date', header: t('ui.colFrom'), sortable: true, filterable: true, filterType: 'daterange' },
    { key: 'end_date', header: t('ui.colTo'), sortable: true, filterable: true, filterType: 'daterange' },
    {
      key: 'status',
      header: t('ui.colStatus'),
      sortable: true,
      filterable: true,
      filterType: 'select',
      options: [
        { value: 'pending', label: t('ui.statusPending') },
        { value: 'approved', label: t('ui.statusApproved') },
        { value: 'rejected', label: t('ui.statusRejected') },
        { value: 'cancelled', label: t('ui.statusCancelled') },
      ],
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
    window.removeEventListener('erplora:locale-changed', this.onLocaleChange);
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
      this.formError = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errSetStatus');
    } finally {
      this.busyId = '';
    }
  }

  render() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return html`<div>
        <header>
          <h2>${t('ui.timeOffTitle')}</h2>
        </header>
        ${this.formError ? html`<ok-inline-feedback tone="danger" icon="alert-circle-outline">${this.formError}</ok-inline-feedback>` : nothing}
        ${this.ctrl?.error ? html`<ok-inline-feedback tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : nothing}
        <ok-data-table .serverSide=${true} .columns=${this.columns} .views=${true} .cardTitle=${(r: Record<string, unknown>) => String(r.staff_name ?? '—')} .cardIcon=${() => 'airplane-outline'} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? 'asc'} .searchable=${true} .actions=${this.actions} .searchPlaceholder=${t('ui.searchMember')} .emptyMessage=${this.ctrl?.loading ? t('ui.loading') : t('ui.emptyTimeOff')} @rowAction=${(e: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) =>
            this.onRowAction(e.detail.actionId, e.detail.row)} @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)} @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) => this.ctrl.setSort(e.detail.sort, e.detail.dir)} @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)} @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) => this.ctrl.setFilter(e.detail.col, e.detail.value)}></ok-data-table>
      </div>`;
  }
}

define('erp-staff-time-off', ErpStaffTimeOff);
