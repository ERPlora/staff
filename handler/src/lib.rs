//! Handler WASM (Tier 2) del módulo `staff` — lógica de WASM-TODO.md §1-§4.
//!
//! Lógica pura, sin BD: cada función recibe `{payload, context}`, valida lo que es
//! computable con el propio payload y devuelve **intenciones** (commands del propio
//! módulo) que el host valida y ejecuta en UNA transacción. Los eventos declarados
//! (`emit` del manifest) los persiste el host; el guest no los duplica.
//!
//! The guards that depend on DB state are AUTHORITATIVE here (staff#1): the runtime pre-loads
//! the module's own queries into `context.reads` (ADR-0069, `reads` of each command, all
//! `required`), the handler decides, and a failed guard is a structured domain error
//! (`Output.error`, hub#139) — the runtime persists nothing and emits nothing. Before staff#1 the
//! same guards lived only in conditional SQL: 0 rows, `{ok:true}`, and the event still went out.
//! That SQL stays as defence in depth (a race between the read and the write), never as the
//! answer.
//! * `deactivate_staff_member` → `staff.member_not_found` / `staff.already_inactive` /
//!   `staff.active_time_off`; then `_deactivate_member`.
//! * `create_time_off` → `staff.member_not_found` / `staff.overlapping_time_off` (any
//!   `pending|approved` leave of the member overlapping the range); then `_insert_time_off`.
//! * `create_schedule` → `staff.member_not_found` / `staff.schedule_invalid_range` /
//!   `staff.schedule_no_hours`; then `_unset_default_schedules` + `_insert_schedule` +
//!   N × `_insert_working_hours`.
//! * `update_schedule` (staff#2) → `staff.schedule_not_found` (read `staff.schedules.get`) + the
//!   same validation; then `_unset_default_schedules`? + `_update_schedule` +
//!   `_retire_working_hours` + N × `_insert_working_hours` (upsert = the week is REPLACED).
//! * `set_time_off_status` → state machine `pending → approved|rejected|cancelled`,
//!   `approved → cancelled`, terminal states stay put (`staff.invalid_transition`); approving
//!   re-checks conflicts against APPROVED leave (`staff.overlapping_time_off`); missing row →
//!   `staff.time_off_not_found`; then `_set_time_off_status`.
//! * `bulk_create_staff_members` → rows are skipped, never silently: a role that is not this
//!   hub's, or a row without a name, is listed in `result.skipped` with its reason.
//!
//! Ids: el host pasa `context.new_ids` (autoridad de ids); el guest solo los reparte.
//! La fecha de hoy se deriva de `context.now` (RFC3339 del host, no falsificable).

use erplora_guest_sdk::money;
use erplora_guest_sdk::{DomainError, Operation, Output};
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
pub fn update_schedule(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    to_fn_result(update_schedule_pure(input.into_inner().into_value()))
}

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn create_time_off(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    to_fn_result(create_time_off_pure(input.into_inner().into_value()))
}

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn set_time_off_status(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    to_fn_result(set_time_off_status_pure(input.into_inner().into_value()))
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

/// Rows of a pre-loaded read (`context.reads["<query>"]`, ADR-0069). `None` when the runtime did
/// not deliver that read at all (older runtime, or a graceful read that failed) — callers decide
/// what the absence means; an empty array is a real answer («no rows»).
fn read_rows<'a>(input: &'a Value, query: &str) -> Option<&'a Vec<Value>> {
    input
        .get("context")
        .and_then(|c| c.get("reads"))
        .and_then(|r| r.get(query))
        .and_then(|v| v.as_array())
}

/// The member row the runtime pre-loaded via `staff.members.get` (filtered by `payload.staff_id`).
/// `None` = the member does not exist in this hub (or the read is missing, which the manifest
/// forbids with `required: true` — the runtime aborts before the handler runs).
fn member_row(input: &Value) -> Option<Value> {
    read_rows(input, "staff.members.get").and_then(|rows| rows.first().cloned())
}

/// A structured business rejection (hub#139): the host discards operations/events and answers
/// with the code — the module's public ABI the UI translates against (`locales/*.json` → `errors`).
fn refuse(code: &str, message: &str) -> Output {
    Output::new().with_error(DomainError::new(code, message))
}

const MEMBER_NOT_FOUND: (&str, &str) =
    ("staff.member_not_found", "That staff member does not exist in this business.");

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

