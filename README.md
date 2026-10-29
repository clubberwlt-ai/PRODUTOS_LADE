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
  backups/                 backups gerados pelo salvar.php (não versionado)
salvar.php                 salvamento no servidor (não versionado)
salvar.example.php         modelo do salvamento para deploy
servidor.py                servidor local de desenvolvimento
```

## Rodar localmente

```powershell
python servidor.py
```

Acesse `http://localhost:8000`. Em `localhost` o botão salvar usa o `servidor.py` (grava direto em `produtos/catalogo.json`, sem senha).

## Deploy no HostGator

1. Envie para `public_html` (ou subpasta): `index.html`, `assets/`, `produtos/catalogo.json`.
2. Copie `salvar.example.php` como `salvar.php` no servidor e troque `TROQUE-ESTA-SENHA` por uma senha forte.
3. Crie `produtos/backups/` com um `.htaccess` contendo `Require all denied`.
4. Permissões: pastas `755`, arquivos `644`. Se o salvamento falhar por escrita, use `775` em `produtos` e `664` em `catalogo.json`.
5. Ative HTTPS (AutoSSL/Let's Encrypt) no cPanel.

O `salvar.php` não é versionado porque contém a senha de edição. Mantenha-o apenas no servidor.

## Uso em produção

- **Modo Edição**: exige a senha definida no `salvar.php`, pedida uma vez por sessão do navegador.
- Cada salvamento gera um backup em `produtos/backups/` (máximo de 20).
- Em hospedagem sem PHP (ex.: GitHub Pages), o salvamento fica apenas no `localStorage`; use **Baixar JSON** e substitua `produtos/catalogo.json` no repositório/deploy.

## Segurança

- Repositório público: não commite `salvar.php`, planilhas `.xlsx` nem a pasta `produtos/backups/`.
- O `produtos/catalogo.json` é público por natureza (é o conteúdo exibido no site).
