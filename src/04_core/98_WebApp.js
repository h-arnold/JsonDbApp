/**
 * doGet entrypoint for the GAS web app.
 * Enforces that the active user matches the effective user to avoid accidental exposure
 * if the deployment is misconfigured. Throws on mismatch rather than rendering an error page
 * to minimise the surface for unintended data leakage.
 *
 * @param {GoogleAppsScript.Events.DoGet} e - Web app request event
 * @returns {GoogleAppsScript.HTML.HtmlOutput} Rendered HTML output
 * @throws {Error} When active and effective users do not align
 */
function doGet(e) {
  const activeUser = Session.getActiveUser();
  const effectiveUser = Session.getEffectiveUser();

  const activeEmail = activeUser && activeUser.getEmail ? activeUser.getEmail() : '';
  const effectiveEmail = effectiveUser && effectiveUser.getEmail ? effectiveUser.getEmail() : '';

  if (!activeEmail || !effectiveEmail || activeEmail !== effectiveEmail) {
    throw new Error('Unauthorised: active user does not match effective user. Ensure deployment is restricted to self.');
  }

  // Placeholder output until the built frontend is wired in via HtmlService.
  return HtmlService.createHtmlOutput('<h1>JsonDbApp WebApp</h1><p>Frontend build pending.</p>');
}
