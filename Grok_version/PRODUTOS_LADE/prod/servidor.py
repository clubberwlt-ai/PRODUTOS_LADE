#!/usr/bin/env python3
"""Servidor local de desenvolvimento do Catálogo LADE.

Uso:  python servidor.py            (http://localhost:8000)
Variáveis de ambiente opcionais:
  LADE_TOKEN  se definida, exige o cabeçalho X-Save-Token com este valor
              para gravar (salvar catálogo, enviar e apagar imagens).
  LADE_PORT   porta (padrão 8000).
"""
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
import hashlib
import hmac
import json
import mimetypes
import os
import re
import tempfile
from urllib.parse import unquote, urlsplit

ROOT = os.path.realpath(os.path.dirname(os.path.abspath(__file__)))
CATALOGO_PATH = os.path.join(ROOT, 'produtos', 'catalogo.json')
IMAGENS_DIR = os.path.join(ROOT, 'produtos', 'imagens')
PORT = int(os.environ.get('LADE_PORT', '8000'))
TOKEN = os.environ.get('LADE_TOKEN', '')

MAX_CATALOGO_BYTES = 5 * 1024 * 1024
MAX_IMAGEM_BYTES = 3 * 1024 * 1024
MAX_IMAGENS_POR_PRODUTO = 10
EXTENSOES = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp'}
ID_RE = re.compile(r'^[A-Za-z0-9_-]{1,64}$')
NOME_RE = re.compile(r'^[A-Za-z0-9_-]{1,80}\.(jpg|jpeg|png|webp)$')
ORIGENS_PERMITIDAS = {f'http://localhost:{PORT}', f'http://127.0.0.1:{PORT}'}
BLOQUEADOS = ('.git', '.github', '__pycache__')


def dentro_de(caminho, pasta):
    """True se o caminho real estiver dentro da pasta (sem path traversal)."""
    real = os.path.realpath(caminho)
    base = os.path.realpath(pasta)
    return real == base or real.startswith(base + os.sep)


def mime_real(dados):
    """Detecta o tipo pelo conteúdo (assinatura), não pelo cabeçalho."""
    if dados[:3] == b'\xff\xd8\xff':
        return 'image/jpeg'
    if dados[:8] == b'\x89PNG\r\n\x1a\n':
        return 'image/png'
    if dados[:4] == b'RIFF' and dados[8:12] == b'WEBP':
        return 'image/webp'
    return None


def validar_catalogo(dados):
    """Retorna mensagem de erro ou None. Aceita lista ou {"produtos": [...]}."""
    produtos = dados.get('produtos') if isinstance(dados, dict) else dados
    if not isinstance(produtos, list):
        return 'O catálogo deve ser uma lista de produtos (ou objeto com "produtos").'
    ids = set()
    for i, item in enumerate(produtos):
        if not isinstance(item, dict):
            return f'Item {i} não é um objeto.'
        if not str(item.get('Equipamento') or '').strip():
            return f'Item {i} sem nome (Equipamento).'
        pid = item.get('id')
        if pid is not None:
            if str(pid) in ids:
                return f'id duplicado: {pid}'
            ids.add(str(pid))
        imgs = item.get('imagens')
        if imgs is not None:
            if not isinstance(imgs, list) or not all(isinstance(x, str) for x in imgs):
                return f'Item {i}: "imagens" deve ser lista de textos.'
            if len(imgs) > MAX_IMAGENS_POR_PRODUTO:
                return f'Item {i}: máximo de {MAX_IMAGENS_POR_PRODUTO} imagens.'
    return None


def gravar_atomico(caminho, conteudo):
    pasta = os.path.dirname(caminho)
    fd, tmp = tempfile.mkstemp(dir=pasta, suffix='.tmp')
    try:
        with os.fdopen(fd, 'wb') as f:
            f.write(conteudo)
        os.replace(tmp, caminho)
    except Exception:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


