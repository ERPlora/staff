//! Handler WASM (Tier 2) del módulo `staff` — lógica de WASM-TODO.md §1-§4.
//!
//! Lógica pura, sin BD: cada función recibe `{payload, context}`, valida lo que es
//! computable con el propio payload y devuelve **intenciones** (commands del propio
//! módulo) que el host valida y ejecuta en UNA transacción. Los eventos declarados
//! (`emit` del manifest) los persiste el host; el guest no los duplica.
//!
//! Restricciones del runtime actual (sin lecturas pre-cargadas — patrón
//! `payment_gateways`/`kitchen`): los invariantes que dependen del estado de la BD
//! van EN EL SQL condicional de la intención (no-op de 0 filas si no se cumplen):
//! * `deactivate_staff_member` → `_deactivate_member` guarda estado (`active`/`on_leave`)
//!   y bloquea si hay ausencias `pending|approved` con `end_date >= hoy` (NOT EXISTS).
//! * `create_time_off` → `_insert_time_off` solo inserta si NO hay solapamiento con
//!   otra ausencia `pending|approved` del miembro (regla legacy `conflicts_with`).
//! * `create_schedule` → `_insert_schedule`/`_insert_working_hours` condicionados a
//!   que el miembro/horario exista; `_unset_default_schedules` desmarca otros default.
//!
//! Ids: el host pasa `context.new_ids` (autoridad de ids); el guest solo los reparte.
//! La fecha de hoy se deriva de `context.now` (RFC3339 del host, no falsificable).

use erplora_guest_sdk::money;
use erplora_guest_sdk::{Operation, Output};
use serde_json::{json, Map, Value};

#[cfg(feature = "guest")]
use extism_pdk::*;

// ── Exports WASM ───────────────────────────────────────────────────────────

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn deactivate_staff_member(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    to_fn_result(deactivate_staff_member_pure(input.into_inner().into_value()))
}

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn bulk_create_staff_members(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    to_fn_result(bulk_create_staff_members_pure(input.into_inner().into_value()))
}

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn create_schedule(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    to_fn_result(create_schedule_pure(input.into_inner().into_value()))
}

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn create_time_off(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    to_fn_result(create_time_off_pure(input.into_inner().into_value()))
}

#[cfg(feature = "guest")]
fn to_fn_result(r: Result<Output, String>) -> FnResult<Json<Output>> {
    match r {
        Ok(out) => Ok(Json(out)),
        Err(e) => Err(Error::msg(e).into()),
    }
}

// ── Helpers ────────────────────────────────────────────────────────────────

/// Lote máximo de altas (cap legacy de `StaffService.bulk_create_staff_members`).
const MAX_BULK: usize = 100;

fn as_str(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        Value::Number(n) => n.to_string(),
        Value::Bool(b) => b.to_string(),
        _ => String::new(),
    }
}

fn as_f64(v: &Value, d: f64) -> f64 {
    match v {
        Value::Number(n) => n.as_f64().unwrap_or(d),
        Value::String(s) => s.trim().parse::<f64>().unwrap_or(d),
        _ => d,
    }
}

fn as_i01(v: &Value, d: i64) -> i64 {
    let n = match v {
        Value::Number(n) => n.as_i64().unwrap_or(d),
        Value::Bool(b) => *b as i64,
        Value::String(s) => s.trim().parse::<i64>().unwrap_or(d),
        _ => d,
    };
    if n != 0 { 1 } else { 0 }
}

fn str_or(p: &Value, k: &str, d: &str) -> String {
    let s = as_str(p.get(k).unwrap_or(&Value::Null));
    if s.is_empty() { d.to_string() } else { s }
}

fn opt_str(p: &Value, k: &str) -> Value {
    match p.get(k) {
        Some(Value::Null) | None => Value::Null,
        Some(v) => {
            let s = as_str(v);
            if s.is_empty() { Value::Null } else { Value::String(s) }
        }
    }
}

fn payload_context(input: &Value) -> (Value, Vec<Value>, String) {
    let payload = input.get("payload").cloned().unwrap_or(Value::Null);
    let new_ids = input
        .get("context")
        .and_then(|c| c.get("new_ids"))
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let now = input
        .get("context")
        .and_then(|c| c.get("now"))
        .map(as_str)
        .unwrap_or_default();
    (payload, new_ids, now)
}

/// `2026-06-10T22:00:00+00:00` → `2026-06-10` (la fecha de hoy es capacidad del host).
fn today_from_now(now: &str) -> String {
    now.split('T').next().unwrap_or("").to_string()
}

