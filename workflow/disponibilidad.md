# WORKFLOW — Personal · Servicios, horarios y disponibilidad

Prefijo: STAFF

## Flujos

### STAFF-F10 Asignar un servicio a un profesional
Estado: hecho
Vertical: peluqueria
Actor: administrador, responsable
Pantalla: Personal
Pasos:
1. En Personal → Personal abre la ficha de la persona con Editar (el alta no tiene esta sección): aparece «Servicios que realiza» con su lista, o «Sin servicios asignados todavía.».
2. En «Añadir servicio…» elige uno del catálogo de Servicios (salen los que esa persona aún no tiene) y, si quieres, escribe «Minutos (opcional)» y «Precio (opcional)» propios de ese profesional.
3. Pulsa «Asignar».
4. El servicio sale en la lista con sus minutos y precio propios si los hay, y la persona ya cuenta como competente para él.
Entra: el servicio del catálogo (Servicios, lectura opcional, hasta 500): se guarda su identificador y una copia del nombre. Los minutos valen si son un entero mayor que 0 (si no, se guarda «sin minutos propios» sin avisar); el precio se teclea en la moneda del hub y, vacío, significa «el del catálogo», nunca «gratis».
Sale: la competencia, activa y no principal (`staff.service.assigned`). Citas la lee para filtrar los profesionales de un servicio, para tomar la duración y el precio propios en lugar de los del catálogo y para rechazar una pareja servicio-profesional que no cuadra (STAFF-F12). Renombrar o borrar el servicio en Servicios no cambia esta lista: la copia del nombre se queda y la competencia sigue.
Si falla: dentro de la sección, «No se pudieron actualizar los servicios» o el motivo concreto («No se pudo asignar el servicio: ese profesional no existe en este negocio.», o el importe ilegible, negativo o ambiguo). Sin el módulo Servicios: «Instala el módulo Servicios para asignar servicios a este profesional.» y el resto de la ficha funciona.
Implicados: pendiente
Pendiente de enlazar: services — el catálogo de servicios del que se elige (lectura `services.services.list`)
Pendiente de enlazar: appointments — la competencia, la duración y el precio propios del profesional al reservar una cita (APPOINTMENTS-F01, APPOINTMENTS-F12)
QA: BD-06

### STAFF-F11 Cambiar o quitar un servicio de un profesional
Estado: parcial — la pantalla no cambia los minutos ni el precio propios de un servicio ya asignado, ni lo desactiva: hay que quitarlo y volver a asignarlo (cambiar y desactivar solo existen con el asistente, o llamando a `staff.services.update` con una sesión del hub; no está en la API pública con llave)
Vertical: peluqueria
Actor: administrador, responsable
Pantalla: Personal
Pasos:
1. En la ficha, en «Servicios que realiza», pulsa la estrella del servicio («Servicio principal») para marcarlo principal: solo hay uno por persona y el anterior deja de serlo (la estrella del que ya es principal no hace nada).
2. O pulsa la cruz «Quitar servicio»: se quita al momento, sin confirmar.
3. Para cambiar los minutos o el precio propios, quita el servicio y vuelve a asignarlo (STAFF-F10): volver a asignar recupera la competencia quitada con los datos nuevos.
4. La lista se recarga.
Entra: la competencia elegida.
Sale: el cambio (`staff.service.updated` o `staff.service.removed`). El servicio principal solo ordena las listas de Personal (los elegibles de un servicio salen primero los principales); ningún otro módulo lo lee. Si al quitarlo ya nadie tiene ese servicio asignado, Citas deja que lo haga todo el equipo reservable (STAFF-F12).
Si falla: dentro de la sección «No se pudieron actualizar los servicios» o «Esa asignación de servicio no existe en este negocio.».
Implicados: pendiente
Pendiente de enlazar: appointments — al cambiar el profesional o el servicio de una cita o de una serie se vuelve a comprobar la competencia (APPOINTMENTS-F04, APPOINTMENTS-F14)
QA: ninguno

