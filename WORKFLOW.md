# WORKFLOW — Personal

Prefijo: STAFF
Alcance MVP: transversal

## Para qué sirve y para quién
La plantilla del negocio como recurso de trabajo: quién trabaja, qué rol de catálogo tiene («estilista», «camarero»), qué servicios hace cada profesional, en qué turnos, cuándo falta y qué porcentaje de comisión lleva. La usan el **administrador** y el **responsable** (dan de alta, editan, asignan servicios, ponen horarios y registran y aprueban ausencias; solo el administrador desactiva o da de baja) y el **empleado** (ve el directorio y quién falta, nunca la tarifa ni el motivo de una ausencia). Citas lee de aquí quién puede hacer cada servicio y cuándo trabaja, y el TPV y la cocina leen el directorio para nombrar a quien atiende. Es el módulo de personas del hub, no el de acceso.

**Frontera con el Hub (importante).** El hub tiene su propia pantalla, **Empleados** (menú del hub; su pestaña interna también se llama «Personal»): ahí viven las cuentas de acceso, su rol de permisos y el PIN, y responde a «quién entra». Este módulo responde a «quién trabaja y atiende» y es otra tabla. La ficha de Personal puede **colgar** de una cuenta del hub (campo «Usuario del Hub», STAFF-F03) y esa unión es opcional en los dos sentidos: un profesional sin cuenta aparece solo en la agenda, y una cuenta sin ficha no atiende. Ninguna pantalla ni comando de negocio del hub crea, edita ni desactiva fichas, ni Personal crea cuentas, y desactivar una cuenta en el hub no toca la ficha. Las únicas vías del hub que escriben en la tabla de fichas son la restauración o importación de un paquete o blueprint (ADR-0113, `hub/crates/runtime/src/export.rs:1340-1417`), que recrea las fichas tal como estaban, enlaces a cuentas incluidos, y la migración de importes (`money_backfill.rs:178`). Fuera del formulario de Personal, una ficha también se enlaza a una cuenta por la API (`staff.members.create` y `staff.members.update`), por el asistente y por esos paquetes. El **rol de Personal** es una etiqueta de catálogo y **no concede permisos**; los permisos los da el rol de la cuenta. Pendiente de enlazar al documento de la pantalla Empleados del hub desde STAFF-F01 y STAFF-F03.

