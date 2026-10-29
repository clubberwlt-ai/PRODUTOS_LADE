from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
import mimetypes

CATALOGO_PATH = os.path.join('produtos', 'catalogo.json')
PORT = 8000

class CatalogoHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Remove query string
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
        if self.path == '/salvar-catalogo':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            
            try:
                data = json.loads(body)
                with open(CATALOGO_PATH, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                
                response = json.dumps({'status': 'sucesso', 'mensagem': 'Catalogo salvo com sucesso'})
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(response.encode('utf-8'))
            except Exception as e:
                response = json.dumps({'status': 'erro', 'mensagem': str(e)})
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(response.encode('utf-8'))
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
    print('Pressione Ctrl+C para parar')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nServidor parado')
        server.server_close()