/// Valida forma ISO `YYYY-MM-DD` (suficiente para comparar lexicográficamente).
fn is_iso_date(s: &str) -> bool {
    let b = s.as_bytes();
    if b.len() != 10 || b[4] != b'-' || b[7] != b'-' {
        return false;
    }
    if !s.chars().enumerate().all(|(i, c)| matches!(i, 4 | 7) || c.is_ascii_digit()) {
        return false;
    }
    let month: u32 = s[5..7].parse().unwrap_or(0);
    let day: u32 = s[8..10].parse().unwrap_or(0);
    (1..=12).contains(&month) && (1..=31).contains(&day)
}

/// Normaliza `HH:MM`/`HH:MM:SS` → `HH:MM:SS`; `None` si la forma no es válida.
fn norm_time(s: &str) -> Option<String> {
    let valid_hm = |h: &str, m: &str| {
        h.len() == 2
            && m.len() == 2
            && h.parse::<u32>().map(|v| v < 24).unwrap_or(false)
            && m.parse::<u32>().map(|v| v < 60).unwrap_or(false)
    };
    let parts: Vec<&str> = s.split(':').collect();
    match parts.as_slice() {
        [h, m] if valid_hm(h, m) => Some(format!("{h}:{m}:00")),
        [h, m, sec]
            if valid_hm(h, m)
                && sec.len() == 2
                && sec.parse::<u32>().map(|v| v < 60).unwrap_or(false) =>
        {
            Some(s.to_string())
        }
        _ => None,
    }
}

// ── §1 deactivate_staff_member ─────────────────────────────────────────────

/// Desactiva (≠ terminar) un miembro. Guardas de estado e invariante de ausencias
/// activas resueltos en el SQL condicional de `staff._deactivate_member` (el guest
/// no puede leer la BD): si el miembro no existe, ya está inactive/terminated o
/// tiene ausencias `pending|approved` vigentes, la operación es un no-op.
pub fn deactivate_staff_member_pure(input: Value) -> Result<Output, String> {
    let (payload, _ids, now) = payload_context(&input);
    let staff_id = as_str(payload.get("staff_id").unwrap_or(&Value::Null));
    if staff_id.is_empty() {
        return Err("staff_id requerido".into());
    }
    let mut p = Map::new();
    p.insert("staff_id".into(), json!(staff_id));
    p.insert("today".into(), json!(today_from_now(&now)));
    Ok(Output {
        operations: vec![Operation::sql("staff._deactivate_member", p)],
        events: vec![],
    })
}

// ── §2 bulk_create_staff_members ───────────────────────────────────────────

/// Alta en lote tolerante a fallos por fila: las filas inválidas (sin first_name/
/// last_name o con hire_date mal formada) se saltan, el resto se inserta reusando
/// el command SQL público `staff.members.create` (el host inyecta `:new_id` por op).
pub fn bulk_create_staff_members_pure(input: Value) -> Result<Output, String> {
    let (payload, _ids, _now) = payload_context(&input);
    let empty: Vec<Value> = Vec::new();
    let members = payload.get("members").and_then(|v| v.as_array()).unwrap_or(&empty);

    let mut ops: Vec<Operation> = Vec::new();
    for item in members.iter().take(MAX_BULK) {
        let first_name = as_str(item.get("first_name").unwrap_or(&Value::Null));
        let last_name = as_str(item.get("last_name").unwrap_or(&Value::Null));
        if first_name.trim().is_empty() || last_name.trim().is_empty() {
            continue; // fila inválida: se omite, el lote sigue (tolerante por fila)
        }
        // hire_date: ISO YYYY-MM-DD o vacío → NULL; mal formada → fila omitida.
        let hire_date = match item.get("hire_date") {
            Some(Value::Null) | None => Value::Null,
            Some(v) => {
                let s = as_str(v);
                if s.is_empty() {
                    Value::Null
                } else if is_iso_date(&s) {
                    Value::String(s)
                } else {
                    continue;
                }
            }
        };
        // hourly_rate es DINERO (céntimos/hora, ADR-0123): entero i64 vía SDK, nunca f64.
        let hourly_rate = item.get("hourly_rate").map(|v| money::from_json(v, 0)).unwrap_or(0);

        let mut p = Map::new();
        p.insert("first_name".into(), json!(first_name.trim()));
        p.insert("last_name".into(), json!(last_name.trim()));
        p.insert("email".into(), json!(str_or(item, "email", "")));
        p.insert("phone".into(), json!(str_or(item, "phone", "")));
        p.insert("employee_id".into(), json!(""));
        p.insert("role_id".into(), opt_str(item, "role_id"));
        p.insert("hire_date".into(), hire_date);
        p.insert("status".into(), json!("active"));
        p.insert("bio".into(), json!(str_or(item, "bio", "")));
        p.insert("specialties".into(), json!(str_or(item, "specialties", "")));
        p.insert(
            "is_bookable".into(),
            json!(item.get("is_bookable").map(|v| as_i01(v, 1)).unwrap_or(1)),
        );
        p.insert("color".into(), json!(""));
        p.insert("hourly_rate".into(), json!(hourly_rate.max(0))); // céntimos (INTEGER)
        p.insert("commission_rate".into(), json!(0));
        p.insert("notes".into(), json!(""));
        ops.push(Operation::sql("staff.members.create", p));
    }
    Ok(Output { operations: ops, events: vec![] })
}

