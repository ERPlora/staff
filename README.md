# Módulo `staff` — personal, roles, horarios y ausencias

Módulo **HR base** del Hub (sin dependencias): ficha laboral del empleado, **rol de catálogo**
(estilista, barbero…), **horarios** semanales, **ausencias** con flujo de aprobación y datos de
compensación (tarifa/comisión).

> ⚠️ **`staff` NO sustituye a la identidad del core** (ADR-0192). El `hub_user` responde a *quién
> entra* y su rol **concede permisos**; `staff_member` responde a *quién trabaja* y su `staff_role`
> es solo una **etiqueta de catálogo** con color y orden. `staff_member.user_id` es la costura, y es
> **opcional en los dos sentidos**.

> **Module id:** `staff`. **Depende de:** nada (`depends_on: []`). **Es dependencia de**
> `appointments`. Módulo híbrido: SQL + handler WASM (4 funciones).

## Documentación de usuario — [`docs/`](docs/)

Viaja **dentro** del módulo y se versiona con él: el asistente del hub (ADR-0282) la indexa por
versión instalada y cita la de TU versión, no la de la última publicada. En inglés (idioma fuente).

| Fichero | Para qué |
| ------- | -------- |
| [`docs/overview.md`](docs/overview.md) | Qué hace y qué NO hace; **staff ≠ usuarios del hub**; por qué la privacidad está en las queries |
| [`docs/screens.md`](docs/screens.md) | Staff / Roles / Time Off / Horarios y el cierre del día por profesional |
| [`docs/concepts.md`](docs/concepts.md) | El rol de staff **no concede nada**, desactivar vs terminar, `null` vs `''` al desvincular, no hay fichajes |
| [`docs/limits.md`](docs/limits.md) | Guardas que **rechazan con código** (staff#1), caps, permisos por acción y diagnóstico |

## Privacidad por query (staff#10)

`employee` tiene `view_staff_member` y `view_time_off` por defecto, así que **la compensación y el
motivo de una ausencia se sacaron de las listas** y viven detrás de sus propios permisos:

| Dato | Query | Permiso |
| ---- | ----- | ------- |
| Tarifa hora y % comisión | `staff.members.compensation` | `staff.view_compensation` |
| Motivo y notas de una ausencia (dato de salud) | `staff.time_off.detail` | `staff.view_time_off_detail` |

No están tampoco en `sort`/`filters`: un filtro de rango sobre un valor invisible es un oráculo.

## Qué expone hoy

| Tipo | Nombre | Permiso |
| ---- | ------ | ------- |
| query | `staff.members.list` / `.get` / `.stats` · `staff.roles.list` · `staff.schedules.list_for_member` · `staff.settings.get` | `view_staff_member` |
| query | `staff.services.list_for_member` · `staff.services.eligible_for_service` (la que consume la agenda por `reads`) | `view_staff_member` |
| query | `staff.schedules.hours_for_member` · `staff.schedules.get` · **`staff.availability.for_member`** (horario vigente − ausencias aprobadas; la autoridad de «cuándo puede trabajar», staff#2) | `view_staff_member` |
| query | `staff.members.compensation` · `staff.commissions.summary` | `view_compensation` |
| query | `staff.time_off.list` / `.today` | `view_time_off` |
| query | `staff.time_off.detail` | `view_time_off_detail` |
| command | `staff.members.create` / `.bulk_create` (WASM, cap 100) | `add_staff_member` |
| command | `staff.members.update` · `staff.services.assign` / `.update` / `.remove` (competencias por servicio, staff#9) | `change_staff_member` |
| command | `staff.members.deactivate` (WASM, guarda por ausencias vivas) / `.delete` | `delete_staff_member` |
| command | `staff.time_off.create` (WASM, invariante de solape) / `.set_status` | `manage_time_off` |
| command | `staff.roles.create` · `staff.schedules.create` / `.update` (WASM, sustituye la semana) · `.set_active` / `.delete` · `staff.settings.update` | `manage_settings` |
| emite | `staff.member.*`, `staff.role.created`, `staff.time_off.*`, `staff.schedule.*`, `staff.service.*`, `staff.settings.updated` | — |
| escucha | — (bloque declarado pero **vacío**) | — |

Navegación: `erp-staff-members`, `erp-staff-roles`, `erp-staff-time-off`, `erp-staff-schedules`;
ajustes declarativos (ADR-0082).

## Layout

```text
module.json                   # manifest (contrato técnico)
migrations/postgres/          # esquema §2.5 (hub_id + soft-delete + auditoría)
queries/*.sql                 # lecturas declarativas (:hub_id inyectado)
commands/*.sql                # escrituras declarativas (las `_` son intenciones del WASM)
schemas/*.json                # JSON Schemas de input (draft 2020-12)
handler/                      # WASM Tier 2 → dist/handler.wasm
ui/                           # Web Components (Lit/Ionic/OutfitKit)
docs/                         # documentación de usuario + corpus del asistente
```

## Estado y trabajo abierto

El estado vive en las **Issues de este repo**, no aquí. Limitaciones documentadas en
`docs/limits.md`: **no hay control horario/fichajes** (por eso no hay widget de fichajes — cero
mocks) y no hay nómina. Las guardas de `deactivate`/`time_off.create`/`schedules.create`/
`time_off.set_status` son **autoritativas** (staff#1): el handler decide sobre `context.reads` y un
rechazo es un error de dominio (`staff.*`) — ni fila ni evento; el SQL condicional queda solo como
defensa en profundidad.

Doc de arquitectura: `architecture/modules/staff.md` (cargarlo antes de tocar el módulo).
