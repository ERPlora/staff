# Staff — Overview

## What this module does

Staff is the HR layer of the hub. It holds the **people who work**: their employment record, the
**role** they play in the catalogue (stylist, barber, reception), the **weekly schedules** they work,
their **time-off** requests with an approval flow, and their pay data — hourly rate and commission
percentage.

It is deliberately the base module of the people domain: it depends on nothing, and `appointments`,
payroll and services build on top of it.

## Staff is not the same as hub users

This is the distinction that causes the most confusion, so it comes first.

| | **Hub user** (core, "Personal" screen) | **Staff member** (this module) |
|---|---|---|
| Answers | **Who logs in** | **Who works / who serves** |
| Holds | Identity, PIN or cloud account, permission role, sessions | Employment record, schedule, time off, commission, services |
| Its "role" | `owner` / `admin` / `manager` / `employee` — **grants permissions** | A catalogue label with a colour and an order — **grants nothing** |

A staff member can be **linked** to a hub user, and the link is **optional in both directions**: a
professional who never touches the till has a record with no user, and a manager who never serves has
a user with no record.

**A staff role is not a permission.** Calling somebody "senior stylist" gives them no access to
anything.

## What this module does NOT do

- **It does not grant permissions.** Access is decided by the hub user's role, not by the staff role.
- **It does not do clock-in / clock-out.** There is no time-tracking table at all. What it knows is
  who is **absent** today, not who arrived at 09:03.
- **It does not run payroll.** It stores the hourly rate and the commission percentage; it computes
  no pay.
- **It does not compute commission amounts.** It publishes the **rate**; the money comes from
  crossing that with the sales attributed to each professional.
- **It does not book appointments.** It says who is bookable; the diary is `appointments`.

## Modules it connects to

**Depends on nothing.**

**`appointments` reads it** to offer the list of bookable professionals, and books against a
`staff_id`.

**`services` is loosely coupled**: a staff member can be marked as providing a service, stored as an
**opaque reference** with the name denormalised — no cross-module foreign key.

**Events it emits**

| Event | When |
|---|---|
| `staff.member.created` | a member is created, including in bulk |
| `staff.member.updated` | a member is edited |
| `staff.member.deactivated` | a member is deactivated |
| `staff.member.terminated` | a member is terminated |
| `staff.role.created` | a role is created |
| `staff.time_off.created` | a time-off request is filed |
| `staff.time_off.status_changed` | it is approved, rejected or cancelled |
| `staff.schedule.created` | a schedule is created |
| `staff.settings.updated` | the settings are saved |

**Events it listens to** — none. The block exists but is empty.

## Privacy is built into the queries

Two kinds of data are deliberately **not** in the everyday lists, because an employee can read those
lists:

- **Compensation** — hourly rate and commission — lives in its own query behind
  `staff.view_compensation`.
- **The reason and notes of an absence** — a sick leave is health data — live in their own query
  behind `staff.view_time_off_detail`.

The directory tells you **who is who**; the absence list tells you **who is away and when**, never
why.

## Where its numbers come from

- **Commission rate** is a percentage from 0 to 100.
- **Days of the week are 0 = Monday … 6 = Sunday.**
- **Statuses**: a member is `active`, `inactive`, `on_leave` or `terminated`; a time-off request is
  `pending`, `approved`, `rejected` or `cancelled`; leave is `vacation`, `sick`, `personal`,
  `training` or `other`.