// ── §3 create_schedule ─────────────────────────────────────────────────────

/// Crea horario + N working_hours (multi-tabla atómica, todo-o-nada en la tx del
/// host). Si el nuevo es default, desmarca los demás del miembro. Valida en el
/// guest: day_of_week 0..6 sin duplicados, start < end y break dentro del intervalo.
pub fn create_schedule_pure(input: Value) -> Result<Output, String> {
    let (payload, new_ids, _now) = payload_context(&input);
    let staff_id = as_str(payload.get("staff_id").unwrap_or(&Value::Null));
    if staff_id.is_empty() {
        return Err("staff_id requerido".into());
    }
    let schedule_id = new_ids.first().map(as_str).unwrap_or_default();
    if schedule_id.is_empty() {
        return Err("context.new_ids vacío (el host es la autoridad de ids)".into());
    }
    let is_default = payload.get("is_default").map(|v| as_i01(v, 1)).unwrap_or(1);

    for k in ["effective_from", "effective_until"] {
        if let Some(Value::String(s)) = payload.get(k) {
            if !s.is_empty() && !is_iso_date(s) {
                return Err(format!("{k} debe ser fecha ISO YYYY-MM-DD"));
            }
        }
    }

    let empty: Vec<Value> = Vec::new();
    let hours = payload.get("working_hours").and_then(|v| v.as_array()).unwrap_or(&empty);
    let mut seen_days: Vec<i64> = Vec::new();
    let mut wh_params: Vec<Map<String, Value>> = Vec::new();
    for (i, wh) in hours.iter().enumerate() {
        let day = match wh.get("day_of_week") {
            Some(Value::Number(n)) => n.as_i64().unwrap_or(-1),
            Some(Value::String(s)) => s.trim().parse::<i64>().unwrap_or(-1),
            _ => -1,
        };
        if !(0..=6).contains(&day) {
            return Err(format!("working_hours[{i}]: day_of_week debe estar en 0..6"));
        }
        if seen_days.contains(&day) {
            return Err(format!("working_hours[{i}]: day_of_week {day} duplicado"));
        }
        seen_days.push(day);

        let start = norm_time(&str_or(wh, "start_time", "09:00:00"))
            .ok_or(format!("working_hours[{i}]: start_time inválida"))?;
        let end = norm_time(&str_or(wh, "end_time", "18:00:00"))
            .ok_or(format!("working_hours[{i}]: end_time inválida"))?;
        if start >= end {
            return Err(format!("working_hours[{i}]: start_time debe ser < end_time"));
        }
        // Break: ambos extremos o ninguno; si hay, dentro del intervalo de trabajo.
        let b_start = opt_str(wh, "break_start");
        let b_end = opt_str(wh, "break_end");
        let (b_start, b_end) = match (&b_start, &b_end) {
            (Value::Null, Value::Null) => (Value::Null, Value::Null),
            (Value::String(bs), Value::String(be)) => {
                let bs = norm_time(bs).ok_or(format!("working_hours[{i}]: break_start inválida"))?;
                let be = norm_time(be).ok_or(format!("working_hours[{i}]: break_end inválida"))?;
                if !(start <= bs && bs < be && be <= end) {
                    return Err(format!(
                        "working_hours[{i}]: el break debe caer dentro del intervalo de trabajo"
                    ));
                }
                (json!(bs), json!(be))
            }
            _ => {
                return Err(format!(
                    "working_hours[{i}]: break_start y break_end van juntos (ambos o ninguno)"
                ))
            }
        };

        let wh_id = new_ids.get(i + 1).map(as_str).unwrap_or_default();
        if wh_id.is_empty() {
            return Err("context.new_ids insuficiente para las working_hours".into());
        }
        let mut p = Map::new();
        p.insert("wh_id".into(), json!(wh_id));
        p.insert("schedule_id".into(), json!(schedule_id));
        p.insert("day_of_week".into(), json!(day));
        p.insert("start_time".into(), json!(start));
        p.insert("end_time".into(), json!(end));
        p.insert("break_start".into(), b_start);
        p.insert("break_end".into(), b_end);
        p.insert("is_working".into(), json!(wh.get("is_working").map(|v| as_i01(v, 1)).unwrap_or(1)));
        wh_params.push(p);
    }

    let mut ops: Vec<Operation> = Vec::new();
    if is_default == 1 {
        // Solo un horario default por miembro: desmarca los demás antes de insertar.
        let mut p = Map::new();
        p.insert("staff_id".into(), json!(staff_id));
        ops.push(Operation::sql("staff._unset_default_schedules", p));
    }
    let mut sp = Map::new();
    sp.insert("schedule_id".into(), json!(schedule_id));
    sp.insert("staff_id".into(), json!(staff_id));
    sp.insert("name".into(), json!(str_or(&payload, "name", "Default Schedule")));
    sp.insert("is_default".into(), json!(is_default));
    sp.insert("effective_from".into(), opt_str(&payload, "effective_from"));
    sp.insert("effective_until".into(), opt_str(&payload, "effective_until"));
    ops.push(Operation::sql("staff._insert_schedule", sp));
    for p in wh_params {
        ops.push(Operation::sql("staff._insert_working_hours", p));
    }
    Ok(Output { operations: ops, events: vec![] })
}

