import os as _os
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))  # roda a partir da raiz do repo
import json

with open('produtos/catalogo.json', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total de produtos: {len(data)}")
print("\n=== PRODUTOS SEM IMAGEM VÁLIDA ===\n")

count = 0
for i, p in enumerate(data):
    url = p.get('URL da imagem / fonte') or ''
    img = p.get('Imagem')
    tem_problema = (
        not url or 
        'não encontrada' in str(url).lower() or 
        'não encontrado' in str(url).lower() or
        not img or
        str(img).lower() in ['null', 'não encontrada', 'não encontrado', '']
    )
    if tem_problema:
        count += 1
        print(f"{count}. [{i+1}] {p.get('Equipamento')}")
        print(f"    Marca/Modelo: {p.get('Marca/Modelo')}")
        print(f"    Categoria: {p.get('Categoria')}")
        print(f"    Imagem coluna: {img}")
        print(f"    URL coluna: {url[:100] if url else 'VAZIO'}")
        print()

print(f"Total sem imagem válida: {count}")
