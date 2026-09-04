-- Lado de la COMISIÓN para el cierre del día por profesional: por cada miembro activo del staff,
-- su id, nombre y tasa de comisión (`commission_rate`, % 0..100). Runtime inyecta :hub_id.
--
-- Es DATOS DE STAFF SOLAMENTE: NO conoce las ventas (viven en el módulo sales; prohibido el JOIN
-- cross-módulo, ADR-0007/contrato de módulos). El importe de comisión =
-- gross_total × (commission_rate/100) lo compone el llamador (cierre del día) cruzando ESTAS filas
-- con `sales.by_staff` por `staff_id`. Seam documentado en architecture/modules/staff.md y sales.md.
-- Se excluyen miembros terminados/inactivos (no atribuyen comisión hoy) y los de comisión 0 NO se
-- filtran (aparecen con rate 0 para que el cierre los liste igual).
--
-- LA MISMA PERSONA LLEGA POR DOS IDS (staff#46). Desde sales#179 ninguna venta queda sin atribuir:
-- `sales_sale.staff_id` es el `staff_member` que nombra la cita, o el **usuario del hub** de la
-- sesión en toda venta de mostrador. Es una referencia OPACA a una persona, no a una ficha. Por eso
-- la hoja publica junto al `staff_id` el `user_id` del que cuelga la ficha (la costura del ADR-0192,
-- opcional): son los DOS ids bajo los que puede llegar el día de un mismo profesional, y con ellos
-- el cierre los suma como uno solo sin que `staff` lea una venta ni `sales` sepa qué es una ficha.
-- Sin ese segundo id, la mitad de mostrador no casaba con ninguna tasa y el día se pagaba a medias.
-- `user_id` NULL = ficha sin usuario del Hub: no hay nada que unificar (comportamiento de siempre).
SELECT
    m.id                                       AS staff_id,
    m.user_id                                  AS user_id,
    (m.first_name || ' ' || m.last_name)       AS full_name,
    m.role_id,
    r.name                                     AS role_name,
    m.commission_rate                          AS commission_rate
FROM staff_member m
LEFT JOIN staff_role r ON r.id = m.role_id AND r.is_deleted = 0 AND r.hub_id = :hub_id
WHERE m.hub_id = :hub_id
  AND m.is_deleted = 0
  AND m.status NOT IN ('terminated', 'inactive')
ORDER BY full_name ASC;
