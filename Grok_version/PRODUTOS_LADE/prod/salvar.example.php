<?php
declare(strict_types=1);

// Senha de edição. Ordem de leitura (a primeira encontrada vale):
//   1) variável de ambiente LADE_SAVE_TOKEN (ex.: SetEnv no .htaccess);
//   2) arquivo indicado por LADE_SENHA_ARQUIVO, ou ../.lade_senha
//      (um nível ACIMA da pasta do site, fora do public_html);
//   3) a constante SENHA abaixo (comportamento original).
const SENHA = 'TROQUE-ESTA-SENHA';
const ARQUIVO = __DIR__ . '/produtos/catalogo.json';
const PASTA_BACKUP = __DIR__ . '/produtos/backups';
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_BACKUPS = 20;

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function senha_configurada(): string
{
    $env = getenv('LADE_SAVE_TOKEN');
    if (is_string($env) && trim($env) !== '') {
        return trim($env);
    }
    $arquivo = getenv('LADE_SENHA_ARQUIVO');
    if (!is_string($arquivo) || $arquivo === '') {
        $arquivo = dirname(__DIR__) . '/.lade_senha';
    }
    if (is_file($arquivo) && is_readable($arquivo)) {
        $conteudo = trim((string) file_get_contents($arquivo));
        if ($conteudo !== '') {
            return $conteudo;
        }
    }
    return SENHA;
}

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
$esperada = senha_configurada();
if ($senha === '' || $esperada === '' || !hash_equals($esperada, $senha)) {
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

$dados = json_decode($corpo, true, 64);
if (json_last_error() !== JSON_ERROR_NONE) {
    responder(400, ['status' => 'erro', 'mensagem' => 'JSON inválido: ' . json_last_error_msg()]);
}
if (!is_array($dados) || array_values($dados) !== $dados) {
    responder(400, ['status' => 'erro', 'mensagem' => 'O catálogo deve ser uma lista de produtos.']);
}

foreach ($dados as $item) {
    if (!is_array($item) || !isset($item['Equipamento']) || trim((string) $item['Equipamento']) === '') {
        responder(422, ['status' => 'erro', 'mensagem' => 'Existe produto sem nome. Corrija antes de salvar.']);
    }
}

$ids = [];
foreach ($dados as $i => $item) {
    if (isset($item['id']) && $item['id'] !== '') {
        $id = (string) $item['id'];
        if (isset($ids[$id])) {
            responder(422, ['status' => 'erro', 'mensagem' => "id duplicado: $id"]);
        }
        $ids[$id] = true;
    }
    if (array_key_exists('imagens', $item) && $item['imagens'] !== null) {
        $imgs = $item['imagens'];
        if (!is_array($imgs) || array_values($imgs) !== $imgs || count($imgs) > 10) {
            responder(422, ['status' => 'erro', 'mensagem' => "Item $i: \"imagens\" deve ser lista com no máximo 10 caminhos."]);
        }
        foreach ($imgs as $img) {
            if (!is_string($img) || strncmp($img, 'data:', 5) === 0) {
                responder(422, ['status' => 'erro', 'mensagem' => "Item $i: imagem inválida (envie o arquivo pelo upload)."]);
            }
        }
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