/// Desactiva (≠ terminar) un miembro. The guards are decided HERE over the reads the runtime
/// pre-loaded (`staff.members.get`, `staff.time_off.active_for_member`) and a failed guard is a
/// domain error (staff#1) — `_deactivate_member` keeps the same conditions in SQL only as defence
/// in depth against a race between the read and the write.
pub fn deactivate_staff_member_pure(input: Value) -> Result<Output, String> {
    let (payload, _ids, now) = payload_context(&input);
    let staff_id = as_str(payload.get("staff_id").unwrap_or(&Value::Null));
    if staff_id.is_empty() {
        return Err("staff_id requerido".into());
    }
    let Some(member) = member_row(&input) else {
        return Ok(refuse(MEMBER_NOT_FOUND.0, MEMBER_NOT_FOUND.1));
    };
    let status = as_str(member.get("status").unwrap_or(&Value::Null));
    if status == "inactive" || status == "terminated" {
        return Ok(refuse(
            "staff.already_inactive",
            "That staff member is already inactive.",
        ));
    }
    if read_rows(&input, "staff.time_off.active_for_member").is_some_and(|rows| !rows.is_empty()) {
        return Ok(refuse(
            "staff.active_time_off",
            "That staff member has pending or approved time off that has not ended yet. Resolve it first.",
        ));
    }
    let mut p = Map::new();
    p.insert("staff_id".into(), json!(staff_id));
    p.insert("today".into(), json!(today_from_now(&now)));
    // `..Default::default()` so the literal compiles against BOTH shapes of `Output`: the one
    // before hub#139 and the one that gained `error` (structured domain rejection). Without it the
    // handler stops compiling as soon as the hub checkout moves on, and then nobody can rebuild
    // `dist/handler.wasm` (pm#81).
    Ok(Output {
        operations: vec![Operation::sql("staff._deactivate_member", p)],
        events: vec![],
        ..Default::default()
    })
}

// ── §2 bulk_create_staff_members ───────────────────────────────────────────

/// Alta en lote tolerante a fallos por fila: las filas inválidas (sin first_name/
/// last_name, con hire_date mal formada, o con un `role_id` que no es de este hub) se saltan y
/// el resto se inserta reusando el command SQL público `staff.members.create` (el host inyecta
/// `:new_id` por op). Skipping is never silent (staff#1): the batch answers
/// `result: {created, skipped: [{index, reason}]}`.
///
/// The role check reads `context.reads["staff.roles.list"]` (this hub's roles). The WASM path of
/// the runtime does not apply the `expect_rows` gate of `staff.members.create` (staff#12), so a
/// foreign role would otherwise become a 0-row INSERT that the batch reported as done.
pub fn bulk_create_staff_members_pure(input: Value) -> Result<Output, String> {
    let (payload, _ids, _now) = payload_context(&input);
    let empty: Vec<Value> = Vec::new();
    let members = payload.get("members").and_then(|v| v.as_array()).unwrap_or(&empty);
    let known_roles: Option<Vec<String>> = read_rows(&input, "staff.roles.list").map(|rows| {
        rows.iter()
            .filter(|r| r.get("is_active").map(|v| as_i01(v, 1)).unwrap_or(1) == 1)
            .map(|r| as_str(r.get("id").unwrap_or(&Value::Null)))
            .collect()
    });

    let mut ops: Vec<Operation> = Vec::new();
    let mut skipped: Vec<Value> = Vec::new();
    for (index, item) in members.iter().enumerate().take(MAX_BULK) {
        let first_name = as_str(item.get("first_name").unwrap_or(&Value::Null));
        let last_name = as_str(item.get("last_name").unwrap_or(&Value::Null));
        if first_name.trim().is_empty() || last_name.trim().is_empty() {
            skipped.push(json!({ "index": index, "reason": "name_required" }));
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
                    skipped.push(json!({ "index": index, "reason": "invalid_hire_date" }));
                    continue;
                }
            }
        };
        let role_id = opt_str(item, "role_id");
        if let (Value::String(role), Some(known)) = (&role_id, &known_roles) {
            if !known.contains(role) {
                skipped.push(json!({ "index": index, "reason": "role_not_found" }));
                continue;
            }
        }
        // hourly_rate es DINERO (céntimos/hora, ADR-0123): entero i64 vía SDK, nunca f64.
        let hourly_rate = item.get("hourly_rate").map(|v| money::from_json(v, 0)).unwrap_or(0);

        let mut p = Map::new();
        p.insert("first_name".into(), json!(first_name.trim()));
        p.insert("last_name".into(), json!(last_name.trim()));
        p.insert("email".into(), json!(str_or(item, "email", "")));
        p.insert("phone".into(), json!(str_or(item, "phone", "")));
        p.insert("employee_id".into(), json!(""));
        p.insert("role_id".into(), role_id);
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
    let created = ops.len();
    Ok(Output { operations: ops, events: vec![], ..Default::default() }
        .with_result(json!({ "created": created, "skipped": skipped })))
}

