# WORKFLOW — Personal · Comisión, ajustes y paneles

Prefijo: STAFF

## Flujos

### STAFF-F21 Dar la comisión de cada profesional
Estado: parcial — Personal guarda y publica la tasa, pero ninguna pantalla ni cierre la cruza con las ventas: fuera de los tests nadie llama a la consulta de comisiones
Vertical: comun
Actor: sistema, asistente
Pantalla: ninguna
Pasos:
1. Quien edita la ficha escribe la «Comisión (%)» de la persona, de 0 a 100; sin permiso de ver compensación el campo no sale (STAFF-F02).
2. Con permiso de ver compensación, el asistente o la API piden la hoja de comisiones.
3. Personal contesta, por cada persona **Activo** o **De baja** (no las Inactivo ni las dadas de baja), el identificador de su ficha, el de su cuenta del hub (vacío si no tiene), su nombre, su rol y su tasa; las de tasa 0 salen también.
4. El importe del día (total vendido × tasa ÷ 100) lo tiene que componer quien cierra el día cruzando la hoja con las ventas por profesional de Ventas (SALES-F28); hoy ninguna pantalla ni módulo lo hace (ni Ventas ni Caja, que no tiene cierre por profesional), y el asistente solo tiene las dos consultas con esa indicación.
Entra: la tasa de cada ficha; no lee ventas.
Sale: solo lectura. Una persona puede aparecer en las ventas bajo dos identificadores (el de su ficha, si la venta nace de una cita, o el de su cuenta del hub, si la cobra en el mostrador): por eso la hoja da los dos y quien suma los junta antes de aplicar la tasa (STAFF-F03). Sin cuenta vinculada, lo cobrado en el mostrador no cuenta para su comisión.
Si falla: sin permiso de ver compensación, la consulta se rechaza.
Implicados: SALES-F16, SALES-F28, REC_PELUQUERIA-F15
QA: B-08 (discrepa)

### STAFF-F22 Cambiar los ajustes de Personal
Estado: parcial — los once ajustes se guardan y ningún módulo los lee; el formulario de horario no usa la jornada por defecto
Vertical: comun
Actor: administrador
Pantalla: Ajustes de Personal
Pasos:
1. En Personal abre la pestaña Ajustes (la ven el administrador y el responsable, que tienen el permiso de ajustes; solo el administrador puede cambiarla desde la pantalla, HUB_SHELL-F43, hub#2588).
2. Cambia los campos: jornada (inicio y fin en HH:MM), «Duración del descanso (minutos)» de 0 a 480, «Antelación mínima de reserva (horas)» de 0 a 168, «Horas máximas por día» de 1 a 24, «Umbral de horas extra (horas/semana)» de 1 a 168, y los interruptores de fotos, biografía, elegir profesional y avisos.
3. Pulsa Guardar.
4. Sale «Ajustes guardados.».
Entra: los valores del formulario; mientras el negocio no tiene fila de ajustes, el formulario enseña los valores propuestos como si estuvieran guardados.
Sale: la fila de ajustes del negocio, que se crea en el primer guardado (`staff.settings.updated`); las horas se guardan siempre en HH:MM. Nada más cambia: ni Personal, ni Citas, ni el TPV, ni el hub leen ninguno de los once. «Permitir elegir profesional» no es el ajuste del mismo nombre de la reserva online, que es suyo, y la antelación mínima de reserva que cuenta es la de Citas.
Si falla: «No se pudieron guardar los ajustes.» o «Revisa los campos marcados y vuelve a guardar.» con «Este valor no se admite.» en el campo.
Implicados: ninguno
QA: ninguno

### STAFF-F23 Ver la plantilla por rol en el inicio
Estado: hecho
Vertical: comun
Actor: administrador, responsable, empleado
Pantalla: Paneles del inicio
Pasos:
1. En el inicio del hub, «Plantilla activa» («Empleados activos») sale activo por defecto; «Empleados por rol» no viene activo por defecto (cómo se activa desde el inicio: sin confirmar).
2. «Plantilla activa» da cuántas personas tienen el estado **Activo**, sean o no reservables; no cuenta las Inactivo, las De baja ni las dadas de baja.
3. «Empleados por rol» dibuja una barra por rol con las personas **Activo** que lo llevan, con el color del rol, hasta 10 roles.
4. «Plantilla activa» se refresca con altas, desactivaciones y bajas; «Empleados por rol», además, con roles nuevos. Ninguno se refresca al editar una ficha (cambiar Estado o Rol desde Editar).
Entra: las fichas y los roles.
Sale: solo lectura. Qué 10 roles salen cuando hay más: los primeros que devuelve la lista de roles (por nombre); si el panel los reordena por tamaño: sin confirmar.
Si falla: sin personas o sin roles, el panel sale vacío o en 0; cómo pinta el inicio un fallo de lectura: sin confirmar.
Implicados: ninguno
QA: ninguno
