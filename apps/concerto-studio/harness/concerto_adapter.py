"""concerto_adapter.py — the Concerto adapter behind the harness API.

Owns the Playwright browser session and everything Concerto-specific
(URLs, DOM conventions, render-race protections). The HTTP layer
(server.py) and Studio know nothing about selectors; the crawlers use the
page helpers here. Replacing Playwright with an HTTP/API adapter later
means re-implementing this module's public surface only.

READ-ONLY BY CONSTRUCTION:
- WRITE_CAPABILITY is False and there is no write method of any kind.
- The adapter never enters credentials; a human signs in at the visible
  browser window (session state is detected, never created).
- Crawlers never press SAVE/DELETE; transient form opens end in CANCEL.

Technique provenance: docs/DISCOVERY-TECHNIQUES-AND-LESSONS.md —
tab-strip navigation, GUID harvesting from pbl_form_<guid> checkbox ids
and PblActions.nav handlers, batched form_view navigation with
name-match verification (stale-panel defence), record VIEW pages for
data the Edit form lacks.
"""

from __future__ import annotations

import re
import time

WRITE_CAPABILITY = False
ADAPTER_VERSION = "0.1"

# Session states surfaced to Studio
DISCONNECTED = "DISCONNECTED"
LOGIN_REQUIRED = "LOGIN_REQUIRED"
CONNECTED_READ_ONLY = "CONNECTED_READ_ONLY"


class StructureError(RuntimeError):
    """Concerto's page structure did not match evidence-based expectations.
    Crawlers FAIL LOUDLY on this rather than returning incomplete data."""


class PageError(RuntimeError):
    """Concerto answered with an error, a refusal or a login page instead of
    the page requested. The instance said no — distinct from the structure
    being unfamiliar, and reported to the user in those terms."""


def _host_of(url: str) -> str:
    """Identity of an instance: its ORIGIN (host, plus port when it is not
    the scheme default), lower-cased.

    Not the full URL — that would call a login redirect a different system.
    Not the bare hostname either — two systems can share a hostname on
    different ports, and treating them as one is exactly the confusion this
    function exists to prevent.
    """
    from urllib.parse import urlparse

    if not url:
        return ""
    parsed = urlparse(url if "//" in url else "//" + url)
    host = (parsed.hostname or "").lower()
    if not host:
        return ""
    try:
        port = parsed.port
    except ValueError:
        port = None
    default = {"http": 80, "https": 443}.get((parsed.scheme or "").lower())
    if port and port != default:
        return f"{host}:{port}"
    return host


