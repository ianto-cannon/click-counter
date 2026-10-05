const artEl = document.querySelector(".art");
const show = (cls, text) => {
  document.querySelectorAll(`.${cls}`).forEach(el => el.textContent = text);
};

const TAU = 2 * Math.PI;

function parseN(s) {
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}
const hashN = () => parseN(location.hash.slice(1));

function maurerRose(n) {
  const SIZE = 400;
  const H = SIZE / 2;
  const R = SIZE * 0.46;
  const a = n % TAU;
  const b = (n * n) % TAU;

  show("count", n);
  show("angle", (a / TAU).toFixed(4));
  show("phase", (b / TAU).toFixed(4));

  let pathD = "";
  for (let k = 1; k <= 512; k++) {
    const th = a * k;
    const r = R * Math.sin(b * k);
    const x = (r * Math.cos(th)).toFixed(2);
    const y = (r * Math.sin(th)).toFixed(2);
    pathD += `${k === 1 ? "M" : "L"}${x} ${y}`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-H} ${-H} ${SIZE} ${SIZE}" width="100%">
    <path d="${pathD}" fill="none" stroke="currentColor" stroke-width="0.5" stroke-linejoin="round"/>
  </svg>`;
}

let liveCount = null;

function render(n, setHash) {
  artEl.innerHTML = maurerRose(n);
  if (setHash) history.replaceState(null, "", "#" + n);
}

async function update(method) {
  try {
    const res = await fetch("/click.php", { method });
    if (!res.ok) {
      if (res.status === 429) {
        btn.textContent = "Slow down";
        setTimeout(() => { btn.textContent = "Click"; }, 1500);
      }
      return;
    }
    const c = parseN((await res.text()).trim());
    if (c === null) return;
    if (liveCount !== null && c < liveCount) return;
    liveCount = c;

    if (method === "POST") {
      render(c, true);
    } else {
      const nav = performance.getEntriesByType("navigation")[0];
      const reloaded = nav && nav.type === "reload";
      const n = hashN();
      if (n === null || reloaded) render(c, true);
      else render(n, false);
    }
  } catch (err) {
    console.error("Failed to update counter:", err);
  }
}

const btn = document.querySelector(".click");
let busy = false;

btn.addEventListener("click", async () => {
  if (busy) return;
  busy = true;
  btn.disabled = true;
  await update("POST");
  btn.disabled = false;
  busy = false;
});

window.addEventListener("hashchange", () => {
  const n = hashN();
  if (n !== null) render(n, false);
  else if (liveCount !== null) render(liveCount, true);
});

window.addEventListener("pageshow", (e) => {
  if (e.persisted) update("GET");
});

update("GET");
