import openpyxl
import json
import os
import glob
import shutil
import time

OUTPUT_JSON = os.path.join('produtos', 'catalogo.json')
BACKUP_DIR = os.path.join('produtos', 'backups')


def achar_excel():
    arquivos = glob.glob(os.path.join('produtos', '*.xlsx'))
    if not arquivos:
        raise FileNotFoundError('Nenhum .xlsx na pasta produtos/')
    return max(arquivos, key=os.path.getmtime)


def normalizar_numero(v):
    if v is None or v == '':
        return None
    try:
        n = float(v)
    except (TypeError, ValueError):
        return v
    if n.is_integer():
        return int(n)
    return round(n, 4)


def texto(v):
    if v is None:
        return ''
    return str(v).strip()


def carregar_anterior():
    if not os.path.exists(OUTPUT_JSON):
        return {}
    try:
        with open(OUTPUT_JSON, encoding='utf-8') as f:
            antigos = json.load(f)
    except Exception:
        return {}
    por_nome = {}
    for item in antigos:
        nome = texto(item.get('Equipamento'))
        if nome:
            por_nome[nome] = item
    return por_nome


def main():
    excel = achar_excel()
    print('Lendo:', excel)
    wb = openpyxl.load_workbook(excel, data_only=True)
    ws = wb['Catálogo']

    header = [texto(c.value) for c in ws[1]]
    col = {nome: i for i, nome in enumerate(header) if nome}

    def idx(prefixo):
        for nome, i in col.items():
            if nome.lower().startswith(prefixo.lower()):
                return i
        return None

    c_cat = idx('Categoria')
    c_equip = idx('Equipamento')
    c_marca = idx('Marca/Modelo')
    c_desc = idx('Descrição')
    c_qtd_romaneio = idx('Qtd máxima usada')
    c_unid = idx('Unidade')
    c_romaneios = idx('Romaneios onde aparece')
    c_urlfonte = idx('URL da imagem / fonte')
    c_urllimpa = idx('URL da imagem (limpa)')
    c_codigo = idx('Código estoque')
    c_estoque = idx('Qtd em estoque')
    c_minimo = idx('Qtd mínima')
    c_almox = idx('Almoxarifado')

    anteriores = carregar_anterior()
    itens = []
    base_id = int(time.time() * 1000)

    def val(row, i):
        if i is None:
            return None
        return ws.cell(row=row, column=i + 1).value

    for r in range(2, ws.max_row + 1):
        equip = texto(val(r, c_equip))
        if not equip:
            continue

        item = {}
        if c_cat is not None:
            item['Categoria'] = texto(val(r, c_cat))
        item['Equipamento'] = equip
        item['Marca/Modelo'] = texto(val(r, c_marca))
        item['Descrição/Observações'] = texto(val(r, c_desc))
        item['Qtd máxima usada em um romaneio'] = normalizar_numero(val(r, c_qtd_romaneio)) or 0
        item['Unidade'] = texto(val(r, c_unid)) or 'UN'
        item['Romaneios onde aparece'] = texto(val(r, c_romaneios))
        item['URL da imagem / fonte'] = texto(val(r, c_urlfonte))
        item['Imagem'] = texto(val(r, c_urllimpa))

        codigo = normalizar_numero(val(r, c_codigo))
        estoque = normalizar_numero(val(r, c_estoque))
        minimo = normalizar_numero(val(r, c_minimo))
        almox = texto(val(r, c_almox))

        if codigo is not None:
            item['Código estoque'] = codigo
        if estoque is not None:
            item['Qtd em estoque (09/11/2026)'] = estoque
        if minimo is not None:
            item['Qtd mínima'] = minimo
        item['Almoxarifado'] = almox

        anterior = anteriores.get(equip)
        if anterior:
            item['id'] = anterior.get('id') or f'{base_id}_{len(itens)}'
            galeria = anterior.get('galeria')
            if galeria:
                item['galeria'] = galeria
            if anterior.get('destaque'):
                item['destaque'] = True
        else:
            item['id'] = f'{base_id}_{len(itens)}'
            item['galeria'] = []

        itens.append(item)

    os.makedirs(BACKUP_DIR, exist_ok=True)
    if os.path.exists(OUTPUT_JSON):
        stamp = time.strftime('%Y%m%d_%H%M%S')
        destino = os.path.join(BACKUP_DIR, f'catalogo_{stamp}.json')
        shutil.copy2(OUTPUT_JSON, destino)
        print('Backup:', destino)

    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(itens, f, ensure_ascii=False, indent=4)

    print(f'OK: {len(itens)} itens gravados em {OUTPUT_JSON}')


if __name__ == '__main__':
    main()