class ConcertoSession:
    """One visible (headed) browser session against one Concerto instance."""

    def __init__(self, headless: bool = False) -> None:
        # Headed is the ONLY mode used against a real instance: the human
        # must be able to see the window they sign in to. `headless=True`
        # exists solely for the fixture end-to-end test, which signs in to
        # nothing.
        self._headless = headless
        self._pw = None
        self._browser = None
        self.page = None
        self.target_url: str | None = None
        self.state: str = DISCONNECTED
        self.concerto_build: str | None = None
        # set when the browser is showing a DIFFERENT host than the target
        self.wrong_host: str | None = None

    # ---- lifecycle -----------------------------------------------------

    def connect(self, url: str) -> dict:
        """Open the browser and navigate to the instance.
        NEVER accepts or enters credentials.

        A DIFFERENT instance always gets a FRESH browser context. Two
        reasons, both non-negotiable:
          1. Safety — one customer's session cookies must never be carried
             into another customer's instance.
          2. Correctness — the previous instance's pending login redirect
             would otherwise hijack the navigation ("interrupted by another
             navigation to …/login.aspx"), leaving the harness pointed at
             the wrong system while claiming to be on this one.
        """
        from playwright.sync_api import sync_playwright

        url = url.rstrip("/")
        if self._pw is None:
            self._pw = sync_playwright().start()
            # Headed: the human signs in in this window.
            self._browser = self._pw.chromium.launch(headless=self._headless)

        if self.page is None or _host_of(url) != _host_of(self.target_url or ""):
            self._new_context()

        self.target_url = url
        self._goto_settled(self.target_url)
        self.refresh_state()
        return self.status()

    def _new_context(self) -> None:
        """Drop any existing context (and its cookies) and start clean."""
        try:
            if self.page is not None:
                self.page.context.close()
        except Exception:
            pass
        context = self._browser.new_context(viewport={"width": 1500, "height": 950})
        self.page = context.new_page()
        self.concerto_build = None

    def _goto_settled(self, url: str, attempts: int = 3) -> None:
        """Navigate, tolerating the app's own redirects.

        A Concerto instance normally bounces an unauthenticated visit to
        its login page; Playwright reports that as an interrupted
        navigation. That is expected, not a failure — so the interruption
        is absorbed and the landing URL is checked instead. What is NOT
        tolerated is landing on a DIFFERENT HOST: that means we are looking
        at another system, and the caller must be told rather than shown
        someone else's configuration.
        """
        last_error: Exception | None = None
        for attempt in range(attempts):
            try:
                self.page.goto(url, wait_until="domcontentloaded", timeout=45000)
                last_error = None
                break
            except Exception as exc:  # noqa: BLE001 — inspected below
                last_error = exc
                if "interrupted by another navigation" not in str(exc):
                    raise
                # let the in-flight redirect finish, then try again
                try:
                    self.page.wait_for_load_state("domcontentloaded", timeout=15000)
                except Exception:
                    pass
                time.sleep(0.5 * (attempt + 1))

        landed = ""
        try:
            landed = self.page.url or ""
        except Exception:
            pass

        if last_error is not None and not landed:
            raise last_error
        if landed and _host_of(landed) != _host_of(url):
            raise StructureError(
                f"navigation landed on {_host_of(landed)!r} but {_host_of(url)!r} was requested — "
                "refusing to continue against a different system"
            )

    def adopt_session_cookie(self, url: str, name: str, value: str) -> dict:
        """Adopt an EXISTING authenticated session created by a human in
        another browser (session-cookie hand-off). This is not credential
        entry: the human signed in themselves; we reuse that session.
        The cookie value is held in browser memory only — never logged,
        never persisted, never written to a receipt or the repository."""
        from playwright.sync_api import sync_playwright

        if self._pw is None:
            self._pw = sync_playwright().start()
            self._browser = self._pw.chromium.launch(headless=self._headless)
            context = self._browser.new_context(viewport={"width": 1500, "height": 950})
            self.page = context.new_page()
        url = url.rstrip("/")
        if self.page is None or _host_of(url) != _host_of(self.target_url or ""):
            self._new_context()
        self.target_url = url
        self.page.context.add_cookies([{"name": name, "value": value, "url": self.target_url + "/"}])
        self._goto_settled(self.target_url)
        self.refresh_state()
        return self.status()

    def disconnect(self) -> None:
        try:
            if self._browser:
                self._browser.close()
            if self._pw:
                self._pw.stop()
        finally:
            self._pw = self._browser = self.page = None
            self.state = DISCONNECTED

    # ---- session state -------------------------------------------------

    def refresh_state(self) -> str:
        if not self.page:
            self.state = DISCONNECTED
            return self.state
        try:
            url = self.page.url or ""
            # Wrong system? Say so instead of describing it as connected.
            if url and self.target_url and _host_of(url) != _host_of(self.target_url):
                self.state = DISCONNECTED
                self.wrong_host = _host_of(url)
                return self.state
            self.wrong_host = None
            if "login" in url.lower() or self.page.locator("input[type=password]").count() > 0:
                self.state = LOGIN_REQUIRED
            else:
                self.state = CONNECTED_READ_ONLY
                if not self.concerto_build:
                    self.concerto_build = self._sniff_build()
        except Exception:
            # navigating page / closed window
            try:
                self.state = LOGIN_REQUIRED if "login" in (self.page.url or "").lower() else self.state
            except Exception:
                self.state = DISCONNECTED
        return self.state

    def status(self) -> dict:
        return {
            "state": self.state,
            "targetUrl": self.target_url,
            "targetHost": _host_of(self.target_url or ""),
            "wrongHost": self.wrong_host,
            "concertoBuild": self.concerto_build,
            "writeCapability": WRITE_CAPABILITY,
        }

    def _sniff_build(self) -> str | None:
        try:
            text = self.page.evaluate("() => document.body ? document.body.innerText : ''") or ""
            m = re.search(r"\b(20\d\d\.\d+\.\d+[\w.-]*)\b", text)
            return m.group(1) if m else None
        except Exception:
            return None

    # ---- page helpers used by crawlers ----------------------------------

    def goto_admin(self, page_name: str) -> None:
        """Navigate to an admin page (helpdesk_admin.aspx / order_admin.aspx),
        and NOTICE when the application answers with an error or a refusal
        instead of the page.

        Concerto serves its own error page (content/Oops.aspx, carrying the
        failed path in aspxerrorpath) and its own access-denied pages. Both
        return HTTP 200 on the right host, so nothing upstream would object
        — the crawler would sail on and report the confusing symptom
        ("Tab not found: 'Job statuses'") three steps later. Naming the real
        cause here is the difference between a fixable message and a mystery.
        """
        assert self.state == CONNECTED_READ_ONLY, "not connected read-only"
        self._goto_settled(f"{self.target_url}/{page_name}")
        self.page.wait_for_timeout(800)
        self._assert_page_usable(page_name)

    def _assert_page_usable(self, page_name: str) -> None:
        url = ""
        text = ""
        try:
            url = (self.page.url or "").lower()
            text = (self.page.evaluate("() => document.body ? document.body.innerText : ''") or "")
        except Exception:
            pass
        low = text.lower()

        if "oops.aspx" in url or "aspxerrorpath" in url or "unexpected error has occurred" in low:
            failed = page_name
            m = re.search(r"aspxerrorpath=([^&]+)", url)
            if m:
                from urllib.parse import unquote
                failed = unquote(m.group(1))
            raise PageError(
                f"{page_name}: Concerto returned its error page for {failed!r} "
                "(\"An unexpected error has occurred\"). The page itself failed in the "
                "application — this is not a crawler fault and retrying will not help. "
                "Check whether this instance exposes that admin page and whether the "
                "signed-in account may open it."
            )

        if re.search(r"access denied|not authoris|not authoriz|do not have permission|insufficient (rights|permission)", low):
            raise PageError(
                f"{page_name}: the signed-in account is not permitted to open this page. "
                "Sign in as a user with Concerto administration rights, then crawl again."
            )

        if "login" in url or self._has_password_field():
            self.state = LOGIN_REQUIRED
            raise PageError(
                f"{page_name}: the session was bounced to the login page — the sign-in has "
                "expired. Sign in again at the harness browser window, then crawl again."
            )

    def _has_password_field(self) -> bool:
        try:
            return self.page.locator("input[type=password]").count() > 0
        except Exception:
            return False

    def click_tab(self, label: str) -> None:
        """Click a tab-strip button by its visible text; AJAX — URL unchanged."""
        tab = self.page.locator(".nav-link", has_text=re.compile(rf"^\s*{re.escape(label)}\s*$", re.I))
        if tab.count() == 0:
            # fall back to any button/anchor with the exact text inside the tab bar
            tab = self.page.get_by_role("button", name=label, exact=True)
        if tab.count() == 0:
            raise StructureError(f"Tab not found: {label!r}")
        tab.first.click()
        self.page.wait_for_timeout(900)

    def harvest_grid_guids(self) -> dict[str, str]:
        """Map visible grid row display-name -> GUID via pbl_form_<guid>_0
        select checkboxes (technique: GUID harvesting)."""
        return self.page.evaluate(
            """() => {
                const out = {};
                for (const cb of document.querySelectorAll('input[id^="pbl_form_"]')) {
                    const m = cb.id.match(/^pbl_form_([0-9a-f-]{36})_0$/i);
                    if (!m) continue;
                    const row = cb.closest('tr');
                    if (!row) continue;
                    const cells = Array.from(row.querySelectorAll('td')).map(td => td.innerText.trim());
                    const name = cells.find(c => c && c.length > 1);
                    if (name) out[name] = m[1];
                }
                return out;
            }"""
        )

    def grid_rows(self) -> list[list[str]]:
        """Visible grid rows as arrays of cell texts (list projection —
        record truth still needs the form/record view)."""
        return self.page.evaluate(
            """() => {
                const tables = Array.from(document.querySelectorAll('table'))
                    .filter(t => t.querySelector('input[id^="pbl_form_"]'));
                if (!tables.length) return [];
                const rows = [];
                for (const tr of tables[0].querySelectorAll('tr')) {
                    const cells = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
                    if (cells.length) rows.push(cells);
                }
                return rows;
            }"""
        )

    def grid_headers(self) -> list[str]:
        return self.page.evaluate(
            """() => {
                const tables = Array.from(document.querySelectorAll('table'))
                    .filter(t => t.querySelector('input[id^="pbl_form_"]'));
                if (!tables.length) return [];
                return Array.from(tables[0].querySelectorAll('th')).map(th => th.innerText.trim());
            }"""
        )

    def nav_form_view(self, guid: str, expect_name: str, timeout_s: float = 12.0) -> None:
        """Open a record's Edit form via PblActions.nav('form_view', guid) and
        WAIT until a text input carries the expected record name — the
        stale-panel / render-race defence. Fails loudly on mismatch."""
        self.page.evaluate("g => PblActions.nav('form_view', g)", guid)
        self._wait_for_name(expect_name, timeout_s, context=f"form_view {guid}")

    def nav_record_view(self, guid: str, expect_name: str, timeout_s: float = 12.0) -> None:
        """Open a record's summary VIEW page (RenderActionSummaryConst)."""
        self.page.evaluate("g => PblActions.nav('RenderActionSummaryConst', g)", guid)
        deadline = time.time() + timeout_s
        needle = expect_name.strip().lower()
        while time.time() < deadline:
            body = self.page.evaluate("() => document.body.innerText") or ""
            if needle in body.lower():
                return
            self.page.wait_for_timeout(300)
        raise StructureError(f"record view for {expect_name!r} did not render (stale panel?)")

    def _wait_for_name(self, expect_name: str, timeout_s: float, context: str) -> None:
        deadline = time.time() + timeout_s
        needle = expect_name.strip().lower()
        while time.time() < deadline:
            ok = self.page.evaluate(
                """(needle) => {
                    for (const i of document.querySelectorAll('input[type=text]')) {
                        if ((i.value || '').trim().toLowerCase() === needle) return true;
                    }
                    return false;
                }""",
                needle,
            )
            if ok:
                return
            self.page.wait_for_timeout(300)
        raise StructureError(f"{context}: form for {expect_name!r} did not render (stale panel?)")

    def cancel_form(self) -> None:
        """CANCEL any open form — the discipline that keeps this read-only.
        Tolerates 'no form open'."""
        try:
            btn = self.page.get_by_role("button", name=re.compile(r"^cancel$", re.I))
            if btn.count():
                btn.first.click()
                self.page.wait_for_timeout(500)
        except Exception:
            pass

    def read_form_fields(self) -> dict:
        """Extract the open form's labelled values: text inputs, selects,
        checkboxes (label text -> value/checked)."""
        return self.page.evaluate(
            """() => {
                const out = {inputs: {}, checks: {}, selects: {}, checkedLabels: []};
                const labelFor = (el) => {
                    if (el.id) {
                        const l = document.querySelector('label[for="' + el.id + '"]');
                        if (l) return l.innerText.trim();
                    }
                    const wrap = el.closest('label');
                    if (wrap) return wrap.innerText.trim();
                    const td = el.closest('td,div');
                    if (td) {
                        const prev = td.previousElementSibling;
                        if (prev) return prev.innerText.trim();
                    }
                    return el.name || el.id || '';
                };
                for (const i of document.querySelectorAll('input[type=text], textarea')) {
                    const l = labelFor(i);
                    if (l) out.inputs[l] = i.value;
                }
                for (const s of document.querySelectorAll('select')) {
                    const l = labelFor(s);
                    const opt = s.selectedOptions && s.selectedOptions[0];
                    if (l) out.selects[l] = opt ? opt.text.trim() : '';
                }
                for (const c of document.querySelectorAll('input[type=checkbox]')) {
                    const l = labelFor(c);
                    if (l) {
                        out.checks[l] = c.checked;
                        if (c.checked) out.checkedLabels.push(l);
                    }
                }
                return out;
            }"""
        )

    def body_text(self) -> str:
        return self.page.evaluate("() => document.body.innerText") or ""