## Referencia adoptada
- **Salón (Fresha, Vagaro, Mangomint, Square Appointments)**: ya contrastada en la regla 4 de `.claude/qa/qa-method-shared.md`. De ahí se adopta: el profesional como recurso de la agenda con sus servicios, su turno y sus ausencias; reservable o no; quien atiende queda atribuido a la venta; comisión por profesional.
- **Odoo Empleados y Dynamics 365 Business Central**: la baja guarda fecha y motivo en la ficha (staff#4); el responsable registra la ausencia él y la aprobación es el segundo paso, no el único (staff#36, que cita también Square Team, DaySmart y Toast).
- **Factorial, Personio, BambooHR y Deputy**: la máquina de estados de una ausencia (pendiente → aprobada o rechazada, pendiente o aprobada → cancelada, rechazada y cancelada terminales); según el comentario de `handler/src/lib.rs:737-741`.
- **Decisiones registradas que mandan aquí**: ADR-0192 (la ficha cuelga del usuario del hub, opcional en los dos sentidos), ADR-0123 (la tarifa es dinero en céntimos enteros; la comisión es un porcentaje, no dinero), ADR-0127 (el catálogo de Servicios se lee como integración opcional) y hub#1022 (el «hoy» es el día del negocio, no el UTC).

## Antes de empezar
1. En el hub, en **Empleados**, crea las cuentas de acceso de quien vaya a entrar al TPV (solo si quieres vincular su ficha; es opcional).
2. En **Personal → Roles**, crea los roles de catálogo del negocio (STAFF-F04). Un rol no es un permiso.
3. En **Personal → Personal**, da de alta a cada profesional (STAFF-F01), márcalo **Reservable** si va a recibir citas y vincula su cuenta si la tiene (STAFF-F03).
4. Para la peluquería: instala **Servicios** (Citas lo instala con ella) y asigna a cada profesional los servicios que hace (STAFF-F10). Mientras un servicio no tenga a nadie asignado, Citas deja que lo haga todo el equipo reservable (STAFF-F12).
5. En la pestaña **Horarios** de Personal (no el módulo Horarios, que guarda el horario del negocio), crea el turno semanal de cada profesional (STAFF-F13). Sin turno, Citas no restringe por turno: solo una ausencia aprobada puede impedir la reserva (STAFF-F16).
6. Registra las ausencias previstas en **Ausencias** (STAFF-F17); solo cuentan para la agenda cuando están **Aprobada** (STAFF-F18).
7. La zona horaria del negocio (ajustes del hub) decide qué es «hoy» para «Ausentes hoy», para el bloqueo de Desactivar y para el último día de una baja.
8. Los **Ajustes de Personal** existen pero ninguno cambia nada hoy (STAFF-F22).
9. Qué profesionales trae de ejemplo el blueprint de peluquería: sin confirmar (el catálogo de arranque de `blueprints` siembra dos cajeros ligados a su ficha, `blueprints/scripts/build_starter_catalog.py:388-389,643`).

## Pantallas

### Personal
Menú → **Personal** (nombre del módulo en español), primera pestaña. Las pestañas del módulo son **Personal · Roles · Ausencias · Horarios** y el shell del hub añade **Ajustes** al final.
- Tabla con buscador «Buscar miembro…», columnas **Nombre, Rol, Email, Estado** y, solo si la sesión puede ver compensación, **Tarifa/h**; **Teléfono** existe pero sale oculto (se activa en el selector de columnas). Se ordena por cualquier columna y filtra por Nombre, Rol, Email, Teléfono y Estado (el filtro de Estado solo ofrece **Activo** e **Inactivo**).
- Botón de añadir de la tabla → panel **Nuevo**. Pulsar una fila o su acción **Editar** → panel **Editar · {nombre}** (el panel enseña primero lo que trae la fila y enseguida la ficha completa; la dirección lleva `?member=<id>` y abrirla así abre esa ficha).
- Formulario (el mismo para alta y edición): **Nombre, Apellidos, Email, Teléfono, Nº de empleado, Rol** (con «Sin rol»), **Usuario del Hub** (con «Sin acceso al Hub»), y si no hay usuario elegido el aviso «Sin usuario del Hub, las ventas de mostrador se atribuyen a quien tenga la sesión y no le contarán para su comisión.»; después **Estado** (solo al editar: Activo, Inactivo, De baja), interruptor **Reservable**, **Margen entre citas (min)**, **Fecha de alta** (texto dd/mm/aaaa), **Color**, **Especialidades**, **Bio**; para quien puede ver compensación, **Tarifa por hora** y **Comisión (%)**; al editar, la sección **Servicios que realiza** (STAFF-F10); el aviso de error dentro del formulario y el botón **Guardar** («Guardando…» mientras guarda), apagado sin Nombre o sin Apellidos.
- Acciones de fila solo para quien puede borrar (el administrador): **Desactivar** (en gris si el estado no es Activo ni De baja) y **Dar de baja**. Ambas piden confirmar en un diálogo.
- Vacía: «Sin miembros del staff.» · Cargando: «Cargando…» · Error: el aviso de la tabla con **Reintentar**; un rechazo de una acción de fila sale en un aviso sobre la tabla.
- El botón de añadir y la acción Editar se ven siempre; el servidor rechaza a quien no tiene permiso (el texto que ve esa persona: sin confirmar).

### Roles
Pestaña **Roles**. Tabla con buscador «Buscar rol…» y columnas **Rol, Descripción, Miembros** (cuántas personas Activas lo llevan). Botón de añadir → panel **Nuevo** con **Nombre del rol, Descripción, Color** (marcador «Color (#RRGGBB)») y **Guardar**. Vacía: «Sin roles definidos.» · Error: el aviso de la tabla con Reintentar. No hay acción de fila: un rol no se edita ni se retira (STAFF-F04). La columna Color no existe aunque el rol lo guarda.

### Ausencias
Pestaña **Ausencias**, título «Ausencias». Tabla con buscador por nombre y columnas **Miembro, Tipo, Desde, Hasta, Estado**, con filtros por cada una (Tipo, Estado y fechas con selector de rango). Acciones de fila con solo icono: **Aprobar** y **Rechazar** (se ven en todas las filas; solo actúan sobre una **Pendiente**, en las demás no hacen nada y no avisan). El botón de añadir solo existe para quien puede gestionar ausencias; abre el formulario **Miembro, Tipo, Desde, Hasta, Día completo, (Desde (hora), Hasta (hora) si no lo es), Motivo** y **Guardar**. Vacía: «Sin solicitudes de ausencia.» · Error: el aviso de la tabla con Reintentar; los rechazos de Aprobar y Rechazar salen en un aviso sobre la tabla («No se pudo cambiar el estado» o el motivo concreto) y los del alta, dentro del formulario. El motivo y las notas de una ausencia no salen en esta tabla.

### Horarios
Pestaña **Horarios**. Arriba el selector **Miembro** (carga el primero); la tabla lista los horarios de esa persona con columnas **Horario, Por defecto, Desde, Hasta, Activo, Horas** (la semana resumida, por ejemplo con el descanso entre paréntesis). Acciones de fila: **Editar** (también pulsando la fila), **Activar / desactivar** y **Eliminar** (confirma con «Eliminar horario»). Botón de añadir → panel **Nuevo**: **Horario** (nombre, marcador «Nombre del horario»; vacío se guarda «Horario habitual»), **Vigente desde, Vigente hasta, Por defecto** y una fila por día de la semana (Lunes a Domingo) con casilla de trabajo y, si trabaja, **Inicio, Fin, Inicio descanso, Fin descanso** (texto hh:mm; si no trabaja, «No trabaja»); botón **Crear horario** (al editar, **Guardar**). Sin ningún miembro: solo el aviso «Aún no hay miembros del staff», «Da de alta miembros del staff para poder asignarles horarios.» y el botón **Dar de alta un miembro**, que abre la pestaña Personal. Sin horarios: «Este miembro aún no tiene horarios.» · Cargando: «Cargando…» · Error: el aviso de la tabla con Reintentar.

### Ajustes de Personal
Pestaña **Ajustes**, que el hub añade sola porque el módulo declara sus ajustes. La ve todo el que entra al módulo; quien no es administrador la ve en solo lectura con «Solo un administrador puede cambiar estos ajustes.» (aunque su rol tenga el permiso `staff.manage_settings`, el formulario de ajustes del hub solo deja editar al administrador: `hub/apps/web/src/components/ModuleSettingsForm.vue:252`). Campos: «Inicio de jornada (HH:MM)», «Fin de jornada (HH:MM)», «Duración del descanso (minutos)», «Antelación mínima de reserva (horas)», «Horas máximas por día», «Umbral de horas extra (horas/semana)», «Mostrar fotos del personal», «Mostrar biografía del personal», «Permitir elegir profesional», «Avisar de nueva cita», «Avisar de cancelación»; botón **Guardar**. Cargando: «Cargando ajustes…» · Error: «No se pudieron cargar los ajustes.» o «No se pudieron guardar los ajustes.» · Guardado: «Ajustes guardados.»

### Paneles del inicio
Los cinco paneles de Personal salen en el inicio del hub (los tres primeros vienen activos por defecto): **Plantilla activa** («Empleados activos»), **Ausentes hoy**, **Ausencias de hoy** (cronología), **Ausencias pendientes** («Solicitudes por aprobar», no activo por defecto) y **Empleados por rol** (no activo por defecto, los 10 primeros). «Plantilla activa» se refresca con altas, desactivaciones y bajas; «Empleados por rol», además, con roles nuevos; los de ausencias, al registrar o resolver una. Ninguno de los dos primeros se refresca al editar una ficha.

## Flujos

El detalle de cada flujo (pasos, datos, fallos, implicados y QA) está en `workflow/`, con la misma gramática y el mismo prefijo. Antes de tocar código, lee el fichero del flujo que cambias.

| ID | Flujo | Estado | Detalle |
|---|---|---|---|
| STAFF-F01 | Dar de alta a un profesional | parcial | [`workflow/ficha.md`](workflow/ficha.md) |
| STAFF-F02 | Editar la ficha de un profesional | parcial | [`workflow/ficha.md`](workflow/ficha.md) |
| STAFF-F03 | Vincular la ficha con una cuenta del hub | hecho | [`workflow/ficha.md`](workflow/ficha.md) |
| STAFF-F04 | Crear un rol de catálogo | parcial | [`workflow/ficha.md`](workflow/ficha.md) |
| STAFF-F05 | Desactivar a un profesional | hecho | [`workflow/ficha.md`](workflow/ficha.md) |
| STAFF-F06 | Dar de baja a un profesional | hecho | [`workflow/ficha.md`](workflow/ficha.md) |
| STAFF-F07 | Dar de alta a varios profesionales de golpe | parcial | [`workflow/ficha.md`](workflow/ficha.md) |
| STAFF-F08 | Ver mi propia ficha y mis ausencias | parcial | [`workflow/ficha.md`](workflow/ficha.md) |
| STAFF-F09 | Dar el equipo a otros módulos | hecho | [`workflow/ficha.md`](workflow/ficha.md) |
| STAFF-F10 | Asignar un servicio a un profesional | hecho | [`workflow/disponibilidad.md`](workflow/disponibilidad.md) |
| STAFF-F11 | Cambiar o quitar un servicio de un profesional | parcial | [`workflow/disponibilidad.md`](workflow/disponibilidad.md) |
| STAFF-F12 | Saber quién puede hacer un servicio | hecho | [`workflow/disponibilidad.md`](workflow/disponibilidad.md) |
| STAFF-F13 | Crear el horario semanal de un profesional | parcial | [`workflow/disponibilidad.md`](workflow/disponibilidad.md) |
| STAFF-F14 | Editar un horario | hecho | [`workflow/disponibilidad.md`](workflow/disponibilidad.md) |
| STAFF-F15 | Activar, desactivar o eliminar un horario | hecho | [`workflow/disponibilidad.md`](workflow/disponibilidad.md) |
| STAFF-F16 | Saber cuándo puede trabajar un profesional | hecho | [`workflow/disponibilidad.md`](workflow/disponibilidad.md) |
| STAFF-F17 | Registrar una ausencia | parcial | [`workflow/ausencias.md`](workflow/ausencias.md) |
| STAFF-F18 | Aprobar o rechazar una ausencia | hecho | [`workflow/ausencias.md`](workflow/ausencias.md) |
| STAFF-F19 | Cancelar una ausencia | parcial | [`workflow/ausencias.md`](workflow/ausencias.md) |
| STAFF-F20 | Ver quién falta hoy | hecho | [`workflow/ausencias.md`](workflow/ausencias.md) |
| STAFF-F21 | Dar la comisión de cada profesional | parcial | [`workflow/pago-y-ajustes.md`](workflow/pago-y-ajustes.md) |
| STAFF-F22 | Cambiar los ajustes de Personal | parcial | [`workflow/pago-y-ajustes.md`](workflow/pago-y-ajustes.md) |
| STAFF-F23 | Ver la plantilla por rol en el inicio | hecho | [`workflow/pago-y-ajustes.md`](workflow/pago-y-ajustes.md) |

## Qué comparten los verticales

Las pantallas son las mismas para los dos negocios; lo que cambia es quién lee el resultado. Solo Citas (peluquería) lee las competencias, el turno y las ausencias, y la receta de cita de WhatsApp lee el directorio y las horas libres que le da Citas; el TPV y la cocina (los dos verticales) solo leen el directorio.

| Pieza compartida | Flujos que la usan |
|---|---|
| La ficha del profesional (estado, reservable, rol, cuenta del hub) | STAFF-F01, STAFF-F02, STAFF-F03, STAFF-F05, STAFF-F06, STAFF-F07, STAFF-F09, STAFF-F12, STAFF-F16 |
| El directorio que leen el TPV, la cocina, Citas y la receta de cita de WhatsApp | STAFF-F09, STAFF-F12 |
| La competencia (servicio de un profesional) | STAFF-F10, STAFF-F11, STAFF-F12 |
| La plantilla de horario y su regla de «cuál manda ese día» | STAFF-F13, STAFF-F14, STAFF-F15, STAFF-F16 |
| La ausencia aprobada (resta del turno en la agenda y cuenta en «Ausentes hoy») | STAFF-F16, STAFF-F17, STAFF-F18, STAFF-F19, STAFF-F20 |
| La tasa de comisión y el vínculo con la cuenta del hub (los dos ids de una persona; el TPV los pliega en una fila al elegir quién atiende) | STAFF-F03, STAFF-F09, STAFF-F21 |
| Los ajustes de Personal (ninguno se lee hoy) | STAFF-F22 |

Regla: tocar un flujo `comun` puede afectar a los dos negocios; tocar uno de `peluqueria` (competencias, horario, disponibilidad) no debe afectar al TPV ni a la cocina.

## Cobertura contra la referencia

Referencia: Fresha, Vagaro, Mangomint y Square Appointments (regla 4 de `.claude/qa/qa-method-shared.md`), más lo adoptado de Odoo y Business Central.

| Elemento (equipo) | Estado | Flujo |
|---|---|---|
| Ficha del profesional: nombre, contacto, rol, fecha de alta | hecho | STAFF-F01, STAFF-F02 |
| Reservable o no en la agenda | hecho | STAFF-F02 |
| Margen entre citas | parcial — se guarda al editar (no al dar de alta) y Citas no lo aplica | STAFF-F01, STAFF-F02 |
| Color, especialidades y biografía | parcial — se guardan; Citas no las lee y los ajustes «Mostrar…» no hacen nada | STAFF-F02, STAFF-F22 |
| Foto del profesional | no hecho — la columna existe y ningún formulario ni comando la escribe | — |
| Borrar la fecha de alta una vez puesta | no hecho — la pantalla manda «sin cambio» | STAFF-F02 |
| Una cuenta de acceso por profesional | hecho | STAFF-F03 |
| Roles de catálogo: crear | hecho | STAFF-F04 |
| Roles de catálogo: editar, retirar, ordenar | no hecho — ni pantalla ni API | STAFF-F04 |
| Desactivar sin borrar | hecho | STAFF-F05 |
| Baja definitiva con fecha y motivo | hecho | STAFF-F06 |
| Reactivar a una persona dada de baja | no hecho — la ficha queda cerrada | STAFF-F06 |
| Alta en lote | parcial — solo asistente, sin pantalla de importación; un nombre vacío o una tarifa negativa tumba el lote entero y lo que pasa de 100 filas se pierde sin avisar | STAFF-F07 |
| Ver mis propios datos | parcial — solo asistente o API | STAFF-F08 |
| Avisar de las citas futuras al desactivar, dar de baja o aprobar una ausencia | no hecho — Personal no mira las citas ya reservadas y Citas no escucha a Personal (APPOINTMENTS-F01, APPOINTMENTS-F04) | STAFF-F05, STAFF-F06, STAFF-F18 |

| Elemento (servicios por profesional) | Estado | Flujo |
|---|---|---|
| Qué servicios hace cada profesional | hecho | STAFF-F10 |
| Duración y precio propios de un servicio | parcial — se fijan al asignar; para cambiarlos hay que quitar el servicio y volver a asignarlo | STAFF-F10, STAFF-F11 |
| Servicio principal | hecho | STAFF-F11 |
| Filtrar los profesionales por servicio al reservar | hecho | STAFF-F12 |

| Elemento (turnos y ausencias) | Estado | Flujo |
|---|---|---|
| Turno semanal con descanso | parcial — con más de 50 personas el selector de miembro solo ofrece las 50 primeras | STAFF-F13, STAFF-F14 |
| Turno que cruza la medianoche | no hecho — el fin tiene que ser posterior al inicio | STAFF-F13 |
| Dos tramos en un día sin descanso de por medio | no hecho — un día es un tramo con un descanso opcional | STAFF-F13 |
| Excepción de un día concreto | parcial — sin pantalla propia: un horario no habitual con vigencia de un solo día | STAFF-F13, STAFF-F16 |
| Activar o desactivar y eliminar un horario | hecho | STAFF-F15 |
| Vacaciones, bajas y permisos con aprobación | hecho | STAFF-F17, STAFF-F18 |
| Ausencia de horas, no de día entero | parcial — dos ausencias de horas distintas el mismo día se rechazan como solapadas | STAFF-F17 |
| Que el empleado pida su propia ausencia | no hecho — solo quien gestiona ausencias las registra | STAFF-F17 |
| Cancelar una ausencia | parcial — solo con el asistente (no está en la API pública con llave) | STAFF-F19 |
| Quién falta hoy | hecho | STAFF-F20 |
| Disponibilidad efectiva (turno menos ausencias) para quien reserva | hecho | STAFF-F16 |
| Pantalla de disponibilidad efectiva de una persona | no hecho — solo la leen Citas y el asistente | STAFF-F16 |
| Saldo y días acumulados de vacaciones | fuera del MVP | — |

| Elemento (comisión y control horario) | Estado | Flujo |
|---|---|---|
| Tasa de comisión por profesional | parcial — se guarda y se publica; nada la usa hoy | STAFF-F21 |
| Importe de comisión del día por profesional | no hecho — ninguna pantalla cruza la tasa con las ventas por profesional de Ventas (SALES-F28; B-08) | STAFF-F21 |
| Ajustes de jornada, reserva y avisos | parcial — se guardan y nadie los lee | STAFF-F22 |
| Fichaje, horas trabajadas y horas extra | fuera del MVP | — |
| Nómina | fuera del MVP | — |

## Datos: de quién es cada dato
| Dato | Dueño | Cómo lo obtiene Personal |
|---|---|---|
| Ficha del profesional (datos, estado, reservable, tarifa, comisión) | Personal | propio |
| Roles de catálogo | Personal | propio |
| Servicios que hace cada profesional (competencia) | Personal | propio; guarda el id del servicio y una copia del nombre |
| Plantillas de horario y horas de cada día | Personal | propio |
| Ausencias | Personal | propio |
| Ajustes de Personal | Personal | propio |
| Cuenta de acceso (nombre, rol de permisos, activa o no) | Hub | lectura `hub.users.list` solo para elegir a quién vincular; guarda solo el id |
| Catálogo de servicios | Servicios | lectura opcional `services.services.list` (hasta 500) para asignar |
| Zona horaria del negocio | Hub | la entrega el hub en cada lectura; Personal no guarda copia |
| Horario del negocio, festivos y excepciones | Horarios | no lo lee ni lo guarda: Citas lo cruza con el turno del profesional |
| Citas de cada profesional | Citas | no las lee |
| Ventas atribuidas a cada profesional | Ventas | no las lee |

**Datos personales (inventario RGPD, recorriendo las seis migraciones):**
- **Ficha:** nombre y apellidos, email, teléfono, nº de empleado, cuenta del hub, fecha de alta, fecha de baja y **motivo de baja** (texto libre, migración 002), bio, especialidades, **notas de RRHH** (texto libre que se escribe por API o asistente y que ninguna consulta devuelve), **tarifa por hora y % de comisión** (retribución, solo con permiso de compensación), color, margen entre citas, orden, y la columna de **foto** (nadie la escribe).
- **Ausencia:** el tipo (**baja por enfermedad** es un dato de salud), las fechas, el **motivo y las notas** en texto libre y quién la aprobó (usuario del hub) y cuándo. El motivo y las notas solo salen por la consulta de detalle con permiso y por «lo mío».
- **Competencia:** el nombre del servicio copiado de Servicios y la duración y el precio propios.
- **Horarios, horas de cada día, roles y ajustes:** sin datos personales más allá del profesional al que pertenecen.
- **Auditoría** en todas las tablas: quién creó y quién cambió cada fila (usuarios del hub).
- **Tablas retiradas con otro nombre:** ninguna; las seis migraciones no borran ni renombran tablas.
- **Lo que sale hacia otros:** el hub guarda en la bandeja de avisos los parámetros del comando que emite cada aviso (`hub/crates/runtime/src/commands.rs:665-672` para los comandos SQL y `:1551-1572` para los de handler), así que los avisos de alta y edición de ficha viajan con nombre, contacto, tarifa y notas, `staff.member.terminated` con el motivo de baja y `staff.time_off.created` con el motivo y las notas; qué campos ve cada oyente: sin confirmar. Flujos ofrece como disparadores `staff.time_off.created`, `staff.member.created` y `staff.member.deactivated`.
- **Borrado:** Dar de baja es un borrado lógico que conserva todos esos datos (también el motivo de baja y las notas); no existe borrado ni anonimización de una ficha. Personal no escucha ningún aviso de otros módulos (`events.listen` vacío en `module.json`), así que ni la baja ni la anonimización de una cuenta del hub ni de un cliente cambian nada aquí. Es un hueco de la familia RGPD.

## Reglas que no se rompen
- **Aislamiento por hub:** toda lectura y escritura filtra por el hub del contexto; un rol, un profesional o un horario de otro negocio se rechaza o no se ve (`commands/member_create.sql`, `commands/service_assign.sql`, `queries/*.sql`).
- **Una cuenta del hub, una ficha viva:** alta y edición rechazan una segunda ficha sobre la misma cuenta con «staff.user_already_linked» y un índice único parcial lo impone también en la carrera de dos guardados (`handler/src/lib.rs:280`, `migrations/postgres/006_member_user_link_unique.sql`). Una ficha dada de baja libera la cuenta.
- **Tarifa, comisión y motivo de una ausencia solo con permiso:** van en consultas aparte (`staff.members.compensation`, `staff.time_off.detail`) con `staff.view_compensation` y `staff.view_time_off_detail`; el directorio y la lista de ausencias no los llevan ni como columna ni como filtro. La única excepción es lo propio de la sesión (`staff.members.mine`, `staff.time_off.mine`).
- **`terminated` solo se alcanza dando de baja:** los esquemas de alta y edición no admiten ese estado y una ficha dada de baja ya no se puede editar (queda borrada).
- **Una ausencia no se solapa con otra pendiente o aprobada** del mismo profesional, y cambia de estado solo por el camino pendiente → aprobada, rechazada o cancelada y aprobada → cancelada; aprobar se rechaza si solapa con otra ya aprobada (`handler/src/lib.rs:669-800`, `commands/_insert_time_off.sql`).
- **No se desactiva** a quien tiene una ausencia pendiente o aprobada que no ha terminado (`handler/src/lib.rs:251-256`, `commands/_deactivate_member.sql`).
- **Un horario válido:** al menos un día de trabajo, inicio antes del fin, descanso con inicio y fin y dentro del tramo, ningún día repetido, vigencia con «desde» no posterior a «hasta»; un solo horario por defecto por profesional (los demás se desmarcan en la misma transacción) (`handler/src/lib.rs:455-560`).
- **Un rol solo se asigna si es de este negocio, está vivo y está activo** (`commands/member_create.sql`, `commands/member_update.sql`).
- **Dinero en céntimos enteros y nunca negativo:** la tarifa y el precio propio de un servicio (`schemas/member_create.json`, `schemas/service_assign.json`); la comisión es un porcentaje de 0 a 100 y no es dinero.
- **El «hoy» es el día del negocio**, no el UTC, para el bloqueo de Desactivar, el último día de una baja, «Ausentes hoy» y las ausencias activas (`queries/time_off_today.sql`, `commands/member_delete.sql`).
- **Un rechazo de dominio no deja rastro:** ni escritura ni aviso, en los comandos que lo vigilan con handler o con `expect_rows` (todos menos `staff.roles.create`, que siempre inserta, y el alta en lote, que omite filas por su cuenta). En una carrera entre la lectura y la escritura, desactivar, registrar o resolver una ausencia y crear un horario pueden emitir su aviso sin haber cambiado nada: sus sentencias internas no llevan `expect_rows`.
- **Permisos por comando:** crear y editar fichas y servicios con `staff.add_staff_member` y `staff.change_staff_member`, desactivar y dar de baja con `staff.delete_staff_member` (solo administrador), registrar y resolver ausencias con `staff.manage_time_off`, y roles, horarios y ajustes con `staff.manage_settings` (`module.json`).

Lo que **no** es una regla aunque se diga: que una persona dada de baja, desactivada o ausente no tenga citas. Citas rechaza las reservas **nuevas** (profesional no encontrado, no reservable o fuera de turno) pero las ya reservadas siguen en la agenda y Personal no las mira.

## Lo que NO hace, a propósito
- **No es el acceso:** no crea cuentas, no da permisos, no guarda PIN ni contraseña; eso es la pantalla Empleados del hub.
- **No ficha:** no hay entradas ni salidas, horas trabajadas ni horas extra. «Ausentes hoy» es la pregunta contraria: quién no está.
- **No calcula nómina ni el importe de la comisión:** guarda la tarifa por hora y publica la tasa.
- **No reserva ni guarda citas:** quién es reservable lo dice Personal; la agenda es de Citas.
- **No guarda el horario del negocio:** el turno del profesional es de aquí; abrir y cerrar, festivos y excepciones son de Horarios.
- **No borra de verdad:** no hay borrado físico ni anonimización de una ficha.
- **No avisa a nadie** al pedir, aprobar o rechazar una ausencia: el módulo no declara campana ni envía mensajes (los avisos son para otros módulos y para Flujos).
- **No guarda saldos de vacaciones** ni días acumulados.
- **No avisa de duplicados:** dos fichas con el mismo nombre, email o nº de empleado se aceptan (solo la cuenta del hub es única).

## Dudas abiertas
- ¿Qué debe pasar con las **citas futuras** de un profesional al desactivarlo, darlo de baja o aprobarle una ausencia: avisar de cuáles son, bloquearlo, o reasignarlas desde Citas? Hoy no pasa nada y nadie se entera.
- **Desactivar** se rechaza mientras haya una ausencia aprobada sin terminar, pero una aprobada solo se anula con el asistente (STAFF-F19): ¿se da pantalla a Cancelar, o Desactivar deja de mirar las ausencias?
- ¿Debe el **empleado** poder pedir su propia ausencia? Hoy solo el responsable las registra (STAFF-F17).
- Los **ajustes** de Personal (11) no cambian nada: ¿se conectan los que tienen sentido (jornada por defecto en el formulario de horario, antelación y elegir profesional), se ocultan o se retiran?
- **«Margen entre citas (min)»**: ¿Citas debe aplicarlo entre una cita y la siguiente del mismo profesional?
- **Dos ausencias de horas** el mismo día (mañana y tarde): ¿deben permitirse, comparando también las horas?
- **Roles de catálogo**: ¿hace falta editar, retirar u ordenar un rol?
- «**De baja**» (estado temporal) y «**Dado de baja**» (baja definitiva) se parecen demasiado, y el botón «Dar de baja» hace la segunda: ¿se renombra alguna?
- **Registro horario** (RD-ley 8/2019, ya anotado en `.claude/qa/qa-method-shared.md` como fuera del producto): ¿entra en el MVP v2?
- ¿Quién compone el **cierre del día por profesional** con la comisión: Caja, Ventas o el asistente? Hoy nadie.

## Fuentes contrastadas
Contra el código de `origin/main` (v2.3.12), una línea por discrepancia:
- `architecture/modules/staff.md` (contrato de pantalla, vista Ausencias) pide «Aprobar / rechazar / cancelar»; la pantalla solo tiene Aprobar y Rechazar y cancelar es solo con el asistente (no está en la API pública con llave) (`ui/components/erp-staff-time-off/erp-staff-time-off.ts:159-166`, STAFF-F19).
- `architecture/modules/staff.md` dice que el directorio filtra por «bookable»; la pantalla no tiene esa columna ni filtro y el filtro de Estado solo ofrece Activo e Inactivo (`erp-staff-members.ts:288-301`); el filtro por reservable solo existe en la consulta.
- `architecture/modules/staff.md` dice que Roles enseña «nombre, color, nº de miembros»; la tabla enseña Rol, Descripción y Miembros, sin color (`erp-staff-roles.ts:63-69`).
- `architecture/modules/staff.md` y `docs/screens.md` dicen que los ajustes los edita quien tiene `staff.manage_settings`; el formulario del hub solo deja editar al administrador (`ModuleSettingsForm.vue:252`).
- `docs/screens.md` describe los ajustes como jornada por defecto, reglas de reserva y avisos, y `locales/es.json` da a cada uno una descripción; ninguno se lee en ningún módulo (`queries/settings_get.sql` es su único lector) y el formulario de horario siembra Lunes a Viernes de 09:00 a 18:00 fijo, no los ajustes (`erp-staff-schedules.ts:81-90`) (STAFF-F22).
- `locales/es.json` (`settings.fields.default_work_end`) dice que un turno que acaba antes de empezar cruza la medianoche y «La jornada nocturna … es válida»; el horario semanal rechaza un fin que no sea posterior al inicio (`handler/src/lib.rs:508`) y los ajustes no se leen.
- `docs/screens.md` y `docs/concepts.md` presentan el margen entre citas como parte de lo que hace reservable a una persona; Citas no lo lee en ningún fichero de `origin/main` (STAFF-F02).
- `hand-book/modulos/staff.md` llama «Finalizar» a lo que la pantalla llama «Dar de baja», y «ausente» o «finalizada» a los estados que la pantalla llama «De baja» y «Dado de baja» (`locales/es.json`, `ui.status_on_leave`, `ui.status_terminated`, `ui.actionTerminate`).
- `hand-book/modulos/staff.md` dice que una persona activa «debe estar además marcada como reservable y prestar el servicio elegido para aparecer en una cita»; si el servicio no tiene a nadie asignado, Citas acepta a cualquier reservable, y si el único que lo hace está inactivo o no reservable la lista de elegibles sale vacía y también acepta a todos (`appointments/handler/src/lib.rs:1983`, STAFF-F12).
- `hand-book/modulos/staff.md` manda comprobar «el calendario efectivo»; no hay pantalla de disponibilidad efectiva (STAFF-F16).
- `docs/overview.md` y `docs/screens.md` dicen que la comisión del día la compone el cierre cruzando `staff.commissions.summary` con `sales.by_staff`; ningún módulo ni pantalla llama a `staff.commissions.summary` (solo los tests del hub) y B-08 (`qa-hub.md` §6) espera la comisión por profesional (STAFF-F21).
- El flujo de WhatsApp «cita desde un mensaje» entrega al asistente `staff.schedules.list_for_member` «para elegir un profesional que trabaje a esa hora» (`whatsapp_inbox/flows/appointment-from-whatsapp.requires.json`); esa consulta devuelve solo el nombre y la vigencia de cada horario, no las horas, que salen de `staff.schedules.hours_for_member` (STAFF-F09, STAFF-F16).
- `docs/overview.md` lista 9 de los 14 avisos que emite el módulo; faltan los tres de servicios (`staff.service.assigned`, `staff.service.updated`, `staff.service.removed`) y `staff.schedule.updated` y `staff.schedule.deleted`.
- `docs/screens.md` enumera para Ausencias los filtros de la consulta («full-day flag, times, status or approver») y llama «top 10» al panel «By role»; la pantalla solo filtra por Miembro, Tipo, fechas y Estado, y el panel muestra hasta 10 roles de la lista (por nombre; sin confirmar si los reordena por tamaño).
- La descripción de `staff.roles.list` en `module.json` habla de «sus permisos asignados»; un rol de Personal no tiene permisos (la tabla no tiene esa columna).
- `module.json` describe `staff.time_off.create` como «new time-off request» y Flujos lo ofrece como disparador «alguien pide vacaciones» (`flows/ui/lib/trigger-catalog.ts:92`, `flows/locales/es.json:207`); el aviso sale con cualquier tipo de ausencia y también cuando la registra el responsable (STAFF-F17).
- `handler/src/lib.rs:32` (cabecera) dice que el alta en lote nunca omite filas en silencio; las filas pasadas de la 100 se descartan sin figurar entre las omitidas (`handler/src/lib.rs:379`, STAFF-F07).
- El diálogo «Dar de baja» dice «sus horarios y ausencias futuras dejan de contar»; el código solo cierra la ficha (`commands/member_delete.sql`): sus horarios dejan de gobernar la disponibilidad porque la consulta los une con la ficha viva, sus ausencias dejan de salir en la lista y en «Ausentes hoy», y el panel «Ausencias pendientes» las sigue contando (`queries/members_stats.sql:24`) (STAFF-F06).
- «Dar de baja» pide el «Último día» con un campo de fecha del navegador (`erp-staff-members.ts:878`), no con el texto en el orden del idioma del hub que usan las demás fechas del módulo (staff#87).
- La pestaña interna «Personal» de la pantalla Empleados del hub (`hub/apps/web/src/i18n/locales/es.ts`, `employees.tabStaff`) y este módulo se llaman igual y son cosas distintas (STAFF-F03).
- Oleada 2 (Servicios y Horarios, 05/10/2026): confirmado en `appointments/handler/src/lib.rs` que la regla «un servicio sin nadie asignado lo puede hacer todo el equipo reservable» es de Citas; Servicios tampoco la tiene (STAFF-F12). La pestaña **Horarios** de Personal es el turno de cada profesional; el horario del negocio es del módulo Horarios, que Personal no lee (`qa-hub-beauty`, aprovisionamiento, punto 5, los confunde).
