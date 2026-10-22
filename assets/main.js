/* ------------------------------------------------------------------
   BKS Infralink — edit your contact details here. Everything on the
   site that shows a phone, email or WhatsApp link reads from this.
   ------------------------------------------------------------------ */
const SITE = {
  phone: "+91 00000 00000",          // TODO: real phone number
  whatsapp: "910000000000",          // TODO: digits only, with country code
  email: "info@example.com",         // TODO: real email
  address: "Dholpur, Rajasthan, India",
  // Optional: paste a form endpoint (e.g. https://formspree.io/f/xxxx or
  // https://formsubmit.co/ajax/you@domain.com). If empty, forms open the
  // visitor's email app with the message filled in.
  formEndpoint: ""
};

document.documentElement.classList.add("js");

/* contact details */
document.querySelectorAll("[data-site]").forEach(el => {
  const k = el.dataset.site, v = SITE[k];
  if (!v) return;
  if (k === "phone") { el.href = "tel:" + v.replace(/\s/g, ""); el.textContent = v; }
  else if (k === "email") { el.href = "mailto:" + v; el.textContent = v; }
  else if (k === "whatsapp") { el.href = "https://wa.me/" + v; }
  else el.textContent = v;
});
document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());

/* header */
const hdr = document.querySelector(".top");
const onScroll = () => hdr && hdr.classList.toggle("scrolled", scrollY > 8);
addEventListener("scroll", onScroll, { passive: true }); onScroll();
const menuBtn = document.querySelector(".menu-btn");
menuBtn && menuBtn.addEventListener("click", () => {
  const open = document.body.classList.toggle("menu-open");
  menuBtn.setAttribute("aria-expanded", open);
});
document.querySelectorAll(".nav a").forEach(a => a.addEventListener("click", () => document.body.classList.remove("menu-open")));

/* hero sheet: crosshair + coordinate readout, like a CAD cursor */
const sheet = document.querySelector(".sheet");
if (sheet) {
  const ro = sheet.querySelector(".readout"), cross = sheet.querySelector(".cross");
  sheet.addEventListener("pointermove", e => {
    const r = sheet.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    cross.style.setProperty("--x", x + "px"); cross.style.setProperty("--y", y + "px");
    // sheet spans roughly 260 m on the ground
    const m = 260 / r.width;
    ro.textContent = `E ${(x * m).toFixed(1).padStart(6, "0")} m   N ${((r.height - y) * m).toFixed(1).padStart(6, "0")} m`;
  });
}

/* one-time reveal for drawing plates */
const io = "IntersectionObserver" in window && new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
}), { rootMargin: "0px 0px -8% 0px" });
document.querySelectorAll(".reveal").forEach(el => io ? io.observe(el) : el.classList.add("in"));

/* ink / paper toggle on the work page */
const seg = document.querySelector("[data-theme-toggle]");
if (seg) {
  const set = t => {
    seg.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.dataset.t === t));
    document.querySelectorAll("img[data-base]").forEach(img => {
      const b = img.dataset.base;
      img.src = `${b}-${t}-1200.webp`;
      img.srcset = `${b}-${t}-1200.webp 1200w, ${b}-${t}.webp 2400w`;
    });
    document.querySelectorAll(".plate .img").forEach(d => d.style.background = t === "dark" ? "#1b2130" : "#f7f2ec");
    try { localStorage.setItem("bks-theme", t); } catch (e) {}
  };
  seg.addEventListener("click", e => { const b = e.target.closest("button"); b && set(b.dataset.t); });
  let saved = "dark"; try { saved = localStorage.getItem("bks-theme") || "dark"; } catch (e) {}
  if (saved !== "dark") set(saved);
}

/* lightbox with pan + zoom */
const lb = document.querySelector(".lb");
if (lb) {
  const stage = lb.querySelector(".lb-stage"), img = stage.querySelector("img"), title = lb.querySelector(".lb-bar .t");
  let s = 1, tx = 0, ty = 0, last = null, opener = null;
  const apply = () => img.style.transform = `translate(${tx}px,${ty}px) scale(${s})`;
  const fit = () => {
    const W = stage.clientWidth, H = stage.clientHeight, iw = img.naturalWidth, ih = img.naturalHeight;
    s = Math.min(W / iw, (H - 80) / ih); tx = (W - iw * s) / 2; ty = (H - ih * s) / 2 + 20; apply();
  };
  const zoom = (f, cx, cy) => {
    const ns = Math.min(Math.max(s * f, .1), 4);
    tx = cx - (cx - tx) * ns / s; ty = cy - (cy - ty) * ns / s; s = ns; apply();
  };
  document.querySelectorAll("[data-zoom]").forEach(btn => btn.addEventListener("click", () => {
    opener = btn;
    const im = btn.querySelector("img"), base = im.dataset.base;
    const t = (document.querySelector("[data-theme-toggle] [aria-pressed=true]") || {}).dataset?.t || "dark";
    title.textContent = btn.dataset.zoom;
    img.alt = im.alt;
    img.onload = fit; img.src = `${base}-${t}.webp`;
    lb.style.background = t === "dark" ? "#11151f" : "#e9e2d8";
    lb.classList.add("open"); document.body.style.overflow = "hidden";
    lb.querySelector("[data-close]").focus();
  }));
  const close = () => { lb.classList.remove("open"); document.body.style.overflow = ""; opener && opener.focus(); };
  lb.querySelector("[data-close]").addEventListener("click", close);
  lb.querySelector("[data-in]").addEventListener("click", () => zoom(1.4, stage.clientWidth / 2, stage.clientHeight / 2));
  lb.querySelector("[data-out]").addEventListener("click", () => zoom(1 / 1.4, stage.clientWidth / 2, stage.clientHeight / 2));
  lb.querySelector("[data-fit]").addEventListener("click", fit);
  addEventListener("keydown", e => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") close();
    if (e.key === "+" || e.key === "=") zoom(1.25, stage.clientWidth / 2, stage.clientHeight / 2);
    if (e.key === "-") zoom(.8, stage.clientWidth / 2, stage.clientHeight / 2);
  });
  stage.addEventListener("wheel", e => { e.preventDefault(); const r = stage.getBoundingClientRect(); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  const pts = new Map(); let pinch = 0;
  stage.addEventListener("pointerdown", e => { stage.setPointerCapture(e.pointerId); pts.set(e.pointerId, e); stage.classList.add("drag"); last = e; });
  stage.addEventListener("pointermove", e => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, e);
    if (pts.size === 2) {
      const [a, b] = [...pts.values()], d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const r = stage.getBoundingClientRect();
      if (pinch) zoom(d / pinch, (a.clientX + b.clientX) / 2 - r.left, (a.clientY + b.clientY) / 2 - r.top);
      pinch = d; return;
    }
    tx += e.clientX - last.clientX; ty += e.clientY - last.clientY; last = e; apply();
  });
  const up = e => { pts.delete(e.pointerId); pinch = 0; if (!pts.size) stage.classList.remove("drag"); last = [...pts.values()][0] || null; };
  stage.addEventListener("pointerup", up); stage.addEventListener("pointercancel", up);
  addEventListener("resize", () => lb.classList.contains("open") && fit());
}

