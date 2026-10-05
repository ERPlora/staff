# WORKFLOW — Personal · Fichas, roles y baja

Prefijo: STAFF

## Flujos

### STAFF-F01 Dar de alta a un profesional
Estado: parcial — el «Margen entre citas (min)» que se teclea al dar de alta no se guarda: el alta no lo envía (solo la edición, STAFF-F02)
Vertical: comun
Actor: administrador, responsable
Pantalla: Personal
Pasos:
1. En Personal → Personal, pulsa el botón de añadir de la tabla: se abre el panel «Nuevo» (sin la sección de servicios ni el Estado: la persona nace **Activo**).
2. Escribe Nombre y Apellidos (sin los dos, el botón Guardar queda apagado). Si quieres, Email, Teléfono, Nº de empleado, el Rol (por defecto «Sin rol»), el Usuario del Hub (por defecto «Sin acceso al Hub», ver STAFF-F03), Fecha de alta, Color, Especialidades y Bio; **Reservable** viene encendido. Quien puede ver compensación (administrador y responsable) ve además Tarifa por hora y Comisión (%); quien no puede, no los ve y no se envían.
3. Pulsa Guardar.
4. El panel se cierra y la persona sale en la tabla como **Activo**. Los servicios que hace se asignan después, abriendo su ficha (STAFF-F10).
Entra: los datos del formulario; los roles de Roles (STAFF-F04); las cuentas activas del hub (lectura `hub.users.list`). La tarifa se teclea en la moneda del hub y se guarda en céntimos enteros; la comisión es un número de 0 a 100.
Sale: la ficha (`staff.member.created`), que refresca los paneles de plantilla; no crea cuenta de acceso ni avisa a nadie. No avisa de otra ficha con el mismo nombre, email o nº de empleado.
Si falla: el motivo sale dentro del panel y lo tecleado se conserva: «Ese rol no está disponible: no existe en este negocio, o se ha eliminado o retirado.», la cuenta ya vinculada a otra ficha (STAFF-F03), o una tarifa que no se lee como importe («Esto no es un importe. Escribe una cifra, por ejemplo 12,50.»), negativa («Este importe no puede ser negativo.») o ambigua. Una fecha de alta que no se lee como fecha se rechaza («Hay una fecha que no se entiende — escríbela como dd/mm/aaaa (p. ej. 05/10/2026).»). Texto de la negativa del servidor ante una sesión sin permiso: sin confirmar.
Implicados: pendiente
Pendiente de enlazar: hub — la pantalla Empleados del hub, donde se crea la cuenta de acceso que luego se vincula
QA: ninguno

### STAFF-F02 Editar la ficha de un profesional
Estado: parcial — la fecha de alta, una vez puesta, no se puede borrar desde la pantalla (se manda como «sin cambio»), y el «Margen entre citas (min)» se guarda pero Citas no lo aplica
Vertical: comun
Actor: administrador, responsable
Pantalla: Personal
Pasos:
1. En la tabla pulsa la fila o su acción Editar: se abre «Editar · {nombre}» (la dirección pasa a llevar `?member=<id>` y abrirla así abre esa ficha).
2. Cambia lo que haga falta. **Estado** ofrece Activo, Inactivo y De baja (no la baja definitiva, STAFF-F06); **Reservable** y **Margen entre citas (min)** gobiernan la agenda; el Rol «Sin rol» lo quita y «Sin acceso al Hub» desvincula la cuenta (STAFF-F03). La compensación solo se ve y solo viaja con permiso de verla.
3. Pulsa Guardar: se envía la ficha completa tal como la ves.
4. El panel se cierra y la tabla se recarga; la tarifa de la columna se refresca.
Entra: la ficha (lectura `staff.members.get`) y, con permiso, su tarifa y comisión (`staff.members.compensation`).
Sale: la ficha cambiada (`staff.member.updated`). Poner **Inactivo** desde aquí no apaga Reservable ni mira las ausencias (eso solo lo hace Desactivar, STAFF-F05), y volver a **Activo** no vuelve a encender Reservable: hay que encenderlo a mano. Citas solo acepta a quien está Activo y Reservable. Las «Especialidades», la «Bio» y el «Color» se guardan, pero Citas no las lee.
Si falla: dentro del panel, «No se ha podido actualizar el miembro: no existe en este negocio, o el rol elegido no existe.» (también si la ficha ya se dio de baja), el rol retirado o la cuenta ya vinculada. Si la ficha no carga: «No se pudo cargar la ficha». Cerrar el panel mientras carga descarta la respuesta tardía.
Implicados: APPOINTMENTS-F01
QA: ninguno

