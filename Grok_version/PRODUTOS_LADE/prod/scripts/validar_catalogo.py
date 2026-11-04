#!/usr/bin/env python3
"""Valida produtos/catalogo.json (usado no CI).

Checa: JSON válido, lista de objetos com "Equipamento", ids únicos,
"imagens" com no máximo 10 itens, e que imagens locais existam no repo.
Avisos (não falham): itens sem id, URLs de imagem que parecem não ser imagem.
Uso: python scripts/validar_catalogo.py [caminho]
"""
import json
import os
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAX_IMAGENS = 10
EXT_IMG = ('.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif')


def main(caminho):
    erros, avisos = [], []
    try:
        with open(caminho, encoding='utf-8') as f:
            dados = json.load(f)
    except (OSError, ValueError) as e:
        print(f'ERRO: não foi possível ler {caminho}: {e}')
        return 1
    produtos = dados.get('produtos') if isinstance(dados, dict) else dados
    if not isinstance(produtos, list):
        print('ERRO: o catálogo deve ser uma lista de produtos.')
        return 1

    vistos = {}
    for i, p in enumerate(produtos):
        rot = f'item {i}'
        if not isinstance(p, dict):
            erros.append(f'{rot}: não é objeto')
            continue
        nome = str(p.get('Equipamento') or '').strip()
        rot = f'item {i} ({nome or "sem nome"})'
        if not nome:
            erros.append(f'{rot}: campo "Equipamento" vazio')
        pid = p.get('id')
        if pid in (None, ''):
            avisos.append(f'{rot}: sem id (será gerado ao enviar a primeira foto)')
        elif str(pid) in vistos:
            erros.append(f'{rot}: id duplicado {pid} (também no item {vistos[str(pid)]})')
        else:
            vistos[str(pid)] = i

        imgs = p.get('imagens')
        if imgs is None:
            imgs = []
        elif not isinstance(imgs, list):
            erros.append(f'{rot}: "imagens" deve ser lista')
            imgs = []
        if len(imgs) > MAX_IMAGENS:
            erros.append(f'{rot}: {len(imgs)} imagens (máximo {MAX_IMAGENS})')
        for img in imgs:
            if not isinstance(img, str) or not img.strip():
                erros.append(f'{rot}: imagem inválida {img!r}')
            elif img.startswith('data:'):
                erros.append(f'{rot}: imagem embutida (data URL) — salve como arquivo em produtos/imagens/')
            elif not img.startswith(('http://', 'https://')):
                local = os.path.normpath(os.path.join(RAIZ, img))
                if not local.startswith(RAIZ + os.sep):
                    erros.append(f'{rot}: caminho fora do repositório {img}')
                elif not os.path.isfile(local):
                    erros.append(f'{rot}: arquivo de imagem não encontrado {img}')
        unica = p.get('Imagem')
        if isinstance(unica, str) and unica.startswith('http') and not unica.lower().split('?')[0].endswith(EXT_IMG):
            avisos.append(f'{rot}: "Imagem" não parece ser arquivo de imagem: {unica[:90]}')

    for a in avisos:
        print('AVISO:', a)
    for e in erros:
        print('ERRO:', e)
    print(f'{len(produtos)} produtos, {len(erros)} erro(s), {len(avisos)} aviso(s).')
    return 1 if erros else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, 'produtos', 'catalogo.json')))
