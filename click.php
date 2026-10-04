<?php
$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'POST' && $method !== 'GET') {
    http_response_code(405);
    header('Allow: GET, POST');
    exit;
}

// Only same-origin pages may increment (see the CORS discussion)
if ($method === 'POST') {
    $site = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
    if ($site !== '' && $site !== 'same-origin') {
        http_response_code(403);
        exit;
    }
}

$file = "/var/lib/counter/count.bin";
$fp = fopen($file, "c+b");
if (!$fp) { http_response_code(500); exit; }

flock($fp, $method === 'POST' ? LOCK_EX : LOCK_SH);
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

header('Content-Type: text/plain');
header('Cache-Control: no-store');
echo $count;