class CatalogoHandler(BaseHTTPRequestHandler):
    server_version = 'LADE'

    # ---------- utilitários ----------
    def responder(self, codigo, dados):
        corpo = json.dumps(dados, ensure_ascii=False).encode('utf-8')
        self.send_response(codigo)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(corpo)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(corpo)

    def erro(self, codigo, msg):
        self.responder(codigo, {'status': 'erro', 'mensagem': msg})

    def origem_ok(self):
        origem = self.headers.get('Origin')
        return origem is None or origem in ORIGENS_PERMITIDAS

    def token_ok(self):
        if not TOKEN:
            return True
        enviado = self.headers.get('X-Save-Token', '')
        return bool(enviado) and hmac.compare_digest(TOKEN.encode(), enviado.encode())

    def ler_corpo(self, limite):
        try:
            tamanho = int(self.headers.get('Content-Length', 0))
        except ValueError:
            tamanho = -1
        if tamanho <= 0:
            self.erro(400, 'Nenhum dado recebido.')
            return None
        if tamanho > limite:
            self.erro(413, 'Conteúdo muito grande.')
            return None
        return self.rfile.read(tamanho)

    # ---------- GET: arquivos estáticos ----------
    def do_GET(self):
        caminho = unquote(urlsplit(self.path).path)
        if caminho == '/':
            caminho = '/index.html'
        partes = [p for p in caminho.split('/') if p]
        if any(p.startswith('.') or p in BLOQUEADOS for p in partes):
            self.send_error(404, 'Arquivo não encontrado')
            return
        arquivo = os.path.realpath(os.path.join(ROOT, *partes))
        if not dentro_de(arquivo, ROOT) or not os.path.isfile(arquivo):
            self.send_error(404, 'Arquivo não encontrado')
            return
        mime, _ = mimetypes.guess_type(arquivo)
        with open(arquivo, 'rb') as f:
            conteudo = f.read()
        self.send_response(200)
        self.send_header('Content-Type', mime or 'application/octet-stream')
        self.send_header('Content-Length', str(len(conteudo)))
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(conteudo)

    # ---------- POST: gravações ----------
    def do_POST(self):
        rota = urlsplit(self.path).path
        if rota not in ('/salvar-catalogo', '/upload-imagem', '/apagar-imagem'):
            self.erro(404, 'Endpoint não encontrado')
            return
        if not self.origem_ok():
            self.erro(403, 'Origem não permitida.')
            return
        if not self.token_ok():
            self.erro(401, 'Senha de edição incorreta.')
            return
        if rota == '/salvar-catalogo':
            self.salvar_catalogo()
        elif rota == '/upload-imagem':
            self.upload_imagem()
        else:
            self.apagar_imagem()

    def salvar_catalogo(self):
        corpo = self.ler_corpo(MAX_CATALOGO_BYTES)
        if corpo is None:
            return
        try:
            dados = json.loads(corpo)
        except (ValueError, UnicodeDecodeError):
            self.erro(400, 'JSON inválido.')
            return
        problema = validar_catalogo(dados)
        if problema:
            self.erro(422, problema)
            return
        texto = json.dumps(dados, ensure_ascii=False, indent=2) + '\n'
        gravar_atomico(CATALOGO_PATH, texto.encode('utf-8'))
        total = len(dados['produtos'] if isinstance(dados, dict) else dados)
        self.responder(200, {'status': 'sucesso', 'mensagem': 'Catálogo salvo.', 'total': total})

    def upload_imagem(self):
        pid = self.headers.get('X-Produto-Id', '')
        if not ID_RE.match(pid):
            self.erro(400, 'id de produto inválido.')
            return
        corpo = self.ler_corpo(MAX_IMAGEM_BYTES)
        if corpo is None:
            return
        mime = mime_real(corpo)
        if mime not in EXTENSOES:
            self.erro(415, 'Tipo de imagem não permitido (use JPG, PNG ou WEBP).')
            return
        pasta = os.path.join(IMAGENS_DIR, pid)
        if not dentro_de(pasta, IMAGENS_DIR):
            self.erro(400, 'Caminho inválido.')
            return
        os.makedirs(pasta, exist_ok=True)
        existentes = [n for n in os.listdir(pasta) if NOME_RE.match(n)]
        if len(existentes) >= MAX_IMAGENS_POR_PRODUTO:
            self.erro(409, f'Limite de {MAX_IMAGENS_POR_PRODUTO} imagens por produto atingido.')
            return
        numeros = [int(n[:2]) for n in existentes if n[:2].isdigit()]
        proximo = (max(numeros) + 1) if numeros else 1
        nome = f'{proximo:02d}-{hashlib.sha256(corpo).hexdigest()[:8]}.{EXTENSOES[mime]}'
        gravar_atomico(os.path.join(pasta, nome), corpo)
        self.responder(200, {'status': 'sucesso', 'caminho': f'produtos/imagens/{pid}/{nome}'})

    def apagar_imagem(self):
        corpo = self.ler_corpo(4096)
        if corpo is None:
            return
        try:
            caminho = str(json.loads(corpo).get('caminho', ''))
        except (ValueError, AttributeError, UnicodeDecodeError):
            self.erro(400, 'JSON inválido.')
            return
        partes = caminho.split('/')
        if (len(partes) != 4 or partes[:2] != ['produtos', 'imagens']
                or not ID_RE.match(partes[2]) or not NOME_RE.match(partes[3])):
            self.erro(400, 'Caminho inválido.')
            return
        arquivo = os.path.join(ROOT, *partes)
        if not dentro_de(arquivo, IMAGENS_DIR):
            self.erro(400, 'Caminho inválido.')
            return
        if not os.path.isfile(arquivo):
            self.erro(404, 'Imagem não encontrada.')
            return
        os.remove(arquivo)
        try:
            os.rmdir(os.path.dirname(arquivo))  # remove a pasta se ficou vazia
        except OSError:
            pass
        self.responder(200, {'status': 'sucesso', 'mensagem': 'Imagem apagada.'})

    def do_OPTIONS(self):
        # Sem CORS: o front é servido pela mesma origem.
        self.send_response(204)
        self.send_header('Allow', 'GET, POST, OPTIONS')
        self.end_headers()

    def log_message(self, format, *args):
        pass


if __name__ == '__main__':
    server = ThreadingHTTPServer(('127.0.0.1', PORT), CatalogoHandler)
    print(f'Servidor rodando em http://localhost:{PORT}')
    print(f'Catálogo: {CATALOGO_PATH}')
    print('Gravação protegida por LADE_TOKEN' if TOKEN else 'Gravação sem senha (defina LADE_TOKEN para exigir)')
    print('Pressione Ctrl+C para parar')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nServidor parado')
        server.server_close()
