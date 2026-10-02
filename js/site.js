/* تعامل‌های عمومی سایت: پوسته، منوی موبایل و فرم تماس. */
(() => {
  const root = document.documentElement;
  const mobileQuery = window.matchMedia("(max-width: 980px)");

  function readStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {}
  }

  function updateTheme(theme, persist = true) {
    root.dataset.theme = theme;
    if (persist) writeStorage("site-theme", theme);
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      const label =
        theme === "dark" ? button.dataset.labelLight : button.dataset.labelDark;
      if (label) {
        button.setAttribute("aria-label", label);
        button.title = label;
      }
    });
  }

  function setSidebarCollapsed(collapsed, persist = true) {
    const isCollapsed = !mobileQuery.matches && Boolean(collapsed);
    document.body.dataset.sidebarCollapsed = String(isCollapsed);
    if (persist && !mobileQuery.matches) {
      writeStorage("site-sidebar-collapsed", String(isCollapsed));
    }
    const button = document.querySelector("[data-sidebar-toggle]");
    if (!button) return;
    const label = isCollapsed
      ? button.dataset.labelCollapsed
      : button.dataset.labelExpanded;
    button.setAttribute("aria-expanded", String(!isCollapsed));
    if (label) {
      button.setAttribute("aria-label", label);
      button.title = label;
    }
  }

  function syncDrawerState() {
    const sidebar = document.querySelector("#primary-sidebar");
    const toggle = document.querySelector("[data-drawer-toggle]");
    if (!sidebar) return;
    const isOpen =
      mobileQuery.matches && document.body.classList.contains("drawer-open");
    sidebar.toggleAttribute("inert", mobileQuery.matches && !isOpen);
    sidebar.setAttribute("aria-hidden", String(mobileQuery.matches && !isOpen));
    if (toggle) {
      toggle.setAttribute("aria-expanded", String(isOpen));
      const label = isOpen
        ? toggle.dataset.labelClose
        : toggle.dataset.labelOpen;
      if (label) {
        toggle.setAttribute("aria-label", label);
        toggle.title = label;
      }
    }
    document.body.classList.toggle("drawer-locked", isOpen);
  }

  function closeDrawer(restoreFocus = false) {
    document.body.classList.remove("drawer-open");
    syncDrawerState();
    if (restoreFocus) document.querySelector("[data-drawer-toggle]")?.focus();
  }

  function openDrawer() {
    document.body.classList.add("drawer-open");
    syncDrawerState();
    document
      .querySelector("#primary-sidebar a, #primary-sidebar button")
      ?.focus();
  }

  const savedTheme = readStorage("site-theme");
  updateTheme(
    savedTheme === "light" || savedTheme === "dark"
      ? savedTheme
      : root.dataset.theme || "dark",
    false,
  );
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () =>
      updateTheme(root.dataset.theme === "dark" ? "light" : "dark"),
    );
  });
  const sidebarToggle = document.querySelector("[data-sidebar-toggle]");
  sidebarToggle?.addEventListener("click", () => {
    if (mobileQuery.matches) return;
    setSidebarCollapsed(document.body.dataset.sidebarCollapsed !== "true");
  });
  setSidebarCollapsed(
    !mobileQuery.matches && readStorage("site-sidebar-collapsed") === "true",
    false,
  );
  syncDrawerState();
  mobileQuery.addEventListener("change", () => {
    document.body.classList.remove("drawer-open");
    setSidebarCollapsed(
      !mobileQuery.matches && readStorage("site-sidebar-collapsed") === "true",
      false,
    );
    syncDrawerState();
  });
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest("[data-drawer-toggle]")) {
      document.body.classList.contains("drawer-open")
        ? closeDrawer()
        : openDrawer();
    } else if (event.target.closest("[data-drawer-close]")) {
      closeDrawer(true);
    } else if (
      mobileQuery.matches &&
      event.target.closest("#primary-sidebar a")
    ) {
      closeDrawer();
    }
  });
  document.addEventListener("keydown", (event) => {
    const sidebar = document.querySelector("#primary-sidebar");
    if (
      event.key === "Escape" &&
      document.body.classList.contains("drawer-open")
    ) {
      closeDrawer(true);
      return;
    }
    if (
      event.key !== "Tab" ||
      !document.body.classList.contains("drawer-open") ||
      !sidebar
    )
      return;
    const links = [
      ...sidebar.querySelectorAll("a[href], button:not([disabled])"),
    ];
    if (!links.length) return;
    if (event.shiftKey && document.activeElement === links[0]) {
      event.preventDefault();
      links.at(-1).focus();
    } else if (!event.shiftKey && document.activeElement === links.at(-1)) {
      event.preventDefault();
      links[0].focus();
    }
  });

  setupRevealAnimations();

  // فرم تماس فقط وقتی API و site key عمومی تنظیم شده باشند فعال می‌شود.
  setupContactForms();

  function setupRevealAnimations() {
    const targets = document.querySelectorAll(".inner-page [data-reveal]");
    if (!targets.length) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -5% 0px" },
    );

    targets.forEach((target, index) => {
      const requestedDelay = Number(target.dataset.revealDelay);
      const delay = Number.isFinite(requestedDelay)
        ? requestedDelay
        : (index % 5) * 65;
      target.style.setProperty("--reveal-delay", `${delay}ms`);
      target.classList.add("reveal-ready");
      observer.observe(target);
    });
  }

  function loadTurnstile() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    return new Promise((resolve, reject) => {
      let script = document.querySelector("script[data-turnstile-api]");
      if (!script) {
        script = document.createElement("script");
        script.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.dataset.turnstileApi = "true";
        document.head.appendChild(script);
      }
      script.addEventListener(
        "load",
        () =>
          window.turnstile
            ? resolve(window.turnstile)
            : reject(new Error("Turnstile did not start.")),
        { once: true },
      );
      script.addEventListener(
        "error",
        () => reject(new Error("Turnstile could not load.")),
        { once: true },
      );
    });
  }

  function setupContactForms() {
    document.querySelectorAll("[data-lead-form]").forEach((form) => {
      const button = form.querySelector("[type='submit']");
      const widget = form.querySelector("[data-turnstile-widget]");
      const apiUrl =
        window.SITE_CONFIG?.leadsApiUrl?.trim() ||
        form.dataset.apiUrl?.trim() ||
        "";
      const siteKey =
        window.SITE_CONFIG?.turnstileSiteKey?.trim() ||
        form.dataset.turnstileSiteKey?.trim() ||
        "";
      if (!apiUrl || !siteKey || !button || !widget) {
        if (button) button.disabled = true;
        return;
      }

      let challenge;
      let token = "";
      button.disabled = true;
      const status = form.querySelector("[data-form-status]");
      const setStatus = (message) => {
        if (status) status.textContent = message;
      };
      loadTurnstile()
        .then((turnstile) => {
          challenge = turnstile;
          const widgetId = turnstile.render(widget, {
            sitekey: siteKey,
            action: "contact",
            callback: (value) => {
              token = value;
              button.disabled = false;
              setStatus(form.dataset.messageReady || "");
            },
            "expired-callback": () => {
              token = "";
              button.disabled = true;
              setStatus(form.dataset.messageVerification || "");
            },
            "error-callback": () => {
              token = "";
              button.disabled = true;
              setStatus(form.dataset.messageVerification || "");
            },
          });

          form.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (!token) {
              setStatus(
                form.dataset.messageVerification ||
                  form.dataset.messageFailure ||
                  "",
              );
              return;
            }
            button.disabled = true;
            setStatus(form.dataset.messageLoading || "");
            const data = new FormData(form);
            const payload = {
              name: String(data.get("name") || ""),
              email: String(data.get("email") || ""),
              service: String(data.get("service") || ""),
              message: String(data.get("message") || ""),
              companyWebsite: String(data.get("companyWebsite") || ""),
              turnstileToken: token,
            };
            try {
              const response = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              if (response.ok) {
                form.reset();
                setStatus(form.dataset.messageSuccess || "");
              } else {
                setStatus(form.dataset.messageFailure || "");
              }
            } catch {
              setStatus(form.dataset.messageFailure || "");
            } finally {
              token = "";
              button.disabled = true;
              challenge.reset(widgetId);
            }
          });
        })
        .catch(() => {
          button.disabled = true;
          setStatus(
            form.dataset.messageVerification ||
              form.dataset.messageFailure ||
              "",
          );
        });
    });
  }
})();
