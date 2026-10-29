const RULES = [
  {
    title: 'One table per upload',
    body: 'The keyboard takes the whole 576-byte table in a single transfer. Edits stay on this page until the commit is accepted.',
  },
  {
    title: 'Fn layer stores overrides only',
    body: 'Keys you leave alone keep their firmware behaviour. Clearing an override is not the same as restoring the top layer.',
  },
  {
    title: 'Restore works one layer at a time',
    body: 'Restoring the top layer leaves Fn overrides alone. Clearing Fn leaves the top layer alone.',
  },
];

export function WriteRules() {
  return (
    <aside
      aria-labelledby="write-rules-title"
      className="rounded-panel border border-line bg-surface p-4"
    >
      <h2 id="write-rules-title" className="text-[11px] font-medium text-muted">
        Before you upload
      </h2>
      <dl className="mt-2">
        {RULES.map((rule) => (
          <div
            key={rule.title}
            className="border-t border-line/60 py-2.5 first:border-t-0 first:pt-1"
          >
            <dt className="text-xs font-medium text-ivory">{rule.title}</dt>
            <dd className="mt-1 text-[11px] leading-relaxed text-muted">{rule.body}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-1 border-t border-line/60 pt-3 text-[11px] leading-relaxed text-muted">
        Close the vendor app before connecting. It holds the same USB interface.
      </p>
    </aside>
  );
}