// ── §4 create_time_off ─────────────────────────────────────────────────────

/// Crea una ausencia `pending`. Valida en el guest: fechas ISO con
/// `start_date <= end_date`, `leave_type` del enum y coherencia de horas si no es
/// full-day. El invariante de solapamiento con ausencias `pending|approved` va en
/// el SQL condicional de `staff._insert_time_off` (NOT EXISTS, regla legacy
/// `conflicts_with`): si solapa, la operación es un no-op.
pub fn create_time_off_pure(input: Value) -> Result<Output, String> {
    let (payload, new_ids, _now) = payload_context(&input);
    let staff_id = as_str(payload.get("staff_id").unwrap_or(&Value::Null));
    if staff_id.is_empty() {
        return Err("staff_id requerido".into());
    }
    let time_off_id = new_ids.first().map(as_str).unwrap_or_default();
    if time_off_id.is_empty() {
        return Err("context.new_ids vacío (el host es la autoridad de ids)".into());
    }

    let start_date = as_str(payload.get("start_date").unwrap_or(&Value::Null));
    let end_date = as_str(payload.get("end_date").unwrap_or(&Value::Null));
    if !is_iso_date(&start_date) || !is_iso_date(&end_date) {
        return Err("start_date y end_date deben ser fechas ISO YYYY-MM-DD".into());
    }
    if start_date > end_date {
        return Err("start_date debe ser <= end_date".into());
    }
    let leave_type = str_or(&payload, "leave_type", "vacation");
    if !matches!(leave_type.as_str(), "vacation" | "sick" | "personal" | "training" | "other") {
        return Err(format!("leave_type inválido: {leave_type}"));
    }

    let is_full_day = payload.get("is_full_day").map(|v| as_i01(v, 1)).unwrap_or(1);
    let (start_time, end_time) = if is_full_day == 1 {
        (Value::Null, Value::Null)
    } else {
        let st = norm_time(&as_str(payload.get("start_time").unwrap_or(&Value::Null)))
            .ok_or("start_time requerida (HH:MM) si la ausencia no es de día completo")?;
        let et = norm_time(&as_str(payload.get("end_time").unwrap_or(&Value::Null)))
            .ok_or("end_time requerida (HH:MM) si la ausencia no es de día completo")?;
        if st >= et {
            return Err("start_time debe ser < end_time".into());
        }
        (json!(st), json!(et))
    };

    let mut p = Map::new();
    p.insert("time_off_id".into(), json!(time_off_id));
    p.insert("staff_id".into(), json!(staff_id));
    p.insert("leave_type".into(), json!(leave_type));
    p.insert("start_date".into(), json!(start_date));
    p.insert("end_date".into(), json!(end_date));
    p.insert("is_full_day".into(), json!(is_full_day));
    p.insert("start_time".into(), start_time);
    p.insert("end_time".into(), end_time);
    p.insert("reason".into(), json!(str_or(&payload, "reason", "")));
    p.insert("notes".into(), json!(str_or(&payload, "notes", "")));
    Ok(Output {
        operations: vec![Operation::sql("staff._insert_time_off", p)],
        events: vec![],
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bulk_create_passes_hourly_rate_as_integer_cents() {
        // ADR-0123 §1: hourly_rate es DINERO (céntimos/hora, INTEGER en BD y en el JSON).
        // El passthrough en f64 mandaba 1500.0 (float) a una columna INTEGER — el único
        // importe de la flota que viajaba como number (falso negativo del validador).
        let input = serde_json::json!({
            "payload": { "members": [
                { "first_name": "Ana", "last_name": "Ruiz", "hourly_rate": 1500 },
                { "first_name": "Luz", "last_name": "Vega" }
            ] },
            "context": { "new_ids": ["id-0", "id-1"] }
        });
        let out = bulk_create_staff_members_pure(input).expect("bulk válido");
        assert_eq!(out.operations[0].params["hourly_rate"], serde_json::json!(1500), "entero, no 1500.0");
        assert_eq!(out.operations[1].params["hourly_rate"], serde_json::json!(0), "default entero");
    }
}