// ── §3 create_schedule / update_schedule ───────────────────────────────────

/// Outcome of validating a schedule payload: either the working-hour params ready to become
/// `_insert_working_hours` intentions, or a host error (malformed input) / a domain refusal.
enum WeekCheck {
    Ok(Vec<Map<String, Value>>),
    Refuse(Output),
}

/// Validity range of a template: both ISO dates when present, and `from <= until` (staff#2:
/// the API used to accept an inverted range the UI rejected — API and browser diverged).
fn check_validity_range(payload: &Value) -> Result<Option<Output>, String> {
    for k in ["effective_from", "effective_until"] {
        if let Some(Value::String(s)) = payload.get(k) {
            if !s.is_empty() && !is_iso_date(s) {
                return Err(format!("{k} must be an ISO date YYYY-MM-DD"));
            }
        }
    }
    if let (Value::String(from), Value::String(until)) =
        (opt_str(payload, "effective_from"), opt_str(payload, "effective_until"))
    {
        if from > until {
            return Ok(Some(refuse(
                "staff.schedule_invalid_range",
                "The schedule's validity ends before it starts.",
            )));
        }
    }
    Ok(None)
}

/// Validates `working_hours` (day_of_week 0..6 without repeats, start < end, break inside the
/// interval with both ends or none) and normalises times. At least ONE working interval is
/// required (staff#2): a template with no hours is not a schedule, it is a hole the availability
/// query would read as «never works». Ids come from `new_ids[first_id..]`.
fn check_week(
    payload: &Value,
    schedule_id: &str,
    new_ids: &[Value],
    first_id: usize,
) -> Result<WeekCheck, String> {
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
            return Err(format!("working_hours[{i}]: day_of_week must be in 0..6"));
        }
        if seen_days.contains(&day) {
            return Err(format!("working_hours[{i}]: day_of_week {day} repeated"));
        }
        seen_days.push(day);

        let start = norm_time(&str_or(wh, "start_time", "09:00:00"))
            .ok_or(format!("working_hours[{i}]: invalid start_time"))?;
        let end = norm_time(&str_or(wh, "end_time", "18:00:00"))
            .ok_or(format!("working_hours[{i}]: invalid end_time"))?;
        if start >= end {
            return Err(format!("working_hours[{i}]: start_time must be < end_time"));
        }
        // Break: both ends or none; when present, inside the working interval.
        let b_start = opt_str(wh, "break_start");
        let b_end = opt_str(wh, "break_end");
        let (b_start, b_end) = match (&b_start, &b_end) {
            (Value::Null, Value::Null) => (Value::Null, Value::Null),
            (Value::String(bs), Value::String(be)) => {
                let bs = norm_time(bs).ok_or(format!("working_hours[{i}]: invalid break_start"))?;
                let be = norm_time(be).ok_or(format!("working_hours[{i}]: invalid break_end"))?;
                if !(start <= bs && bs < be && be <= end) {
                    return Err(format!(
                        "working_hours[{i}]: the break must fall inside the working interval"
                    ));
                }
                (json!(bs), json!(be))
            }
            _ => {
                return Err(format!(
                    "working_hours[{i}]: break_start and break_end go together (both or none)"
                ))
            }
        };

        let wh_id = new_ids.get(first_id + i).map(as_str).unwrap_or_default();
        if wh_id.is_empty() {
            return Err("context.new_ids too short for the working_hours".into());
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
    if !wh_params.iter().any(|p| p["is_working"] == json!(1)) {
        return Ok(WeekCheck::Refuse(refuse(
            "staff.schedule_no_hours",
            "A schedule needs at least one working day with hours.",
        )));
    }
    Ok(WeekCheck::Ok(wh_params))
}

