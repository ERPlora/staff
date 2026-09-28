# Staff — Screens

The module contributes four tabs to the hub navigation — **Staff**, **Roles**, **Time Off** and
**Horarios** — plus a **Personal** settings tab the shell generates from the declarative settings
block.

## Staff — the directory

Every employee (`staff.members.list`, 50 rows per page). Requires `staff.view_staff_member`.

- **Search** by first name, last name, full name, email, phone or role.
- **Sort** by any listed column.
- **Filter** by role, status, bookable flag or colour; hire date by range.

**Compensation is not in this list** — not as a column, not as a sort, not as a filter. A range
filter on a value you cannot see would be an oracle for guessing it.

### Create an employee

1. Open **Staff** and add one.
2. Fill in first name and last name; email, phone and hire date are optional.
3. Pick the **role** (a catalogue label) and whether the person is **bookable**, with a booking
   buffer if needed.
4. Optionally link the **hub user** this record belongs to — the selector lists only **active**
   users.
5. Optionally set the hourly rate and the commission percentage.

Requires `staff.add_staff_member`.

### Edit an employee — the record

Open a row (Edit; a record is linkable with `?member=<id>`). The panel shows the whole record in
groups: identity (name, email, phone, employee ID), links (staff role, hub user), operation
(**status** — active / inactive / on leave —, **bookable**, buffer between appointments, hire date,
colour, specialties, bio), **compensation** (hourly rate in euros, commission %) only for a session
with `staff.view_compensation`, and the services performed. Saving sends the whole record.

Through the API editing is **partial**: fields you do not send are left alone. Two sentinels matter
when clearing a link (`role_id`, `user_id`):

- **null** means "do not touch it";
- **empty string** means "clear / unlink".

`terminated` is not a status you can set: it is only reached through Terminate. Requires
`staff.change_staff_member`.

### Services a professional performs

Open a member's record (Edit) and use the **Services performed** section: pick a service from the
Services catalogue and assign it, optionally with a custom duration (minutes) or price for that
professional; a star marks their **primary** service (only one per member); the cross removes it.
Booking screens only offer the professionals who perform the chosen service
(`staff.services.eligible_for_service`). If the Services module is not installed the section shows a
hint and the rest of the record works as usual. Requires `staff.change_staff_member`.

### Deactivate versus terminate

- **Deactivate** takes someone off the floor without deleting anything. It is **refused while they
  have pending or approved absences that have not ended** — you cannot make somebody disappear while
  their holiday is still on the calendar.
- **Terminate** is destructive: a soft delete that sets the status to `terminated`, stamps the last
  day (today if you leave it empty) and keeps the reason. Confirmation required. A terminated member
  disappears from the directory; terminating twice, or someone of another business, is refused.

Both are row actions in the Staff screen (they ask first) and both need
`staff.delete_staff_member` — **admin only**.

### Create employees in bulk

Bulk creation is tolerant per row: rows without a first or last name, or with a malformed hire date,
are skipped and the rest go through. Up to **100 rows**. Requires `staff.add_staff_member`.

### See your own record and absences (self-service)

An employee cannot read the payroll or the reasons of others, but they can read **their own**:
`staff.members.mine` returns the record hanging from the session user (rate and commission included)
and `staff.time_off.mine` their absences with reason and notes. Both work with the everyday
permissions — the scope is the session, not a wider permission.

### See compensation

`staff.members.compensation` gives the hourly rate and commission percentage for one member or for
the whole payroll. Requires `staff.view_compensation` — manager and admin only.

## Roles

The catalogue labels (`staff.roles.list`, 50 rows per page). Requires `staff.view_staff_member`.
Sorted by name. Each row shows the name, the colour and **how many members** hold it.

Create one with a name, a description, a colour and a sort order. Requires
`staff.manage_settings`.

Remember these grant no permissions.

## Time Off — absences

The operational view: **who is away and when** (`staff.time_off.list`, 50 rows per page). Requires
`staff.view_time_off` — an employee has this.

- **Search** by staff name.
- **Filter** by member, leave type, full-day flag, times, status or approver; dates by range.

