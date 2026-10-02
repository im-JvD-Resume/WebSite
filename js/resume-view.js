(() => {
  "use strict";

  const preview = document.querySelector("#resume-preview");
  const downloadButton = document.querySelector("[data-download-resume]");
  const downloadStatus = document.querySelector("#resume-download-status");
  if (!preview || !downloadButton || !downloadStatus) return;

  const copy = {
    fa: {
      about: "معرفی",
      contact: "تماس",
      skills: "مهارت‌ها",
      education: "تحصیلات",
      loading: "در حال بارگذاری رزومهٔ به‌روز…",
      loadError: "بارگذاری رزومه ناموفق بود. لطفاً صفحه را تازه‌سازی کنید.",
      download: "در حال آماده‌سازی فایل PDF…",
      downloaded: "فایل PDF دانلود شد.",
      downloadError: "ساخت فایل PDF ناموفق بود. دوباره تلاش کنید.",
      portraitAlt: "پرترهٔ محمدجواد کریمی",
      pageTitle: "رزومه",
    },
    en: {
      about: "PROFILE",
      contact: "CONTACT",
      skills: "SKILLS",
      education: "EDUCATION",
      loading: "Loading the latest résumé…",
      loadError: "The résumé could not be loaded. Please refresh the page.",
      download: "Preparing the PDF…",
      downloaded: "The PDF has been downloaded.",
      downloadError: "The PDF could not be created. Please try again.",
      portraitAlt: "Portrait of Mohamad Javad Karimi",
      pageTitle: "Résumé",
    },
  };

  const socialSites = {
    "instagram.com": { key: "instagram", mark: "IG", label: "Instagram" },
    "t.me": { key: "telegram", mark: "TG", label: "Telegram" },
    "github.com": { key: "github", mark: "GH", label: "GitHub" },
    "ble.ir": { key: "bale", mark: "BL", label: "Bale" },
  };

  const localeFromPath = location.pathname.match(/^\/(fa|en)(?:\/|$)/)?.[1];
  const locale = localeFromPath || document.body.dataset.locale;
  const labels = copy[locale];

  function textOf(element) {
    return element?.textContent?.replace(/\s+/g, " ").trim() || "";
  }

  function fail(message) {
    const notice = document.createElement("p");
    notice.className = "resume-view-message is-error";
    notice.setAttribute("role", "alert");
    notice.textContent = message;
    preview.replaceChildren(notice);
    preview.setAttribute("aria-busy", "false");
  }

  function sectionHeading(id, text, className = "resume-sidebar-heading") {
    const heading = document.createElement("h2");
    heading.className = className;
    heading.id = id;
    heading.textContent = text;
    return heading;
  }

  function getSocialLinks(contactDocument) {
    const seen = new Set();
    return Array.from(
      contactDocument.querySelectorAll(".header-social-links a[href]")
    ).flatMap((anchor) => {
      let url;
      try {
        url = new URL(anchor.getAttribute("href"), location.origin);
      } catch {
        return [];
      }

      const known = socialSites[url.hostname.toLowerCase().replace(/^www\./, "")];
      if (!known || url.protocol !== "https:" || seen.has(known.key)) return [];
      seen.add(known.key);

      const cleanPath = url.pathname.replace(/\/$/, "");
      return [
        {
          kind: "social",
          key: known.key,
          mark: known.mark,
          label: anchor.getAttribute("aria-label") || known.label,
          href: `${url.origin}${url.pathname}`,
          value: `${url.hostname.replace(/^www\./, "")}${cleanPath}`,
        },
      ];
    });
  }

  function getEmail(contactDocument) {
    const anchor = contactDocument.querySelector(
      ".contact-grid .contact-email-card[href^='mailto:']"
    );
    if (!anchor) return null;

    const href = anchor.getAttribute("href") || "";
    const address = href.slice("mailto:".length).split(/[?#]/, 1)[0].trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return null;

    return {
      kind: "email",
      mark: "@",
      label: textOf(anchor.querySelector(".contact-card-label")),
      href: `mailto:${address}`,
      value: textOf(anchor.querySelector("strong[dir='ltr']")) || address,
    };
  }

  function getImageSource(resumeDocument, resumeUrl) {
    const image = resumeDocument.querySelector(
      ".resume-heading-block .interior-hero-photo"
    );
    if (!image) return "";

    try {
      const source = new URL(image.getAttribute("src"), resumeUrl);
      return source.origin === location.origin ? source.href : "";
    } catch {
      return "";
    }
  }

  function collectModel(resumeDocument, contactDocument, resumeUrl) {
    const resumePage = resumeDocument.querySelector(".resume-page");
    const intro = resumePage?.querySelector(".resume-heading-block");
    const name = textOf(intro?.querySelector("h1"));
    const role = textOf(resumeDocument.querySelector(".sidebar-brand-copy span"));
    const summary = textOf(intro?.querySelector(".page-intro-block > p:last-child"));
    const experienceSection = resumePage?.querySelector(".resume-section");
    const experienceHeading = textOf(experienceSection?.querySelector("h2"));
    const experience = Array.from(
      resumePage?.querySelectorAll(".experience-list .experience-card") || []
    ).map((card) => ({
      company: textOf(card.querySelector(".experience-title-row h3")),
      role: textOf(card.querySelector(".experience-title-row p")),
      date: textOf(card.querySelector(".experience-kind")),
      tasks: Array.from(card.querySelectorAll(".experience-tasks li"), textOf),
    })).filter((item) => item.company);

    const educationCard = resumePage?.querySelector(
      ".resume-bottom-grid .resume-info-card:not(.resume-skills-card)"
    );
    const educationHeading = textOf(educationCard?.querySelector(".eyebrow"));
    const education = textOf(educationCard?.querySelector("h2"));
    const skillsCard = resumePage?.querySelector(".resume-skills-card");
    const skillsHeading = textOf(skillsCard?.querySelector(".eyebrow"));
    const skills = Array.from(
      skillsCard?.querySelectorAll(".technology-tag") || [],
      textOf
    ).filter(Boolean);
    const contactHeading = textOf(
      contactDocument.querySelector(".contact-hero .eyebrow")
    );
    const email = getEmail(contactDocument);
    const contacts = [...(email ? [email] : []), ...getSocialLinks(contactDocument)];

    if (!name || !summary || !experience.length || !education || !skills.length) {
      throw new Error("The source résumé is missing required content.");
    }

    return {
      locale,
      name,
      role,
      summary,
      experienceHeading: experienceHeading || (locale === "fa" ? "تجربهٔ کاری" : "Work experience"),
      experience,
      educationHeading: educationHeading || labels.education,
      education,
      skillsHeading: skillsHeading || labels.skills,
      skills,
      contactHeading: contactHeading || labels.contact,
      contacts,
      portrait: getImageSource(resumeDocument, resumeUrl),
      portraitAlt:
        resumeDocument.querySelector(".resume-heading-block .interior-hero-photo")?.getAttribute("alt") ||
        labels.portraitAlt,
    };
  }

  function appendContact(list, contact) {
    const item = document.createElement("li");
    item.className = "resume-contact-item";

    const mark = document.createElement("span");
    mark.className = "resume-contact-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = contact.mark;

    const link = document.createElement("a");
    link.className = "resume-contact-link";
    link.href = contact.href;
    if (contact.kind === "social") {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }

    const label = document.createElement("span");
    label.className = "resume-contact-label";
    label.textContent = contact.label || contact.value;
    const value = document.createElement("span");
    value.className = "resume-contact-value";
    value.dir = "ltr";
    value.textContent = contact.value;
    link.append(label, value);
    item.append(mark, link);
    list.append(item);
  }

  function render(model) {
    const sheet = document.createElement("article");
    sheet.className = "resume-sheet";
    sheet.setAttribute("aria-label", `${labels.pageTitle}: ${model.name}`);

    const sidebar = document.createElement("aside");
    sidebar.className = "resume-sheet__sidebar";
    const sidebarHeader = document.createElement("header");
    sidebarHeader.className = "resume-sidebar-header";
    const name = document.createElement("h1");
    name.className = "resume-view-name";
    name.textContent = model.name;
    const role = document.createElement("p");
    role.className = "resume-view-role";
    role.textContent = model.role;
    sidebarHeader.append(name, role);

    if (model.portrait) {
      const portrait = document.createElement("img");
      portrait.className = "resume-view-portrait";
      portrait.src = model.portrait;
      portrait.alt = model.portraitAlt;
      portrait.width = 360;
      portrait.height = 360;
      portrait.decoding = "async";
      sidebarHeader.append(portrait);
    }
    sidebar.append(sidebarHeader);

    if (model.contacts.length) {
      const contactSection = document.createElement("section");
      contactSection.className = "resume-sidebar-section";
      contactSection.setAttribute("aria-labelledby", "resume-contact-heading");
      contactSection.append(sectionHeading("resume-contact-heading", model.contactHeading));
      const contactList = document.createElement("ul");
      contactList.className = "resume-contact-list";
      model.contacts.forEach((contact) => appendContact(contactList, contact));
      contactSection.append(contactList);
      sidebar.append(contactSection);
    }

    const skillSection = document.createElement("section");
    skillSection.className = "resume-sidebar-section";
    skillSection.setAttribute("aria-labelledby", "resume-skills-heading");
    skillSection.append(sectionHeading("resume-skills-heading", model.skillsHeading));
    const skillList = document.createElement("ul");
    skillList.className = "resume-skills-list";
    for (const skill of model.skills) {
      const item = document.createElement("li");
      item.className = "resume-skill-item";
      item.textContent = skill;
      skillList.append(item);
    }
    skillSection.append(skillList);
    sidebar.append(skillSection);

    const main = document.createElement("div");
    main.className = "resume-sheet__main";

    const profileSection = document.createElement("section");
    profileSection.className = "resume-main-section resume-profile-section";
    profileSection.setAttribute("aria-labelledby", "resume-profile-heading");
    const profileHeading = document.createElement("h2");
    profileHeading.className = "resume-section-heading";
    profileHeading.id = "resume-profile-heading";
    profileHeading.textContent = labels.about;
    const profile = document.createElement("p");
    profile.className = "resume-profile-copy";
    profile.textContent = model.summary;
    profileSection.append(profileHeading, profile);
    main.append(profileSection);

    const experienceSection = document.createElement("section");
    experienceSection.className = "resume-main-section";
    experienceSection.setAttribute("aria-labelledby", "resume-experience-heading");
    experienceSection.append(
      sectionHeading(
        "resume-experience-heading",
        model.experienceHeading,
        "resume-section-heading"
      )
    );
    const experienceList = document.createElement("div");
    experienceList.className = "resume-experience-list";
    for (const record of model.experience) {
      const card = document.createElement("article");
      card.className = "resume-experience";
      const header = document.createElement("div");
      header.className = "resume-experience-head";
      const company = document.createElement("h3");
      company.className = "resume-experience-company";
      company.textContent = record.company;
      header.append(company);
      if (record.date) {
        const date = document.createElement("span");
        date.className = "resume-experience-date";
        date.textContent = record.date;
        header.append(date);
      }
      card.append(header);
      if (record.role) {
        const jobRole = document.createElement("p");
        jobRole.className = "resume-experience-role";
        jobRole.textContent = record.role;
        card.append(jobRole);
      }
      if (record.tasks.length) {
        const taskList = document.createElement("ul");
        taskList.className = "resume-experience-tasks";
        for (const task of record.tasks) {
          const taskItem = document.createElement("li");
          taskItem.textContent = task;
          taskList.append(taskItem);
        }
        card.append(taskList);
      }
      experienceList.append(card);
    }
    experienceSection.append(experienceList);
    main.append(experienceSection);

    const educationSection = document.createElement("section");
    educationSection.className = "resume-main-section";
    educationSection.setAttribute("aria-labelledby", "resume-education-heading");
    educationSection.append(
      sectionHeading(
        "resume-education-heading",
        model.educationHeading,
        "resume-section-heading"
      )
    );
    const educationCard = document.createElement("div");
    educationCard.className = "resume-education-card";
    const education = document.createElement("p");
    education.className = "resume-education-title";
    education.textContent = model.education;
    educationCard.append(education);
    educationSection.append(educationCard);
    main.append(educationSection);

    if (model.locale === "fa") {
      sheet.append(main, sidebar);
    } else {
      sheet.append(sidebar, main);
    }
    preview.replaceChildren(sheet);
    preview.setAttribute("aria-busy", "false");
    document.title = `${labels.pageTitle} | ${model.name}`;
    return sheet;
  }

  async function loadLatestContent() {
    if (!labels || document.body.dataset.locale !== locale) {
      throw new Error("Résumé language does not match its route.");
    }

    const resumeUrl = new URL(`/${locale}/resume/`, location.origin);
    const contactUrl = new URL(`/${locale}/contact/`, location.origin);
    const options = { cache: "no-cache", credentials: "same-origin" };
    const [resumeResponse, contactResponse] = await Promise.all([
      fetch(resumeUrl, options),
      fetch(contactUrl, options),
    ]);
    if (!resumeResponse.ok || !contactResponse.ok) {
      throw new Error("Could not fetch the current résumé pages.");
    }

    const [resumeMarkup, contactMarkup] = await Promise.all([
      resumeResponse.text(),
      contactResponse.text(),
    ]);
    const parser = new DOMParser();
    const resumeDocument = parser.parseFromString(resumeMarkup, "text/html");
    const contactDocument = parser.parseFromString(contactMarkup, "text/html");
    if (
      resumeDocument.documentElement.lang !== locale ||
      contactDocument.documentElement.lang !== locale
    ) {
      throw new Error("A source page is in a different language.");
    }

    return collectModel(resumeDocument, contactDocument, resumeUrl);
  }

  async function start() {
    if (!labels) {
      fail(copy.en.loadError);
      return;
    }

    let model;
    try {
      model = await loadLatestContent();
      render(model);
    } catch (error) {
      console.error("Could not load the latest résumé:", error);
      fail(labels.loadError);
      return;
    }

    if (!window.ResumePdf) {
      downloadStatus.textContent = labels.downloadError;
      return;
    }

    downloadButton.setAttribute("aria-busy", "true");
    downloadStatus.textContent = labels.download;
    let preparedPdf;
    try {
      preparedPdf = await window.ResumePdf.prepare(model);
    } catch (error) {
      console.error("Could not prepare the résumé PDF:", error);
      downloadButton.removeAttribute("aria-busy");
      downloadStatus.textContent = labels.downloadError;
      return;
    }

    downloadButton.removeAttribute("aria-busy");
    downloadButton.disabled = false;
    downloadStatus.textContent = "";
    downloadButton.addEventListener("click", () => {
      try {
        window.ResumePdf.download(preparedPdf);
        downloadStatus.textContent = labels.downloaded;
      } catch (error) {
        console.error("Résumé PDF download failed:", error);
        downloadStatus.textContent = labels.downloadError;
      }
    });
  }

  start();
})();
