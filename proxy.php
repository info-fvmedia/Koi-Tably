<?php
// ==============================
// KOI PROXY.PHP - Versione aggiornata
// ==============================

// ⚙️ Abilita logging degli errori (solo sviluppo)
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// ✅ Consenti solo richieste POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode([
        "success" => false,
        "error" => "Metodo non consentito. Solo POST ammesso."
    ]);
    exit;
}

// ✅ Leggi e decodifica input JSON
$input = json_decode(file_get_contents("php://input"), true);
if (!is_array($input)) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode([
        "success" => false,
        "error" => "Dati JSON mancanti o non validi."
    ]);
    exit;
}

// ✅ Verifica il token
$valid_token = "KOI2025_XYZ888";
if (!isset($input['token']) || $input['token'] !== $valid_token) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode([
        "success" => false,
        "error" => "Token non valido"
    ]);
    exit;
}

// ✅ URL del tuo Google Apps Script (endpoint pubblico)
$script_url = 'https://script.google.com/macros/s/AKfycbzpt0RAGBn7zQZh1rB5PMYubSO7K194sa-lTwH423BStjK-Ju9PHlmDJ4KkGqsU0GpY/exec';

// ✅ Invia la richiesta a Google Apps Script
$ch = curl_init($script_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($input));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true); // Segui redirect se presente

$response = curl_exec($ch);
$http_status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

// ✅ Log di debug opzionale (solo sviluppo)
file_put_contents(__DIR__ . '/proxy_debug.log', json_encode([
    'request' => $input,
    'response' => $response,
    'http_status' => $http_status,
    'curl_error' => $error
], JSON_PRETTY_PRINT));

// ✅ Gestione errori CURL
if ($response === false || $http_status >= 400) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        "success" => false,
        "error" => $error ?: "Errore HTTP: $http_status"
    ]);
    exit;
}

// ✅ Risposta JSON forzata con codice 200 (anche se Apps Script fa redirect)
http_response_code(200);
header('Content-Type: application/json');
echo $response;
exit;
