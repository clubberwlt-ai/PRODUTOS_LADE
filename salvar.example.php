<?php
declare(strict_types=1);

const SENHA = 'TROQUE-ESTA-SENHA';
const ARQUIVO = __DIR__ . '/produtos/catalogo.json';
const PASTA_BACKUP = __DIR__ . '/produtos/backups';
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_BACKUPS = 20;

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function responder(int $codigo, array $dados): void
{
    http_response_code($codigo);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    responder(405, ['status' => 'erro', 'mensagem' => 'Método não permitido.']);
}

$senha = (string) ($_SERVER['HTTP_X_SAVE_TOKEN'] ?? '');
if ($senha === '' || !hash_equals(SENHA, $senha)) {
    responder(401, ['status' => 'erro', 'mensagem' => 'Senha de edição incorreta.']);
}

$tamanho = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($tamanho <= 0 || $tamanho > MAX_BYTES) {
    responder(413, ['status' => 'erro', 'mensagem' => 'Arquivo inválido ou muito grande.']);
}

$corpo = file_get_contents('php://input');
if ($corpo === false || $corpo === '') {
    responder(400, ['status' => 'erro', 'mensagem' => 'Nenhum dado recebido.']);
}

$dados = json_decode($corpo, true);
if (!is_array($dados) || array_values($dados) !== $dados) {
    responder(400, ['status' => 'erro', 'mensagem' => 'O catálogo deve ser uma lista de produtos.']);
}

foreach ($dados as $item) {
    if (!is_array($item) || !isset($item['Equipamento']) || trim((string) $item['Equipamento']) === '') {
        responder(422, ['status' => 'erro', 'mensagem' => 'Existe produto sem nome. Corrija antes de salvar.']);
    }
}

$json = json_encode($dados, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($json === false) {
    responder(500, ['status' => 'erro', 'mensagem' => 'Falha ao gerar o JSON.']);
}

if (!is_dir(PASTA_BACKUP) && !mkdir(PASTA_BACKUP, 0755, true) && !is_dir(PASTA_BACKUP)) {
    responder(500, ['status' => 'erro', 'mensagem' => 'Não foi possível criar a pasta de backups.']);
}

if (is_file(ARQUIVO)) {
    $backup = PASTA_BACKUP . '/catalogo-' . date('Ymd-His') . '.json';
    copy(ARQUIVO, $backup);

    $antigos = glob(PASTA_BACKUP . '/catalogo-*.json') ?: [];
    sort($antigos);
    while (count($antigos) > MAX_BACKUPS) {
        @unlink(array_shift($antigos));
    }
}

$temporario = ARQUIVO . '.tmp';
if (file_put_contents($temporario, $json, LOCK_EX) === false) {
    responder(500, ['status' => 'erro', 'mensagem' => 'Sem permissão de escrita em produtos/catalogo.json.']);
}

if (!rename($temporario, ARQUIVO)) {
    @unlink($temporario);
    responder(500, ['status' => 'erro', 'mensagem' => 'Não foi possível substituir o catálogo.']);
}

@chmod(ARQUIVO, 0644);

responder(200, [
    'status' => 'sucesso',
    'mensagem' => 'Catálogo salvo no servidor.',
    'total' => count($dados),
]);
