import { LitElement, html, css, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-inline-feedback';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn } from '@erplora/outfitkit';
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

interface StaffRole {
  id: string;
  name: string;
  description: string;
  color: string;
  member_count: number;
}

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

export class ErpStaffRoles extends LitElement {
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

  @state() formError = '';

  @state() newName = '';

  @state() newDesc = '';

  @state() newColor = '';

  @state() saving = false;

  private ctrl!: ListController<StaffRole>;

  private unsub?: () => void;

  private get columns(): DataTableColumn[] {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return [
    { key: 'name', header: t('ui.colRole'), sortable: true, filterable: true, filterType: 'text' },
    { key: 'description', header: t('ui.colDescription'), sortable: true, filterable: true, filterType: 'text' },
    { key: 'member_count', header: t('ui.colMembers'), align: 'right', sortable: true, filterable: true, filterType: 'range' },
  ];
  }

  private readonly onLocaleChange = (): void => this.requestUpdate();

  // TODO-LIT: componentWillLoad → connectedCallback. Recuerda: connectedCallback se dispara
  // en CADA reconexión al DOM (no solo en el primer montaje). Si la init debe correr una
  // sola vez tras el primer render, considera firstUpdated() en su lugar.
  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
    this.ctrl = createListController<StaffRole>(erplora(), 'staff.roles.list', () => this.requestUpdate(), {
      pageSize: 50,
      sort: 'name',
      dir: 'asc',
    });
    await this.ctrl.load();
    try {
      this.unsub = erplora().on('staff.role.created', () => this.ctrl.load());
    } catch {
      /* sin SDK (preview) */
    }
  }

  disconnectedCallback() {
    window.removeEventListener('erplora:locale-changed', this.onLocaleChange);
    super.disconnectedCallback();
    this.unsub?.();
  }

  /** Referencia al panel lateral de la tabla: guardar lo cierra. */
  private dataTable(): { open(p?: 'filters' | 'create'): void; close(): void } | null {
    return this.renderRoot.querySelector('ok-data-table') as
      | { open(p?: 'filters' | 'create'): void; close(): void }
      | null;
  }

  private async createRole(ev: Event) {
    ev.preventDefault();
    if (!this.newName.trim()) return;
    this.saving = true;
    this.formError = '';
    try {
      await erplora().command('staff.roles.create', {
        name: this.newName.trim(),
        description: this.newDesc.trim(),
        color: this.newColor.trim(),
        order: 0,
      });
      this.newName = '';
      this.newDesc = '';
      this.newColor = '';
      this.dataTable()?.close();
      await this.ctrl.load();
    } catch (e) {
      this.formError = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errCreateRole');
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
    const banner = this.renderRoot.querySelector('[data-testid="staff-roles-form-error"]') as
      | (HTMLElement & { updateComplete?: Promise<unknown> })
      | null;
    await banner?.updateComplete;
    banner?.scrollIntoView?.({ block: 'center' });
  }

  render() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return html`<div class="page">
        ${this.ctrl?.error ? html`<ok-inline-feedback data-testid="staff-roles-load-error" tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : nothing}
        <ok-data-table testid="staff-roles-table" .serverSide=${true} .fill=${true} .addable=${true} .columns=${this.columns} .views=${true} .cardTitle=${(r: Record<string, unknown>) => String(r.name ?? '—')} .cardIcon=${() => 'shield-outline'} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? 'asc'} .searchable=${true} .searchPlaceholder=${t('ui.searchRole')} .emptyMessage=${this.ctrl?.loading ? t('ui.loading') : t('ui.emptyRoles')} @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)} @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) => this.ctrl.setSort(e.detail.sort, e.detail.dir)} @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)} @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) => this.ctrl.setFilter(e.detail.col, e.detail.value)}>
          <!-- El formulario se proyecta SIEMPRE en el panel: si solo se pintara al abrirlo, el «+»
               abriría un panel vacío (la tabla no re-renderiza a sus hijos de luz). -->
          <form data-testid="staff-roles-form" slot="create" class="form" @submit=${(e: Event) => this.createRole(e)}>
            <ion-input data-testid="staff-roles-name" mode="md" fill="outline" label-placement="floating" label=${t('ui.phRoleName')} .value=${this.newName} @ionInput=${(e: any) => (this.newName = e.target.value)}></ion-input>
            <ion-input data-testid="staff-roles-description" mode="md" fill="outline" label-placement="floating" label=${t('ui.phDescription')} .value=${this.newDesc} @ionInput=${(e: any) => (this.newDesc = e.target.value)}></ion-input>
            <ion-input data-testid="staff-roles-color" mode="md" fill="outline" label-placement="floating" label=${t('ui.colColor')} placeholder=${t('ui.phColor')} .value=${this.newColor} @ionInput=${(e: any) => (this.newColor = e.target.value)}></ion-input>
            <!-- staff#72: the refusal travels WITH the form — on a phone the panel is a full-screen sheet
                 and a banner on the page underneath it is never seen. -->
            ${this.formError ? html`<ok-inline-feedback data-testid="staff-roles-form-error" tone="danger" icon="alert-circle-outline">${this.formError}</ok-inline-feedback>` : nothing}
            <ion-button data-testid="staff-roles-submit" type="submit" size="small" ?disabled=${this.saving || !this.newName}>${this.saving ? t('ui.actionSaving') : t('ui.actionAdd')}</ion-button>
          </form>
        </ok-data-table>
      </div>`;
  }
}

define('erp-staff-roles', ErpStaffRoles);
