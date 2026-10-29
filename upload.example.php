<?php
declare(strict_types=1);

/*
 * Upload e remoção de fotos dos produtos (HostGator / Apache + PHP).
 * Copie como upload.php no servidor (não versionado).
 *
 *   POST upload.php?acao=enviar   corpo = bytes da imagem
 *        cabeçalhos: X-Save-Token, X-Produto-Id, Content-Type
 *        resposta:   {"status":"sucesso","caminho":"produtos/imagens/<id>/NN-hash.ext"}
 *   POST upload.php?acao=apagar   corpo = {"caminho":"produtos/imagens/<id>/NN-hash.ext"}
 *
 * A senha é a mesma do salvar.php (LADE_SAVE_TOKEN, arquivo ../.lade_senha
 * ou a constante SENHA abaixo).
 */

const SENHA = 'TROQUE-ESTA-SENHA';
const PASTA_IMAGENS = __DIR__ . '/produtos/imagens';
const MAX_BYTES = 3 * 1024 * 1024;
const MAX_POR_PRODUTO = 10;
const TIPOS = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
const ID_RE = '/^[A-Za-z0-9_-]{1,64}$/';
const NOME_RE = '/^[A-Za-z0-9_-]{1,80}\.(jpg|jpeg|png|webp)$/';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function responder(int $codigo, array $dados): void
{
    http_response_code($codigo);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

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

function dentro_de(string $caminho, string $pasta): bool
{
    $base = realpath($pasta);
    $real = realpath($caminho);
    return $base !== false && $real !== false && strncmp($real, $base . DIRECTORY_SEPARATOR, strlen($base) + 1) === 0;
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

$acao = (string) ($_GET['acao'] ?? '');
$tamanho = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);

if ($acao === 'enviar') {
    $id = (string) ($_SERVER['HTTP_X_PRODUTO_ID'] ?? '');
    if (!preg_match(ID_RE, $id)) {
        responder(400, ['status' => 'erro', 'mensagem' => 'id de produto inválido.']);
    }
    if ($tamanho <= 0 || $tamanho > MAX_BYTES) {
        responder(413, ['status' => 'erro', 'mensagem' => 'Imagem vazia ou maior que 3 MB.']);
    }
    $dados = file_get_contents('php://input', false, null, 0, MAX_BYTES + 1);
    if ($dados === false || $dados === '' || strlen($dados) > MAX_BYTES) {
        responder(413, ['status' => 'erro', 'mensagem' => 'Imagem vazia ou maior que 3 MB.']);
    }
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string) $finfo->buffer($dados);
    if (!isset(TIPOS[$mime])) {
        responder(415, ['status' => 'erro', 'mensagem' => 'Tipo de imagem não permitido (use JPG, PNG ou WEBP).']);
    }
    if (!is_dir(PASTA_IMAGENS) && !mkdir(PASTA_IMAGENS, 0755, true) && !is_dir(PASTA_IMAGENS)) {
        responder(500, ['status' => 'erro', 'mensagem' => 'Não foi possível criar produtos/imagens.']);
    }
    $pasta = PASTA_IMAGENS . '/' . $id;
    if (!is_dir($pasta) && !mkdir($pasta, 0755) && !is_dir($pasta)) {
        responder(500, ['status' => 'erro', 'mensagem' => 'Não foi possível criar a pasta do produto.']);
    }
    if (!dentro_de($pasta, PASTA_IMAGENS)) {
        responder(400, ['status' => 'erro', 'mensagem' => 'Caminho inválido.']);
    }
    $existentes = array_values(array_filter(scandir($pasta) ?: [], fn($n) => (bool) preg_match(NOME_RE, $n)));
    if (count($existentes) >= MAX_POR_PRODUTO) {
        responder(409, ['status' => 'erro', 'mensagem' => 'Limite de 10 imagens por produto atingido.']);
    }
    $maior = 0;
    foreach ($existentes as $n) {
        if (ctype_digit(substr($n, 0, 2))) {
            $maior = max($maior, (int) substr($n, 0, 2));
        }
    }
    $nome = sprintf('%02d-%s.%s', $maior + 1, substr(hash('sha256', $dados), 0, 8), TIPOS[$mime]);
    $destino = $pasta . '/' . $nome;
    $tmp = $destino . '.tmp';
    if (file_put_contents($tmp, $dados, LOCK_EX) === false || !rename($tmp, $destino)) {
        @unlink($tmp);
        responder(500, ['status' => 'erro', 'mensagem' => 'Sem permissão de escrita em produtos/imagens.']);
    }
    @chmod($destino, 0644);
    responder(200, ['status' => 'sucesso', 'caminho' => "produtos/imagens/$id/$nome"]);
}

if ($acao === 'apagar') {
    if ($tamanho <= 0 || $tamanho > 4096) {
        responder(400, ['status' => 'erro', 'mensagem' => 'Requisição inválida.']);
    }
    $json = json_decode((string) file_get_contents('php://input'), true);
    $caminho = is_array($json) ? (string) ($json['caminho'] ?? '') : '';
    $partes = explode('/', $caminho);
    if (count($partes) !== 4 || $partes[0] !== 'produtos' || $partes[1] !== 'imagens'
        || !preg_match(ID_RE, $partes[2]) || !preg_match(NOME_RE, $partes[3])) {
        responder(400, ['status' => 'erro', 'mensagem' => 'Caminho inválido.']);
    }
    $arquivo = __DIR__ . '/' . $caminho;
    if (!is_file($arquivo)) {
        responder(404, ['status' => 'erro', 'mensagem' => 'Imagem não encontrada.']);
    }
    if (!dentro_de($arquivo, PASTA_IMAGENS)) {
        responder(400, ['status' => 'erro', 'mensagem' => 'Caminho inválido.']);
    }
    if (!unlink($arquivo)) {
        responder(500, ['status' => 'erro', 'mensagem' => 'Não foi possível apagar a imagem.']);
    }
    @rmdir(dirname($arquivo));
    responder(200, ['status' => 'sucesso', 'mensagem' => 'Imagem apagada.']);
}

responder(400, ['status' => 'erro', 'mensagem' => 'Ação inválida (use acao=enviar ou acao=apagar).']);
