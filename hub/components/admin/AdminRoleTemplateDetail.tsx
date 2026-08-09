'use client';

import { useCallback, useEffect, useState } from 'react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import type { AdminRoleTemplateDetailPayload, AdminRoleTemplateVersion } from '@/lib/admin/roles';
import type { AdminGroupRow } from '@/lib/admin/groups';
import type { PublicationReachPreview } from '@/lib/admin/roles';
import {
  reachSummary,
  namedPublications,
  isPlatformWide,
  publishBlockedReason,
} from '@/lib/admin/role-template-reach';

/**
 * FEAT-H040 STORY-2/3/4 — /admin/roles/[id]: the template detail.
 *
 * Seeds render read-only with Clone as the ONLY action (no edit affordances
 * exist to refuse — STORY-4; the platform's P0001 stays pinned at the door).
 * Non-seeds get the draft editor: name/description + the checkbox fabric
 * over the catalogue (the grant-toggle idiom borrowed from the member plane,
 * not imported), prefilled from the live default set. Save-draft appends an
 * unapplied version; Apply/Rollback is ONE danger ceremony carrying the
 * client-computed diff over payload facts (both sides come from the
 * contract; the client only presents) and the blast-radius line. Refusals
 * render verbatim; every successful mutation repaints from a fresh read.
 */

type ViewState =
  | { kind: 'loading' }
  | { kind: 'refused' }
  | { kind: 'error'; message: string }
  | { kind: 'loaded'; payload: AdminRoleTemplateDetailPayload };

type Ceremony =
  | { kind: 'clone' }
  | { kind: 'save' }
  | { kind: 'apply'; version: AdminRoleTemplateVersion }
  // RD-B FEAT-H044 STORY-3 — the reach acts. Each is a distribution decision
  // (who is OFFERED this template), never a change to any group's roles.
  | { kind: 'publish-all' }
  // RD-B walk fix W-5: the targeted publish. The contract has always accepted
  // `p_group_ids uuid[]`; until now nothing could produce one.
  | { kind: 'publish-groups' }
  | { kind: 'unpublish-all' }
  | { kind: 'unpublish-group'; groupId: string; groupName: string | null }
  | null;

type Outcome = { tone: 'error' | 'success'; text: string } | null;

/**
 * RD-B walk fix W-6 — the blast radius, stated before the click.
 *
 * RD-B's discipline is consequence-before-the-click, and the Steward's diff
 * ceremony honours it: it names the holder count and says what happens to
 * those people. The admin's publish ceremony said nothing, though its reach is
 * two orders of magnitude larger and cannot be undone — unpublish withdraws
 * the OFFER, while the notices correctly stand, because they recorded
 * something that was true when sent.
 *
 * Renders nothing while the preview is absent: a missing number degrades the
 * ceremony to what it was, never blocks the publish. The count is an aid, not
 * a gate.
 */
function BlastRadius({ preview }: { preview: PublicationReachPreview | null }) {
  if (!preview) return null;
  const { recipient_count: people, group_count: groups } = preview;
  if (people === 0) {
    return (
      <span data-testid="publish-blast-radius" className="mt-2 block text-xs text-gray-600">
        No one is notified — no group in reach has a member who can manage roles.
      </span>
    );
  }
  return (
    <span data-testid="publish-blast-radius" className="mt-2 block text-xs text-amber-700">
      This will notify {people} {people === 1 ? 'steward' : 'stewards'} across {groups}{' '}
      {groups === 1 ? 'group' : 'groups'}. Those notices cannot be withdrawn.
    </span>
  );
}

const computeDiff = (from: string[], to: string[]) => ({
  added: to.filter((name) => !from.includes(name)).sort(),
  removed: from.filter((name) => !to.includes(name)).sort(),
});

