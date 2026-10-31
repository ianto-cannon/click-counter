# click-counter

A global click counter where every count draws its own rose.

Live: https://counter.maricakes.de

<img src="scrnshot.jpg" alt="A Maurer rose drawn by the click counter">

Press the button to increase the all-time counter. The new count `n` is used to draw a variation of a [Maurer rose](https://en.wikipedia.org/wiki/Maurer_rose).

* Valid counts are whole numbers from 1 to 94,906,265. Above this, `n * n` is no longer exact in a JavaScript double.
* The backend is a small dependency-free Rust CGI binary (`src/main.rs`), run per request by `fcgiwrap`. Nothing stays resident between requests.
* The count is stored as an 8-byte big-endian integer in `/var/lib/counter/count.bin`.
* Updates are protected by `flock`, so simultaneous clicks cannot lose increments.
* `POST /click` increments the count, `GET /click` returns it. Cross-origin POSTs are rejected using `Sec-Fetch-Site`.
* `/click` is rate-limited by nginx to 5 requests per second per IP, with a burst of 10. Further requests receive `429`.

## Running it yourself

1. Build the binary and install it:

   ```bash
   cargo build --release
   sudo install -D -m 755 target/release/click /usr/local/lib/counter/click.cgi
   ```

2. Install `fcgiwrap` and create the counter directory, writable by the web user:

   ```bash
   sudo apt install nginx fcgiwrap
   sudo systemctl enable --now fcgiwrap.socket
   sudo mkdir -p /var/lib/counter
   sudo chown www-data: /var/lib/counter
   ```

   The counter file is created automatically on the first click.

3. Copy `index.html`, `script.js`, `style.css` and the images to your web root (e.g. `/var/www/counter`).

4. Add the rate-limit zone to the `http {}` block, e.g. in `/etc/nginx/conf.d/ratelimit.conf`:

   ```nginx
   limit_req_zone $http_cf_connecting_ip zone=click:1m rate=5r/s;
   ```

   `$http_cf_connecting_ip` assumes Cloudflare in front. Use `$binary_remote_addr` otherwise.

5. Add the server block, adjusting `server_name`, `root` and the listen address:

   ```nginx
   server {
       listen 127.0.0.1:80;
       listen [::1]:80;
       server_name counter.example.com;

       root /var/www/counter;
       index index.html;

       add_header X-Content-Type-Options "nosniff" always;
       add_header Referrer-Policy        "no-referrer" always;
       add_header X-Frame-Options        "DENY" always;
       add_header Content-Security-Policy "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" always;
       add_header Cross-Origin-Opener-Policy "same-origin" always;

       location / {
           try_files $uri $uri/ =404;
       }

       location = /click {
           limit_except GET POST { deny all; }
           limit_req zone=click burst=10 nodelay;
           limit_req_status 429;
           include fastcgi_params;
           fastcgi_param SCRIPT_FILENAME /usr/local/lib/counter/click.cgi;
           fastcgi_pass unix:/run/fcgiwrap.socket;
       }

       location ~ /\. {
           return 404;
       }
   }
   ```

6. Check the configuration and reload nginx:

   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```