### STAFF-F03 Vincular la ficha con una cuenta del hub
Estado: hecho
Vertical: comun
Actor: administrador, responsable
Pantalla: Personal
Pasos:
1. En el formulario de alta o de edición abre «Usuario del Hub»: salen «Sin acceso al Hub» y las cuentas **activas** del hub (una cuenta dada de baja no se ofrece); nadie viene preseleccionado.
2. Elige la cuenta de esa persona, o «Sin acceso al Hub» para desvincular.
3. Pulsa Guardar.
4. La ficha queda unida a esa cuenta; mientras no haya cuenta elegida el formulario avisa «Sin usuario del Hub, las ventas de mostrador se atribuyen a quien tenga la sesión y no le contarán para su comisión.».
Entra: la lista de cuentas del hub (solo identificador, nombre y rol; sin email ni forma de acceso).
Sale: el vínculo, y con él los dos identificadores bajo los que aparece una persona (el de la ficha y el de su cuenta), que Personal publica junto a la comisión (STAFF-F21) y que el TPV pliega en una sola fila al elegir quién atiende. No cambia ningún permiso: los da el rol de la cuenta, no la ficha ni su rol de Personal. Dar de baja la ficha libera la cuenta (STAFF-F06); desactivar o dar de baja la cuenta en el hub no toca la ficha.
Si falla: «Ese usuario del Hub ya está vinculado a {nombre}. Un usuario del Hub solo puede pertenecer a un miembro del equipo: desvincúlalo allí primero o elige otro usuario.», con el nombre de la ficha que la tiene. Si dos personas la vinculan a la vez, a la segunda le sale ese mismo mensaje (un índice único lo garantiza). Si la lista de cuentas no se puede leer, el selector queda solo con «Sin acceso al Hub»: en un alta la ficha se guarda sin vínculo.
Implicados: SALES-F16
Pendiente de enlazar: hub — la pantalla Empleados del hub, que es dueña de las cuentas, su rol de permisos y el PIN
QA: ninguno

