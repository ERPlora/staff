# WORKFLOW — Personal · Ausencias

Prefijo: STAFF

## Flujos

### STAFF-F17 Registrar una ausencia
Estado: parcial — el empleado no puede pedir la suya (solo quien gestiona ausencias las registra), con más de 50 personas el selector de miembro solo ofrece las 50 primeras, y dos ausencias de horas distintas el mismo día se rechazan como solapadas
Vertical: comun
Actor: administrador, responsable
Pantalla: Ausencias
Pasos:
1. En Personal → Ausencias pulsa el botón de añadir (solo existe para quien gestiona ausencias): se abre el formulario.
2. Elige el Miembro, el Tipo (Vacaciones, Baja por enfermedad, Asuntos propios, Formación u Otros; viene Vacaciones), Desde y Hasta (texto dd/mm/aaaa), «Día completo» (si lo apagas, salen «Desde (hora)» y «Hasta (hora)») y, si quieres, el Motivo.
3. Pulsa Guardar.
4. La ausencia sale en la tabla como **Pendiente**.
Entra: la persona (cualquier ficha viva, también una Inactivo), el tipo, las fechas, las horas si no es de día entero y el motivo; la pantalla no recoge notas. Con horas, valen las mismas cada día del rango.
Sale: la ausencia Pendiente (`staff.time_off.created`), que refresca «Ausencias pendientes» y «Ausentes hoy» y puede disparar una automatización de Flujos (su disparador se llama «alguien pide vacaciones» aunque el tipo sea cualquiera y la registre el responsable). Una ausencia pendiente no cambia todavía la agenda: solo cuenta al aprobarla (STAFF-F18). No avisa a la persona.
Si falla: dentro del formulario y sin perder lo tecleado: «Elige de quién es la ausencia.», «Indica la fecha de inicio y la de fin.», «La fecha de fin no puede ser anterior a la de inicio.», «Una ausencia de medio día necesita hora de inicio y de fin.», «La hora de inicio tiene que ser anterior a la de fin.», una fecha que no se entiende, y del servidor «Ese miembro ya tiene una ausencia pendiente o aprobada en esas fechas.» (el solape se mide solo por fechas: una de mañana y otra de tarde del mismo día chocan; las rechazadas y canceladas no cuentan) o «Ese miembro del personal no existe en este negocio.»; otro fallo: «No se pudo registrar la ausencia». Con más de 50 personas, el selector de miembro solo ofrece las 50 primeras (por id).
Implicados: FLOWS-F13, REC_PELUQUERIA-F03
QA: ninguno

### STAFF-F18 Aprobar o rechazar una ausencia
Estado: hecho
Vertical: comun
Actor: administrador, responsable
Pantalla: Ausencias
Pasos:
1. En Personal → Ausencias localiza la ausencia **Pendiente** (el filtro de Estado ayuda).
2. Pulsa el icono Aprobar o el icono Rechazar de su fila (se ven en todas las filas, pero solo actúan sobre una Pendiente: en las demás no pasa nada y no hay aviso).
3. La fila pasa a **Aprobada** o **Rechazada**.
4. Los paneles «Ausentes hoy», «Ausencias de hoy» y «Ausencias pendientes» se refrescan.
Entra: la ausencia y las demás pendientes o aprobadas de la misma persona.
Sale: el estado nuevo y, al aprobar, quién aprobó y cuándo (se guardan; la tabla no los enseña) (`staff.time_off.status_changed`). **Aprobada** resta esas horas al turno de la persona para la agenda (STAFF-F16) y la cuenta en «Ausentes hoy» si cubre hoy; Rechazada no cambia nada. No mira ni avisa de las citas que esa persona ya tenga esos días, no cambia el estado de la ficha y no avisa a la persona.
Si falla: un aviso sobre la tabla con el motivo: «Ese miembro ya tiene una ausencia pendiente o aprobada en esas fechas.» (al aprobar, si otra **aprobada** de la misma persona solapa; como el alta ya impide los solapes, solo puede ocurrir con datos anteriores o con dos altas a la vez), «Esa solicitud de ausencia no puede pasar a ese estado desde el actual.», «Esa solicitud de ausencia no existe en este negocio.» o «No se pudo cambiar el estado».
Implicados: APPOINTMENTS-F01, APPOINTMENTS-F02, REC_PELUQUERIA-F03
QA: ninguno

### STAFF-F19 Cancelar una ausencia
Estado: parcial — sin pantalla: la tabla de Ausencias solo tiene Aprobar y Rechazar, y cancelar existe solo con el asistente (o llamando a `staff.time_off.set_status` con una sesión del hub; no está en la API pública con llave)
Vertical: comun
Actor: administrador, responsable, asistente
Pantalla: asistente
Pasos:
1. Quien gestiona ausencias pide al asistente cancelar una ausencia Pendiente o Aprobada.
2. El asistente cambia su estado a Cancelada.
3. Si estaba Aprobada, sus horas vuelven a estar disponibles para la agenda.
4. La tabla de Ausencias la enseña como **Cancelada**.
Entra: la ausencia.
Sale: el estado Cancelada (`staff.time_off.status_changed`), que es final: ni una Rechazada ni una Cancelada vuelven a Pendiente, y repetir una operación terminal se rechaza. Conserva quién la aprobó y cuándo si lo había sido. Es el único camino para quitar una ausencia aprobada, y sin quitarla no se puede Desactivar a esa persona mientras no termine (STAFF-F05).
Si falla: «Esa solicitud de ausencia no puede pasar a ese estado desde el actual.» o «Esa solicitud de ausencia no existe en este negocio.».
Implicados: APPOINTMENTS-F02
QA: ninguno

### STAFF-F20 Ver quién falta hoy
Estado: hecho
Vertical: comun
Actor: administrador, responsable, empleado
Pantalla: Paneles del inicio
Pasos:
1. Abre el inicio del hub: «Ausentes hoy» da cuántas personas tienen una ausencia aprobada que cubre hoy, «Ausencias de hoy» las lista y «Ausencias pendientes» da cuántas solicitudes esperan respuesta (este último no viene activo por defecto).
2. Para el detalle abre Personal → Ausencias y filtra por Estado y fechas.
3. Los paneles se refrescan solos al registrar o resolver una ausencia.
4. El empleado ve quién falta y cuándo, pero no el motivo ni las notas: esos van en una consulta aparte con permiso.
Entra: las ausencias y el estado de las fichas.
Sale: solo lectura. «Ausentes hoy» cuenta personas distintas con una ausencia **aprobada** que cubre la fecha de hoy en el día del negocio, sea de día entero o de horas (no mira la hora actual); una pendiente o una aprobada de otro día no cuenta. «Ausencias pendientes» cuenta todas las pendientes, también las de una ficha dada de baja, que ya no salen en la lista. Cómo pinta «Ausencias de hoy» el tipo de ausencia (sin traducir o traducido): sin confirmar.
Si falla: sin ausencias, los paneles dicen 0 o vacío; cómo pinta el inicio un fallo de lectura: sin confirmar.
Implicados: REC_PELUQUERIA-F05
QA: ninguno
