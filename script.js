const API = "https://berita-indo-api-next.vercel.app/api/cnn-news";
const $ = id => document.getElementById(id);
const hero = $("hero"), grid = $("berita"), status = $("status"), judul = $("secJudul");
let kategori = "terbaru", data = [], reqId = 0;

/* ---------- util ---------- */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ringkas = s => esc((s || "").replace(/^[A-Za-z\s,.]+?\s-\s/, "").trim());
const gambar = a => a?.image?.large || a?.image?.small || a?.image || "";
const ago = iso => {
  const d = new Date(iso); if (isNaN(d)) return "";
  const m = Math.round((Date.now() - d) / 60000);
  if (m < 1) return "Baru saja";
  if (m < 60) return `${m} menit lalu`;
  if (m < 1440) return `${Math.floor(m / 60)} jam lalu`;
  if (m < 10080) return `${Math.floor(m / 1440)} hari lalu`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};
const img = (a, eager) => gambar(a)
  ? `<img src="${esc(gambar(a))}" alt="" ${eager ? "" : 'loading="lazy"'} onerror="this.style.display='none'">` : "";

/* ---------- tampilan ---------- */
function skeleton() {
  hero.innerHTML = `<div class="sk sk-lead"></div><div class="sk sk-side"></div>`;
  grid.innerHTML = Array(6).fill('<div class="sk sk-card"></div>').join("");
  judul.hidden = status.hidden = true;
}

function render(list) {
  status.hidden = true;
  if (!list.length) {
    hero.innerHTML = grid.innerHTML = ""; judul.hidden = true;
    return pesan("Berita tidak ditemukan", "Coba kata kunci lain atau pilih kategori berbeda.");
  }
  const [a, ...rest] = list;
  const side = rest.slice(0, 4), lain = rest.slice(4);

  hero.innerHTML = `
    <a class="lead rise" href="${esc(a.link)}" target="_blank" rel="noopener">
      ${img(a, true)}
      <div class="lead-body">
        <span class="badge">${esc(kategori === "terbaru" ? "Berita utama" : kategori.replace("-", " "))}</span>
        <h1>${esc(a.title)}</h1>
        <p>${ringkas(a.contentSnippet)}</p>
        <span class="time">${ago(a.isoDate)}</span>
      </div>
    </a>
    <aside class="side rise" style="--i:2">
      <h2>Sedang dibaca</h2>
      ${side.map(s => `<a href="${esc(s.link)}" target="_blank" rel="noopener">
        <h3>${esc(s.title)}</h3><span class="time">${ago(s.isoDate)}</span></a>`).join("")}
    </aside>`;

  judul.hidden = !lain.length;
  grid.innerHTML = lain.map((b, i) => `
    <a class="card rise" style="--i:${Math.min(i, 8)}" href="${esc(b.link)}" target="_blank" rel="noopener">
      <div class="img">${img(b)}</div>
      <div class="body">
        <h3><span>${esc(b.title)}</span></h3>
        <p>${ringkas(b.contentSnippet)}</p>
        <span class="time">${ago(b.isoDate)}</span>
      </div>
    </a>`).join("");
}

function pesan(h, p, retry) {
  status.hidden = false;
  status.innerHTML = `<h3>${h}</h3><p>${p}</p>${retry ? '<button id="ulang">Coba lagi</button>' : ""}`;
  if (retry) $("ulang").onclick = () => muat(kategori);
}

function ticker(list) {
  const items = list.slice(0, 8).map(b => `<a href="${esc(b.link)}" target="_blank" rel="noopener">${esc(b.title)}</a>`).join("");
  $("tickerTrack").innerHTML = items + items;
  $("ticker").hidden = !list.length;
}

/* ---------- data ---------- */
async function ambil(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(r.status);
  const j = await r.json();
  if (!Array.isArray(j.data) || !j.data.length) throw new Error("kosong");
  return j.data;
}

async function muat(k) {
  const id = ++reqId; kategori = k; $("cari").value = "";
  skeleton();
  try {
    let hasil;
    try { hasil = await ambil(k === "terbaru" ? `${API}/terbaru` : `${API}/${k}`); }
    catch { hasil = await ambil(API); }          // cadangan: endpoint utama
    if (id !== reqId) return;                    // abaikan respons lama
    data = hasil; render(data); ticker(data);
  } catch {
    if (id !== reqId) return;
    hero.innerHTML = grid.innerHTML = ""; judul.hidden = true;
    pesan("Berita belum bisa dimuat", "Periksa koneksi internet kamu, lalu coba lagi.", true);
  } finally {
    if (id === reqId) {
      setTimeout(() => $("preloader").classList.add("done"), Math.max(0, 1400 - (Date.now() - mulai)));
    }
  }
}

/* ---------- interaksi ---------- */
$("kategori").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b || b.dataset.k === kategori) return;
  document.querySelectorAll("#kategori button").forEach(x => x.classList.toggle("on", x === b));
  window.scrollTo({ top: 0, behavior: "smooth" });
  muat(b.dataset.k);
});

let t;
$("cari").addEventListener("input", e => {
  clearTimeout(t);
  t = setTimeout(() => {
    const q = e.target.value.trim().toLowerCase();
    render(q ? data.filter(b => (b.title + " " + (b.contentSnippet || "")).toLowerCase().includes(q)) : data);
  }, 200);
});

const header = document.querySelector(".top");
addEventListener("scroll", () => header.classList.toggle("scrolled", scrollY > 40), { passive: true });

$("tanggal").textContent = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const mulai = Date.now(); // preloader tampil minimal 1,4 dtk agar animasi logo terbaca
muat("terbaru");
