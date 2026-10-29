import os as _os
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))  # roda a partir da raiz do repo
import openpyxl
import json
import os
import sys

# Configurações
EXCEL_FILE = r"produtos/Catálogo de Equipamentos - LADE.xlsx"
OUTPUT_JSON = r"produtos/catalogo.json"

def excel_to_json():
    print(f"Lendo arquivo: {EXCEL_FILE}...")
    if not os.path.exists(EXCEL_FILE):
        print(f"Erro: Arquivo {EXCEL_FILE} não encontrado.")
        return

    try:
        workbook = openpyxl.load_workbook(EXCEL_FILE, data_only=True)
        sheet = workbook.active
        
        rows = list(sheet.rows)
        if not rows:
            print("Planilha vazia.")
            return
        
        header = [cell.value for cell in rows[0]]
        data = []
        
        for row in rows[1:]:
            item = {}
            has_data = False
            for i, cell in enumerate(row):
                if i < len(header):
                    val = cell.value
                    item[header[i]] = val
                    if val: has_data = True
            
            if has_data:
                data.append(item)
        
        with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        
        print(f"Sucesso! {len(data)} produtos convertidos para {OUTPUT_JSON}")
        print("Agora basta atualizar a página no navegador.")

    except Exception as e:
        print(f"Erro na conversão: {e}")

if __name__ == "__main__":
    excel_to_json()