/// Crea horario + N working_hours (multi-tabla atómica, todo-o-nada en la tx del host). Si el
/// nuevo es default, desmarca los demás del miembro. Validation shared with `update_schedule`
/// (`check_validity_range` + `check_week`, staff#2).
pub fn create_schedule_pure(input: Value) -> Result<Output, String> {
    let (payload, new_ids, _now) = payload_context(&input);
    let staff_id = as_str(payload.get("staff_id").unwrap_or(&Value::Null));
    if staff_id.is_empty() {
        return Err("staff_id required".into());
    }
    let schedule_id = new_ids.first().map(as_str).unwrap_or_default();
    if schedule_id.is_empty() {
        return Err("context.new_ids empty (the host is the id authority)".into());
    }
    // staff#1: a schedule for a member this hub does not have is refused, not silently dropped by
    // the INSERT … SELECT of `_insert_schedule` (which stays as defence in depth).
    if member_row(&input).is_none() {
        return Ok(refuse(MEMBER_NOT_FOUND.0, MEMBER_NOT_FOUND.1));
    }
    let is_default = payload.get("is_default").map(|v| as_i01(v, 1)).unwrap_or(1);
    if let Some(refusal) = check_validity_range(&payload)? {
        return Ok(refusal);
    }
    let wh_params = match check_week(&payload, &schedule_id, &new_ids, 1)? {
        WeekCheck::Ok(p) => p,
        WeekCheck::Refuse(out) => return Ok(out),
    };

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
    Ok(Output { operations: ops, events: vec![], ..Default::default() })
}

/// Edits a template and REPLACES its week (staff#2). The row comes from the pre-loaded read
/// `staff.schedules.get` (required, hub-scoped): no row → `staff.schedule_not_found`. Fields not
/// sent (`name`, `is_default`, validity) keep the row's values; `working_hours` is the whole new
/// week: `_retire_working_hours` soft-deletes every day, then one `_insert_working_hours` (upsert)
/// per day sent revives it with the new times. Becoming default demotes the member's others.
pub fn update_schedule_pure(input: Value) -> Result<Output, String> {
    let (payload, new_ids, _now) = payload_context(&input);
    let schedule_id = as_str(payload.get("schedule_id").unwrap_or(&Value::Null));
    if schedule_id.is_empty() {
        return Err("schedule_id required".into());
    }
    let Some(row) = read_rows(&input, "staff.schedules.get").and_then(|r| r.first().cloned()) else {
        return Ok(refuse("staff.schedule_not_found", "That schedule does not exist in this business."));
    };
    let staff_id = as_str(row.get("staff_id").unwrap_or(&Value::Null));
    // Merge: payload over row, so validity is checked on what will be stored.
    let mut merged = Map::new();
    for k in ["name", "is_default", "effective_from", "effective_until"] {
        let v = match payload.get(k) {
            Some(Value::Null) | None => row.get(k).cloned().unwrap_or(Value::Null),
            Some(v) => v.clone(),
        };
        merged.insert(k.into(), v);
    }
    let merged = Value::Object(merged);
    if let Some(refusal) = check_validity_range(&merged)? {
        return Ok(refusal);
    }
    let wh_params = match check_week(&payload, &schedule_id, &new_ids, 0)? {
        WeekCheck::Ok(p) => p,
        WeekCheck::Refuse(out) => return Ok(out),
    };
    let is_default = merged.get("is_default").map(|v| as_i01(v, 1)).unwrap_or(1);

    let mut ops: Vec<Operation> = Vec::new();
    if is_default == 1 {
        let mut p = Map::new();
        p.insert("staff_id".into(), json!(staff_id));
        ops.push(Operation::sql("staff._unset_default_schedules", p));
    }
    let mut up = Map::new();
    up.insert("schedule_id".into(), json!(schedule_id));
    up.insert("name".into(), json!(str_or(&merged, "name", "Default Schedule")));
    up.insert("is_default".into(), json!(is_default));
    up.insert("effective_from".into(), opt_str(&merged, "effective_from"));
    up.insert("effective_until".into(), opt_str(&merged, "effective_until"));
    ops.push(Operation::sql("staff._update_schedule", up));
    let mut rp = Map::new();
    rp.insert("schedule_id".into(), json!(schedule_id));
    ops.push(Operation::sql("staff._retire_working_hours", rp));
    for p in wh_params {
        ops.push(Operation::sql("staff._insert_working_hours", p));
    }
    Ok(Output { operations: ops, events: vec![], ..Default::default() })
}

// ── §4 create_time_off ─────────────────────────────────────────────────────

