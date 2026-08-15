# Staff — Limits and troubleshooting

## Known limitations you should know about

- **No clock-in / clock-out.** There is no time-tracking data of any kind.
- **No payroll.** The module stores rates; it computes no pay.
- **Commission amounts are not computed here.** Only the rate is published.
- **Some writes fail silently as no-ops.** Deactivation and time-off creation are guarded in SQL: if
  the guard does not hold, the operation touches zero rows rather than returning an explicit error.
  Always re-read the record to confirm.

## Refusals you will actually see

| Situation | What happens | What to do |
|---|---|---|
| Deactivating someone with pending or approved absences not yet ended | No-op — nothing changes | Resolve or cancel the absences first |
| Filing an absence overlapping a pending or approved one | No-op — nothing is created | Check the person's calendar |
| Filing an absence for a member that does not exist | No-op | Check the member id |
| A schedule with a repeated weekday, `start >= end`, or a break outside the interval | Rejected | Fix the hours |
| A schedule with only one end of the break set | Rejected | Give both ends or neither |
| Saving settings on a hub that never had a settings row | Now creates it | Nothing — this used to silently show defaults as if saved |

## Accepted values

| Field | Values |
|---|---|
| Member status | `active`, `inactive`, `on_leave`, `terminated` |
| Time-off status | `pending`, `approved`, `rejected`, `cancelled` |
| Leave type | `vacation`, `sick`, `personal`, `training`, `other` |
| Day of week | 0 = Monday … 6 = Sunday |
| Commission rate | 0–100 |

## Caps and sizes

| Limit | Value |
|---|---|
| Members per bulk creation | 100 |
| Rows per page (members, roles, time off) | 50 |
| Maximum rows a paginated request may ask for | 500 |
| Default schedules per member | 1 |
| Occurrences of a weekday in one schedule | 1 |
| A service listed once per member | yes |

Bulk creation skips invalid rows and keeps going; check what came back rather than assuming all rows
landed.

## Permissions per action

| To do this | You need |
|---|---|
| See the directory, a member's operational detail, roles, schedules and settings | `staff.view_staff_member` |
| **See hourly rate and commission**, see the commission summary | `staff.view_compensation` |
| Create a member, bulk-create | `staff.add_staff_member` |
| Edit a member | `staff.change_staff_member` |
| Deactivate or terminate a member | `staff.delete_staff_member` |
| See who is away and when | `staff.view_time_off` |
| **See the reason and notes of an absence** | `staff.view_time_off_detail` |
| File, approve, reject or cancel an absence | `staff.manage_time_off` |
| Create a role, create a schedule, change the settings | `staff.manage_settings` |

By role: **admin** has everything. **manager** has everything except `staff.delete_staff_member` —
a manager cannot deactivate or terminate anybody. **employee** sees the **directory** and **who is
away and when**, and nothing else: no compensation, no absence reasons, no writes.

## Dependencies — what breaks if something is missing

**Staff depends on nothing.** It is the base of the people domain.

**`appointments` requires it** — installing the diary installs Staff, and **you cannot uninstall
Staff while `appointments` is installed**, because a booking is made against a professional.

**`services` is optional and loosely coupled.** The services a member provides are stored as opaque
references; without the module they are just ids with a copied name.

**`sales` is not a dependency**, but the day-close commission figure needs it: this module has the
rate, `sales` has the money.

## When something looks wrong

**"I gave someone the stylist role and they still cannot do anything."** A staff role grants no
permissions. Change the **hub user's** role in the core Personal screen.

**"I cannot see hourly rates."** You need `staff.view_compensation`, which an employee does not have.
They are deliberately absent from the directory.

**"I cannot see why someone is off."** You need `staff.view_time_off_detail`. The operational list
never shows the reason.

**"Deactivating did nothing."** The person has a pending or approved absence that has not ended.
Resolve it first.

**"My time-off request did not appear."** It overlapped an existing pending or approved absence for
the same person, or the member id was wrong. Both are silent no-ops today.

**"Someone is not offered in the appointment booking."** Check that they are **bookable** and
`active`. Being an employee is not enough.

**"The person is in the hub user list but not in Staff."** Those are two different records and the
link is optional. Create the staff record and link it.

**"I unlinked a hub user and it came back."** You probably sent null (do not touch) instead of an
empty string (unlink).

**"Two schedules are both default for one person."** They cannot be; creating a default unsets the
previous one. Reload.

**"The commission is zero."** This module only publishes the rate. The amount comes from crossing it
with the per-professional sales, and a sale rung up without attributing a professional is not in
there.

**"A terminated employee still appears somewhere."** Termination is a soft delete: they leave the
active views and the commission summary, but historical records that referenced them are untouched.
