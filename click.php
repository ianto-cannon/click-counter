<?php
 $method = $_SERVER['REQUEST_METHOD'];

// Set early so all responses (including errors) are plain-text and uncached
header('Content-Type: text/plain');
header('Cache-Control: no-store');

if ($method !== 'POST' && $method !== 'GET') {
    http_response_code(405);
    header('Allow: GET, POST');
    exit;
}

if ($method === 'POST') {
    // CSRF protection: reject cross-origin fetches from browsers
    $site = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
    if ($site !== '' && $site !== 'same-origin') {
        http_response_code(403);
        exit;
    }
}

 $file = "/var/lib/counter/count.bin";
 $fp = fopen($file, "c+b");
if (!$fp) {
    http_response_code(500);
    exit;
}

// Exclusive lock for POST (read-increment-write), shared lock for GET
if (!flock($fp, $method === 'POST' ? LOCK_EX : LOCK_SH)) {
    fclose($fp);
    http_response_code(500);
    exit;
}

 $data = fread($fp, 8);
 $count = strlen($data) === 8 ? unpack("J", $data)[1] : 0;

if ($method === 'POST') {
    $count++;
    rewind($fp);
    fwrite($fp, pack("J", $count));
    ftruncate($fp, 8);
    fflush($fp);
}

flock($fp, LOCK_UN);
fclose($fp);

echo $count;