### STAFF-F04 Crear un rol de catálogo
Estado: parcial — un rol solo se puede crear: ni la pantalla ni la API lo editan, lo retiran, lo borran ni lo ordenan
Vertical: comun
Actor: administrador, responsable
Pantalla: Roles
Pasos:
1. En Personal → Roles pulsa el botón de añadir: se abre «Nuevo».
2. Escribe el «Nombre del rol» (obligatorio; sin él Guardar queda apagado) y, si quieres, Descripción y Color (texto libre, marcador «Color (#RRGGBB)»).
3. Pulsa Guardar.
4. El rol sale en la tabla con 0 Miembros y ya se puede elegir en el Rol de una ficha.
Entra: nombre, descripción y color tecleados; la pantalla guarda siempre el orden 0; el asistente puede darle otro al crear, pero ninguna lista ordena los roles por él.
Sale: el rol (`staff.role.created`) y el panel «Empleados por rol». Un rol es una etiqueta de catálogo, **no concede permisos** (los da el rol de la cuenta del hub). «Miembros» cuenta solo las personas **Activo** con ese rol. No avisa de un nombre repetido.
Si falla: dentro del panel sale el texto del servidor tal cual, sin traducir códigos (la pantalla de Roles muestra el mensaje de error del servidor); el aviso de error de esa pantalla no pasa por el catálogo de errores del módulo.
Implicados: ninguno
QA: ninguno

### STAFF-F05 Desactivar a un profesional
Estado: hecho
Vertical: comun
Actor: administrador
Pantalla: Personal
Pasos:
1. En la fila de una persona **Activo** o **De baja** pulsa Desactivar (solo la ve quien puede borrar; en otros estados sale en gris).
2. El diálogo «Desactivar profesional» pregunta «¿Sacar a {nombre} de la agenda? Deja de ser reservable; no se borra nada.».
3. Pulsa Desactivar.
4. La fila pasa a **Inactivo** y deja de ser reservable.
Entra: la ficha y sus ausencias pendientes o aprobadas cuya fecha de fin no ha pasado (el «hoy» es el día del negocio).
Sale: estado Inactivo y Reservable apagado (`staff.member.deactivated`). No toca sus horarios, servicios, ausencias, cuenta del hub ni las citas ya reservadas. Para volver: Editar, Estado Activo y encender Reservable (STAFF-F02).
Si falla: un aviso sobre la tabla: «Ese miembro tiene ausencias pendientes o aprobadas que aún no han terminado. Resuélvelas primero.» (una pendiente se rechaza en STAFF-F18; una aprobada solo se anula con el asistente, STAFF-F19). Si un responsable, que no tiene este permiso, puede pedirlo con aprobación por PIN: sin confirmar «Ese miembro del personal ya está inactivo.» si ya lo estaba, o «Ese miembro del personal no existe en este negocio.» si la ficha ya se dio de baja o es de otro negocio.
Implicados: APPOINTMENTS-F01, APPOINTMENTS-F04
QA: ninguno

### STAFF-F06 Dar de baja a un profesional
Estado: hecho
Vertical: comun
Actor: administrador
Pantalla: Personal
Pasos:
1. En la fila de la persona pulsa Dar de baja (solo la ve quien puede borrar).
2. El diálogo «Dar de baja» pregunta «¿Dar de baja a {nombre}? Su ficha se cierra y sus horarios y ausencias futuras dejan de contar.» y pide «Último día (hoy si se deja vacío)» y «Motivo (opcional)» (hasta 500 caracteres).
3. Pulsa Dar de baja.
4. La persona desaparece de la tabla y del directorio (la baja definitiva se guarda con su fecha y motivo, pero ninguna pantalla enseña las fichas dadas de baja).
Entra: la fecha (se acepta cualquiera; vacía, hoy en el día del negocio) y el motivo.
Sale: la ficha queda en baja definitiva, sin Reservable y borrada, con su fecha y motivo (`staff.member.terminated`); libera su cuenta del hub. Es irreversible desde el producto: una ficha dada de baja no se edita ni se reabre. No mira sus ausencias ni sus citas, no se rechaza por una ausencia viva y se puede dar de baja a quien ya estaba Inactivo. Sus horarios y ausencias no se tocan: sus horarios dejan de gobernar la disponibilidad y sus ausencias dejan de salir en la lista y en «Ausentes hoy», pero «Ausencias pendientes» las sigue contando. Personal no toca las citas ni las ventas anteriores de esa persona.
Si falla: un aviso sobre la tabla; si la ficha ya estaba dada de baja o es de otro negocio, «Ese miembro del personal no existe en este negocio.»; otro fallo: «No se pudo cambiar el estado del profesional».
Implicados: APPOINTMENTS-F01, APPOINTMENTS-F04
QA: ninguno

### STAFF-F07 Dar de alta a varios profesionales de golpe
Estado: parcial — sin pantalla de importación (solo el asistente); una fila con nombre vacío, tarifa negativa o un campo de más tumba el lote entero, y las filas pasadas de la 100 se descartan sin constar entre las omitidas
Vertical: comun
Actor: asistente
Pantalla: asistente
Pasos:
1. Quien tiene permiso de alta pide al asistente que dé de alta a varias personas con sus nombres (y, si quiere, email, teléfono, rol, fecha de alta, tarifa, reservable, bio y especialidades).
2. El asistente envía el lote (hasta 100 filas por llamada).
3. Se crea una ficha **Activo** por cada fila válida.
4. La respuesta dice cuántas se crearon y cuáles se omitieron con su motivo (nombre de solo espacios, rol que no es de este negocio o retirado, o fecha de alta mal formada; si el servidor ya rechaza antes una fecha mal formada: sin confirmar).
Entra: las filas del lote; los roles activos del negocio. Una fila no lleva cuenta del hub, comisión ni color.
Sale: una ficha por fila válida y un solo aviso de ficha creada para todo el lote.
Si falla: el servidor valida el esquema antes del código del módulo, así que una fila con nombre vacío, con tarifa negativa o no entera, o con un campo que el alta en lote no admite (por ejemplo cuenta del hub o color) rechaza el lote entero sin crear a nadie. Solo un nombre de solo espacios, un rol que no es de este negocio o retirado, o una fecha mal formada (si el esquema no la rechaza antes) omiten esa fila y las demás entran. Las filas pasadas de la 100 no se crean ni se listan como omitidas. Si se omiten todas, no se crea ninguna ficha pero el aviso de ficha creada sale igualmente.
Implicados: ninguno
QA: ninguno

### STAFF-F08 Ver mi propia ficha y mis ausencias
Estado: parcial — sin pantalla propia: solo el asistente o la API con llave; el empleado no puede registrar una ausencia suya (STAFF-F17)
Vertical: comun
Actor: empleado, asistente
Pantalla: asistente
Pasos:
1. Un empleado con cuenta vinculada a su ficha (STAFF-F03) pregunta al asistente por sus datos o sus ausencias.
2. El asistente lee solo lo suyo: la ficha de la cuenta de la sesión y sus ausencias.
3. Responde con ellos.
4. Sin ficha vinculada, la respuesta viene vacía.
Entra: la cuenta de la sesión (el hub la inyecta; no se puede falsificar) y el permiso de ver el equipo o ver ausencias, que tiene todo empleado.
Sale: su ficha con **su propia** tarifa y comisión (sin las notas de RRHH) y sus ausencias con motivo y notas (lo que escribió). Nada cambia.
Si falla: sin ficha o sin ausencias, la respuesta viene vacía (`staff.members.mine`, `staff.time_off.mine`).
Implicados: ninguno
QA: ninguno

### STAFF-F09 Dar el equipo a otros módulos
Estado: hecho
Vertical: comun
Actor: sistema, empleado
Pantalla: ninguna
Pasos:
1. Un módulo que necesita nombrar al equipo (el TPV en «Atiende», la cocina al nombrar a quien dispara una comanda, Citas al listar profesionales, el propio hub al imprimir la comanda) pide el directorio.
2. Personal contesta solo si la sesión puede ver el equipo: lo pueden administrador, responsable, empleado y cajero.
3. Recibe, por persona, nombre, email, teléfono, rol, cuenta del hub, estado, reservable, fecha de alta, color y orden, nunca la tarifa ni la comisión; sin pedir un número de filas llegan 50 por página (Citas pide 500 y el TPV pide todas las páginas).
4. El otro módulo pinta lo que le toca: el TPV ofrece a quien no está Inactivo (los dados de baja ya no salen).
Entra: nada; es una lectura.
Sale: el directorio de fichas vivas, incluidas las Inactivo y De baja; no escribe nada. El asistente de WhatsApp recibe este directorio y las cabeceras de horario de cada persona (nombre, vigencia, activo; no las horas, que da `staff.schedules.hours_for_member`, STAFF-F16).
Si falla: cada módulo lo trata a su manera (el TPV sigue cobrando con la sesión). Sin Personal instalado, el TPV ofrece solo las cuentas del hub, porque lo lee como integración opcional.
Implicados: APPOINTMENTS-F01, APPOINTMENTS-F12, KITCHEN-F10, SALES-F16, WHATSAPP_INBOX-F21, REC_WA_CITA-F04
Pendiente de enlazar: hub — el shell lee el directorio para imprimir la comanda con el nombre de quien atiende
QA: ninguno
