# click-counter

A global click counter webpage where every count draws its own rose.

Live: https://counter.maricakes.de

Each click on the page increments an all-time counter. The new count `n` is used to draw a variation of a [Maurer rose](https://en.wikipedia.org/wiki/Maurer_rose).

## The maths

Take the rose curve `r = sin(nθ)` and join 512 points on it with straight lines, sampled at the angles `θ = kn` radians for `k = 1, 2, ..., 512`.

Each point therefore turns by `n mod 2π` (the angle step), and the phase of its radius advances by `n² mod 2π`. Since π is irrational, neither value repeats for different integers `n`, so no two counts ever give the same parameters. The `n²` term stops neighbouring counts from looking alike.

Only the parameters are guaranteed unique. At screen resolution, some roses can still look similar.

## Exploring other counts

Change the number after the `#` in the address bar, for example `/#3`, to see the rose for any other count. This happens entirely in your browser and never touches the counter. Valid values are whole numbers from 1 to 94,906,265 (above that, `n * n` is no longer exact in a double). Anything else falls back to the live count.

## How it works

- `index.html`, `style.css`, `script.js`: the page. The rose is built as an inline SVG string in `script.js`.
- `click.php`: the counter endpoint.
  - `GET` returns the current count without changing it.
  - `POST` increments it and returns the new value. Cross-site requests are rejected using the `Sec-Fetch-Site` header.
  - The count is an 8-byte big-endian integer in `/var/lib/counter/count.bin`, protected by `flock`, so simultaneous clicks never lose increments.
- `nginx-counter.conf`: the nginx server block, with per-IP rate limiting, security headers (including a strict CSP), and gzip for text assets.
- `flower.svg`, `marble.avif`: static assets.

Only clicks count. Loading the page just reads the number.

## Running it yourself

1. Create the counter file's directory and let PHP-FPM write to it:

   ```
   sudo mkdir -p /var/lib/counter
   sudo chown www-data: /var/lib/counter
   ```

   The file itself is created on the first click.

2. Serve this directory with nginx and PHP-FPM, using `nginx-counter.conf` as a starting point. Adjust `server_name`, `root`, and the PHP-FPM socket path for your system.

3. The config assumes the site sits behind a Cloudflare Tunnel. It listens on localhost only and takes the visitor's address from `CF-Connecting-IP`, so the rate limit applies per visitor rather than to the tunnel. If you aren't using a tunnel, remove the `set_real_ip_from` and `real_ip_header` lines and listen on a normal address.

4. Check the config and reload:

   ```
   sudo nginx -t && sudo systemctl reload nginx
   ```

Back up `count.bin` if you care about the number. If the file is lost or empty, the counter restarts from zero.

## Licence

MIT. See `LICENSE`.
