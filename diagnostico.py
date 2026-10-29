#!/usr/bin/env python3
"""
Diagnóstico do Catálogo LADE - Google Apps Script
Execute: python diagnostico.py
"""

import json
import urllib.request
import urllib.error
import ssl
import sys

# ============================================
# CONFIGURAÇÃO - Cole aqui a URL do seu Web App
# ============================================
APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw0-2XRwXEl4C0fVbJscUcB_kY3cRCsJ7XX9H_QS6AaSSqdYa1yaJ7ZMLY5Y31i_cMX/exec'

def testar_json_local():
    """Testa se o JSON local está válido"""
    print("=" * 60)
    print("TESTE 1: JSON Local (produtos/catalogo.json)")
    print("=" * 60)
    
    try:
        with open('produtos/catalogo.json', encoding='utf-8') as f:
            dados = json.load(f)
        
        produtos_validos = [p for p in dados if p.get('Equipamento')]
        print("[OK] JSON valido!")
        print(f"  Total de itens no arquivo: {len(dados)}")
        print(f"  Produtos com nome: {len(produtos_validos)}")
        
        if produtos_validos:
            primeiro = produtos_validos[0]
            print(f"  Primeiro produto: {primeiro.get('Equipamento')}")
            print(f"  Categoria: {primeiro.get('Categoria')}")
            print(f"  Tem imagem: {'Sim' if primeiro.get('URL da imagem / fonte') else 'Nao'}")
        
        return True
    except FileNotFoundError:
        print("[FALHA] Arquivo produtos/catalogo.json nao encontrado!")
        return False
    except json.JSONDecodeError as e:
        print(f"[FALHA] Erro ao decodificar JSON: {e}")
        return False
    except Exception as e:
        print(f"[FALHA] Erro inesperado: {e}")
        return False
    except json.JSONDecodeError as e:
        print(f"✗ Erro ao decodificar JSON: {e}")
        return False
    except Exception as e:
        print(f"✗ Erro inesperado: {e}")
        return False


def testar_apps_script():
    """Testa a conexão com o Google Apps Script"""
    print()
    print("=" * 60)
    print("TESTE 2: Google Apps Script Web App")
    print("=" * 60)
    
    if not APPS_SCRIPT_URL or 'SEU_ID' in APPS_SCRIPT_URL:
        print("[AVISO] URL do Apps Script nao parece estar configurada corretamente")
        print(f"  URL atual: {APPS_SCRIPT_URL}")
        print("  Pule para o TESTE 3 ou configure a URL no topo deste script")
        return False
    
    print(f"  URL: {APPS_SCRIPT_URL}")
    print()
    
    # Teste 1: GET com action=listar (via query string)
    print("  --- Teste A: GET ?action=listar ---")
    try:
        url_teste = APPS_SCRIPT_URL + '?action=listar'
        print(f"  Acessando: {url_teste}")
        
        req = urllib.request.Request(url_teste)
        with urllib.request.urlopen(req, timeout=15) as resposta:
            conteudo = resposta.read().decode('utf-8')
            print(f"  Status HTTP: {resposta.status}")
            print(f"  Tamanho da resposta: {len(conteudo)} caracteres")
            
            try:
                dados = json.loads(conteudo)
                print(f"  JSON valido: Sim")
                print(f"  Status: {dados.get('status', 'N/A')}")
                
                if dados.get('status') == 'ok' and 'produtos' in dados:
                    produtos = dados['produtos']
                    print(f"  Produtos retornados: {len(produtos)}")
                    if produtos:
                        print(f"  Primeiro produto: {produtos[0].get('Equipamento', 'N/A')}")
                    return True
                else:
                    print(f"  Resposta inesperada: {dados}")
                    return False
            except json.JSONDecodeError as e:
                print(f"  [AVISO] Resposta nao e JSON valido: {e}")
                print(f"  Conteudo (primeiros 200 chars): {conteudo[:200]}")
                return False
                
    except urllib.error.HTTPError as e:
        print(f"  [FALHA] Erro HTTP {e.code}: {e.reason}")
        try:
            corpo = e.read().decode('utf-8')
            print(f"  Corpo: {corpo[:200]}")
        except:
            pass
        return False
    except urllib.error.URLError as e:
        print(f"  [FALHA] Erro de conexao: {e.reason}")
        return False
    except Exception as e:
        print(f"  [FALHA] Erro inesperado: {e}")
        return False

    # Teste 2: POST com JSON (como o app.js faz)
    print()
    print("  --- Teste B: POST com JSON (metodo usado pelo catalogo) ---")
    try:
        payload = json.dumps({"action": "listar"}).encode('utf-8')
        req = urllib.request.Request(
            APPS_SCRIPT_URL,
            data=payload,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        
        with urllib.request.urlopen(req, timeout=15) as resposta:
            conteudo = resposta.read().decode('utf-8')
            print(f"  Status HTTP: {resposta.status}")
            
            try:
                dados = json.loads(conteudo)
                print(f"  JSON valido: Sim")
                print(f"  Status: {dados.get('status', 'N/A')}")
                
                if dados.get('status') == 'ok' and 'produtos' in dados:
                    print(f"  [OK] POST funcionou! {len(dados['produtos'])} produtos")
                    return True
                else:
                    print(f"  Resposta: {dados}")
                    return False
            except json.JSONDecodeError:
                print(f"  [AVISO] Nao e JSON: {conteudo[:200]}")
                return False
                
    except urllib.error.HTTPError as e:
        print(f"  [FALHA] Erro HTTP {e.code}: {e.reason}")
        return False
    except Exception as e:
        print(f"  [FALHA] Erro: {e}")
        return False


def testar_cors():
    """Verifica se o Web App permite CORS"""
    print()
    print("=" * 60)
    print("TESTE 3: Verificação de CORS")
    print("=" * 60)
    
    print("  O Web App do Google Apps Script precisa estar implantado com:")
    print("  - Execute como: Usuário da conta")
    print("  - Quem tem acesso: Qualquer pessoa (anônimo)")
    print()
    print("  Se estiver restrito a 'Apenas eu' ou domínio, o navegador bloqueará.")
    print()


def main():
    print("DIAGNÓSTICO DO CATÁLOGO LADE")
    print("Data:", __import__('datetime').datetime.now().strftime('%d/%m/%Y %H:%M:%S'))
    print()
    
    resultado_json = testar_json_local()
    resultado_apps = testar_apps_script()
    testar_cors()
    
    print()
    print("=" * 60)
    print("RESUMO")
    print("=" * 60)
    print(f"JSON Local: {'OK' if resultado_json else 'FALHA'}")
    print(f"Google Apps Script: {'OK' if resultado_apps else 'FALHA'}")
    print()
    
    if resultado_json and not resultado_apps:
        print("O catalogo vai funcionar no modo OFFLINE (localStorage).")
        print("Para usar o Google Sheets, verifique a implantacao do Web App.")
    elif resultado_json and resultado_apps:
        print("Tudo funcionando! O catalogo vai carregar do Google Sheets.")
    elif not resultado_json:
        print("Primeiro corrija o arquivo produtos/catalogo.json")


if __name__ == '__main__':
    main()