/// Crea una ausencia `pending`. Valida en el guest: fechas ISO con
/// `start_date <= end_date`, `leave_type` del enum y coherencia de horas si no es
/// full-day. The member must exist in this hub (`staff.members.get`) and the range must not
/// overlap another `pending|approved` leave of the member (`staff.time_off.overlapping`, the
/// legacy `conflicts_with` rule) — both decided here over the pre-loaded reads, both domain
/// errors (staff#1). `_insert_time_off` keeps the same NOT EXISTS as defence in depth.
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

    if member_row(&input).is_none() {
        return Ok(refuse(MEMBER_NOT_FOUND.0, MEMBER_NOT_FOUND.1));
    }
    if read_rows(&input, "staff.time_off.overlapping").is_some_and(|rows| !rows.is_empty()) {
        return Ok(refuse(
            "staff.overlapping_time_off",
            "That staff member already has pending or approved time off in those dates.",
        ));
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
        ..Default::default()
    })
}

// ── §5 set_time_off_status ─────────────────────────────────────────────────

/// Allowed transitions of a time-off request (staff#1). Market standard (Factorial, Personio,
/// BambooHR, Deputy): a manager approves or rejects a PENDING request; a pending or approved
/// request can be CANCELLED (by the requester or the manager); rejected and cancelled are
/// terminal; nothing ever goes back to `pending`. Repeating a terminal operation is refused
/// explicitly — never a false success.
fn transition_allowed(from: &str, to: &str) -> bool {
    matches!(
        (from, to),
        ("pending", "approved") | ("pending", "rejected") | ("pending", "cancelled") | ("approved", "cancelled")
    )
}

