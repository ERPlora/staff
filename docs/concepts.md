# Staff — Concepts

The things people get wrong on their first day.

## A staff role grants nothing

"Senior stylist" is a **catalogue label** with a colour and a sort order. It does not give access to
a screen, a command or a number.

Access comes from the **hub user's** role — `owner`, `admin`, `manager`, `employee` — which lives in
the core, not here. Two people can both be "stylist" and have completely different permissions.

## A staff member and a hub user are two different rows

The link between them is **optional in both directions**:

- a professional who never touches the till has a staff record and **no user**;
- a manager who never serves customers has a user and **no staff record**.

When editing, two sentinels distinguish "leave it alone" from "unlink": **null** means do not touch
the field, an **empty string** means remove the link. Sending the wrong one silently does the wrong
thing.

## Compensation and absence reasons are hidden on purpose

An employee can read the directory and the absence list, so two kinds of data were deliberately taken
out of them:

- **Hourly rate and commission** are in their own query, behind `staff.view_compensation`.
- **The reason and the notes of an absence** are in their own query, behind
  `staff.view_time_off_detail`. A sick leave is health data.

This is why the directory has no pay column *and* no pay filter: a range filter on an invisible value
is a way of guessing it.

The everyday views answer **who is who** and **who is away and when** — never **why**.

## Deactivate, terminate, delete

Three different things, and picking the wrong one loses information:

- **Deactivate** — off the floor, everything kept. **Refused while the person has pending or approved
  absences that have not ended yet.** You cannot deactivate somebody whose holiday is still on the
  calendar.
- **Terminate** — the person has left. Soft delete, status `terminated`, termination date stamped.
- There is **no hard delete**. Nothing is erased.

## An absence cannot overlap another absence

Filing time off is refused if it overlaps an existing **pending or approved** absence for the same
person. Rejected and cancelled ones do not block.

The check is done in the write itself, so two requests filed at the same moment cannot both get
through.

## Approval is a status change, and it records who approved

`pending` → `approved`, `rejected` or `cancelled`. Approving stamps the approver and the moment.
Nothing is deleted when a request is rejected; the record of the request survives.

## "On leave today" means approved and covering today

The today view and the widgets count **approved** absences whose range covers the current date. A
pending request does not make somebody absent, and an approved one for next month does not either.

## There is no clock-in, and there is no fake one

The module has **no time-tracking table**: no arrival, no departure, no worked hours. That is why
there is no "today's clock-ins" widget — inventing one with no data behind it was rejected.

What exists is the opposite question: who is **not** available today.

## A schedule is a template, not a calendar

A schedule holds the working hours of each weekday for one member, optionally with a break, and
optionally a validity range. It says what a normal week looks like; it is not a list of dated shifts.

- **Weekdays are 0 = Monday … 6 = Sunday.**
- A weekday can appear **once** per schedule.
- Start must be before end, and a break must fall inside the interval — both ends or neither.
- **Only one schedule per member can be the default.** Creating a new default unsets the previous one
  in the same transaction.

## Commission: this module has the rate, `sales` has the money

`staff.commissions.summary` publishes the **percentage** per active member. It has no idea what
anybody sold.

The amount is computed by whoever builds the day close: take the per-professional sales totals from
`sales`, match them by staff id, and apply `gross × rate / 100`. There is no cross-module join and no
command that does it for you — it is a seam, on purpose.

Terminated and inactive members are excluded from that summary.

## The service list on a member is an opaque reference

Saying "this person does colour treatments" stores the **service id** with the name copied alongside,
and no foreign key to the `services` module. Renaming a service there does not update the copy here.

## Bookable is a flag, and the diary respects it

`is_bookable` is what makes somebody appear in the appointment professional selector, together with
an optional booking buffer. Someone active but not bookable works but is never offered a slot.
