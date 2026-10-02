(() => {
  "use strict";

  const PAGE_WIDTH = 794;
  const PAGE_HEIGHT = 1123;
  const RASTER_WIDTH = 2480;
  const RASTER_HEIGHT = 3508;
  const PIXEL_SCALE = RASTER_WIDTH / PAGE_WIDTH;
  const SIDEBAR_WIDTH = 287;
  const MAIN_PADDING = 49;
  const SIDEBAR_PADDING = 30;
  const DEFAULT_ACCENT = "#f2ca52";
  const SIDEBAR_COLOR = "#20252d";
  const SIDEBAR_TEXT = "#f4f4f1";
  const MUTED_SIDEBAR_TEXT = "#c4cbd2";
  const MAIN_TEXT = "#252b33";
  const BODY_TEXT = "#58616c";
  const FONT_FAMILY =
    getComputedStyle(document.body).fontFamily || '"Segoe UI", Tahoma, Arial, sans-serif';
  const labels = { fa: "رزومه", en: "Resume" };

  function setFont(context, size, weight = 400) {
    context.font = `${weight} ${size}px ${FONT_FAMILY}`;
  }

  function roundedRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + width - r, y);
    context.quadraticCurveTo(x + width, y, x + width, y + r);
    context.lineTo(x + width, y + height - r);
    context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    context.lineTo(x + r, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
  }

  function splitLongWord(context, word, maxWidth) {
    const pieces = [];
    let current = "";
    for (const character of Array.from(word)) {
      const candidate = current + character;
      if (current && context.measureText(candidate).width > maxWidth) {
        pieces.push(current);
        current = character;
      } else {
        current = candidate;
      }
    }
    if (current) pieces.push(current);
    return pieces;
  }

  function wrapText(context, value, maxWidth, direction) {
    context.direction = direction;
    const words = String(value || "").trim().split(/\s+/u).filter(Boolean);
    const lines = [];
    let line = "";

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) {
        lines.push(line);
        line = "";
      }
      if (context.measureText(word).width <= maxWidth) {
        line = word;
      } else {
        const parts = splitLongWord(context, word, maxWidth);
        lines.push(...parts.slice(0, -1));
        line = parts.at(-1) || "";
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  function drawParagraph(context, value, options) {
    const {
      x,
      y,
      width,
      size,
      weight = 400,
      color = MAIN_TEXT,
      lineHeight = size * 1.65,
      direction = "ltr",
      align = direction === "rtl" ? "right" : "left",
      maxLines = Infinity,
    } = options;
    setFont(context, size, weight);
    context.fillStyle = color;
    context.textBaseline = "top";
    context.direction = direction;
    context.textAlign = align;
    const lines = wrapText(context, value, width, direction).slice(0, maxLines);
    const drawX = align === "center" ? x + width / 2 : align === "right" ? x + width : x;
    lines.forEach((line, index) => {
      context.fillText(line, drawX, y + index * lineHeight, width);
    });
    return { lines, height: lines.length * lineHeight };
  }

  function drawTitle(context, text, x, y, width, direction, accent) {
    context.fillStyle = accent;
    const barX = direction === "rtl" ? x + width - 3 : x;
    context.fillRect(barX, y + 3, 3, 19);
    return drawParagraph(context, text, {
      x: direction === "rtl" ? x : x + 13,
      y,
      width: width - 13,
      size: 16,
      weight: 740,
      color: MAIN_TEXT,
      lineHeight: 23,
      direction,
    }).height;
  }

  function drawChips(context, values, x, y, width, options) {
    const {
      direction,
      fontSize,
      textColor,
      background,
      borderColor,
      accent,
      gap = 5,
      rowGap = 5,
      horizontalPadding = 7,
      verticalPadding = 3,
      lineHeight = fontSize * 1.5,
      radius = 6,
    } = options;
    const chipHeight = lineHeight + verticalPadding * 2;
    const rows = [];
    let row = [];
    let rowWidth = 0;

    for (const value of values) {
      setFont(context, fontSize, 500);
      const measured = Math.min(
        width,
        Math.ceil(context.measureText(value).width + horizontalPadding * 2)
      );
      if (row.length && rowWidth + gap + measured > width) {
        rows.push(row);
        row = [];
        rowWidth = 0;
      }
      row.push({ value, width: measured });
      rowWidth += (row.length > 1 ? gap : 0) + measured;
    }
    if (row.length) rows.push(row);

    rows.forEach((chips, rowIndex) => {
      let cursor = direction === "rtl" ? x + width : x;
      const chipY = y + rowIndex * (chipHeight + rowGap);
      for (const chip of chips) {
        const chipX = direction === "rtl" ? cursor - chip.width : cursor;
        roundedRect(context, chipX, chipY, chip.width, chipHeight, radius);
        context.fillStyle = background;
        context.fill();
        context.strokeStyle = borderColor;
        context.lineWidth = 0.65;
        context.stroke();
        context.fillStyle = textColor;
        setFont(context, fontSize, 500);
        context.textBaseline = "middle";
        context.direction = direction;
        context.textAlign = direction === "rtl" ? "right" : "left";
        const textX = direction === "rtl"
          ? chipX + chip.width - horizontalPadding
          : chipX + horizontalPadding;
        context.fillText(chip.value, textX, chipY + chipHeight / 2, chip.width - horizontalPadding * 2);
        if (direction === "rtl") cursor -= chip.width + gap;
        else cursor += chip.width + gap;
      }
    });
    return rows.length * chipHeight + Math.max(0, rows.length - 1) * rowGap;
  }

  function drawSkillGrid(context, values, x, y, width, options) {
    const {
      direction,
      fontSize,
      textColor,
      background,
      borderColor,
      gap = 8,
      rowGap = 7,
      horizontalPadding = 8,
      verticalPadding = 5,
      lineHeight = fontSize * 1.5,
      radius = 7,
    } = options;
    const columns = 2;
    const cellWidth = (width - gap) / columns;
    const cellHeight = lineHeight + verticalPadding * 2;
    const rowCount = Math.ceil(values.length / columns);

    values.forEach((value, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const visualColumn = direction === "rtl" ? columns - 1 - column : column;
      const cellX = x + visualColumn * (cellWidth + gap);
      const cellY = y + row * (cellHeight + rowGap);
      roundedRect(context, cellX, cellY, cellWidth, cellHeight, radius);
      context.fillStyle = background;
      context.fill();
      context.strokeStyle = borderColor;
      context.lineWidth = 0.65;
      context.stroke();
      context.fillStyle = textColor;
      setFont(context, fontSize, 550);
      context.textBaseline = "middle";
      context.direction = "ltr";
      context.textAlign = "center";
      context.fillText(
        value,
        cellX + cellWidth / 2,
        cellY + cellHeight / 2,
        cellWidth - horizontalPadding * 2
      );
    });

    return rowCount * cellHeight + Math.max(0, rowCount - 1) * rowGap;
  }

  function drawSidebarHeader(context, model, layout, direction, accent, photo) {
    let y = 42;
    const center = (PAGE_WIDTH - SIDEBAR_WIDTH) / 2;
    const innerX = layout.x + SIDEBAR_PADDING;
    const innerWidth = SIDEBAR_WIDTH - SIDEBAR_PADDING * 2;
    const name = drawParagraph(context, model.name, {
      x: innerX,
      y,
      width: innerWidth,
      size: 22,
      weight: 780,
      color: "#ffffff",
      lineHeight: 30,
      direction,
      align: "center",
    });
    y += name.height + 5;
    const role = drawParagraph(context, model.role, {
      x: innerX,
      y,
      width: innerWidth,
      size: 11,
      color: MUTED_SIDEBAR_TEXT,
      lineHeight: 17,
      direction,
      align: "center",
    });
    y += role.height + 18;

    const photoSize = 150;
    const photoX = layout.x + (SIDEBAR_WIDTH - photoSize) / 2;
    if (photo) {
      context.save();
      context.beginPath();
      context.arc(photoX + photoSize / 2, y + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
      context.clip();
      const scale = Math.max(photoSize / photo.naturalWidth, photoSize / photo.naturalHeight);
      const sourceWidth = photoSize / scale;
      const sourceHeight = photoSize / scale;
      const sourceX = (photo.naturalWidth - sourceWidth) / 2;
      const sourceY = (photo.naturalHeight - sourceHeight) * 0.27;
      context.drawImage(
        photo,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        photoX,
        y,
        photoSize,
        photoSize
      );
      context.restore();
    } else {
      context.beginPath();
      context.arc(photoX + photoSize / 2, y + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
      context.fillStyle = "#39404a";
      context.fill();
    }
    context.beginPath();
    context.arc(photoX + photoSize / 2, y + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
    context.strokeStyle = "#ffffff";
    context.lineWidth = 2;
    context.stroke();
    y += photoSize + 23;

    return { y, innerX, innerWidth, center };
  }

  function drawContactSection(context, model, layout, y, direction, accent) {
    if (!model.contacts.length) return y;
    y += 17;
    context.fillStyle = "rgba(255,255,255,0.15)";
    context.fillRect(layout.x + SIDEBAR_PADDING, y, SIDEBAR_WIDTH - SIDEBAR_PADDING * 2, 0.7);
    y += 13;
    const title = drawParagraph(context, model.contactHeading, {
      x: layout.innerX,
      y,
      width: layout.innerWidth,
      size: 12,
      weight: 740,
      color: accent,
      lineHeight: 18,
      direction,
    });
    y += title.height + 10;

    for (const contact of model.contacts) {
      const iconSize = 21;
      const gap = 8;
      const textWidth = layout.innerWidth - iconSize - gap;
      const iconX = direction === "rtl"
        ? layout.innerX + layout.innerWidth - iconSize
        : layout.innerX;
      const textX = direction === "rtl"
        ? layout.innerX
        : layout.innerX + iconSize + gap;
      const label = contact.kind === "email"
        ? (contact.label || (model.locale === "fa" ? "ایمیل" : "Email"))
        : contact.label;
      const value = contact.value;
      context.fillStyle = "rgba(255,255,255,0.035)";
      roundedRect(context, iconX, y, iconSize, iconSize, 6);
      context.fill();
      context.strokeStyle = "rgba(242,202,82,0.52)";
      context.lineWidth = 0.7;
      context.stroke();
      setFont(context, 8.5, 760);
      context.fillStyle = accent;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.direction = "ltr";
      context.fillText(contact.mark, iconX + iconSize / 2, y + iconSize / 2 + 0.3, iconSize - 2);

      const labelLayout = drawParagraph(context, label, {
        x: textX,
        y,
        width: textWidth,
        size: 8.5,
        weight: 650,
        color: MUTED_SIDEBAR_TEXT,
        lineHeight: 12,
        direction,
      });
      const valueLayout = drawParagraph(context, value, {
        x: textX,
        y: y + labelLayout.height + 1,
        width: textWidth,
        size: 9.2,
        color: SIDEBAR_TEXT,
        lineHeight: 13,
        direction: "ltr",
        align: "left",
      });
      y += Math.max(iconSize, labelLayout.height + valueLayout.height + 1) + 8;
    }
    return y;
  }

  function drawSkillSection(context, model, layout, y, direction, accent) {
    y += 9;
    context.fillStyle = "rgba(255,255,255,0.15)";
    context.fillRect(layout.x + SIDEBAR_PADDING, y, SIDEBAR_WIDTH - SIDEBAR_PADDING * 2, 0.7);
    y += 13;
    const title = drawParagraph(context, model.skillsHeading, {
      x: layout.innerX,
      y,
      width: layout.innerWidth,
      size: 12,
      weight: 740,
      color: accent,
      lineHeight: 18,
      direction,
    });
    y += title.height + 10;
    const height = drawSkillGrid(context, model.skills, layout.innerX, y, layout.innerWidth, {
      direction,
      fontSize: 10.2,
      textColor: SIDEBAR_TEXT,
      background: "rgba(255,255,255,0.045)",
      borderColor: "rgba(255,255,255,0.14)",
      horizontalPadding: 8,
      verticalPadding: 5,
      lineHeight: 15,
      rowGap: 7,
      gap: 7,
      radius: 7,
    });
    return y + height;
  }

  function drawExperience(context, record, x, y, width, direction, accent) {
    const startY = y;
    const lineX = direction === "rtl" ? x + width - 1 : x + 1;
    const textX = direction === "rtl" ? x : x + 17;
    const textWidth = width - 17;
    const date = record.date || "";
    const dateWidth = date
      ? (() => {
          setFont(context, 8.5, 720);
          return Math.min(textWidth * 0.48, context.measureText(date).width + 12);
        })()
      : 0;
    const gap = date ? 8 : 0;
    const companyWidth = textWidth - dateWidth - gap;
    const company = drawParagraph(context, record.company, {
      x: textX + (direction === "rtl" ? dateWidth + gap : 0),
      y,
      width: companyWidth,
      size: 12.2,
      weight: 750,
      color: MAIN_TEXT,
      lineHeight: 18,
      direction,
    });

    if (date) {
      const dateX = direction === "rtl" ? textX : textX + textWidth - dateWidth;
      roundedRect(context, dateX, y, dateWidth, 19, 9.5);
      context.fillStyle = "#fff9e7";
      context.fill();
      context.strokeStyle = "rgba(140,103,0,0.32)";
      context.lineWidth = 0.65;
      context.stroke();
      setFont(context, 8.5, 720);
      context.fillStyle = "#6b581e";
      context.direction = "ltr";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(date, dateX + dateWidth / 2, y + 9.5, dateWidth - 6);
    }

    y += Math.max(company.height, date ? 19 : 0) + 2;
    if (record.role) {
      y += drawParagraph(context, record.role, {
        x: textX,
        y,
        width: textWidth,
        size: 9.5,
        color: BODY_TEXT,
        lineHeight: 15,
        direction,
      }).height;
    }
    if (record.tasks.length) {
      y += 7;
      y += drawChips(context, record.tasks, textX, y, textWidth, {
        direction,
        fontSize: 8.4,
        textColor: "#59636e",
        background: "#f6f7f8",
        borderColor: "#e1e5e8",
        accent,
        horizontalPadding: 6,
        verticalPadding: 3,
        lineHeight: 12.5,
        rowGap: 4,
        gap: 4,
        radius: 5,
      });
    }
    const endY = y + 15;
    context.strokeStyle = "#d9dee3";
    context.lineWidth = 0.8;
    context.beginPath();
    context.moveTo(lineX, startY + 8);
    context.lineTo(lineX, endY);
    context.stroke();
    context.beginPath();
    context.arc(lineX, startY + 8, 4, 0, Math.PI * 2);
    context.fillStyle = accent;
    context.fill();
    context.strokeStyle = "#ffffff";
    context.lineWidth = 1.5;
    context.stroke();
    return endY;
  }

  function drawMain(context, model, layout, direction, accent) {
    const x = layout.x + MAIN_PADDING;
    const width = PAGE_WIDTH - SIDEBAR_WIDTH - MAIN_PADDING * 2;
    let y = 58;
    y += drawTitle(
      context,
      model.locale === "fa" ? "معرفی" : "PROFILE",
      x,
      y,
      width,
      direction,
      accent
    );
    y += 6;
    y += drawParagraph(context, model.summary, {
      x,
      y,
      width,
      size: 10.7,
      color: BODY_TEXT,
      lineHeight: 19.5,
      direction,
    }).height;

    y += 25;
    y += drawTitle(context, model.experienceHeading, x, y, width, direction, accent);
    y += 11;
    for (const record of model.experience) {
      y = drawExperience(context, record, x, y, width, direction, accent);
    }

    y += 11;
    y += drawTitle(context, model.educationHeading, x, y, width, direction, accent);
    y += 7;
    const educationLines = wrapText(context, model.education, width - 24, direction);
    const cardHeight = Math.max(44, educationLines.length * 18 + 22);
    roundedRect(context, x, y, width, cardHeight, 9);
    context.fillStyle = "#fbfbfa";
    context.fill();
    context.strokeStyle = "#e0e4e8";
    context.lineWidth = 0.8;
    context.stroke();
    drawParagraph(context, model.education, {
      x: x + 12,
      y: y + 11,
      width: width - 24,
      size: 10.4,
      weight: 550,
      color: "#303740",
      lineHeight: 18,
      direction,
    });
    return y + cardHeight;
  }

  function safeAccent() {
    const accent = getComputedStyle(document.documentElement)
      .getPropertyValue("--accent")
      .trim();
    return /^#[\da-f]{3,8}$/i.test(accent) ? accent : DEFAULT_ACCENT;
  }

  function drawPage(canvas, model, photo) {
    let context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas is not supported in this browser.");
    const direction = model.locale === "fa" ? "rtl" : "ltr";
    const accent = safeAccent();
    let contentEnd = 0;

    function renderAtScale(scale) {
      if (scale !== 1) {
        canvas.width = RASTER_WIDTH;
        canvas.height = RASTER_HEIGHT;
        context = canvas.getContext("2d", { alpha: false });
      }
      const offsetX = (PAGE_WIDTH * (1 - scale)) / 2;
      const offsetY = 18;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, RASTER_WIDTH, RASTER_HEIGHT);
      context.setTransform(
        PIXEL_SCALE * scale,
        0,
        0,
        PIXEL_SCALE * scale,
        PIXEL_SCALE * offsetX,
        PIXEL_SCALE * offsetY
      );

      const sidebarX = direction === "rtl" ? PAGE_WIDTH - SIDEBAR_WIDTH : 0;
      context.fillStyle = SIDEBAR_COLOR;
      context.fillRect(sidebarX, -offsetY / scale, SIDEBAR_WIDTH, PAGE_HEIGHT / scale);
      context.fillStyle = accent;
      context.fillRect(sidebarX, -offsetY / scale, SIDEBAR_WIDTH, 4);
      const sidebarLayout = { x: sidebarX };
      const header = drawSidebarHeader(context, model, sidebarLayout, direction, accent, photo);
      const sidebarContentLayout = { ...sidebarLayout, ...header };
      let sidebarEnd = drawContactSection(context, model, sidebarContentLayout, header.y, direction, accent);
      sidebarEnd = drawSkillSection(context, model, sidebarContentLayout, sidebarEnd, direction, accent);

      const mainX = direction === "rtl" ? 0 : SIDEBAR_WIDTH;
      const mainEnd = drawMain(context, model, { x: mainX }, direction, accent);
      contentEnd = Math.max(sidebarEnd, mainEnd) * scale + offsetY;
      return contentEnd;
    }

    let end = renderAtScale(1);
    const availableHeight = PAGE_HEIGHT - 34;
    if (end > availableHeight) {
      const scale = Math.max(0.72, availableHeight / end);
      end = renderAtScale(scale);
      if (end > PAGE_HEIGHT - 8) {
        throw new Error("The résumé content does not fit on one A4 page.");
      }
    }
    return canvas;
  }

  function createFileName(model) {
    const forbiddenCharacters = "\\/:*?\"<>|";
    const safeName = Array.from(model.name.normalize("NFC"))
      .filter((character) => character.codePointAt(0) > 31 && !forbiddenCharacters.includes(character))
      .join("")
      .trim()
      .replace(/\s+/g, "-");
    return `${labels[model.locale]}-${safeName || "CV"}.pdf`;
  }

  function waitForPhoto(source) {
    if (!source) return Promise.resolve(null);
    return new Promise((resolve) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = source;
      if (image.complete && image.naturalWidth) resolve(image);
    });
  }

  function canvasToJpeg(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("The résumé image could not be encoded."));
        },
        "image/jpeg",
        0.94
      );
    });
  }

  function utf8(value) {
    return new TextEncoder().encode(value);
  }

  function concatenate(parts) {
    const length = parts.reduce((total, part) => total + part.byteLength, 0);
    const output = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
      output.set(part, offset);
      offset += part.byteLength;
    }
    return output;
  }

  function buildPdf(jpegBytes) {
    const header = utf8("%PDF-1.4\n");
    const pageContent = utf8(
      "q\n595.276 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n"
    );
    const objects = [
      utf8("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"),
      utf8("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"),
      utf8(
        "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.276 841.89] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n"
      ),
      concatenate([
        utf8(
          `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${RASTER_WIDTH} /Height ${RASTER_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.byteLength} >>\nstream\n`
        ),
        jpegBytes,
        utf8("\nendstream\nendobj\n"),
      ]),
      concatenate([
        utf8(`5 0 obj\n<< /Length ${pageContent.byteLength} >>\nstream\n`),
        pageContent,
        utf8("endstream\nendobj\n"),
      ]),
    ];

    const offsets = [];
    const parts = [header];
    let byteOffset = header.byteLength;
    for (const object of objects) {
      offsets.push(byteOffset);
      parts.push(object);
      byteOffset += object.byteLength;
    }

    const xrefOffset = byteOffset;
    const xrefEntries = ["0000000000 65535 f \n"];
    for (const offset of offsets) {
      xrefEntries.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
    }
    parts.push(
      utf8(
        `xref\n0 ${objects.length + 1}\n${xrefEntries.join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
      )
    );
    return new Blob(parts, { type: "application/pdf" });
  }

  async function prepare(model) {
    if (!labels[model.locale]) throw new Error("Unsupported résumé language.");
    if (document.fonts?.ready) await document.fonts.ready;
    const photo = await waitForPhoto(model.portrait);
    const canvas = document.createElement("canvas");
    canvas.width = RASTER_WIDTH;
    canvas.height = RASTER_HEIGHT;
    drawPage(canvas, model, photo);
    const jpegBlob = await canvasToJpeg(canvas);
    const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
    const blob = buildPdf(jpegBytes);
    canvas.width = 1;
    canvas.height = 1;
    return { blob, fileName: createFileName(model) };
  }

  function download(prepared) {
    if (!prepared?.blob || !prepared?.fileName) {
      throw new Error("The PDF has not been prepared yet.");
    }
    const url = URL.createObjectURL(prepared.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = prepared.fileName;
    link.style.position = "fixed";
    link.style.insetInlineStart = "-10000px";
    link.setAttribute("aria-hidden", "true");
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  window.ResumePdf = { prepare, download };
})();
