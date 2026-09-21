/* Page title now lives in the global <Header/> (greeting + H1). Pages only contribute their action row. */
export function PageHeader({ actions }) {
  if (!actions) return null;
  return <div className="flex flex-wrap items-center justify-end gap-3">{actions}</div>;
}
