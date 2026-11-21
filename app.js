(function () {
  "use strict";

  var THEME_KEY = "sora-theme";
  var root = document.documentElement;
  var themeButton = document.getElementById("theme-toggle");

  function currentTheme() {
    return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function applyTheme(theme, persist) {
    root.setAttribute("data-theme", theme);
    var dark = theme === "dark";
    if (themeButton) {
      themeButton.setAttribute("aria-pressed", dark ? "true" : "false");
      themeButton.setAttribute("aria-label", dark ? "ライトモードに切り替え" : "ダークモードに切り替え");
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#0e1522" : "#e7f3ff");
    if (persist) {
      try { localStorage.setItem(THEME_KEY, theme); } catch (err) {}
    }
  }

  if (themeButton) {
    themeButton.addEventListener("click", function () {
      applyTheme(currentTheme() === "dark" ? "light" : "dark", true);
    });
  }
  applyTheme(currentTheme(), false);

  var walk = new Image();
  walk.onerror = function () {
    var lane = document.getElementById("walk-lane");
    if (lane) lane.remove();
  };
  walk.src = "assets/chibi-walk-right.webp";

  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function setMeta(selector, value) {
    if (!value) return;
    var node = document.querySelector(selector);
    if (node) node.setAttribute("content", value);
  }

  function linkKind(url) {
    var value = String(url || "").trim();
    if (!value) return null;
    if (/^mailto:/i.test(value)) return { href: value, external: false };
    if (/^https?:\/\//i.test(value)) return { href: value, external: true };
    return null;
  }

  function safeImage(src) {
    var value = String(src || "").trim();
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    if (/^[A-Za-z0-9._/-]+$/.test(value) && value.indexOf("..") === -1) return value;
    return "";
  }

  function badgeTone(badge) {
    var text = badge || "";
    if (text.indexOf("招待") !== -1) return "invite";
    if (text.indexOf("動画") !== -1) return "video";
    if (text.indexOf("公式") !== -1) return "official";
    if (/PR|ＰＲ/i.test(text)) return "pr";
    return "neutral";
  }

  function initial(title) {
    var chars = Array.from(String(title || "").trim());
    var ch = chars[0] || "・";
    return /[a-z]/i.test(ch) ? ch.toUpperCase() : ch;
  }

  function iconSvg(kind) {
    if (kind === "play") {
      return '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13l11-6.5-11-6.5z"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M4 7.5h16v10H4z"/><path fill="none" stroke="currentColor" stroke-width="1.8" d="m4 8 8 6 8-6"/></svg>';
  }

  function fallbackCopy(text) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.appendChild(area);
    area.focus();
    area.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (err) {}
    area.remove();
    return ok;
  }

  function copyText(value, button) {
    var text = String(value || "");
    if (!text) return;
    var original = button.textContent;
    var done = function (ok) {
      if (!ok) return;
      button.textContent = "コピーした";
      window.setTimeout(function () {
        button.textContent = original;
      }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }).catch(function () {
        done(fallbackCopy(text));
      });
    } else {
      done(fallbackCopy(text));
    }
  }

  function renderInviteCode(code) {
    var row = el("span", "invite-code");
    var label = el("span", "invite-code-label");
    label.textContent = "紹介コード";
    var value = el("span", "invite-code-value");
    value.textContent = code;
    var button = el("button", "copy-code");
    button.type = "button";
    button.textContent = "コピー";
    button.setAttribute("aria-label", "紹介コード " + code + " をコピー");
    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      copyText(code, button);
    });
    row.appendChild(label);
    row.appendChild(value);
    row.appendChild(button);
    return row;
  }

  function renderCard(item, section, index) {
    var kind = linkKind(item.url);
    var soon = !kind;
    var code = String(item.code || "").trim();
    var splitLink = !soon && !!code;
    var card = el(soon || splitLink ? "div" : "a", "card" + (soon ? " is-soon" : "") + (splitLink ? " has-code" : ""));
    var main = card;
    if (soon) {
      card.setAttribute("role", "group");
      card.setAttribute("aria-label", item.title + "、準備中");
    } else {
      if (splitLink) main = el("a", "card-hit");
      main.href = kind.href;
      if (kind.external) {
        main.target = "_blank";
        main.rel = section && section.sponsored ? "sponsored noopener noreferrer" : "noopener noreferrer";
      }
    }

    var mark = el("span", "mark");
    mark.dataset.tone = ["a", "b", "c"][index % 3];
    var image = safeImage(item.image);
    if (image) {
      var img = el("img");
      img.src = image;
      img.alt = "";
      img.addEventListener("error", function () {
        img.remove();
        if (kind && /youtube\.com|youtu\.be/i.test(kind.href)) mark.innerHTML = iconSvg("play");
        else if (kind && !kind.external) mark.innerHTML = iconSvg("mail");
        else mark.textContent = initial(item.title);
      });
      mark.appendChild(img);
    } else if (kind && /youtube\.com|youtu\.be/i.test(kind.href)) {
      mark.innerHTML = iconSvg("play");
    } else if (kind && !kind.external) {
      mark.innerHTML = iconSvg("mail");
    } else {
      mark.textContent = initial(item.title);
    }

    var body = el("span", "card-body");
    var row = el("span", "title-row");
    var title = el("span", "card-title");
    title.textContent = item.title || "";
    row.appendChild(title);
    if (item.badge) {
      var badge = el("span", "badge");
      badge.dataset.tone = badgeTone(item.badge);
      badge.textContent = item.badge;
      row.appendChild(badge);
    }
    var note = el("span", "note");
    note.textContent = item.note || "";
    body.appendChild(row);
    body.appendChild(note);

    var trail = el("span", "trail");
    if (soon) {
      var label = el("span", "soon-label");
      label.textContent = "準備中";
      trail.appendChild(label);
    } else if (kind.external) {
      trail.className = "trail chevron";
      trail.innerHTML = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M8 5l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      var sr = el("span", "sr");
      sr.textContent = "（新しいタブで開く）";
      body.appendChild(sr);
    } else {
      trail.className = "trail chevron";
      trail.innerHTML = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M5 10h10M11 6l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }

    main.appendChild(mark);
    main.appendChild(body);
    main.appendChild(trail);
    if (splitLink) card.appendChild(main);
    if (code) {
      if (soon) card.classList.add("has-code");
      card.appendChild(renderInviteCode(code));
    }
    return card;
  }

  function renderSection(section, index) {
    var sec = el("section", "section");
    if (section.id) sec.id = section.id;
    var head = el("div", "section-head");
    var num = el("span", "section-index");
    num.textContent = String(index + 1).padStart(2, "0");
    var heading = el("h2");
    var titleText = section.title || "";
    var splitAt = titleText.indexOf("（");
    if (splitAt > 0) {
      heading.appendChild(document.createTextNode(titleText.slice(0, splitAt)));
      heading.appendChild(document.createElement("br"));
      heading.appendChild(document.createTextNode(titleText.slice(splitAt)));
    } else {
      heading.textContent = titleText;
    }
    head.appendChild(num);
    head.appendChild(heading);
    if (section.id === "ai-services" || section.id === "pickup") {
      var point = el("img", "section-point");
      var pointsRight = section.id === "pickup";
      point.src = pointsRight ? "assets/chibi-point-right.webp" : "assets/chibi-point-left.webp";
      if (pointsRight) point.classList.add("is-left");
      point.alt = "";
      point.width = 68;
      point.height = 68;
      point.addEventListener("error", function () { point.remove(); });
      if (pointsRight) head.insertBefore(point, num);
      else head.appendChild(point);
    }
    var list = el("div", "list");
    (section.items || []).forEach(function (item, itemIndex) {
      if (!item || !item.title) return;
      list.appendChild(renderCard(item, section, itemIndex));
    });
    sec.appendChild(head);
    sec.appendChild(list);
    return sec;
  }

  function text(id, value) {
    var node = document.getElementById(id);
    if (node && value != null) node.textContent = value;
  }

  function apply(data) {
    var meta = data.meta || {};
    var profile = data.profile || {};
    if (meta.title) document.title = meta.title;
    setMeta('meta[name="description"]', meta.description);
    setMeta('meta[property="og:title"]', meta.title);
    setMeta('meta[property="og:description"]', meta.description);
    setMeta('meta[name="twitter:title"]', meta.title);
    setMeta('meta[name="twitter:description"]', meta.description);
    if (meta.ogImage) {
      setMeta('meta[property="og:image"]', meta.ogImage);
      setMeta('meta[name="twitter:image"]', meta.ogImage);
    }
    if (meta.siteUrl) {
      var origin = String(meta.siteUrl).replace(/\/$/, "");
      setMeta('meta[property="og:url"]', origin + "/");
      var image = origin + "/" + String(meta.ogImage || "assets/ogp.png").replace(/^\//, "");
      setMeta('meta[property="og:image"]', image);
      setMeta('meta[name="twitter:image"]', image);
      var canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
      }
      canonical.href = origin + "/";
    }

    text("hero-kicker", profile.kicker || "");
    text("hero-name", profile.heroName || "");
    text("profile-name", profile.name || "");
    text("profile-bio", profile.bio || "");
    text("disclosure-text", data.disclosure || "");
    text("footer-disclosure", data.disclosure || "");
    text("footer-name", data.footer || profile.name || "");

    var icon = document.getElementById("profile-icon");
    if (icon) {
      var src = safeImage(profile.icon);
      var fallback = safeImage(profile.iconFallback);
      if (src) icon.src = src;
      icon.alt = profile.iconAlt || profile.name || "";
      icon.onerror = function () {
        if (fallback && icon.src.indexOf(fallback) === -1) icon.src = fallback;
      };
    }

    var anySoon = false;
    (data.sections || []).forEach(function (section) {
      (section.items || []).forEach(function (item) {
        if (item && !linkKind(item.url)) anySoon = true;
      });
    });
    var pending = document.getElementById("pending");
    if (pending) pending.hidden = !anySoon;
    if (anySoon) text("pending-note", data.pendingNote || "");

    var mount = document.getElementById("sections");
    mount.replaceChildren();
    (data.sections || []).forEach(function (section, index) {
      mount.appendChild(renderSection(section, index));
    });
  }

  function showError() {
    var mount = document.getElementById("sections");
    mount.replaceChildren();
    var box = el("div", "error");
    var message = el("p");
    message.textContent = "リンク集を読み込めませんでした。通信環境を確認して、もう一度開いてください。";
    var button = el("button");
    button.type = "button";
    button.textContent = "再読み込み";
    button.addEventListener("click", function () { location.reload(); });
    box.appendChild(message);
    box.appendChild(button);
    mount.appendChild(box);
  }

  fetch("links.json", { cache: "no-cache" })
    .then(function (res) {
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    })
    .then(apply)
    .catch(showError);
})();