**The reason and the notes are not here.** They live in `staff.time_off.detail`, behind
`staff.view_time_off_detail`.

### File an absence

1. Pick the member, the **leave type** (`vacation`, `sick`, `personal`, `training`, `other`) and the
   dates.
2. Mark it full-day, or give start and end times.
3. Save.

It is created `pending`, and it is **refused if it overlaps** another pending or approved absence for
the same person. Requires `staff.manage_time_off`.

### Approve, reject or cancel

Change the status. Approving stamps who approved it and when. Requires `staff.manage_time_off`.

### Who is away today

`staff.time_off.today` lists **approved** absences whose range covers today. It says who is missing,
never why.

## Horarios — schedules

Weekly schedule templates per member.

1. Pick the member. Their schedules are listed (`staff.schedules.list_for_member`).
2. Create a schedule with its **working hours per day**: for each weekday (0 = Monday … 6 = Sunday), a
   start and an end time, and optionally a break.
3. Mark it default if it is the usual one — **only one default per member**; creating a new default
   unsets the previous.

4. Each row shows its **hours** at a glance (`staff.schedules.hours_for_member`). Row actions:
   **Edit** (opens the template with its week in the panel; saving replaces the whole week),
   **Activate / deactivate** (an inactive template never counts for availability) and **Delete**
   (asks first).

The rules are checked in the screen and again in the server: start before end, the break inside the
interval, no duplicated weekday, at least one working day, and «effective from» not after
«effective until». Requires `staff.manage_settings` to create/edit, `staff.view_staff_member` to view.

### When can this person work — effective availability

`staff.availability.for_member` (`staff_id`, `date_from`, `date_to`) answers, day by day, the
intervals a professional can actually work: the intervals of the schedule that governs that day
(a template with a validity range beats the default one), split around the break, **minus approved
absences** (a full-day absence removes the day; a partial one cuts the interval). Pending absences
do not count. Booking screens read this to refuse an appointment outside the day or during leave.

`staff.availability.day_at` (`staff_id`, `at`) is the same answer for the one day an instant falls
on, read on the business clock: the governing schedule, its working pieces and the approved
absences of that day. It is what the booking door reads to refuse an appointment when that person
does not work at that hour. A person with no schedule for that day is not restricted by it; an
approved absence always is.

`staff.availability.days_ahead` (`staff_id`, `days`) is that same one-day answer repeated for every
business day from today onwards (at most two years): what the appointment doors that book several
days at once — a batch of sessions, a recurring series — read to refuse each date on which that
person does not work.

`staff.availability.team_day_at` (`at`) is the one-day answer of `day_at` for EVERY person of the
team at once, each row carrying its `staff_id`: what moving an appointment reads, since a move
names the appointment and the new time, not the person, and it is that appointment's own
professional whose day decides.

## Personal — settings

Generated by the shell from the settings schema. Requires `staff.manage_settings`.

It holds the default working hours, the default break duration, booking rules and visibility and
notification flags.

> Saving performs an insert-then-update with a guard, so a hub that never had a settings row gets one
> instead of silently showing schema defaults as if they had been saved.

## Dashboard widgets

| Widget | Shows | Permission | On by default |
|---|---|---|---|
| Headcount | Active employees | `staff.view_staff_member` | yes |
| On leave today | People absent today | `staff.view_time_off` | yes |
| Pending time off | Requests waiting for approval | `staff.view_time_off` | no |
| Time off today | Timeline of who is away | `staff.view_time_off` | yes |
| By role | Distribution of employees per role (top 10) | `staff.view_staff_member` | no |

There is **no clock-in widget**, because there is no clock-in data. "On leave today" is the real
equivalent.

## Commission at the day close

`staff.commissions.summary` gives, per **active** member (terminated and inactive excluded), their
id, name, role and **commission rate**. It knows nothing about sales.

The actual commission is `gross total × rate / 100`, computed by crossing these rows with the
per-professional sales breakdown from `sales`, matching on the staff id. Requires
`staff.view_compensation`.
