# Optional application extensions

Read only when approved reference scope requires server data, forms, or shared
client state. These are independent extensions to landing-page architecture,
not a replacement architecture or permission to implement services. Library
capabilities below were checked against official documentation on 2026-10-03;
verify current compatibility when selecting versions in a future project.

## Branch selection

| Approved behavior | Branch | Smallest starting point |
| --- | --- | --- |
| Static landing, menu, carousel, scroll/GPU effect | None | Static content, local React state, refs/lifecycle modules |
| Filter a bundled project list | None | Derived data; router search params if shareable |
| Fetch/filter a remote catalog | Server state | Existing framework data path or fetch |
| Contact/newsletter submission | Forms; server state only if remote cache needs it | Native form and existing submission path |
| Repeated remote mutations with cache updates | Server state; Forms if inputs need it | One cache owner and explicit invalidation |
| Draft shared across distant consumers/routes | Shared client state; Forms if editing | Lifted state or scoped Context first |

Do not infer a live API, authentication system, email delivery, or backend from
visual controls. Record local/mock/live behavior and any missing contract that
blocks the requested live behavior. Use a local demonstration only when scope
permits it, and do not describe it as a working remote submission.

URL state belongs to the selected router, irrespective of branch. Derive counts,
filtered lists, and totals from their source rather than storing extra copies.

## Server state

Trigger: approved behavior reads/writes remote data. Determine separately whether
it needs a client cache. A server-rendered content page or single submission does
not automatically justify a query library.

1. Preserve the framework and its existing data/mutation conventions. Next.js
   App Router remains the router; do not add a SPA router for this extension.
2. Use existing framework facilities or native fetch when sufficient. Shared
   HTTP handling belongs in a small existing client, only when repetition
   justifies it. Define non-success response, cancellation, and parse failures.
3. Consider TanStack Query when client-side caching, deduplication, background
   refresh, invalidation, or optimistic updates are required. Existing SWR or
   RTK Query can remain the owner; do not add a second cache for the same data.
4. Keep endpoint requests and query definitions with the owning module.
   Shared API code contains transport concerns, not every business endpoint.

Record the source of truth, query identity (including relevant filters), freshness
policy, invalidation, loading/empty/error behavior, and request cancellation.
Choose mutation retry/optimistic behavior deliberately; do not retry a
non-idempotent action blindly. Never copy query results into Zustand/Redux just
to share them. A separate editing draft needs explicit initialize/reset/save
semantics. In SSR, isolate request-specific mutable stores/caches to prevent
cross-request data sharing and specify server/client transfer where needed.

TypeScript annotations do not validate remote input. Define runtime validation
at untrusted data boundaries when required by the contract; Zod is a candidate,
not a mandate to validate every internal function. A real backend remains
responsible for authoritative validation and authorization.

## Forms

Trigger: approved behavior includes input, validation, and submission. An input
styled to match a reference does not alone require a form library.

- Start with semantic HTML, labels, native constraints, FormData, and the existing
  framework submission mechanism for simple forms.
- Consider React Hook Form for dynamic fields, dirty/touched state, complex
  validation, or multi-step flows that would otherwise require substantial
  bespoke state handling.
- Consider Zod when a reusable runtime schema is needed. With React Hook Form,
  use a compatible resolver only if schema integration is selected. Prefer
  inferred types over duplicating a schema with a handwritten form type.
- Keep values/errors local to the form. Do not mirror every keystroke into a
  global store. Cross-route drafts activate Shared client state only when their
  lifetime actually requires it.

Record field schema, validation timing, accessible errors/focus, submission
pending/success/failure, duplicate-submit prevention, and reset behavior. For live
forms, distinguish field failures from transport failures and preserve user input
on failure. Keep client UX validation separate from server enforcement. Record
whether the form is local/mock/live; do not invent an endpoint or transmit data
while producing this architecture contract.

## Shared client state

Trigger: multiple distant consumers must read/write the same client-owned state,
or that state must outlive a route. Multiple consumers alone do not justify a
library when a common parent can own the value naturally.

| Candidate | Select when |
| --- | --- |
| useState/useReducer with props | A common owner and explicit data flow are sufficient |
| Scoped Context | A subtree needs a shared value/dispatch without a separate store |
| Zustand | Shared state and actions need selective subscriptions with a small store interface |
| Jotai | Atom composition and dependent derived state fit the interaction model |
| Redux Toolkit | Coordinated events, reducer conventions, and traceable complex updates are required |

Preserve a suitable installed solution before introducing another. Do not install
Zustand, Jotai, and Redux together as options. Store files live beside the owning
module; only truly app-wide initialization belongs at the app composition level.
A theme, menu, or carousel alone does not mandate a global store.

Record the owner, readers/writers, lifetime, reset on navigation/logout where
applicable, and whether persistence is required. Persist only justified fields;
specify hydration and schema migration if persisted. Keep server data in its
cache and URL state in the router. Subscribe to needed values rather than the
whole store. Pointer coordinates, scroll velocity, RAF time, GPU resources, and
shader uniforms remain in the existing motion/render lifecycle, not reactive
application stores.

## Folder placement and styling

Follow [portable-structure.md](portable-structure.md); extensions do not add an
alternative layout. A form belongs under `components/<ModuleName>` or
its actual Section owner. Colocate its schema, transport and tests when needed:

```text
components/ContactForm/
  ContactForm.tsx
  contact.schema.ts        # only when a runtime schema is needed
  contact.api.ts           # only when live transport belongs here
  ContactForm.test.tsx     # planned downstream behavior verification
```

Query definitions may use an adjacent `*.queries.ts`; a justified client store
may use `*.store.ts`. Do not automatically create all of these files, split a
trivial file into api/model/ui directories, or add pass-through service and
repository layers. Keep types, hooks, styles, and tests beside their owner.

Preserve the chosen CSS Modules/Tailwind convention. The parent reconstruction
may require Tailwind and portability constraints; these take precedence over
standalone examples. UI primitives such as shadcn/ui are optional and must satisfy
observed geometry, interaction, and accessibility after adaptation. They do not
justify replacing the reference with library defaults. Keep shared UI and design
tokens under one clear ownership convention.

## Packet additions and verification

For each selected branch, add to the existing architecture packet:

- trigger and approved local/mock/live behavior;
- state owner, consumers, lifetime, and public interface;
- dependency choice, simpler option considered, and rejected overlap;
- applicable error/loading/empty/success and reset behavior;
- planned observable checks and implementation-blocking contract gaps.

Plan the smallest meaningful behavior checks. Existing test tooling takes
priority; Vitest and React Testing Library are candidates for logic and component
behavior, and MSW is useful when network outcomes need controlled reproduction.
No test dependency is required merely because this guide was read. Retain the
parent's visual/signature/GPU gates and the user's connected-Chrome browser
policy. Type checks, logic tests, and builds do not prove visual parity. This
skill specifies checks; downstream implementation creates and runs them.

## Official references

- [React app composition and data-tool choices](https://react.dev/learn/build-a-react-app-from-scratch)
- [TanStack Query server state](https://tanstack.com/query/latest/docs/framework/react/overview)
- [React Hook Form](https://react-hook-form.com/get-started) and [Zod](https://zod.dev/)
- [Zustand](https://zustand.docs.pmnd.rs/getting-started/introduction), [Jotai](https://jotai.org/), and [Redux guidance](https://redux.js.org/style-guide/)
- [Next.js project conventions](https://nextjs.org/docs/app/getting-started/project-structure)
- [Vitest](https://vitest.dev/guide/), [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/), and [MSW](https://mswjs.io/docs/)
