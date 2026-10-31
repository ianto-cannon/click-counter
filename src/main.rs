use std::env;
use std::fs::OpenOptions;
use std::io::{Read, Seek, SeekFrom, Write};
use std::os::unix::io::AsRawFd;

extern "C" {
    fn flock(fd: i32, operation: i32) -> i32;
}
const LOCK_SH: i32 = 1;
const LOCK_EX: i32 = 2;

fn respond(status: &str, extra: &str, body: &str) {
    let out = format!(
        "Status: {status}\r\nContent-Type: text/plain\r\nCache-Control: no-store\r\n{extra}\r\n{body}"
    );
    let _ = std::io::stdout().write_all(out.as_bytes());
}

fn main() {
    let method = env::var("REQUEST_METHOD").unwrap_or_default();

    if method != "GET" && method != "POST" {
        respond("405 Method Not Allowed", "Allow: GET, POST\r\n", "");
        return;
    }

    // CSRF protection: reject cross-origin fetches from browsers
    if method == "POST" {
        let site = env::var("HTTP_SEC_FETCH_SITE").unwrap_or_default();
        if !site.is_empty() && site != "same-origin" {
            respond("403 Forbidden", "", "");
            return;
        }
    }

    let mut f = match OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .open("/var/lib/counter/count.bin")
    {
        Ok(f) => f,
        Err(_) => return respond("500 Internal Server Error", "", ""),
    };

    let op = if method == "POST" { LOCK_EX } else { LOCK_SH };
    if unsafe { flock(f.as_raw_fd(), op) } != 0 {
        return respond("500 Internal Server Error", "", "");
    }

    let mut buf = [0u8; 8];
    let mut count = if f.read_exact(&mut buf).is_ok() {
        u64::from_be_bytes(buf)
    } else {
        0
    };

    if method == "POST" {
        count = count.wrapping_add(1);
        let ok = f.seek(SeekFrom::Start(0)).is_ok()
            && f.write_all(&count.to_be_bytes()).is_ok()
            && f.set_len(8).is_ok();
        if !ok {
            return respond("500 Internal Server Error", "", "");
        }
    }

    respond("200 OK", "", &count.to_string());
    // lock is released when `f` is dropped
}
