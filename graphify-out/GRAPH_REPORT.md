# Graph Report - APP  (2026-11-04)

## Corpus Check
- Corpus is ~33,954 words - fits in a single context window. You may not need a graph.

## Summary
- 290 nodes · 563 edges · 14 communities (10 shown, 4 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.87)
- Token cost: 12,000 input · 8,000 output

## Community Hubs (Navigation)
- Grok Frontend App
- Catálogo Frontend Core
- Catalog Data Scripts
- Grok Gallery & Deploy
- Prod Local Server
- Root Local Server
- GitHub Actions CI
- Gallery Unit Tests
- Resolume Test Pattern
- Event Lighting Rig
- CI & Validation Concepts

## God Nodes (most connected - your core abstractions)
1. `CatalogoHandler` - 14 edges
2. `saveEdit()` - 12 edges
3. `adicionarProduto()` - 12 edges
4. `Página do Catálogo (index.html)` - 11 edges
5. `apagarArquivoImagem()` - 10 edges
6. `modo()` - 9 edges
7. `salvarEdicao()` - 9 edges
8. `importarJSON()` - 9 edges
9. `carregarDados()` - 8 edges
10. `salvarLocal()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Catálogo de Equipamentos LADE` --semantically_similar_to--> `Catálogo de Equipamentos (versão Grok)`  [INFERRED] [semantically similar]
  README.md → Grok_version/PRODUTOS_LADE/prod/README.md
- `salvar.php` --semantically_similar_to--> `LADE_TOKEN (senha no servidor local)`  [INFERRED] [semantically similar]
  README.md → Grok_version/PRODUTOS_LADE/prod/README.md
- `Fallback localStorage` --semantically_similar_to--> `IndexedDB (GitHub Pages)`  [INFERRED] [semantically similar]
  README.md → Grok_version/PRODUTOS_LADE/prod/README.md
- `Baixar JSON` --semantically_similar_to--> `Baixar Pacote (ZIP)`  [INFERRED] [semantically similar]
  README.md → Grok_version/PRODUTOS_LADE/prod/index.html
- `servidor.py (desenvolvimento local)` --semantically_similar_to--> `Endpoints servidor.py (upload-imagem / apagar-imagem)`  [INFERRED] [semantically similar]
  README.md → Grok_version/PRODUTOS_LADE/prod/README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Fluxo de Edição e Persistência** — readme_modo_edicao, readme_salvar_php, readme_localstorage_fallback, readme_baixar_json, readme_catalogo_json [INFERRED 0.85]
- **Pipeline da Galeria de Fotos** — grok_readme_galeria_fotos, grok_readme_imagens_products, grok_readme_upload_php, grok_readme_servidor_endpoints, grok_index_edit_fotos [INFERRED 0.85]
- **Cena de Iluminação de Evento** — grok_version_produtos_lade_prod_produtos_imagens_1793297423672_01_86ec1107_moving_heads, grok_version_produtos_lade_prod_produtos_imagens_1793297423672_01_86ec1107_haze_machine, grok_version_produtos_lade_prod_produtos_imagens_1793297423672_01_86ec1107_color_beams [INFERRED 0.85]

## Communities (14 total, 4 thin omitted)

### Community 0 - "Grok Frontend App"
Cohesion: 0.10
Nodes (58): abrirAddModal(), abrirConfirmarApagar(), abrirIDB(), abrirLightbox(), abrirModal(), acaoFoto(), adicionarProduto(), adicionarUrlExterna() (+50 more)

### Community 1 - "Catálogo Frontend Core"
Cohesion: 0.10
Nodes (47): abrirConfirmarApagar(), abrirEdicao(), abrirGerenciarCidades(), abrirModal(), abrirProdutoModal(), adicionarCidade(), adicionarProduto(), atualizarCategorias() (+39 more)

### Community 2 - "Catalog Data Scripts"
Cohesion: 0.07
Nodes (19): excel_to_json(), atualizar_imagens(), carregar_json(), normalizar(), salvar_json(), main(), testar_apps_script(), testar_cors() (+11 more)

### Community 3 - "Grok Gallery & Deploy"
Cohesion: 0.08
Nodes (37): Baixar Pacote (ZIP), Enviar Fotos (redimensionamento 1600px), Navegação da Galeria (setas e contador), Lightbox de Fotos, Aviso GitHub Pages (somente leitura), Catálogo de Equipamentos (versão Grok), Galeria de Fotos (até 10), Commit de Fotos no Git (+29 more)

### Community 4 - "Prod Local Server"
Cohesion: 0.14
Nodes (5): CatalogoHandler, dentro_de(), gravar_atomico(), mime_real(), validar_catalogo()

### Community 5 - "Root Local Server"
Cohesion: 0.14
Nodes (4): CatalogoHandler, _parse_multipart(), _salvar_arquivo_midia(), _send_json()

### Community 6 - "GitHub Actions CI"
Cohesion: 0.11
Nodes (17): jobs, verificar, name, on, pull_request, push, permissions, contents (+9 more)

### Community 7 - "Gallery Unit Tests"
Cohesion: 0.29
Nodes (4): LadeGaleria, a, cat, fs

### Community 8 - "Resolume Test Pattern"
Cohesion: 0.40
Nodes (5): Barras de Cores de Calibração, Marcas de Alinhamento Geométrico (círculos e diagonais), Grade de Alinhamento (Grid Overlay), Calibração de Painel de LED (VJ), Resolume Test Pattern (2000x800)

### Community 9 - "Event Lighting Rig"
Cohesion: 0.40
Nodes (5): Feixes de Luz Coloridos (RGB), Máquina de Fumaça / Haze, Rig de Moving Heads em Evento, Moving Heads (refletores motorizados), Salão de Evento (piso e teto)

## Knowledge Gaps
- **15 isolated node(s):** `Segurança do Repositório Público`, `Print View (grid de impressão)`, `Busca de Equipamentos (#search)`, `upload.php`, `CI GitHub Actions` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 74 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 2 inferred relationships involving `Página do Catálogo (index.html)` (e.g. with `Navegação da Galeria (setas e contador)` and `Catálogo de Equipamentos LADE`) actually correct?**
  _`Página do Catálogo (index.html)` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Segurança do Repositório Público`, `Print View (grid de impressão)`, `Busca de Equipamentos (#search)` to the rest of the system?**
  _15 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Grok Frontend App` be split into smaller, more focused modules?**
  _Cohesion score 0.09526592635885447 - nodes in this community are weakly interconnected._
- **Should `Catálogo Frontend Core` be split into smaller, more focused modules?**
  _Cohesion score 0.10180995475113122 - nodes in this community are weakly interconnected._
- **Should `Catalog Data Scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.07397959183673469 - nodes in this community are weakly interconnected._
- **Should `Grok Gallery & Deploy` be split into smaller, more focused modules?**
  _Cohesion score 0.07807807807807808 - nodes in this community are weakly interconnected._
- **Should `Prod Local Server` be split into smaller, more focused modules?**
  _Cohesion score 0.13756613756613756 - nodes in this community are weakly interconnected._