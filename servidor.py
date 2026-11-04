from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
import mimetypes
import uuid
import time
from email.parser import BytesParser
from email.policy import HTTP

CATALOGO_PATH = os.path.join('produtos', 'catalogo.json')
MIDIA_DIR = os.path.join('assets', 'midia')
PORT = 8000
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB

ALLOWED_EXTENSIONS = {
    # Imagens
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
    # Vídeos
    '.mp4', '.webm', '.mov', '.avi', '.mkv',
}

os.makedirs(MIDIA_DIR, exist_ok=True)


def _send_json(handler, status_code, data):
    body = json.dumps(data, ensure_ascii=False).encode('utf-8')
    handler.send_response(status_code)
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.send_header('Access-Control-Allow-Origin', '*')
    handler.send_header('Content-Length', str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def _parse_multipart(handler):
    """Faz parse de multipart/form-data e retorna dict com campos e arquivos."""
    content_type = handler.headers.get('Content-Type', '')
    if not content_type.startswith('multipart/form-data'):
        return None, None

    boundary = None
    for part in content_type.split(';'):
        part = part.strip()
        if part.startswith('boundary='):
            boundary = part.split('=', 1)[1].strip('"')
            break

    if not boundary:
        return None, None

    content_length = int(handler.headers.get('Content-Length', 0))
    if content_length > MAX_FILE_SIZE * 2:
        return None, None

    raw_data = handler.rfile.read(content_length)

    # Reconstruir cabeçalho HTTP para o parser de email
    msg_headers = b'Content-Type: ' + content_type.encode() + b'\r\n\r\n' + raw_data
    msg = BytesParser(policy=HTTP).parsebytes(msg_headers)

    fields = {}
    files = []

    for part in msg.iter_parts():
        disposition = part.get('Content-Disposition', '')
        name = None
        filename = None

        for param in disposition.split(';'):
            param = param.strip()
            if param.startswith('name='):
                name = param.split('=', 1)[1].strip('"')
            elif param.startswith('filename='):
                filename = param.split('=', 1)[1].strip('"')

        payload = part.get_payload(decode=True)

        if filename:
            files.append({
                'fieldname': name,
                'filename': filename,
                'content': payload,
                'content_type': part.get_content_type(),
            })
        else:
            fields[name] = payload.decode('utf-8') if payload else ''

    return fields, files


def _salvar_arquivo_midia(file_info):
    """Salva um arquivo enviado e retorna a URL relativa."""
    nome_original = file_info['filename']
    extensao = os.path.splitext(nome_original)[1].lower()

    if extensao not in ALLOWED_EXTENSIONS:
        return None, 'Tipo de arquivo não permitido: ' + extensao

    conteudo = file_info['content']
    if len(conteudo) > MAX_FILE_SIZE:
        return None, 'Arquivo muito grande (máx. 100 MB)'

    # Nome único: timestamp + uuid + extensão
    nome_unico = f"midia_{int(time.time())}_{uuid.uuid4().hex[:8]}{extensao}"
    caminho = os.path.join(MIDIA_DIR, nome_unico)

    with open(caminho, 'wb') as f:
        f.write(conteudo)

    # Retorna caminho relativo para servir pelo próprio servidor
    url_relativa = os.path.join('assets', 'midia', nome_unico).replace(os.sep, '/')
    return url_relativa, None


class CatalogoHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split('?')[0]

        if path == '/':
            path = '/index.html'

        file_path = '.' + path

        if not os.path.exists(file_path) or os.path.isdir(file_path):
            self.send_error(404, 'Arquivo não encontrado')
            return

        mime_type, _ = mimetypes.guess_type(file_path)
        if mime_type is None:
            mime_type = 'application/octet-stream'

        with open(file_path, 'rb') as f:
            content = f.read()

        self.send_response(200)
        self.send_header('Content-Type', mime_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(content)

    def do_POST(self):
        path = self.path.split('?')[0]

        if path == '/salvar-catalogo':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)

            try:
                data = json.loads(body)
                with open(CATALOGO_PATH, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)

                _send_json(self, 200, {'status': 'sucesso', 'mensagem': 'Catalogo salvo com sucesso'})
            except Exception as e:
                _send_json(self, 500, {'status': 'erro', 'mensagem': str(e)})

        elif path == '/upload-midia':
            fields, files = _parse_multipart(self)

            if files is None:
                _send_json(self, 400, {'status': 'erro', 'mensagem': 'Requisição multipart inválida'})
                return

            if not files:
                _send_json(self, 400, {'status': 'erro', 'mensagem': 'Nenhum arquivo enviado'})
                return

            resultados = []
            for file_info in files:
                url, erro = _salvar_arquivo_midia(file_info)
                if erro:
                    resultados.append({
                        'arquivo': file_info['filename'],
                        'status': 'erro',
                        'mensagem': erro,
                    })
                else:
                    resultados.append({
                        'arquivo': file_info['filename'],
                        'status': 'sucesso',
                        'url': url,
                    })

            algum_sucesso = any(r['status'] == 'sucesso' for r in resultados)
            status_code = 200 if algum_sucesso else 400
            _send_json(self, status_code, {
                'status': 'sucesso' if algum_sucesso else 'erro',
                'resultados': resultados,
            })

        else:
            self.send_error(404, 'Endpoint não encontrado')

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, format, *args):
        # Silencia logs de requisições normais
        pass


if __name__ == '__main__':
    server = HTTPServer(('localhost', PORT), CatalogoHandler)
    print(f'Servidor rodando em http://localhost:{PORT}')
    print(f'Catalogo: {os.path.abspath(CATALOGO_PATH)}')
    print(f'Midia: {os.path.abspath(MIDIA_DIR)}')
    print('Pressione Ctrl+C para parar')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nServidor parado')
        server.server_close()
