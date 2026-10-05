const countEl = document.getElementById("count");
const artEl = document.getElementById("art");
const show = (id, text) => {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
};

const TAU = 2 * Math.PI;

// "1234" -> 1234; anything else (empty, negative, text, too big) -> null
function parseN(s) {
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return n > 0 ? n : null;
}
const hashN = () => parseN(location.hash.slice(1));

function maurerRose(n) {
  const SIZE = 400;
  const H = SIZE / 2;
  const R = SIZE * 0.46;
  const a = n % TAU;        // angle step, radians
  const b = (n * n) % TAU;  // radius phase step

  show("v-n", n);
  show("v-a", (a / TAU).toFixed(4));
  show("v-b", (b / TAU).toFixed(4));

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

let liveCount = null; // the real counter value, once we know it

// draw n; setHash keeps the address bar in sync without adding history entries
function render(n, setHash) {
  countEl.textContent = n;
  artEl.innerHTML = maurerRose(n);
  if (setHash) history.replaceState(null, "", "#" + n);
}

async function update(method) {
  try {
    const res = await fetch("/click.php", { method });
    if (!res.ok) return;
    const c = parseN((await res.text()).trim());
    if (c === null) return;
    if (liveCount !== null && c < liveCount) return; // stale response
    liveCount = c;

    if (method === "POST") {
      render(c, true);
    } else {
      // on a refresh always show the live count; on a fresh visit, respect a number in the URL
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

const btn = document.getElementById("click");
let busy = false;

btn.addEventListener("click", async () => {
  if (busy) return;   // ignore presses while a request is in flight
  busy = true;
  await update("POST");
  busy = false;
});

// user edits the number in the address bar
window.addEventListener("hashchange", () => {
  const n = hashN();
  if (n !== null) render(n, false);
  else if (liveCount !== null) render(liveCount, true);
});

window.addEventListener("load", () => update("GET"));
