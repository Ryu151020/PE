/* Fixed internal account (as requested). NOTE: this check runs in the browser, so the values are visible in the
   shipped JavaScript — it keeps casual visitors out of the UI but is NOT real security.
   Real protection for the DATA is the optional API token checked by gas/code.gs (see README). */
export const VALID_USERNAME = "Intco";
export const VALID_PASSWORD = "123";