export function AdminRoleTemplateDetail({ templateId }: { templateId: string }) {
  const [view, setView] = useState<ViewState>({ kind: 'loading' });
  const [ceremony, setCeremony] = useState<Ceremony>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [cloneName, setCloneName] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftChecked, setDraftChecked] = useState<Set<string>>(new Set());
  // RD-B walk fix W-5 — the targeted-publish picker.
  const [groupOptions, setGroupOptions] = useState<AdminGroupRow[] | null>(null);
  const [groupOptionsError, setGroupOptionsError] = useState<string | null>(null);
  const [groupQuery, setGroupQuery] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  // RD-B walk fix W-6 — the blast radius, read before the click.
  const [reachPreview, setReachPreview] = useState<PublicationReachPreview | null>(null);

  const loadReachPreview = useCallback(
    async (groupIds: string[] | null) => {
      setReachPreview(null);
      // An empty selection is not a question the contract will answer (22023),
      // and a blank is the correct render for "nothing chosen yet".
      if (groupIds !== null && groupIds.length === 0) return;
      const qs = groupIds === null ? 'scope=all' : `groups=${groupIds.join(',')}`;
      try {
        const res = await fetch(`/api/admin/roles/${templateId}/publish/preview?${qs}`);
        if (!res.ok) return;
        const data = (await res.json()) as { preview: PublicationReachPreview };
        setReachPreview(data.preview);
      } catch {
        // A missing preview degrades to the ceremony without it — never to a
        // blocked publish. The number is an aid, not a gate.
      }
    },
    [templateId],
  );

  const openGroupPicker = async () => {
    setPicked(new Set());
    setReachPreview(null);
    setGroupQuery('');
    setGroupOptions(null);
    setGroupOptionsError(null);
    setCeremony({ kind: 'publish-groups' });
    try {
      // `engagement` specifically: personal groups are never publication
      // targets, and the contract would ignore them anyway — offering them
      // would be offering a no-op.
      const res = await fetch('/api/admin/groups?filter=engagement');
      if (!res.ok) {
        setGroupOptionsError('The group list could not be loaded.');
        return;
      }
      const data = (await res.json()) as { groups: AdminGroupRow[] };
      setGroupOptions(data.groups ?? []);
    } catch {
      setGroupOptionsError('The group list could not be loaded.');
    }
  };

  const load = useCallback(async (reseedDraft = true) => {
    try {
      const res = await fetch(`/api/admin/roles/${templateId}`);
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        setView({ kind: 'refused' });
        return;
      }
      if (!res.ok) {
        setView({ kind: 'error', message: 'The role template could not be loaded.' });
        return;
      }
      const payload = (await res.json()) as AdminRoleTemplateDetailPayload;
      setView({ kind: 'loaded', payload });
      // The draft editor prefills from the LIVE state — the template's name /
      // description and the default version's permission set (what
      // instantiation copies today). Reinitialised on a fresh mount and after
      // Apply/rollback (the live set genuinely changed) — but NOT after Save
      // draft (WA-7, walk ruling 2026-08-05): the local edits ARE the version
      // just saved, and wiping them back to the live set read as "my edit
      // vanished" in the walk.
      if (reseedDraft) {
        setDraftName(payload.template.name);
        setDraftDescription(payload.template.description ?? '');
        const live = payload.versions.find((v) => v.is_default);
        setDraftChecked(new Set(live?.permission_names ?? []));
      }
      return payload;
    } catch {
      setView({ kind: 'error', message: 'The role template could not be loaded.' });
    }
  }, [templateId]);

  useEffect(() => {
    void load();
  }, [load]);

  const mutate = async (
    path: string,
    body: Record<string, unknown>,
    successText: string | ((fresh: AdminRoleTemplateDetailPayload | undefined) => string),
    opts?: { keepDraft?: boolean; method?: 'POST' | 'DELETE' },
  ) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/roles/${templateId}/${path}`, {
        method: opts?.method ?? 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        // The refusal renders verbatim — the platform's message is the truth.
        setOutcome({ tone: 'error', text: payload.error ?? 'The request was refused.' });
        setCeremony(null);
        return;
      }
      setCeremony(null);
      // The honest repaint — always from a fresh read. WA-7: Save draft keeps
      // the fabric (the edits are the version just saved); Apply/rollback
      // re-seed it (the live set changed).
      const fresh = await load(!opts?.keepDraft);
      setOutcome({
        tone: 'success',
        text: typeof successText === 'function' ? successText(fresh) : successText,
      });
    } finally {
      setBusy(false);
    }
  };

  if (view.kind === 'refused') {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-2">
        <h1 className="text-2xl font-semibold">404</h1>
        <p className="text-gray-600">This page could not be found.</p>
      </main>
    );
  }

  if (view.kind === 'loading') {
    return (
      <div role="status" aria-label="Loading role template" className="space-y-2 p-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-gray-200" />
        ))}
      </div>
    );
  }

  if (view.kind === 'error') {
    return (
      <main className="p-6">
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>{view.message}</p>
          <button
            onClick={() => {
              setView({ kind: 'loading' });
              void load();
            }}
            className="mt-2 rounded border border-red-300 px-3 py-1 text-sm text-red-800"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  const { template, versions, catalog, publications } = view.payload;
  const liveVersion = versions.find((v) => v.is_default) ?? null;
  // RD-B FEAT-H044 STORY-3 — reach, read from the payload and never computed.
  const reachNamed = namedPublications(publications);
  const reachIsAll = isPlatformWide(publications);
  const reachBlocked = publishBlockedReason(template);
  const applying = ceremony?.kind === 'apply' ? ceremony.version : null;
  const diff = applying ? computeDiff(liveVersion?.permission_names ?? [], applying.permission_names) : null;

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          {template.name}
          {template.is_system && (
            <span className="rounded bg-indigo-50 px-2 py-0.5 text-sm text-indigo-700">Seeded</span>
          )}
        </h1>
        {template.is_system && (
          <button
            data-testid="clone-button"
            onClick={() => {
              setCloneName('');
              setCeremony({ kind: 'clone' });
            }}
            className="rounded border border-indigo-300 px-3 py-1 text-sm text-indigo-700"
          >
            Clone…
          </button>
        )}
      </div>
      {template.description && <p className="text-sm text-gray-600">{template.description}</p>}
      {template.is_system && (
        <p className="text-sm text-gray-500">
          Seeded role templates are immutable — clone one to make an editable template.
        </p>
      )}

      {outcome && (
        <p
          data-testid="ceremony-outcome"
          role={outcome.tone === 'error' ? 'alert' : 'status'}
          className={
            outcome.tone === 'error'
              ? 'rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800'
              : 'rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800'
          }
        >
          {outcome.text}
        </p>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-medium">Version history</h2>
        <ul className="space-y-2">
          {versions.map((v) => (
            <li
              key={v.id}
              data-testid={`version-row-${v.version_number}`}
              className="flex flex-wrap items-baseline gap-2 border-t border-gray-100 pt-2 text-sm first:border-t-0 first:pt-0"
            >
              <span className="font-medium">
                v{v.version_number} · {v.name}
              </span>
              {v.is_default && (
                <span
                  data-testid="default-version-marker"
                  className="rounded bg-green-50 px-1.5 py-0.5 text-xs text-green-800"
                >
                  Default
                </span>
              )}
              <span className="text-xs text-gray-500">
                {v.permission_names.length} permission{v.permission_names.length === 1 ? '' : 's'} ·{' '}
                {v.created_by_display_name ?? 'unknown'} · {new Date(v.created_at).toLocaleString()}
              </span>
              {v.description && <span className="text-xs text-gray-500">{v.description}</span>}
              {!template.is_system && !v.is_default && (
                <button
                  data-testid={`apply-version-${v.version_number}`}
                  onClick={() => setCeremony({ kind: 'apply', version: v })}
                  className="rounded border border-red-300 px-2 py-0.5 text-xs text-red-700"
                >
                  Apply…
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* RD-B FEAT-H044 STORY-3 — who this template is FOR.
          Absent on system templates: they are the floor every group is built
          on and are not distributed, so there is no reach to state and no act
          to explain away. */}
      {!template.is_system && (
        <section
          data-testid="reach-section"
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
        >
          <h2 className="mb-1 text-lg font-medium">Reach</h2>
          <p data-testid="reach-summary" className="mb-2 text-sm text-gray-700">
            {reachSummary(publications)}
          </p>

          {reachBlocked && (
            <p data-testid="reach-blocked" className="mb-2 text-sm text-amber-700">
              {reachBlocked}
            </p>
          )}

          {reachNamed.length > 0 && (
            <ul className="mb-3 space-y-1">
              {reachNamed.map((p) => (
                <li
                  key={p.group_id ?? 'all'}
                  data-testid="reach-row"
                  className="flex items-baseline gap-2 text-sm"
                >
                  <span className="font-medium">{p.group_name ?? 'Unknown group'}</span>
                  <span className="text-xs text-gray-500">
                    since {new Date(p.published_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() =>
                      setCeremony({
                        kind: 'unpublish-group',
                        groupId: p.group_id!,
                        groupName: p.group_name,
                      })
                    }
                    className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-700"
                  >
                    Unpublish
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-2">
            {reachIsAll ? (
              <button
                onClick={() => setCeremony({ kind: 'unpublish-all' })}
                className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700"
              >
                Unpublish from all groups
              </button>
            ) : (
              // Retirement blocks the OFFER, not the withdrawal — so Publish
              // disappears with a stated reason while Unpublish stays.
              !reachBlocked && (
                <>
                  <button
                    onClick={() => {
                      setReachPreview(null);
                      setCeremony({ kind: 'publish-all' });
                      // W-6: read the blast radius as the ceremony opens.
                      void loadReachPreview(null);
                    }}
                    className="rounded border border-indigo-300 px-3 py-1 text-sm text-indigo-700"
                  >
                    Publish to all groups
                  </button>
                  {/* W-5: the act RD-B is actually FOR — offering a template to
                      the groups it was made for, rather than to everyone. */}
                  <button
                    onClick={() => void openGroupPicker()}
                    className="rounded border border-indigo-300 px-3 py-1 text-sm text-indigo-700"
                  >
                    Publish to specific groups…
                  </button>
                </>
              )
            )}
          </div>

          {/* RD-2, stated where the action is taken. Withdrawing an offer
              never reaches into a group — this is the sentence that stops
              Unpublish reading like a deletion. */}
          <p data-testid="reach-unpublish-note" className="mt-2 text-xs text-gray-500">
            Publishing only offers this template — it never adds a role to a group. Unpublishing
            withdraws the offer; copies groups have already adopted are unaffected and keep working.
          </p>
        </section>
      )}

      {!template.is_system && (
        <section
          data-testid="draft-editor"
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
        >
          <h2 className="mb-1 text-lg font-medium">Draft a new version</h2>
          <p className="mb-3 text-sm text-gray-500">
            Edits here become a saved version in the history — nothing changes for any group or
            member until you Apply it.
          </p>
          <div className="mb-3 space-y-2">
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-gray-700">Name</span>
              <input
                data-testid="draft-name"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className="w-full max-w-md rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-gray-700">Description</span>
              <textarea
                data-testid="draft-description"
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                rows={2}
                className="w-full max-w-md rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </label>
          </div>
          <div className="mb-3 grid gap-1 sm:grid-cols-2">
            {catalog.map((p) => (
              <label key={p.name} className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  data-testid={`grant-toggle-${p.name}`}
                  checked={draftChecked.has(p.name)}
                  onChange={(e) => {
                    const next = new Set(draftChecked);
                    if (e.target.checked) next.add(p.name);
                    else next.delete(p.name);
                    setDraftChecked(next);
                  }}
                />
                <span>{p.name}</span>
                <span className="text-gray-400">({p.category})</span>
              </label>
            ))}
          </div>
          <button
            data-testid="save-draft-button"
            onClick={() => setCeremony({ kind: 'save' })}
            className="rounded border border-indigo-300 px-3 py-1 text-sm text-indigo-700"
          >
            Save draft…
          </button>
        </section>
      )}

      <ConfirmModal
        isOpen={ceremony?.kind === 'clone'}
        title="Clone role template"
        message={
          <span className="block space-y-2 text-left">
            <span className="block">
              Clones {template.name}&rsquo;s live permission set into a new template. From the
              moment it exists, the clone appears in every member&rsquo;s group-creation options and
              in every Steward&rsquo;s add-role template picker. Groups created without a
              chosen template start with the system set only (WA-6) — a clone joins a
              group only when someone chooses it.
            </span>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-gray-700">New template name</span>
              <input
                data-testid="clone-name-input"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </label>
          </span>
        }
        confirmText="Clone"
        variant="info"
        busy={busy}
        onConfirm={() => void mutate('clone', { name: cloneName }, 'Cloned.')}
        onCancel={() => {
          if (!busy) setCeremony(null);
        }}
      />

      <ConfirmModal
        isOpen={ceremony?.kind === 'save'}
        title="Save draft"
        message={`Saves your edits as a new version in ${template.name}'s history. Nothing changes for any group or member until you Apply it.`}
        confirmText="Save draft"
        variant="info"
        busy={busy}
        onConfirm={() =>
          void mutate(
            'versions',
            {
              name: draftName,
              description: draftDescription === '' ? null : draftDescription,
              permission_names: Array.from(draftChecked).sort(),
            },
            // WA-7: name the version the ledger just gained — the banner is
            // the pointer from "my edits below" to "the row awaiting Apply".
            (fresh) => {
              const newest = fresh
                ? Math.max(...fresh.versions.map((v) => v.version_number))
                : null;
              return newest
                ? `Draft saved as v${newest} — awaiting Apply.`
                : 'Draft saved — awaiting Apply.';
            },
            { keepDraft: true },
          )
        }
        onCancel={() => {
          if (!busy) setCeremony(null);
        }}
      />

      {/* RD-B walk fix W-5 — the targeted publish. The picker rides inside the
          house ceremony (ReactNode message + confirmDisabled, both already
          there from H039/H041) rather than becoming a bespoke modal. */}
      <ConfirmModal
        isOpen={ceremony?.kind === 'publish-groups'}
        title="Publish to specific groups"
        message={
          <div className="text-left text-sm">
            <p className="mb-2 text-gray-600">
              Offers &ldquo;{template.name}&rdquo; to the groups you choose. Stewards there
              decide whether to copy it — publishing never adds a role to a group.
            </p>
            {groupOptionsError && (
              <p role="alert" className="mb-2 text-red-600">
                {groupOptionsError}
              </p>
            )}
            {!groupOptions && !groupOptionsError && <p>Loading groups…</p>}
            {groupOptions && (
              <>
                <input
                  data-testid="group-search"
                  value={groupQuery}
                  onChange={(e) => setGroupQuery(e.target.value)}
                  placeholder="Search groups"
                  className="mb-2 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {groupOptions
                    .filter((g) => g.name.toLowerCase().includes(groupQuery.toLowerCase()))
                    .map((g) =>
                      reachNamed.some((p) => p.group_id === g.id) ? (
                        <p
                          key={g.id}
                          data-testid={`group-already-published-${g.id}`}
                          className="px-1 text-xs text-gray-400"
                        >
                          {g.name} — already published
                        </p>
                      ) : (
                        <label
                          key={g.id}
                          data-testid={`group-option-${g.id}`}
                          className="flex items-center gap-2 px-1 text-sm text-gray-700"
                        >
                          <input
                            type="checkbox"
                            checked={picked.has(g.id)}
                            onChange={(e) => {
                              const next = new Set(picked);
                              if (e.target.checked) next.add(g.id);
                              else next.delete(g.id);
                              setPicked(next);
                              // W-6: preview exactly the selection being made.
                              void loadReachPreview([...next]);
                            }}
                          />
                          <span>{g.name}</span>
                        </label>
                      ),
                    )}
                </div>
                <p className="mt-2 text-xs text-gray-500">{picked.size} selected.</p>
                <BlastRadius preview={reachPreview} />
              </>
            )}
          </div>
        }
        confirmText="Publish"
        variant="info"
        busy={busy}
        // Publishing to nobody is not an act; the route refuses an empty array,
        // so offering Confirm here would be offering a refusal (the WA-1 rule).
        confirmDisabled={picked.size === 0}
        onConfirm={() =>
          void mutate('publish', { group_ids: [...picked] }, `Published to ${picked.size} group${picked.size === 1 ? '' : 's'}.`)
        }
        onCancel={() => {
          if (!busy) setCeremony(null);
        }}
      />

      {/* RD-B FEAT-H044 STORY-3 — one ceremony for all three reach acts. Each
          states its consequence before the click, and every one of them is a
          change to who is OFFERED the template, never to any group's roles. */}
      <ConfirmModal
        isOpen={
          ceremony?.kind === 'publish-all' ||
          ceremony?.kind === 'unpublish-all' ||
          ceremony?.kind === 'unpublish-group'
        }
        title={ceremony?.kind === 'publish-all' ? 'Publish to all groups' : 'Withdraw the offer'}
        message={
          ceremony?.kind === 'publish-all' ? (
            <span className="block text-left">
              <span className="block">
                Offers &ldquo;{template.name}&rdquo; to every group. Stewards choose whether to
                copy it — publishing never adds a role to any group.
              </span>
              <BlastRadius preview={reachPreview} />
            </span>
          ) : ceremony?.kind === 'unpublish-all'
              ? `Stops offering "${template.name}" to all groups. Copies groups have already adopted are unaffected and keep working.`
              : ceremony?.kind === 'unpublish-group'
                ? `Stops offering "${template.name}" to ${ceremony.groupName ?? 'this group'}. Their existing copy, if they made one, is unaffected and keeps working.`
                : ''
        }
        confirmText={ceremony?.kind === 'publish-all' ? 'Publish' : 'Unpublish'}
        variant={ceremony?.kind === 'publish-all' ? 'info' : 'warning'}
        busy={busy}
        onConfirm={() => {
          if (ceremony?.kind === 'publish-all') {
            void mutate('publish', { group_ids: null }, 'Published to all groups.');

          } else if (ceremony?.kind === 'unpublish-all') {
            void mutate('publish', { group_ids: null }, 'Offer withdrawn.', {
              method: 'DELETE',
            });
          } else if (ceremony?.kind === 'unpublish-group') {
            void mutate('publish', { group_ids: [ceremony.groupId] }, 'Offer withdrawn.', {
              method: 'DELETE',
            });
          }
        }}
        onCancel={() => {
          if (!busy) setCeremony(null);
        }}
      />

      <ConfirmModal
        isOpen={ceremony?.kind === 'apply'}
        title={applying ? `Apply v${applying.version_number}` : 'Apply'}
        message={
          applying && diff ? (
            <span className="block space-y-2 text-left">
              {applying.name !== template.name && (
                <span data-testid="diff-name-change" className="block">
                  Renames &ldquo;{template.name}&rdquo; to &ldquo;{applying.name}&rdquo;.
                </span>
              )}
              {diff.added.length > 0 && (
                <span data-testid="diff-added" className="block">
                  Adds: <span className="font-mono text-xs">{diff.added.join(', ')}</span>
                </span>
              )}
              {diff.removed.length > 0 && (
                <span data-testid="diff-removed" className="block">
                  Removes: <span className="font-mono text-xs">{diff.removed.join(', ')}</span>
                </span>
              )}
              {diff.added.length === 0 && diff.removed.length === 0 && (
                <span className="block">No permission changes.</span>
              )}
              <span data-testid="blast-radius" className="block">
                {template.instantiated_role_count} existing group roles keep their snapshot; future
                groups instantiate the new set.
              </span>
            </span>
          ) : (
            ''
          )
        }
        confirmText="Apply"
        variant="danger"
        busy={busy}
        onConfirm={() => {
          if (applying) void mutate('default', { version_id: applying.id }, 'Applied.');
        }}
        onCancel={() => {
          if (!busy) setCeremony(null);
        }}
      />
    </main>
  );
}
