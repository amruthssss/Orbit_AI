/** Presentational seam for user settings. */
export function SettingsForm({ environment }: { environment: string }) {
  return <section aria-label="Settings"><h2>Settings</h2><p>Environment: {environment}</p></section>;
}
