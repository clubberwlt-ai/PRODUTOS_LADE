import json

JSON_PATH = 'produtos/catalogo.json'

IMAGEM_MAP = {
    "Mesa de áudio Digilive 16 canais": "https://dt7v1i9vyp3mf.cloudfront.net/styles/news_large/s3/imagelibrary/s/studiomasterdigilive01-RFuoKCfRG4iihwyPQlDeTIel4TrVJY.l.jpg",
    "PA FZ 2402 02x04": "https://www.fzaudio.com.br/_files/ugd/afe2f8_b41102d6d44f4542be4bd818ae978895.pdf",
    "Ribalta P5 Wash 12x48W": "https://cdn.awsli.com.br/2500x2500/2771/2771594/produto/344739188/1000074774-lwqtywzy7l.jpg",
    "Servidor de vídeo 8K": "https://oss.novastar.tech/uploads/2024/12/ET16S-G-Professional-Media-Server-Specifications-V1.1.0-1.pdf",
    "Totem de LED P1.8 indoor 0,64x1,92m": "https://audioeffetti.com/en/category/video/led-walls/ego-display-totem01-p1-86i-foldable-led-totem-1-86-mm-pixel-pitch-gob-protection-640-1920-mm-display-size-600-cd-m2-brightness-full-mobile-pc-control-ip40-supplied-in-a-single-compartment-flight-case-p213145",
    "COB Klub Pro 240V": "https://via.placeholder.com/400x300?text=COB+Klub+Pro+240V",
    "Luz decorativa espaco Ágora": "https://via.placeholder.com/400x300?text=PAR+LED+RGBW+Wash",
    "Luz decorativa Ágora/Gran": "https://via.placeholder.com/400x300?text=PAR+LED+RGBW+Wash",
    "Estacao de transmissao": "https://via.placeholder.com/400x300?text=Estacao+de+Transmissao",
    "Carpete para forracao": "https://via.placeholder.com/400x300?text=Carpete+Preto+Evento",
    "Fechamento housemix aluminio": "https://via.placeholder.com/400x300?text=Fechamento+Housemix+Aluminio",
    "PA MK System 02x04": "https://via.placeholder.com/400x300?text=PA+MK+System",
    "Audio Cecelia Meireles": "https://via.placeholder.com/400x300?text=Sonorizacao+de+Local",
}

def carregar_json():
    with open(JSON_PATH, encoding='utf-8') as f:
        return json.load(f)

def salvar_json(data):
    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

def normalizar(texto):
    if not texto:
        return ''
    return texto.lower().replace('á', 'a').replace('ã', 'a').replace('ç', 'c').replace('ê', 'e').replace('í', 'i').replace('ó', 'o').replace('ô', 'o').replace('ú', 'u')

def atualizar_imagens():
    data = carregar_json()
    atualizados = 0
    nao_encontrados = []
    
    for produto in data:
        equipamento = produto.get('Equipamento', '')
        categoria = produto.get('Categoria', '')
        imagem_atual = produto.get('Imagem')
        url_atual = produto.get('URL da imagem / fonte') or ''
        
        # Pular serviços (categoria Outros)
        if categoria == 'Outros':
            continue
        
        # Só atualizar se realmente não tem imagem (é None ou 'não encontrada')
        tem_imagem_valida = (
            imagem_atual and 
            str(imagem_atual).strip() not in ['', 'None', 'null', 'não encontrada', 'não encontrado']
        )
        tem_url_valida = (
            url_atual and 
            'não encontrada' not in str(url_atual).lower() and
            'não encontrado' not in str(url_atual).lower() and
            'serviço' not in str(url_atual).lower()
        )
        
        if tem_imagem_valida or tem_url_valida:
            continue
        
        # Tentar encontrar no mapeamento
        equip_norm = normalizar(equipamento)
        url_imagem = None
        for chave, url in IMAGEM_MAP.items():
            chave_norm = normalizar(chave)
            if chave_norm in equip_norm or equip_norm in chave_norm:
                url_imagem = url
                break
        
        if url_imagem:
            produto['URL da imagem / fonte'] = f"[imagem encontrada] imagem: {url_imagem}"
            produto['Imagem'] = url_imagem
            atualizados += 1
            print(f"OK: {equipamento}")
        else:
            nao_encontrados.append(equipamento)
            print(f"SEM MAPEAMENTO: {equipamento}")
    
    salvar_json(data)
    print(f"\nTotal atualizados: {atualizados}")
    print(f"Sem mapeamento: {len(nao_encontrados)}")

if __name__ == "__main__":
    atualizar_imagens()