### STAFF-F12 Saber quién puede hacer un servicio
Estado: hecho
Vertical: peluqueria
Actor: sistema, asistente
Pantalla: ninguna
Pasos:
1. Quien reserva (Citas al abrir el alta de una cita, al mover una cita o al guardar una serie) pregunta qué profesionales pueden hacer un servicio.
2. Personal contesta con las personas **Activo** y **Reservable** que tienen una competencia activa para ese servicio, con su duración y su precio propios, las principales primero y luego por orden y nombre.
3. Citas filtra el selector de profesionales con esa lista y, al guardar, rechaza al profesional que no está en ella.
4. Si la lista sale vacía, Citas no restringe: acepta a cualquier profesional reservable.
Entra: el servicio (`staff.services.eligible_for_service`).
Sale: la lista, de solo lectura. Vacía quiere decir «nadie ha declarado competencias para este servicio» **o** «quien las tiene no está Activo y Reservable»: en los dos casos Citas acepta a todo el equipo reservable, incluso a quien no hace ese servicio (`appointments/handler/src/lib.rs:1983`). Es decir, desactivar o quitar de la agenda al único especialista de un servicio abre ese servicio a todos.
Si falla: si la lectura no llega, Citas rechaza la reserva y no reserva a ciegas (`appointments.catalog_unavailable`, APPOINTMENTS-F01).
Implicados: pendiente
Pendiente de enlazar: appointments — el selector de profesionales por servicio, la duración propia y el rechazo de una pareja inválida (APPOINTMENTS-F01, APPOINTMENTS-F04, APPOINTMENTS-F12, APPOINTMENTS-F14)
QA: B-02, BD-06

### STAFF-F13 Crear el horario semanal de un profesional
Estado: parcial — con más de 50 personas el selector de miembro solo ofrece las 50 primeras
Vertical: peluqueria
Actor: administrador, responsable
Pantalla: Horarios
Pasos:
1. En Personal → Horarios elige a la persona en el selector «Miembro» y pulsa el botón de añadir: se abre «Nuevo» con una semana propuesta, de Lunes a Viernes de 09:00 a 18:00 (Sábado y Domingo en «No trabaja»).
2. Pon un nombre (vacío se guarda «Horario habitual»), «Vigente desde» y «Vigente hasta» si el horario solo vale en unas fechas, marca «Por defecto» si es el habitual (viene marcado) y, día a día, marca si trabaja y escribe Inicio, Fin y, si hay pausa, Inicio descanso y Fin descanso (texto hh:mm; un día es un solo tramo con un descanso opcional).
3. Pulsa «Crear horario».
4. El horario sale en la tabla con su semana resumida en la columna «Horas».
Entra: la persona elegida y la semana tecleada.
Sale: la plantilla y sus horas (`staff.schedule.created`). Si es «Por defecto», los demás horarios de esa persona dejan de serlo en la misma operación. **Qué horario manda un día:** de los horarios activos y vigentes ese día gana el que **no** es «Por defecto» (uno con fechas, o uno sin fechas, gana siempre al habitual); entre varios, el de vigencia «desde» más reciente y luego el más nuevo; si ninguno vale ese día, la persona no tiene turno ese día y Citas no restringe por turno. Un horario con vigencia de un solo día es la forma de dar una excepción.
Si falla: dentro del panel, la primera falta: «Marca al menos un día de trabajo», «{día}: indica hora de inicio y fin», «{día}: la hora de inicio debe ser anterior a la de fin», «{día}: el descanso necesita inicio y fin (o ninguno)», «{día}: el descanso debe caer dentro del intervalo de trabajo», una hora o una fecha que no se entiende, o ««Vigente desde» tiene que ser anterior o igual a «Vigente hasta».». El servidor repite las comprobaciones: «La vigencia del horario termina antes de empezar.», «Un horario necesita al menos un día de trabajo con horas.»; otro fallo: «No se pudo crear el horario». Un turno que cruza la medianoche (fin anterior al inicio) no se admite. Con más de 50 personas, el selector de miembro solo ofrece las 50 primeras (por id).
Implicados: pendiente
Pendiente de enlazar: appointments — el turno del profesional que Citas respeta al reservar y al ofrecer horas libres (APPOINTMENTS-F01, APPOINTMENTS-F02)
QA: B-02, BD-06