/// Cambia el estado de una ausencia — a state machine over the pre-loaded row
/// (`staff.time_off.detail`, filtered by `payload.time_off_id`), not a blind UPDATE (staff#1):
/// missing row → `staff.time_off_not_found`; disallowed move → `staff.invalid_transition`;
/// approving re-validates conflicts against the APPROVED leave of the same member
/// (`staff.time_off.conflicts_for`) → `staff.overlapping_time_off`. Then `_set_time_off_status`.
pub fn set_time_off_status_pure(input: Value) -> Result<Output, String> {
    let (payload, _ids, _now) = payload_context(&input);
    let time_off_id = as_str(payload.get("time_off_id").unwrap_or(&Value::Null));
    if time_off_id.is_empty() {
        return Err("time_off_id requerido".into());
    }
    let to = as_str(payload.get("status").unwrap_or(&Value::Null));
    if !matches!(to.as_str(), "pending" | "approved" | "rejected" | "cancelled") {
        return Err(format!("status inválido: {to}"));
    }
    let Some(row) = read_rows(&input, "staff.time_off.detail").and_then(|rows| rows.first().cloned()) else {
        return Ok(refuse(
            "staff.time_off_not_found",
            "That time-off request does not exist in this business.",
        ));
    };
    let from = as_str(row.get("status").unwrap_or(&Value::Null));
    if !transition_allowed(&from, &to) {
        return Ok(refuse(
            "staff.invalid_transition",
            &format!("A time-off request cannot go from `{from}` to `{to}`."),
        ));
    }
    if to == "approved" {
        let approved_conflict = read_rows(&input, "staff.time_off.conflicts_for").is_some_and(|rows| {
            rows.iter().any(|r| {
                as_str(r.get("status").unwrap_or(&Value::Null)) == "approved"
                    && as_str(r.get("id").unwrap_or(&Value::Null)) != time_off_id
            })
        });
        if approved_conflict {
            return Ok(refuse(
                "staff.overlapping_time_off",
                "That staff member already has approved time off in those dates.",
            ));
        }
    }
    let mut p = Map::new();
    p.insert("time_off_id".into(), json!(time_off_id));
    p.insert("status".into(), json!(to));
    Ok(Output {
        operations: vec![Operation::sql("staff._set_time_off_status", p)],
        events: vec![],
        ..Default::default()
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

    // ── staff#1: the guards are AUTHORITATIVE — a failed guard is a domain error, never a
    // silent 0-row no-op that still emits the command's event. The state the guard needs comes
    // from `context.reads` (ADR-0069), pre-loaded by the runtime from the module's own queries.

    fn input(payload: Value, reads: Value) -> Value {
        json!({
            "payload": payload,
            "context": {
                "hub_id": "hub-a", "current_user_id": "u1", "now": "2026-08-18T10:00:00Z",
                "new_ids": ["id-0", "id-1", "id-2", "id-3"],
                "reads": reads
            }
        })
    }

    fn member(status: &str) -> Value {
        json!([{ "id": "m1", "first_name": "Ana", "last_name": "Ruiz", "status": status }])
    }

    fn code(out: &Output) -> String {
        out.error.as_ref().map(|e| e.code.clone()).unwrap_or_default()
    }

    fn time_off_payload() -> Value {
        json!({ "staff_id": "m1", "leave_type": "vacation", "start_date": "2026-09-01",
                "end_date": "2026-09-05", "is_full_day": 1 })
    }

    #[test]
    fn time_off_for_a_member_that_does_not_exist_is_refused_not_ignored() {
        let out = create_time_off_pure(input(time_off_payload(), json!({
            "staff.members.get": [], "staff.time_off.overlapping": []
        }))).unwrap();
        assert_eq!(code(&out), "staff.member_not_found");
        assert!(out.operations.is_empty(), "a refusal writes nothing");
    }

    #[test]
    fn overlapping_time_off_is_refused_with_its_own_code() {
        let out = create_time_off_pure(input(time_off_payload(), json!({
            "staff.members.get": member("active"),
            "staff.time_off.overlapping": [{ "id": "t9", "status": "pending",
                                            "start_date": "2026-09-03", "end_date": "2026-09-10" }]
        }))).unwrap();
        assert_eq!(code(&out), "staff.overlapping_time_off");
        assert!(out.operations.is_empty());
    }

    #[test]
    fn a_clean_time_off_request_is_inserted() {
        let out = create_time_off_pure(input(time_off_payload(), json!({
            "staff.members.get": member("active"), "staff.time_off.overlapping": []
        }))).unwrap();
        assert!(out.error.is_none(), "{:?}", out.error);
        assert_eq!(out.operations.len(), 1);
        assert_eq!(out.operations[0].command, "staff._insert_time_off");
    }

    #[test]
    fn deactivating_a_missing_member_is_refused() {
        let out = deactivate_staff_member_pure(input(json!({ "staff_id": "m1" }), json!({
            "staff.members.get": [], "staff.time_off.active_for_member": []
        }))).unwrap();
        assert_eq!(code(&out), "staff.member_not_found");
        assert!(out.operations.is_empty());
    }

    #[test]
    fn deactivating_twice_is_refused_as_already_inactive() {
        for status in ["inactive", "terminated"] {
            let out = deactivate_staff_member_pure(input(json!({ "staff_id": "m1" }), json!({
                "staff.members.get": member(status), "staff.time_off.active_for_member": []
            }))).unwrap();
            assert_eq!(code(&out), "staff.already_inactive", "status {status}");
            assert!(out.operations.is_empty());
        }
    }

    #[test]
    fn deactivating_with_live_time_off_is_refused() {
        let out = deactivate_staff_member_pure(input(json!({ "staff_id": "m1" }), json!({
            "staff.members.get": member("active"),
            "staff.time_off.active_for_member": [{ "id": "t1", "status": "approved",
                                                   "start_date": "2026-08-20", "end_date": "2026-08-25" }]
        }))).unwrap();
        assert_eq!(code(&out), "staff.active_time_off");
        assert!(out.operations.is_empty());
    }

    #[test]
    fn deactivating_an_active_member_without_leave_goes_through() {
        let out = deactivate_staff_member_pure(input(json!({ "staff_id": "m1" }), json!({
            "staff.members.get": member("on_leave"), "staff.time_off.active_for_member": []
        }))).unwrap();
        assert!(out.error.is_none());
        assert_eq!(out.operations[0].command, "staff._deactivate_member");
    }

    #[test]
    fn a_schedule_for_a_missing_member_is_refused() {
        let payload = json!({ "staff_id": "m1", "name": "Turno", "working_hours": [
            { "day_of_week": 1, "start_time": "09:00", "end_time": "17:00" }] });
        let out = create_schedule_pure(input(payload.clone(), json!({ "staff.members.get": [] }))).unwrap();
        assert_eq!(code(&out), "staff.member_not_found");
        assert!(out.operations.is_empty());
        let ok = create_schedule_pure(input(payload, json!({ "staff.members.get": member("active") }))).unwrap();
        assert!(ok.error.is_none());
        assert_eq!(ok.operations.len(), 3, "unset default + schedule + 1 working_hours");
    }

    // ── time_off.set_status: a state machine, not a blind UPDATE ────────────────────────────

    fn time_off_row(status: &str) -> Value {
        json!([{ "id": "t1", "staff_id": "m1", "status": status,
                 "start_date": "2026-09-01", "end_date": "2026-09-05" }])
    }

    fn set_status(from: Option<&str>, to: &str, conflicts: Value) -> Output {
        let detail = match from { Some(s) => time_off_row(s), None => json!([]) };
        set_time_off_status_pure(input(json!({ "time_off_id": "t1", "status": to }), json!({
            "staff.time_off.detail": detail, "staff.time_off.conflicts_for": conflicts
        }))).unwrap()
    }

    #[test]
    fn set_status_on_a_missing_request_is_refused() {
        let out = set_status(None, "approved", json!([]));
        assert_eq!(code(&out), "staff.time_off_not_found");
        assert!(out.operations.is_empty());
    }

    #[test]
    fn allowed_transitions_go_through_and_carry_the_target_status() {
        for (from, to) in [("pending", "approved"), ("pending", "rejected"), ("pending", "cancelled"), ("approved", "cancelled")] {
            let out = set_status(Some(from), to, json!([]));
            assert!(out.error.is_none(), "{from} → {to}: {:?}", out.error);
            assert_eq!(out.operations.len(), 1);
            assert_eq!(out.operations[0].command, "staff._set_time_off_status");
            assert_eq!(out.operations[0].params["status"], json!(to));
            assert_eq!(out.operations[0].params["time_off_id"], json!("t1"));
        }
    }

    #[test]
    fn terminal_states_and_repeats_are_refused_explicitly() {
        for (from, to) in [
            ("rejected", "approved"), ("rejected", "cancelled"), ("cancelled", "approved"),
            ("approved", "approved"), ("approved", "rejected"), ("approved", "pending"),
            ("pending", "pending"), ("rejected", "rejected"),
        ] {
            let out = set_status(Some(from), to, json!([]));
            assert_eq!(code(&out), "staff.invalid_transition", "{from} → {to}");
            assert!(out.operations.is_empty(), "{from} → {to}");
        }
    }

    #[test]
    fn approving_revalidates_conflicts_against_approved_leave_only() {
        let approved_conflict = json!([{ "id": "t2", "status": "approved", "start_date": "2026-09-04", "end_date": "2026-09-08" }]);
        let out = set_status(Some("pending"), "approved", approved_conflict.clone());
        assert_eq!(code(&out), "staff.overlapping_time_off");
        assert!(out.operations.is_empty());
        // Another PENDING request in the same window does not block the approval (the other one
        // will be rejected by the manager); and conflicts never block a rejection/cancellation.
        let pending_conflict = json!([{ "id": "t2", "status": "pending", "start_date": "2026-09-04", "end_date": "2026-09-08" }]);
        assert!(set_status(Some("pending"), "approved", pending_conflict).error.is_none());
        assert!(set_status(Some("pending"), "rejected", approved_conflict.clone()).error.is_none());
        assert!(set_status(Some("approved"), "cancelled", approved_conflict).error.is_none());
    }

    // ── bulk_create: a role that is not this hub's does not silently vanish ─────────────────

    #[test]
    fn bulk_create_reports_the_rows_it_skipped_and_refuses_a_foreign_role() {
        let inp = input(json!({ "members": [
            { "first_name": "Ana", "last_name": "Ruiz", "role_id": "r-own" },
            { "first_name": "Eve", "last_name": "Cross", "role_id": "r-neighbour" },
            { "first_name": "", "last_name": "Nobody" },
            { "first_name": "Luz", "last_name": "Vega" }
        ] }), json!({ "staff.roles.list": [{ "id": "r-own", "name": "Stylist", "is_active": 1 }] }));
        let out = bulk_create_staff_members_pure(inp).unwrap();
        assert!(out.error.is_none());
        assert_eq!(out.operations.len(), 2, "Ana and Luz");
        let result = out.result.expect("the batch reports what it did");
        assert_eq!(result["created"], json!(2));
        let skipped = result["skipped"].as_array().expect("skipped rows are listed");
        assert_eq!(skipped.len(), 2);
        assert_eq!(skipped[0]["index"], json!(1));
        assert_eq!(skipped[0]["reason"], json!("role_not_found"));
        assert_eq!(skipped[1]["index"], json!(2));
        assert_eq!(skipped[1]["reason"], json!("name_required"));
    }

    // ── staff#2: schedules are OPERABLE — update replaces the week, server-side validation ──

    fn schedule_row() -> Value {
        json!([{ "id": "s1", "staff_id": "m1", "name": "Regular", "is_default": 1,
                 "effective_from": null, "effective_until": null, "is_active": 1 }])
    }

    #[test]
    fn a_schedule_without_a_single_working_interval_is_refused_on_create_and_update() {
        let create = create_schedule_pure(input(
            json!({ "staff_id": "m1", "working_hours": [] }),
            json!({ "staff.members.get": member("active") }),
        )).unwrap();
        assert_eq!(code(&create), "staff.schedule_no_hours");
        assert!(create.operations.is_empty());
        let update = update_schedule_pure(input(
            json!({ "schedule_id": "s1", "working_hours": [
                { "day_of_week": 0, "start_time": "09:00", "end_time": "17:00", "is_working": 0 }] }),
            json!({ "staff.schedules.get": schedule_row() }),
        )).unwrap();
        assert_eq!(code(&update), "staff.schedule_no_hours");
    }

    #[test]
    fn a_validity_range_that_ends_before_it_starts_is_refused() {
        let out = create_schedule_pure(input(
            json!({ "staff_id": "m1", "effective_from": "2026-09-10", "effective_until": "2026-09-01",
                    "working_hours": [{ "day_of_week": 0, "start_time": "09:00", "end_time": "17:00" }] }),
            json!({ "staff.members.get": member("active") }),
        )).unwrap();
        assert_eq!(code(&out), "staff.schedule_invalid_range");
    }

    #[test]
    fn updating_a_missing_schedule_is_refused() {
        let out = update_schedule_pure(input(
            json!({ "schedule_id": "nope", "working_hours": [
                { "day_of_week": 0, "start_time": "09:00", "end_time": "17:00" }] }),
            json!({ "staff.schedules.get": [] }),
        )).unwrap();
        assert_eq!(code(&out), "staff.schedule_not_found");
        assert!(out.operations.is_empty());
    }

    #[test]
    fn update_replaces_the_week_and_keeps_unsent_fields_from_the_row() {
        let out = update_schedule_pure(input(
            json!({ "schedule_id": "s1", "name": "Summer", "working_hours": [
                { "day_of_week": 0, "start_time": "10:00", "end_time": "16:00" },
                { "day_of_week": 2, "start_time": "10:00", "end_time": "16:00", "break_start": "13:00", "break_end": "13:30" }
            ] }),
            json!({ "staff.schedules.get": schedule_row() }),
        )).unwrap();
        assert!(out.error.is_none(), "{:?}", out.error);
        let cmds: Vec<&str> = out.operations.iter().map(|o| o.command.as_str()).collect();
        // is_default stays 1 (from the row) → the other defaults are demoted first
        assert_eq!(cmds, vec![
            "staff._unset_default_schedules", "staff._update_schedule",
            "staff._retire_working_hours", "staff._insert_working_hours", "staff._insert_working_hours",
        ]);
        assert_eq!(out.operations[0].params["staff_id"], json!("m1"));
        let upd = &out.operations[1].params;
        assert_eq!(upd["schedule_id"], json!("s1"));
        assert_eq!(upd["name"], json!("Summer"));
        assert_eq!(upd["is_default"], json!(1));
        assert_eq!(out.operations[2].params["schedule_id"], json!("s1"));
        let wh = &out.operations[4].params;
        assert_eq!(wh["schedule_id"], json!("s1"));
        assert_eq!(wh["day_of_week"], json!(2));
        assert_eq!(wh["start_time"], json!("10:00:00"));
        assert_eq!(wh["break_end"], json!("13:30:00"));
        assert_eq!(wh["wh_id"], json!("id-1"), "ids come from context.new_ids");
    }

    #[test]
    fn update_that_drops_the_default_flag_does_not_demote_the_others() {
        let out = update_schedule_pure(input(
            json!({ "schedule_id": "s1", "is_default": 0, "working_hours": [
                { "day_of_week": 0, "start_time": "10:00", "end_time": "16:00" }] }),
            json!({ "staff.schedules.get": schedule_row() }),
        )).unwrap();
        assert_eq!(out.operations[0].command, "staff._update_schedule");
        assert_eq!(out.operations[0].params["is_default"], json!(0));
    }
}
