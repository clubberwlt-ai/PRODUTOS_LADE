import os as _os
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))  # roda a partir da raiz do repo
import json

with open('produtos/catalogo.json', encoding='utf-8') as f:
    data = json.load(f)

sem_imagem = 0
com_imagem = 0
for p in data:
    url = p.get('URL da imagem / fonte') or ''
    img = p.get('Imagem')
    tem_url = bool(url and 'não encontrada' not in str(url).lower() and url != 'serviço - sem imagem')
    tem_img = bool(img and str(img).strip() not in ['', 'None', 'null', 'não encontrada'])
    
    if tem_url or tem_img:
        com_imagem += 1
    else:
        sem_imagem += 1
        equip = p.get('Equipamento', '')
        cat = p.get('Categoria', '')
        print(f'SEM IMAGEM: {equip} | {cat}')

print(f'\nCom imagem: {com_imagem}')
print(f'Sem imagem (placeholder): {sem_imagem}')
print(f'Total: {len(data)}')