/* forms: post to endpoint if configured, otherwise open the email app */
document.querySelectorAll("form[data-form]").forEach(form => {
  const status = form.querySelector(".form-status");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (form.querySelector(".hp input")?.value) return;
    if (!form.reportValidity()) return;
    const fd = new FormData(form); fd.delete("website");
    const kind = form.dataset.form;
    const lines = [];
    for (const [k, v] of fd.entries()) if (v && k !== "_subject") lines.push(`${k}: ${v}`);
    const subject = `${kind === "quote" ? "Quote request" : "Enquiry"} from ${fd.get("Name") || "website"}`;
    const btn = form.querySelector("button[type=submit]"), label = btn.textContent;
    if (SITE.formEndpoint) {
      btn.disabled = true; btn.textContent = "Sending…";
      try {
        fd.append("_subject", subject);
        const r = await fetch(SITE.formEndpoint, { method: "POST", body: fd, headers: { Accept: "application/json" } });
        if (!r.ok) throw 0;
        form.reset(); status.className = "form-status ok";
        status.textContent = kind === "quote" ? "Quote request sent. We'll reply within one working day." : "Message sent. We'll reply within one working day.";
      } catch (_) {
        status.className = "form-status err";
        status.textContent = `This didn't send. Check your connection and try again, or email ${SITE.email}.`;
      } finally { btn.disabled = false; btn.textContent = label; }
    } else {
      location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
      status.className = "form-status ok";
      status.textContent = "Your email app should open with the details filled in. Press send there to reach us.";
    }
  });
});

/* ---------- motion layer ---------- */
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// smooth scrolling
let lenis = null;
if (!reduceMotion && window.Lenis) {
  lenis = new Lenis({ lerp: .09, wheelMultiplier: 1 });
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener("click", e => {
    const t = document.querySelector(a.getAttribute("href")); if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -72 }); }
  }));
}

// split headings into words that rise in once
document.querySelectorAll(".rise").forEach(h => {
  h.innerHTML = h.textContent.trim().split(/\s+/).map((w, i) => `<span class="sw"><span style="--i:${i}">${w}</span></span>`).join(" ");
  io ? io.observe(h) : h.classList.add("in");
});
// statement: each word lights up as you scroll past
document.querySelectorAll(".words").forEach(p => {
  const ws = p.textContent.trim().split(/\s+/);
  p.style.setProperty("--n", ws.length);
  p.innerHTML = ws.map((w, i) => `<span style="--i:${i}">${w}</span>`).join(" ");
});

// scroll progress (--p, 0..1) for every [data-scrub] section
const scrubs = [...document.querySelectorAll("[data-scrub]")];
const hsTrack = document.querySelector(".hs-track");
const scrolly = document.querySelector(".scrolly");
const alt = document.querySelector(".gauge .alt");
function setShift() {
  if (hsTrack) hsTrack.closest(".hscroll").style.setProperty("--shift", Math.max(0, hsTrack.scrollWidth - innerWidth + 48) + "px");
}
setShift(); addEventListener("resize", setShift); addEventListener("load", setShift);

function tick(t) {
  lenis && lenis.raf(t);
  const vh = innerHeight;
  for (const el of scrubs) {
    const r = el.getBoundingClientRect();
    if (el !== scrolly && (r.bottom < -vh || r.top > vh * 2)) continue;
    const span = el.classList.contains("statement") || el.classList.contains("process") ? r.height + vh * .4 : r.height - vh;
    const start = el.classList.contains("statement") || el.classList.contains("process") ? vh * .8 : 0;
    const p = Math.min(1, Math.max(0, (start - r.top) / Math.max(1, span)));
    el.style.setProperty("--p", p.toFixed(4));
    if (el === scrolly && hdr) { hdr.classList.toggle("past", r.bottom < 72); hdr.classList.toggle("on-dark", p > .66 && r.bottom > 72); }
    if (el === scrolly && window.__scene) {
      window.__scene.progress = p;
      window.__scene.running = r.bottom > 0 && r.top < vh && !document.hidden;
      if (alt) alt.textContent = window.__scene.height().toFixed(1);
      scrolly.classList.toggle("end", p > .84);
    }
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
