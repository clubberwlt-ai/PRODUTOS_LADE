# PRODUTOS LADE — Catálogo de Equipamentos

Catálogo visual estático dos equipamentos da LADE Sound Stage Tech, com busca, filtro por categoria, modo edição e geração de PDF.

## Estrutura

```
index.html                 página principal
assets/
  css/style.css            estilos
  js/app.js                busca, filtros, modais e salvamento
produtos/
  catalogo.json            base de dados do catálogo
  imagens/<id>/NN-hash.ext  fotos dos produtos (versionadas no git)
  backups/                 backups gerados pelo salvar.php (não versionado)
salvar.php                 salvamento no servidor (não versionado)
salvar.example.php         modelo do salvamento para deploy
upload.php                 upload/remoção de fotos no servidor (não versionado)
upload.example.php         modelo do upload para deploy
servidor.py                servidor local de desenvolvimento
scripts/                   utilitários Python (rode a partir da raiz)
  validar_catalogo.py      valida o catálogo (usado no CI)
  atualizar_catalogo.py    gera catalogo.json a partir da planilha .xlsx
  atualizar_imagens.py     preenche URLs de imagem conhecidas
  verificar_imagens.py     lista itens sem imagem
  verificar_final.py       resumo rápido do catálogo
  obsoletos/diagnostico.py diagnóstico da antiga integração Google Apps Script (não usado)
tests/galeria.test.js      testes de lógica da galeria (node)
.github/workflows/ci.yml   CI: catálogo, PHP, Python e JS
```

## Rodar localmente

```powershell
python servidor.py
```

Acesse `http://localhost:8000`. Em `localhost` o botão salvar usa o `servidor.py` (grava direto em `produtos/catalogo.json` e em `produtos/imagens/`).

- Por padrão não há senha. Para exigir uma, defina `LADE_TOKEN` antes de iniciar
  (PowerShell: `$env:LADE_TOKEN="minha-senha"; python servidor.py`). O site pedirá a senha ao gravar.
- `LADE_PORT` muda a porta (padrão 8000).
- O servidor só escuta em `127.0.0.1`, não envia CORS (aceita gravações apenas da mesma origem),
  bloqueia path traversal e arquivos ocultos (`.git` etc.) e valida o JSON antes de salvar
  (lista de produtos com `Equipamento`, ids únicos, até 10 imagens, máx. 5 MB).

Validar o catálogo: `python scripts/validar_catalogo.py`.

## Deploy no HostGator

1. Envie para `public_html` (ou subpasta): `index.html`, `assets/`, `produtos/catalogo.json`.
2. Copie `salvar.example.php` como `salvar.php` e `upload.example.php` como `upload.php` no servidor e defina a senha
   de edição (a mesma nos dois). Ordem de leitura da senha:
   1. variável de ambiente `LADE_SAVE_TOKEN` (ex.: `SetEnv LADE_SAVE_TOKEN ...` no `.htaccess`, se o plano permitir);
   2. arquivo `../.lade_senha` — um nível **acima** da pasta do site, ou seja, fora do `public_html`
      (ou o caminho em `LADE_SENHA_ARQUIVO`), contendo só a senha;
   3. a constante `SENHA` dentro do PHP (comportamento original: troque `TROQUE-ESTA-SENHA`).
   Recomendado: opção 2, assim a senha não fica em arquivo servido pelo site.
3. Crie `produtos/backups/` com um `.htaccess` contendo `Require all denied`.
4. Permissões: pastas `755`, arquivos `644`. Se o salvamento falhar por escrita, use `775` em `produtos` e `664` em `catalogo.json`.
5. Ative HTTPS (AutoSSL/Let's Encrypt) no cPanel.

O `salvar.php` não é versionado porque contém a senha de edição. Mantenha-o apenas no servidor.

## Uso em produção

- **Modo Edição**: exige a senha definida no `salvar.php`, pedida uma vez por sessão do navegador.
- Cada salvamento gera um backup em `produtos/backups/` (máximo de 20).
- Em hospedagem sem PHP (ex.: GitHub Pages), o salvamento fica apenas no `localStorage`; use **Baixar JSON** e substitua `produtos/catalogo.json` no repositório/deploy.

## Galeria de fotos

- Cada produto pode ter **até 10 fotos** no campo `imagens` (lista) do `catalogo.json`. A primeira é a principal
  (usada no card e no PDF). Itens antigos sem `imagens` continuam funcionando: a foto vem de
  `URL da imagem / fonte` (trecho `imagem: https://...`) ou do campo `Imagem`. Ao editar as fotos de um item,
  o campo `imagens` é criado e `Imagem` passa a refletir a principal.
- Visualização: imagem principal, miniaturas, setas (botões ou ← →) e lightbox ao clicar na foto (Esc fecha).
- Modo Edição: **Enviar fotos** (vários arquivos; JPG, PNG ou WEBP). O navegador redimensiona para no máximo
  1600 px no lado maior e comprime (qualidade 0,85; PNG vira WEBP). Cada foto pode ser apagada, movida (← →)
  ou marcada como principal (★). URLs externas também podem ser adicionadas.
- Arquivos ficam em `produtos/imagens/<id-do-produto>/NN-hash.ext` (o `id` é criado automaticamente se o item não tiver).
- Fotos enviadas e não salvas são descartadas ao cancelar; fotos removidas só são apagadas do servidor ao **Salvar**.

### Onde as fotos são gravadas

| Ambiente | Como funciona |
|---|---|
| Local (`servidor.py`) | `POST /upload-imagem` (corpo = bytes da imagem, cabeçalho `X-Produto-Id`) e `POST /apagar-imagem` (`{"caminho": "produtos/imagens/..."}`). Depois, faça commit da pasta. |
| HostGator (`upload.php`) | `POST upload.php?acao=enviar` e `POST upload.php?acao=apagar`, com `X-Save-Token`. Valida tipo real (finfo), máx. 3 MB, 10 por produto, nome gerado pelo servidor e caminho dentro de `produtos/imagens`. Crie `produtos/imagens/` com permissão de escrita (755/775). |
| GitHub Pages | Somente leitura: fotos novas ficam no **IndexedDB** do navegador (marcadas "Pendente") e o catálogo no `localStorage`. Use **Baixar pacote (ZIP)** — contém `produtos/catalogo.json`, as fotos novas em `produtos/imagens/` e um `LEIA-ME.txt` (com `git rm` das fotos apagadas). Se o JSZip (CDN) não carregar, é baixado um JSON com as imagens embutidas, que precisa ser convertido manualmente. |

### Commitar as fotos no git

```bash
git add produtos/catalogo.json produtos/imagens
git commit -m "Atualiza fotos do catálogo"
git push
```

Atenção ao tamanho do repositório: cada foto fica para sempre no histórico do git, mesmo depois de apagada.
Mantenha as fotos comprimidas (o site já reduz para ~1600 px; o ideal é < 500 KB por foto), evite enviar a
mesma foto várias vezes e não ultrapasse as 10 por item. No HostGator, lembre de baixar as fotos novas do
servidor (FTP/Gerenciador de arquivos) para o repositório, se quiser mantê-lo como fonte da verdade.

## Segurança

- Repositório público: não commite `salvar.php`, `upload.php`, `.lade_senha`, planilhas `.xlsx` nem a pasta `produtos/backups/`.
- O `produtos/catalogo.json` é público por natureza (é o conteúdo exibido no site).