### STAFF-F14 Editar un horario
Estado: hecho
Vertical: peluqueria
Actor: administrador, responsable
Pantalla: Horarios
Pasos:
1. En la fila del horario pulsa Editar (o la fila): se abre «Editar · {nombre}» con su semana cargada.
2. Cambia el nombre, la vigencia, «Por defecto» o cualquier día; un día que desmarcas queda como «No trabaja».
3. Pulsa Guardar.
4. La tabla se recarga con la semana nueva.
Entra: el horario y su semana completa; guardar **sustituye** la semana entera.
Sale: la plantilla cambiada (`staff.schedule.updated`). Si pasa a «Por defecto», los demás de esa persona dejan de serlo. Los mismos efectos sobre qué horario manda un día que al crearlo (STAFF-F13).
Si falla: dentro del panel, las mismas faltas que al crear o «No se pudo actualizar el horario»; si el horario ya no existe, «Ese horario no existe en este negocio.».
Implicados: pendiente
Pendiente de enlazar: appointments — el turno cambiado afecta a las reservas nuevas y a las horas libres (APPOINTMENTS-F02); no toca las citas ya reservadas
QA: BD-06

### STAFF-F15 Activar, desactivar o eliminar un horario
Estado: hecho
Vertical: peluqueria
Actor: administrador, responsable
Pantalla: Horarios
Pasos:
1. En la fila del horario pulsa «Activar / desactivar»: cambia al momento, sin confirmar, y la columna Activo pasa a Sí o No.
2. O pulsa «Eliminar»: el diálogo «Eliminar horario» dice «¿Eliminar el horario «{nombre}»? Sus horas dejan de contar para la disponibilidad.».
3. Pulsa Eliminar para confirmar (Cancelar lo deja como estaba).
4. El horario sale de la tabla.
Entra: el horario.
Sale: un horario inactivo no manda nunca ningún día; uno eliminado se retira con sus horas (`staff.schedule.updated` o `staff.schedule.deleted`). Si se desactiva o elimina el último horario válido de una persona, ese día deja de tener turno y Citas ya no restringe por turno (solo una ausencia aprobada lo impediría). Eliminar el «Por defecto» no hace «Por defecto» a otro.
Si falla: un aviso sobre la tabla, «No se pudo actualizar el horario» o «Ese horario no existe en este negocio.».
Implicados: pendiente
Pendiente de enlazar: appointments — sin horario válido Citas deja de restringir por turno a esa persona (APPOINTMENTS-F01, APPOINTMENTS-F02)
QA: BD-06

### STAFF-F16 Saber cuándo puede trabajar un profesional
Estado: hecho
Vertical: peluqueria
Actor: sistema, asistente
Pantalla: ninguna
Pasos:
1. Quien reserva pregunta por el día de una persona: Citas al guardar una cita (un instante), al guardar un lote y al materializar o editar una serie (los 400 días desde hoy; la consulta admite hasta 731), al mover una cita (todo el equipo en ese instante) y al ofrecer horas libres; el asistente, por un rango de fechas.
2. Personal toma el día **del negocio** (nunca el UTC; una fecha sola vale como ese día), elige el horario que manda ese día (STAFF-F13) y lo parte por el descanso.
3. Contesta con una fila del día (qué horario manda; ninguno quiere decir «sin horario»), un tramo por cada tramo de trabajo del día y una fila por cada ausencia **aprobada** que cubre ese día, de día entero o con sus horas (las mismas horas cada día del rango). La consulta por rango de fechas contesta ya el turno menos las ausencias aprobadas.
4. Quien pregunta decide: Citas rechaza una reserva que no cabe entera en un tramo o que cae sobre una ausencia aprobada; en un día sin horario no rechaza por turno.
Entra: el profesional y el día o el instante; el reloj del negocio, que inyecta el hub.
Sale: solo lectura. Una ausencia pendiente, rechazada o cancelada no cuenta. Una ficha dada de baja no tiene horario que mande (la consulta lo une con la ficha viva), pero sus ausencias aprobadas siguen saliendo en las lecturas de un día (las de Citas); la consulta por rango de fechas no devuelve nada de una ficha dada de baja.
Si falla: si la lectura no llega, Citas rechaza la reserva (`appointments.staff_hours_unavailable`) en vez de abrir la puerta (`appointments/handler/src/lib.rs:1287-1305`).
Implicados: pendiente
Pendiente de enlazar: appointments — turno y ausencias aprobadas del profesional al reservar, mover, ofrecer horas y reservar series (APPOINTMENTS-F01, APPOINTMENTS-F02, APPOINTMENTS-F04, APPOINTMENTS-F13, APPOINTMENTS-F14)
Pendiente de enlazar: whatsapp_inbox — la respuesta con huecos libres de verdad sale del mismo motor de horas libres (WHATSAPP_INBOX-F21, REC_WA_CITA-F04)
QA: B-02, BD-06, W-02
