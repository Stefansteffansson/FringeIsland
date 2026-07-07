import type { PlayerStep } from '@/lib/journeys/player';

/**
 * FEAT-H020 STORY-6 / JRN-18 — the step-kind renderer registry. The DS-3
 * step-kind vocabulary is OPEN (ADR-U044 killed the sealed TS union): renderers
 * are looked up by `kind: string` against a plain map, and any key the map does
 * not know falls to the MANDATORY fallback. Adding a kind is data-only — no
 * union, no exhaustive switch, no Hub change needed to keep functioning.
 *
 * Content is `unknown` and placeholder-quality this cycle (rich authoring/preview
 * is DS-4, forward). Each renderer narrows the payload defensively and presents
 * it plainly per kind; the ask-verb completion affordance is the StepCanvas's, not
 * the renderer's. A null/odd payload must render as data, never crash the canvas.
 */
export type StepRenderer = (props: { step: PlayerStep }) => React.ReactElement;

/** Narrow to the first non-empty string among the given keys of an object payload. */
function pickText(content: unknown, keys: string[]): string | null {
  if (content && typeof content === 'object') {
    const obj = content as Record<string, unknown>;
    for (const key of keys) {
      const value = obj[key];
      if (typeof value === 'string' && value.trim().length > 0) return value;
    }
  }
  return null;
}

/** Narrow to the first non-empty list among the given keys — strings, or objects
 *  carrying a `label`/`text` — so choice/checklist/assessment payloads show. */
function pickList(content: unknown, keys: string[]): string[] | null {
  if (content && typeof content === 'object') {
    const obj = content as Record<string, unknown>;
    for (const key of keys) {
      const value = obj[key];
      if (!Array.isArray(value)) continue;
      const items = value
        .map((entry) => {
          if (typeof entry === 'string') return entry;
          if (entry && typeof entry === 'object') {
            const rec = entry as Record<string, unknown>;
            if (typeof rec.label === 'string') return rec.label;
            if (typeof rec.text === 'string') return rec.text;
          }
          return null;
        })
        .filter((item): item is string => !!item && item.trim().length > 0);
      if (items.length > 0) return items;
    }
  }
  return null;
}

function Eyebrow({ label }: { label: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
  );
}

function Prose({ text }: { text: string }) {
  return (
    <p data-testid="step-body" className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
      {text}
    </p>
  );
}

function Items({ items }: { items: string[] }) {
  return (
    <ul data-testid="step-items" className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

interface KindConfig {
  testid: string;
  label: string;
  textKeys: string[];
  listKeys: string[];
}

/** Build a distinct renderer per kind — the seven map values below are seven
 *  functions, so "add a registry row" reads literally as data (a new entry). */
function makeRenderer(config: KindConfig): StepRenderer {
  const KindRenderer: StepRenderer = ({ step }) => {
    const text = pickText(step.content, config.textKeys);
    const list = config.listKeys.length > 0 ? pickList(step.content, config.listKeys) : null;
    return (
      <div data-testid={config.testid} data-kind={step.kind}>
        <Eyebrow label={config.label} />
        {text && <Prose text={text} />}
        {list && <Items items={list} />}
      </div>
    );
  };
  return KindRenderer;
}

const REGISTRY: Record<string, StepRenderer> = {
  narrative: makeRenderer({
    testid: 'renderer-narrative',
    label: 'Narrative',
    textKeys: ['body', 'text', 'markdown'],
    listKeys: [],
  }),
  reflection: makeRenderer({
    testid: 'renderer-reflection',
    label: 'Reflection',
    textKeys: ['prompt', 'body', 'text'],
    listKeys: [],
  }),
  assessment: makeRenderer({
    testid: 'renderer-assessment',
    label: 'Assessment',
    textKeys: ['question', 'prompt', 'body'],
    listKeys: ['options', 'choices', 'answers'],
  }),
  choice: makeRenderer({
    testid: 'renderer-choice',
    label: 'Choice',
    textKeys: ['prompt', 'question', 'body'],
    listKeys: ['options', 'choices'],
  }),
  activity: makeRenderer({
    testid: 'renderer-activity',
    label: 'Activity',
    textKeys: ['instructions', 'body', 'text'],
    listKeys: ['steps', 'tasks'],
  }),
  journal: makeRenderer({
    testid: 'renderer-journal',
    label: 'Journal',
    textKeys: ['prompt', 'body', 'text'],
    listKeys: [],
  }),
  checklist: makeRenderer({
    testid: 'renderer-checklist',
    label: 'Checklist',
    textKeys: ['prompt', 'body', 'text'],
    listKeys: ['items', 'tasks'],
  }),
};

/**
 * The mandatory fallback: any kind the registry does not know still renders its
 * payload as data (broad string/list narrowing, or a bare string payload) — the
 * canvas supplies the title and the generic complete affordance around it, so
 * an unknown kind is never a crash and never a blank canvas.
 */
export const FallbackRenderer: StepRenderer = ({ step }) => {
  const text =
    typeof step.content === 'string'
      ? step.content
      : pickText(step.content, ['body', 'text', 'prompt', 'question', 'instructions', 'description', 'markdown']);
  const list = pickList(step.content, ['items', 'options', 'choices', 'steps', 'tasks']);
  return (
    <div data-testid="renderer-fallback" data-kind={step.kind}>
      {text && <Prose text={text} />}
      {list && <Items items={list} />}
    </div>
  );
};

/** Open-vocabulary lookup: the kind's renderer, or the fallback. Never a switch. */
export function getStepRenderer(kind: string): StepRenderer {
  return REGISTRY[kind] ?? FallbackRenderer;
}
