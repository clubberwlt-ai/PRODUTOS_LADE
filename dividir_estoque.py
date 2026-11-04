"""Divide os equipamentos do catalogo entre Cuiaba e Sorriso, simulando estoque.

Para cada equipamento, a quantidade total (campo 'Qtd maxima usada em um romaneio')
e distribuida aleatoriamente entre as duas cidades. Gera duas entradas por item,
uma por cidade, com a quantidade daquela cidade no mesmo campo.
"""
import json
import random
from pathlib import Path

BASE = Path(__file__).resolve().parent
ARQUIVO = BASE / "produtos" / "catalogo.json"
CIDADES = ["Cuiabá", "Sorriso"]
SEED = 20261030

random.seed(SEED)

with ARQUIVO.open(encoding="utf-8") as f:
    produtos = json.load(f)

resultado = []
usados = set()

for idx, p in enumerate(produtos):
    base = dict(p)
    try:
        total = int(p.get("Qtd máxima usada em um romaneio") or 1)
    except (TypeError, ValueError):
        total = 1
    if total < 1:
        total = 1

    contagem = {c: 0 for c in CIDADES}
    for _ in range(total):
        contagem[random.choice(CIDADES)] += 1

    id_base = str(p.get("id") or f"item{idx}")
    for cidade in CIDADES:
        novo = dict(base)
        novo["Cidade"] = cidade
        novo["Qtd máxima usada em um romaneio"] = contagem[cidade]
        novo_id = f"{id_base}_{cidade.lower()}"
        while novo_id in usados:
            novo_id += "x"
        usados.add(novo_id)
        novo["id"] = novo_id
        resultado.append(novo)

with ARQUIVO.open("w", encoding="utf-8") as f:
    json.dump(resultado, f, ensure_ascii=False, indent=2)

por_cidade = {c: sum(1 for r in resultado if r["Cidade"] == c) for c in CIDADES}
print(f"Total de registros: {len(resultado)}")
for c in CIDADES:
    print(f"{c}: {por_cidade[c]} registros")
