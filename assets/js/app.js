document.addEventListener('DOMContentLoaded', () => {
    console.log('=== CATÁLOGO LADE — Galeria + Cidades ===');

    const SERVIDOR_URL = 'http://localhost:8000';

    /* ===================== ELEMENTOS DOM ===================== */
    const gridView = document.getElementById('grid-view');
    const printView = document.getElementById('print-view');
    const emptyState = document.getElementById('empty-state');
    const resultsCount = document.getElementById('results-count');
    const searchInput = document.getElementById('search');
    const categoryFilter = document.getElementById('category-filter');
    const cityFilter = document.getElementById('city-filter');
    const loading = document.getElementById('loading');

    // Modal visualização produto
    const modal = document.getElementById('product-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const modalImg = document.getElementById('modal-img');
    const modalCategory = document.getElementById('modal-category');
    const modalTitle = document.getElementById('modal-title');
    const modalBrand = document.getElementById('modal-brand');
    const modalDescription = document.getElementById('modal-description');
    const modalUnit = document.getElementById('modal-unit');
    const modalCidade = document.getElementById('modal-cidade');
    const modalGaleriaThumbs = document.getElementById('modal-galeria-thumbs');
    const carouselPrev = document.getElementById('carousel-prev');
    const carouselNext = document.getElementById('carousel-next');
    const carouselCounter = document.getElementById('carousel-counter');

    // Elementos edição
    const editToggleBtn = document.getElementById('edit-toggle');
    const editModal = document.getElementById('edit-modal');
    const editBackdrop = document.getElementById('edit-backdrop');
    const closeEditModalBtn = document.getElementById('close-edit-modal');
    const cancelEditBtn = document.getElementById('cancel-edit');
    const editForm = document.getElementById('edit-form');
    const editIndexInput = document.getElementById('edit-index');
    const editEquipamento = document.getElementById('edit-equipamento');
    const editMarca = document.getElementById('edit-marca');
    const editCategoria = document.getElementById('edit-categoria');
    const editCidade = document.getElementById('edit-cidade');
    const editEstoque = document.getElementById('edit-estoque');
    const editDescricao = document.getElementById('edit-descricao');
    const editUnidade = document.getElementById('edit-unidade');
    const editUrlImagem = document.getElementById('edit-url-imagem');
    const editCapa = document.getElementById('edit-capa');
    const editCapaPreview = document.getElementById('edit-capa-preview');
    const editGaleriaInput = document.getElementById('edit-galeria');
    const editGaleriaPreview = document.getElementById('edit-galeria-preview');
    const editUrlVideo = document.getElementById('edit-url-video');
    const editAddVideoBtn = document.getElementById('edit-add-video');
    const toast = document.getElementById('toast');
    const downloadJsonBtn = document.getElementById('download-json');

    // Adicionar produto
    const addProdutoBtn = document.getElementById('add-produto');
    const addModal = document.getElementById('add-modal');
    const closeAddModalBtn = document.getElementById('close-add-modal');
    const cancelAddBtn = document.getElementById('cancel-add');
    const addForm = document.getElementById('add-form');
    const addEquipamento = document.getElementById('add-equipamento');
    const addMarca = document.getElementById('add-marca');
    const addCategoria = document.getElementById('add-categoria');
    const addCategoriaNova = document.getElementById('add-categoria-nova');
    const addCidade = document.getElementById('add-cidade');
    const addEstoque = document.getElementById('add-estoque');
    const addDescricao = document.getElementById('add-descricao');
    const addUnidade = document.getElementById('add-unidade');
    const addUrlImagem = document.getElementById('add-url-imagem');
    const addCapa = document.getElementById('add-capa');
    const addCapaPreview = document.getElementById('add-capa-preview');
    const addGaleriaInput = document.getElementById('add-galeria');
    const addGaleriaPreview = document.getElementById('add-galeria-preview');
    const addUrlVideo = document.getElementById('add-url-video');
    const addAddVideoBtn = document.getElementById('add-add-video');

    // Gerenciar cidades
    const cidadesBtn = document.getElementById('cidades-btn');
    const cidadesModal = document.getElementById('cidades-modal');
    const closeCidadesModalBtn = document.getElementById('close-cidades-modal');
    const cancelCidadesBtn = document.getElementById('cancel-cidades');
    const btnAddCidade = document.getElementById('btn-add-cidade');
    const novaCidadeInput = document.getElementById('nova-cidade');
    const cidadesLista = document.getElementById('cidades-lista');

    // Exclusão
    const confirmDeleteModal = document.getElementById('confirm-delete-modal');
    const closeConfirmDeleteBtn = document.getElementById('close-confirm-delete');
    const cancelDeleteBtn = document.getElementById('cancel-delete');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const itemNomeDelete = document.getElementById('item-nome-delete');

    /* ===================== ESTADO ===================== */
    let allProducts = [];
    let editMode = false;
    let editingIndex = null;
    let itemParaApagarIndex = null;
    let cidades = ['Cuiabá', 'Sorriso']; // cidades padrão
    let cidadeSelecionada = 'Cuiabá'; // cidade padrão ao abrir a página
    let midiasCarousel = [];   // mídias unificadas do modal (capa + galeria)
    let midiaAtualIndex = 0;
    let galeriaEdicao = []; // arquivos da galeria em edição
    let galeriaAdicao = []; // arquivos da galeria em adição
    let capaEdicao = null;  // arquivo de capa selecionado na edição
    let capaAdicao = null;  // arquivo de capa selecionado na adição
    const STORAGE_KEY = 'lade_catalogo_v1';
    const CIDADES_KEY = 'lade_cidades_v1';
    const MAX_GALERIA = 5;

    /* ===================== HELPERS MODAL ===================== */
    function abrirModal(modalEl, backdropEl = null) {
        if (modalEl) { modalEl.classList.remove('hidden'); modalEl.classList.add('visible'); }
        if (backdropEl) { backdropEl.classList.remove('hidden'); backdropEl.classList.add('visible'); }
        document.body.style.overflow = 'hidden';
    }

    function fecharModal(modalEl, backdropEl = null) {
        if (modalEl) { modalEl.classList.add('hidden'); modalEl.classList.remove('visible'); }
        if (backdropEl) { backdropEl.classList.add('hidden'); backdropEl.classList.remove('visible'); }
        document.body.style.overflow = 'auto';
    }

    /* ===================== CARREGAR DADOS ===================== */
    async function carregarDados() {
        try {
            const resposta = await fetch('produtos/catalogo.json');
            const data = await resposta.json();
            allProducts = data.filter(p => p.Equipamento);
            salvarLocal();
        } catch (e) {
            console.error('Erro JSON local:', e);
            const salvo = localStorage.getItem(STORAGE_KEY);
            if (salvo) {
                allProducts = JSON.parse(salvo).filter(p => p.Equipamento);
            }
        }

        carregarCidades();
        populateCategories(allProducts);
        populateAddCategorySelect();
        populateCityFilter();
        populateAddCitySelect();
        filtrar();
        loading.classList.add('hidden');
    }

    function carregarCidades() {
        const salvo = localStorage.getItem(CIDADES_KEY);
        if (salvo) {
            try {
                cidades = JSON.parse(salvo);
            } catch (e) { cidades = ['Cuiabá', 'Sorriso']; }
        } else {
            cidades = ['Cuiabá', 'Sorriso'];
        }
        // Garante que Cuiabá esteja sempre
        if (!cidades.includes('Cuiabá')) cidades.unshift('Cuiabá');
    }

    function salvarCidades() {
        localStorage.setItem(CIDADES_KEY, JSON.stringify(cidades));
    }

    function populateCityFilter() {
        cityFilter.innerHTML = '<option value="">Todas as cidades</option>';
        cidades.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            cityFilter.appendChild(opt);
        });
        if (cidadeSelecionada && cidades.includes(cidadeSelecionada)) {
            cityFilter.value = cidadeSelecionada;
        } else {
            cidadeSelecionada = '';
        }
    }

    /* ===================== GALERIA HELPERS ===================== */
    function extrairImagemUrl(str) {
        if (!str || typeof str !== 'string') return 'https://via.placeholder.com/400x300?text=Sem+Imagem';
        const match = str.match(/imagem: (https?:\/\/[^\s|]+)/);
        return match ? match[1] : 'https://via.placeholder.com/400x300?text=Imagem+N%C3%A3o+Encontrada';
    }

    function tipoArquivo(nome) {
        const ext = nome.split('.').pop().toLowerCase();
        const videos = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
        return videos.includes(ext) ? 'video' : 'imagem';
    }

    function iconeTipo(tipo) {
        return tipo === 'video' ? '🎥' : '📷';
    }

    // Detecta link de vídeo externo (YouTube/Vimeo) e devolve URL de embed + miniatura
    function extrairVideoEmbed(url) {
        if (!url || typeof url !== 'string') return null;
        const u = url.trim();
        let m;
        m = u.match(/(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
        if (m) {
            return {
                id: m[1],
                embed: `https://www.youtube.com/embed/${m[1]}`,
                thumb: `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg`,
            };
        }
        m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
        if (m) {
            return { id: m[1], embed: `https://player.vimeo.com/video/${m[1]}`, thumb: null };
        }
        return null;
    }

    function ehLinkVideoExterno(url) {
        return !!extrairVideoEmbed(url);
    }

    // Redimensiona/comprime a foto para não inflar o repositório (WebP ≤1280px, ≤150KB)
    function carregarBitmap(arquivo) {
        if (window.createImageBitmap) return createImageBitmap(arquivo);
        return new Promise((resolve, reject) => {
            const img = new Image();
            const objUrl = URL.createObjectURL(arquivo);
            img.onload = () => { URL.revokeObjectURL(objUrl); resolve(img); };
            img.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error('falha ao carregar imagem')); };
            img.src = objUrl;
        });
    }

    function canvasParaBlob(canvas, tipo, qualidade) {
        return new Promise((resolve) => canvas.toBlob(resolve, tipo, qualidade));
    }

    async function otimizarImagem(arquivo) {
        if (!arquivo || !arquivo.type || !arquivo.type.startsWith('image/')) return arquivo;
        if (arquivo.type === 'image/gif') return arquivo;
        try {
            const bitmap = await carregarBitmap(arquivo);
            const largura = bitmap.width || bitmap.naturalWidth;
            const altura = bitmap.height || bitmap.naturalHeight;
            if (!largura || !altura) return arquivo;

            const MAX_LADO = 1280;
            const escala = Math.min(1, MAX_LADO / Math.max(largura, altura));
            const w = Math.round(largura * escala);
            const h = Math.round(altura * escala);

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bitmap, 0, 0, w, h);

            let qualidade = 0.85;
            let blob = await canvasParaBlob(canvas, 'image/webp', qualidade);
            while (blob && blob.size > 150 * 1024 && qualidade > 0.45) {
                qualidade -= 0.1;
                blob = await canvasParaBlob(canvas, 'image/webp', qualidade);
            }
            if (!blob) return arquivo;
            const nome = arquivo.name.replace(/\.[^.]+$/, '') + '.webp';
            const otimizado = new File([blob], nome, { type: 'image/webp' });
            return otimizado.size < arquivo.size ? otimizado : arquivo;
        } catch (e) {
            return arquivo;
        }
    }

    // Render preview de galeria nos modais de edição/adição
    function renderGaleriaPreview(container, galeriaArray, inputEl) {
        container.innerHTML = '';
        galeriaArray.forEach((item, idx) => {
            const div = document.createElement('div');
            div.className = 'galeria-item';
            div.style.position = 'relative';

            const embed = item.tipo === 'video' ? extrairVideoEmbed(item.url) : null;
            let media;
            if (embed) {
                media = document.createElement('img');
                media.alt = 'Vídeo';
                if (embed.thumb) {
                    media.src = embed.thumb;
                } else {
                    media.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 9%22%3E%3Crect width=%2216%22 height=%229%22 fill=%22%23000%22/%3E%3Cpath d=%22M6 3l5 1.5L6 6z%22 fill=%22%23fff%22/%3E%3C/svg%3E';
                }
            } else {
                media = document.createElement(item.tipo === 'video' ? 'video' : 'img');
                media.src = item.url;
                media.alt = 'Preview';
                if (item.tipo === 'video') {
                    media.muted = true;
                    media.playsInline = true;
                    media.loop = true;
                }
            }
            div.appendChild(media);

            const tipoBadge = document.createElement('div');
            tipoBadge.className = 'galeria-item-type';
            tipoBadge.textContent = item.tipo === 'video' ? 'VÍDEO' : 'IMG';
            div.appendChild(tipoBadge);

            const btnRemove = document.createElement('button');
            btnRemove.className = 'galeria-remove';
            btnRemove.title = 'Remover';
            btnRemove.innerHTML = '×';
            btnRemove.onclick = (e) => {
                e.stopPropagation();
                galeriaArray.splice(idx, 1);
                renderGaleriaPreview(container, galeriaArray, inputEl);
            };
            div.appendChild(btnRemove);

            const legenda = document.createElement('div');
            legenda.className = 'galeria-item-legenda';
            legenda.textContent = item.legenda || '';
            div.appendChild(legenda);

            const inputLegenda = document.createElement('input');
            inputLegenda.type = 'text';
            inputLegenda.className = 'input-legenda';
            inputLegenda.placeholder = 'Legenda';
            inputLegenda.value = item.legenda || '';
            inputLegenda.onchange = (e) => {
                item.legenda = e.target.value.trim();
            };
            div.appendChild(inputLegenda);

            container.appendChild(div);
        });

        inputEl.disabled = galeriaArray.length >= MAX_GALERIA;
    }

    // Processar arquivos selecionados no input file
    async function processarArquivos(fileList, galeriaArray, previewContainer, inputEl) {
        const arquivos = Array.from(fileList);
        if (galeriaArray.length + arquivos.length > MAX_GALERIA) {
            alert(`Máximo de ${MAX_GALERIA} itens na galeria.`);
            return;
        }

        for (const arquivo of arquivos) {
            const otimizado = await otimizarImagem(arquivo);
            const url = URL.createObjectURL(otimizado);
            const tipo = tipoArquivo(otimizado.name);
            galeriaArray.push({ tipo, url, legenda: '', arquivo: otimizado });
        }
        renderGaleriaPreview(previewContainer, galeriaArray, inputEl);
    }

    // Adiciona um vídeo por link (YouTube/Vimeo) na galeria
    function adicionarVideoPorUrl(url, galeriaArray, previewContainer, inputEl) {
        const link = (url || '').trim();
        if (!link) return false;
        if (!extrairVideoEmbed(link)) {
            alert('Link de vídeo inválido. Use um link do YouTube ou Vimeo.');
            return false;
        }
        if (galeriaArray.length >= MAX_GALERIA) {
            alert(`Máximo de ${MAX_GALERIA} itens na galeria.`);
            return false;
        }
        if (galeriaArray.some((item) => item.url === link)) {
            alert('Este vídeo já está na galeria.');
            return false;
        }
        galeriaArray.push({ tipo: 'video', url: link, legenda: '' });
        renderGaleriaPreview(previewContainer, galeriaArray, inputEl);
        return true;
    }

    // Enviar galeria para o servidor e retornar URLs
    async function enviarGaleriaServidor(galeriaArray) {
        const resultados = [];
        for (const item of galeriaArray) {
            if (!item.arquivo) {
                resultados.push({ tipo: item.tipo, url: item.url, legenda: item.legenda || '' });
                continue;
            }
            const formData = new FormData();
            formData.append('arquivo', item.arquivo);
            try {
                const resp = await fetch(`${SERVIDOR_URL}/upload-midia`, {
                    method: 'POST',
                    body: formData,
                });
                const data = await resp.json();
                const ok = data.resultados && data.resultados[0];
                if (ok && ok.status === 'sucesso') {
                    resultados.push({ tipo: item.tipo, url: ok.url, legenda: item.legenda || '' });
                } else {
                    resultados.push({ tipo: item.tipo, url: item.url, legenda: item.legenda || '' });
                }
            } catch (e) {
                resultados.push({ tipo: item.tipo, url: item.url, legenda: item.legenda || '' });
            }
        }
        return resultados;
    }

    function limparGaleria(previewContainer, inputEl, arrayRef) {
        arrayRef.length = 0;
        renderGaleriaPreview(previewContainer, arrayRef, inputEl);
    }

    /* ===================== CAPA ===================== */
    // Envia a foto de capa para o servidor; devolve a URL relativa ou null
    async function uploadCapa(arquivo) {
        const otimizado = await otimizarImagem(arquivo);
        const formData = new FormData();
        formData.append('arquivo', otimizado);
        try {
            const resp = await fetch(`${SERVIDOR_URL}/upload-midia`, {
                method: 'POST',
                body: formData,
            });
            const data = await resp.json();
            const ok = data.resultados && data.resultados[0];
            if (ok && ok.status === 'sucesso') return ok.url;
        } catch (e) {
            console.error('Falha no upload da capa:', e);
        }
        return null;
    }

    function limparPreviewCapa(container) {
        if (!container) return;
        const blob = container.dataset.blobUrl;
        if (blob) URL.revokeObjectURL(blob);
        container.dataset.blobUrl = '';
        container.innerHTML = '';
    }

    // container: div de preview | urlAtual: capa salva | arquivo: nova capa escolhida
    function mostrarPreviewCapa(container, urlAtual, arquivo) {
        if (!container) return;
        limparPreviewCapa(container);
        container.dataset.atual = urlAtual || '';

        if (arquivo) {
            const blobUrl = URL.createObjectURL(arquivo);
            container.dataset.blobUrl = blobUrl;

            const box = document.createElement('div');
            box.className = 'capa-preview-box';

            const img = document.createElement('img');
            img.src = blobUrl;
            img.alt = 'Nova capa';
            box.appendChild(img);

            const badge = document.createElement('span');
            badge.className = 'capa-badge nova';
            badge.textContent = 'Nova';
            box.appendChild(badge);

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'capa-remove';
            btn.title = 'Remover nova capa';
            btn.innerHTML = '×';
            btn.onclick = () => {
                if (container === editCapaPreview) {
                    capaEdicao = null;
                    if (editCapa) editCapa.value = '';
                } else {
                    capaAdicao = null;
                    if (addCapa) addCapa.value = '';
                }
                mostrarPreviewCapa(container, container.dataset.atual, null);
            };
            box.appendChild(btn);

            container.appendChild(box);
        } else if (urlAtual) {
            const box = document.createElement('div');
            box.className = 'capa-preview-box';

            const img = document.createElement('img');
            img.src = urlAtual;
            img.alt = 'Capa atual';
            box.appendChild(img);

            const badge = document.createElement('span');
            badge.className = 'capa-badge atual';
            badge.textContent = 'Atual';
            box.appendChild(badge);

            container.appendChild(box);
        } else {
            const p = document.createElement('p');
            p.className = 'capa-vazia';
            p.textContent = 'Nenhuma foto de capa';
            container.appendChild(p);
        }
    }

    function limparCapaEdicao() {
        capaEdicao = null;
        if (editCapa) editCapa.value = '';
        limparPreviewCapa(editCapaPreview);
    }

    function limparCapaAdicao() {
        capaAdicao = null;
        if (addCapa) addCapa.value = '';
        limparPreviewCapa(addCapaPreview);
    }

    /* ===================== CATEGORIAS ===================== */
    function populateCategories(products) {
        const atual = categoryFilter.value;
        const cats = [...new Set(products.map(p => p.Categoria).filter(Boolean))].sort();
        categoryFilter.innerHTML = '<option value="">Todas as categorias</option>';
        cats.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            categoryFilter.appendChild(opt);
        });
        if (atual && cats.includes(atual)) categoryFilter.value = atual;
    }

    function populateAddCategorySelect() {
        if (!addCategoria) return;
        const atual = addCategoria.value;
        const cats = [...new Set(allProducts.map(p => p.Categoria).filter(Boolean))].sort();
        addCategoria.innerHTML = '<option value="">Sem categoria</option>';
        cats.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            addCategoria.appendChild(opt);
        });
        const nova = document.createElement('option');
        nova.value = '__nova__';
        nova.textContent = '+ Nova categoria';
        addCategoria.appendChild(nova);
        if (atual && Array.from(addCategoria.options).some(o => o.value === atual)) {
            addCategoria.value = atual;
        }
    }

    function populateAddCitySelect() {
        if (!addCidade) return;
        const atual = addCidade.value;
        addCidade.innerHTML = '<option value="">Selecione a cidade</option>';
        cidades.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            addCidade.appendChild(opt);
        });
        if (atual) addCidade.value = atual;
    }

    function populateEditCitySelect(valor) {
        if (!editCidade) return;
        editCidade.innerHTML = '<option value="">Selecione a cidade</option>';
        cidades.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            editCidade.appendChild(opt);
        });
        if (valor) {
            if (!Array.from(editCidade.options).some(o => o.value === valor)) {
                const opt = document.createElement('option');
                opt.value = valor;
                opt.textContent = valor;
                editCidade.appendChild(opt);
            }
            editCidade.value = valor;
        }
    }

    function estoqueDe(p) {
        if (p == null) return 0;
        if (p.Estoque !== undefined && p.Estoque !== null && p.Estoque !== '') return Number(p.Estoque) || 0;
        const q = p['Qtd máxima usada em um romaneio'];
        return Number(q) || 0;
    }

    function atualizarCategorias() {
        populateCategories(allProducts);
        populateAddCategorySelect();
    }

    /* ===================== RENDER PRODUTOS ===================== */
    function renderProducts(products) {
        gridView.innerHTML = '';
        printView.innerHTML = '';

        products.forEach((product, idx) => {
            const imagemUrl = extrairImagemUrl(product['URL da imagem / fonte']);
            const description = product['Descrição/Observações'] || '';
            const brand = product['Marca/Modelo'] || '';
            const cidade = product.Cidade || '';
            const estoque = estoqueDe(product);
            const cidadeEstoque = cidade ? `${cidade} · ${estoque} un` : `${estoque} un`;

            const card = document.createElement('div');
            card.className = 'product-card card-editable';
            card.dataset.index = String(allProducts.indexOf(product));

            let editIcon = '';
            if (editMode) {
                editIcon = `
                    <button class="edit-badge" title="Editar" aria-label="Editar ${product.Equipamento}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                `;
            }

            card.innerHTML = `
                ${editIcon}
                <div class="product-card-image">
                    <img src="${imagemUrl}" alt="${product.Equipamento}">
                </div>
                <div class="product-card-content">
                    <span class="product-card-category">${cidadeEstoque}</span>
                    <h3 class="product-card-title">${product.Equipamento}</h3>
                    <p class="product-card-brand">${brand}</p>
                    <p class="product-card-description">${description}</p>
                </div>
            `;

            gridView.appendChild(card);

            // Página de impressão
            const page = document.createElement('div');
            page.className = 'product-page';
            page.innerHTML = `
                <div class="print-header">
                    <h2 class="print-title">${product.Equipamento}</h2>
                    <p class="print-brand">${brand}</p>
                </div>
                <div class="print-image">
                    <img src="${imagemUrl}" alt="${product.Equipamento}">
                </div>
                <div class="print-description">
                    <p>${description}</p>
                </div>
                <div class="print-meta">
                    <span><strong>Categoria:</strong> ${product.Categoria || '—'}</span>
                    <span><strong>Unidade:</strong> ${product.Unidade || 'UN'}</span>
                    <span><strong>Cidade:</strong> ${cidade || '—'}</span>
                    <span><strong>Estoque:</strong> ${estoque} un</span>
                </div>
                <div class="print-footer">
                    Catálogo de Equipamentos | Catálogo Visual
                </div>
            `;
            printView.appendChild(page);
        });

        if (resultsCount) {
            resultsCount.textContent = `${products.length} ${products.length === 1 ? 'item' : 'itens'}`;
        }
        if (emptyState) {
            emptyState.classList.toggle('hidden', products.length > 0);
        }
    }

    function ehPlaceholder(url) {
        return !url || url.includes('placeholder');
    }

    function montarMidias(product) {
        const lista = [];
        const galeria = (product.galeria || []).filter(g => g && g.url);
        const capa = extrairImagemUrl(product['URL da imagem / fonte']);
        // Capa primeiro; se não houver capa válida, entra só quando não há galeria
        if (!ehPlaceholder(capa) || galeria.length === 0) {
            lista.push({ tipo: 'imagem', url: capa, legenda: 'Foto principal' });
        }
        galeria.forEach((g, i) => {
            lista.push({ tipo: g.tipo || 'imagem', url: g.url, legenda: g.legenda || `Mídia ${i + 1}` });
        });
        return lista;
    }

    function exibirMidia(index) {
        if (!midiasCarousel.length) return;
        const total = midiasCarousel.length;
        midiaAtualIndex = ((index % total) + total) % total;
        const item = midiasCarousel[midiaAtualIndex];

        const videoExistente = document.getElementById('modal-video');
        if (videoExistente) videoExistente.remove();

        if (item.tipo === 'video') {
            const embed = extrairVideoEmbed(item.url);
            if (embed) {
                const f = document.createElement('iframe');
                f.id = 'modal-video';
                f.src = embed.embed;
                f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
                f.allowFullscreen = true;
                f.style.width = '100%';
                f.style.aspectRatio = '16 / 9';
                f.style.maxHeight = '100%';
                f.style.border = '0';
                f.style.display = 'block';
                modalImg.style.display = 'none';
                modalImg.parentNode.insertBefore(f, modalImg.nextSibling);
            } else {
                const v = document.createElement('video');
                v.id = 'modal-video';
                v.src = item.url;
                v.controls = true;
                v.playsInline = true;
                v.style.maxWidth = '100%';
                v.style.maxHeight = '100%';
                v.style.objectFit = 'contain';
                v.style.display = 'block';
                modalImg.style.display = 'none';
                modalImg.parentNode.insertBefore(v, modalImg.nextSibling);
            }
        } else {
            modalImg.src = item.url;
            modalImg.alt = item.legenda || '';
            modalImg.style.display = 'block';
        }

        if (modalGaleriaThumbs) {
            const thumbs = modalGaleriaThumbs.querySelectorAll('.galeria-thumb');
            thumbs.forEach((t, i) => t.classList.toggle('active', i === midiaAtualIndex));
            const ativa = thumbs[midiaAtualIndex];
            if (ativa && ativa.scrollIntoView) {
                ativa.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }

        const multiplo = total > 1;
        if (carouselCounter) {
            carouselCounter.textContent = `${midiaAtualIndex + 1} / ${total}`;
            carouselCounter.classList.toggle('hidden', !multiplo);
        }
        if (carouselPrev) carouselPrev.classList.toggle('hidden', !multiplo);
        if (carouselNext) carouselNext.classList.toggle('hidden', !multiplo);
    }

    function navegarMidia(delta) {
        if (midiasCarousel.length > 1) exibirMidia(midiaAtualIndex + delta);
    }

    function abrirProdutoModal(product) {
        midiasCarousel = montarMidias(product);
        midiaAtualIndex = 0;

        modalCategory.textContent = product.Categoria || '';
        modalTitle.textContent = product.Equipamento;
        modalBrand.textContent = product['Marca/Modelo'] || '';
        modalDescription.textContent = product['Descrição/Observações'] || 'Sem descrição adicional.';
        modalUnit.textContent = product.Unidade || 'UN';
        if (modalCidade) modalCidade.textContent = product.Cidade || '—';

        // Miniaturas de TODAS as mídias (capa + galeria)
        if (modalGaleriaThumbs) modalGaleriaThumbs.innerHTML = '';
        midiasCarousel.forEach((item, i) => {
            const thumb = document.createElement('div');
            thumb.className = 'galeria-thumb';
            thumb.title = item.legenda || '';
            if (item.tipo === 'video') {
                const embed = extrairVideoEmbed(item.url);
                if (embed) {
                    const img = document.createElement('img');
                    img.src = embed.thumb || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 9%22%3E%3Crect width=%2216%22 height=%229%22 fill=%22%23000%22/%3E%3Cpath d=%22M6 3l5 1.5L6 6z%22 fill=%22%23fff%22/%3E%3C/svg%3E';
                    img.alt = item.legenda || 'Vídeo';
                    thumb.appendChild(img);
                } else {
                    const v = document.createElement('video');
                    v.src = item.url;
                    v.muted = true;
                    v.playsInline = true;
                    v.loop = true;
                    thumb.appendChild(v);
                }
            } else {
                const img = document.createElement('img');
                img.src = item.url;
                img.alt = item.legenda || 'Thumb';
                thumb.appendChild(img);
            }
            const tipo = document.createElement('div');
            tipo.className = 'galeria-thumb-type';
            tipo.textContent = item.tipo === 'video' ? 'VÍDEO' : 'IMG';
            thumb.appendChild(tipo);
            thumb.onclick = () => exibirMidia(i);
            modalGaleriaThumbs.appendChild(thumb);
        });

        exibirMidia(0);

        // Meta cidade
        let metaCidade = document.getElementById('modal-meta-cidade');
        if (!metaCidade) {
            metaCidade = document.createElement('div');
            metaCidade.id = 'modal-meta-cidade';
            metaCidade.className = 'meta-item';
            const lbl = document.createElement('span');
            lbl.className = 'meta-label';
            lbl.textContent = 'Cidade';
            const val = document.createElement('span');
            val.id = 'modal-cidade';
            val.className = 'meta-value';
            metaCidade.appendChild(lbl);
            metaCidade.appendChild(val);
            document.querySelector('.modal-meta').appendChild(metaCidade);
        }
        document.getElementById('modal-cidade').textContent = product.Cidade || '—';

        // Meta estoque
        let metaEstoque = document.getElementById('modal-meta-estoque');
        if (!metaEstoque) {
            metaEstoque = document.createElement('div');
            metaEstoque.id = 'modal-meta-estoque';
            metaEstoque.className = 'meta-item';
            const lbl = document.createElement('span');
            lbl.className = 'meta-label';
            lbl.textContent = 'Estoque';
            const val = document.createElement('span');
            val.id = 'modal-estoque';
            val.className = 'meta-value';
            metaEstoque.appendChild(lbl);
            metaEstoque.appendChild(val);
            document.querySelector('.modal-meta').appendChild(metaEstoque);
        }
        document.getElementById('modal-estoque').textContent = `${estoqueDe(product)} un`;

        abrirModal(modal);
    }

    /* ===================== FILTROS ===================== */
    function filtrar() {
        const termo = searchInput.value.toLowerCase();
        const cat = categoryFilter.value;
        const cid = cityFilter.value;

        const filtrados = allProducts.filter(p => {
            const busca = p.Equipamento.toLowerCase().includes(termo) ||
                (p['Marca/Modelo'] && p['Marca/Modelo'].toLowerCase().includes(termo)) ||
                (p['Descrição/Observações'] && p['Descrição/Observações'].toLowerCase().includes(termo));
            const catOk = !cat || p.Categoria === cat;
            const cidOk = !cid || p.Cidade === cid;
            return busca && catOk && cidOk;
        });

        renderProducts(filtrados);
    }

    /* ===================== CRUD ===================== */
    function salvarLocal() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(allProducts)); } catch (e) { console.error(e); }
    }

    async function salvarNoServidor() {
        try {
            const resp = await fetch(`${SERVIDOR_URL}/salvar-catalogo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(allProducts),
            });
            const data = await resp.json();
            if (data.status === 'sucesso') mostrarToast('Salvo no servidor!');
            else mostrarToast('Salvo localmente');
        } catch (e) {
            console.error('Servidor indisponível:', e);
            mostrarToast('Servidor não rodando — salvo localmente');
        }
    }

    function toggleEditMode() {
        editMode = !editMode;
        document.body.classList.toggle('edit-mode', editMode);
        const label = editToggleBtn.querySelector('.btn-label');
        if (label) label.textContent = editMode ? 'Sair da Edição' : 'Modo Edição';
        filtrar();
    }

    function abrirEdicao(index) {
        const p = allProducts[index];
        editingIndex = index;
        editIndexInput.value = index;
        editEquipamento.value = p.Equipamento || '';
        editMarca.value = p['Marca/Modelo'] || '';
        editCategoria.value = p.Categoria || '';
        populateEditCitySelect(p.Cidade || '');
        if (editEstoque) editEstoque.value = estoqueDe(p);
        editDescricao.value = p['Descrição/Observações'] || '';
        editUnidade.value = p.Unidade || '';
        editUrlImagem.value = '';

        // Capa: mostra a capa atual do produto no preview
        capaEdicao = null;
        if (editCapa) editCapa.value = '';
        const capaAtual = extrairImagemUrl(p['URL da imagem / fonte']);
        mostrarPreviewCapa(editCapaPreview, ehPlaceholder(capaAtual) ? '' : capaAtual, null);

        // Prepara galeria existente para edição
        const existente = (p.galeria || []).map(g => ({ tipo: g.tipo, url: g.url, legenda: g.legenda || '', arquivo: null }));
        galeriaEdicao = existente;
        renderGaleriaPreview(editGaleriaPreview, galeriaEdicao, editGaleriaInput);

        abrirModal(editModal, editBackdrop);
    }

    function fecharEdicao() {
        fecharModal(editModal, editBackdrop);
        editingIndex = null;
        galeriaEdicao = [];
        editGaleriaPreview.innerHTML = '';
        limparCapaEdicao();
    }

    function salvarEdicao(e) {
        e.preventDefault();
        if (editingIndex === null) return;

        const p = allProducts[editingIndex];
        p.Equipamento = editEquipamento.value.trim();
        p['Marca/Modelo'] = editMarca.value.trim();
        p.Categoria = editCategoria.value.trim();
        p.Cidade = editCidade ? editCidade.value.trim() : (p.Cidade || '');
        const estoqueVal = editEstoque ? Number(editEstoque.value) : NaN;
        p['Qtd máxima usada em um romaneio'] = Number.isFinite(estoqueVal) && estoqueVal >= 0 ? estoqueVal : estoqueDe(p);
        p['Descrição/Observações'] = editDescricao.value.trim();
        p.Unidade = editUnidade.value.trim();

        // Envia capa + galeria para o servidor e atualiza URLs
        (async () => {
            // Prioridade: arquivo escolhido > URL digitada > mantém a atual
            if (capaEdicao) {
                const urlCapa = await uploadCapa(capaEdicao);
                if (urlCapa) {
                    p['URL da imagem / fonte'] = `imagem: ${urlCapa}`;
                    p.Imagem = urlCapa;
                } else {
                    alert('Não foi possível enviar a foto de capa. Verifique se o servidor está rodando em http://localhost:8000 — a capa antiga foi mantida.');
                }
            } else {
                const novaUrl = editUrlImagem.value.trim();
                if (novaUrl) {
                    p['URL da imagem / fonte'] = `imagem: ${novaUrl}`;
                    p.Imagem = novaUrl;
                }
            }

            const novaGaleria = await enviarGaleriaServidor(galeriaEdicao);
            p.galeria = novaGaleria;

            salvarLocal();
            filtrar();
            fecharEdicao();
            await salvarNoServidor();
            mostrarToast('Produto salvo!');
        })();
    }

    function adicionarProduto(e) {
        e.preventDefault();
        let categoria = addCategoria.value.trim();
        if (categoria === '__nova__') {
            categoria = addCategoriaNova.value.trim();
        }
        const p = {
            Equipamento: addEquipamento.value.trim(),
            'Marca/Modelo': addMarca.value.trim(),
            Categoria: categoria,
            Cidade: addCidade.value.trim(),
            'Qtd máxima usada em um romaneio': (() => {
                const v = addEstoque ? Number(addEstoque.value) : NaN;
                return Number.isFinite(v) && v >= 0 ? v : 0;
            })(),
            'Descrição/Observações': addDescricao.value.trim(),
            Unidade: addUnidade.value.trim() || 'UN',
            'URL da imagem / fonte': '',
            Imagem: '',
            galeria: [],
        };
        if (!p.id) p.id = Date.now().toString();

        (async () => {
            // Prioridade: arquivo escolhido > URL digitada
            if (capaAdicao) {
                const urlCapa = await uploadCapa(capaAdicao);
                if (urlCapa) {
                    p['URL da imagem / fonte'] = `imagem: ${urlCapa}`;
                    p.Imagem = urlCapa;
                } else {
                    alert('Não foi possível enviar a foto de capa. Verifique se o servidor está rodando em http://localhost:8000.');
                }
            } else if (addUrlImagem.value.trim()) {
                p['URL da imagem / fonte'] = `imagem: ${addUrlImagem.value.trim()}`;
                p.Imagem = addUrlImagem.value.trim();
            }

            const novaGaleria = await enviarGaleriaServidor(galeriaAdicao);
            p.galeria = novaGaleria;

            allProducts.push(p);
            if (p.Cidade && !cidades.includes(p.Cidade)) {
                cidades.push(p.Cidade);
                salvarCidades();
                populateCityFilter();
                populateAddCitySelect();
            }
            salvarLocal();
            atualizarCategorias();
            populateCityFilter();
            populateAddCitySelect();
            filtrar();
            fecharAdicao();
            await salvarNoServidor();
            mostrarToast('Produto adicionado!');
        })();
    }

    function fecharAdicao() {
        fecharModal(addModal);
        galeriaAdicao = [];
        addGaleriaPreview.innerHTML = '';
        addForm.reset();
        limparCapaAdicao();
        if (addCategoriaNova) {
            addCategoriaNova.value = '';
            addCategoriaNova.classList.add('hidden');
        }
    }

    function abrirConfirmarApagar(index) {
        itemParaApagarIndex = index;
        itemNomeDelete.textContent = allProducts[index].Equipamento || 'Item';
        fecharModal(editModal, editBackdrop);
        abrirModal(confirmDeleteModal);
    }

    function fecharConfirmarApagar() {
        fecharModal(confirmDeleteModal);
        itemParaApagarIndex = null;
    }

    async function confirmarApagar() {
        if (itemParaApagarIndex === null) return;
        allProducts.splice(itemParaApagarIndex, 1);
        salvarLocal();
        atualizarCategorias();
        populateCityFilter();
        filtrar();
        fecharConfirmarApagar();
        await salvarNoServidor();
        mostrarToast('Produto removido!');
    }

    /* ===================== CIDADES ===================== */
    function renderCidadesLista() {
        cidadesLista.innerHTML = '';
        cidades.forEach((c, i) => {
            const div = document.createElement('div');
            div.className = 'cidade-item' + (i === 0 ? ' cidade-item-ativo' : '');
            const span = document.createElement('span');
            span.className = 'cidade-item-nome';
            span.textContent = c;
            const btn = document.createElement('button');
            btn.className = 'cidade-item-remover';
            btn.title = 'Remover';
            btn.innerHTML = '×';
            btn.onclick = (ev) => {
                ev.stopPropagation();
                if (cidades.length <= 1) return;
                cidades.splice(i, 1);
                salvarCidades();
                populateCityFilter();
                renderCidadesLista();
            };
            div.appendChild(span);
            div.appendChild(btn);
            cidadesLista.appendChild(div);
        });
    }

    function abrirGerenciarCidades() {
        renderCidadesLista();
        abrirModal(cidadesModal);
    }

    function fecharGerenciarCidades() {
        fecharModal(cidadesModal);
    }

    function adicionarCidade() {
        const nome = novaCidadeInput.value.trim();
        if (!nome) return;
        if (cidades.includes(nome)) {
            alert('Esta cidade já existe.');
            return;
        }
        cidades.push(nome);
        salvarCidades();
        novaCidadeInput.value = '';
        populateCityFilter();
        renderCidadesLista();
        mostrarToast('Cidade adicionada!');
    }

    /* ===================== LIGHTBOX ===================== */
    function abrirLightbox(src, tipo) {
        let lb = document.getElementById('lightbox');
        if (!lb) {
            const lbHtml = `
                <div id="lightbox" class="lightbox">
                    <button id="lightbox-close" class="lightbox-close" aria-label="Fechar">✕</button>
                    <div class="lightbox-content"></div>
                    <div class="lightbox-nav">
                        <button id="lightbox-prev" class="lightbox-prev" aria-label="Anterior">‹</button>
                        <button id="lightbox-next" class="lightbox-next" aria-label="Próximo">›</button>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', lbHtml);
            lb = document.getElementById('lightbox');
        }
        const content = document.querySelector('.lightbox-content');
        content.innerHTML = '';
        if (tipo === 'video') {
            const embed = extrairVideoEmbed(src);
            if (embed) {
                const f = document.createElement('iframe');
                f.src = embed.embed;
                f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
                f.allowFullscreen = true;
                f.style.width = '80vw';
                f.style.maxWidth = '960px';
                f.style.aspectRatio = '16 / 9';
                f.style.border = '0';
                f.style.display = 'block';
                content.appendChild(f);
            } else {
                const v = document.createElement('video');
                v.src = src;
                v.controls = true;
                v.playsInline = true;
                v.style.maxWidth = '100%';
                v.style.maxHeight = '85vh';
                v.style.objectFit = 'contain';
                v.style.display = 'block';
                content.appendChild(v);
            }
        } else {
            const img = document.createElement('img');
            img.src = src;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '85vh';
            img.style.objectFit = 'contain';
            img.style.display = 'block';
            content.appendChild(img);
        }
        lb.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }

    function fecharLightbox() {
        const lb = document.getElementById('lightbox');
        if (lb) lb.classList.remove('visible');
        document.body.style.overflow = 'auto';
    }

    /* ===================== TOAST ===================== */
    function mostrarToast(msg) {
        toast.textContent = msg;
        toast.classList.remove('hidden');
        downloadJsonBtn.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3500);
    }

    function baixarJSON() {
        const str = JSON.stringify(allProducts, null, 2);
        const blob = new Blob([str], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'catalogo_editado.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function importarJSON(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const dados = JSON.parse(ev.target.result);
                if (Array.isArray(dados) && dados.length > 0) {
                    allProducts = dados.filter(p => p.Equipamento);
                    salvarLocal();
                    carregarCidades();
                    populateCategories(allProducts);
                    populateAddCategorySelect();
                    populateCityFilter();
                    populateAddCitySelect();
                    renderProducts(allProducts);
                    mostrarToast('JSON importado!');
                } else {
                    alert('JSON inválido ou vazio.');
                }
            } catch (err) {
                alert('Erro ao ler JSON.');
            }
        };
        reader.readAsText(file);
    }

    /* ===================== EVENT LISTENERS ===================== */
    closeModalBtn.onclick = () => fecharModal(modal);
    modal.onclick = (e) => { if (e.target === modal) fecharModal(modal); };
    if (carouselPrev) carouselPrev.onclick = (e) => { e.stopPropagation(); navegarMidia(-1); };
    if (carouselNext) carouselNext.onclick = (e) => { e.stopPropagation(); navegarMidia(1); };

    closeEditModalBtn.onclick = fecharEdicao;
    cancelEditBtn.onclick = fecharEdicao;
    editBackdrop.onclick = fecharEdicao;
    editForm.onsubmit = salvarEdicao;

    document.getElementById('apagar-item').onclick = (e) => {
        e.preventDefault();
        if (editingIndex !== null) abrirConfirmarApagar(editingIndex);
    };

    cidadesBtn.onclick = (e) => { e.stopPropagation(); abrirGerenciarCidades(); };
    closeCidadesModalBtn.onclick = fecharGerenciarCidades;
    cancelCidadesBtn.onclick = fecharGerenciarCidades;
    btnAddCidade.onclick = adicionarCidade;
    novaCidadeInput.onkeypress = (e) => { if (e.key === 'Enter') adicionarCidade(); };

    closeConfirmDeleteBtn.onclick = fecharConfirmarApagar;
    cancelDeleteBtn.onclick = fecharConfirmarApagar;
    confirmDeleteBtn.onclick = confirmarApagar;
    confirmDeleteModal.onclick = (e) => { if (e.target === confirmDeleteModal) fecharConfirmarApagar(); };

    editToggleBtn.onclick = (e) => { e.stopPropagation(); toggleEditMode(); };

    addProdutoBtn.onclick = (e) => {
        e.stopPropagation();
        populateAddCategorySelect();
        populateAddCitySelect();
        if (addCidade && cidades.includes('Cuiabá')) addCidade.value = 'Cuiabá';
        if (addCategoriaNova) {
            addCategoriaNova.value = '';
            addCategoriaNova.classList.add('hidden');
        }
        limparCapaAdicao();
        mostrarPreviewCapa(addCapaPreview, '', null);
        abrirModal(addModal);
    };
    closeAddModalBtn.onclick = fecharAdicao;
    cancelAddBtn.onclick = fecharAdicao;
    addForm.onsubmit = adicionarProduto;
    addModal.onclick = (e) => { if (e.target === addModal) fecharAdicao(); };

    addCategoria.onchange = () => {
        if (!addCategoriaNova) return;
        if (addCategoria.value === '__nova__') {
            addCategoriaNova.classList.remove('hidden');
            addCategoriaNova.focus();
        } else {
            addCategoriaNova.classList.add('hidden');
            addCategoriaNova.value = '';
        }
    };

    downloadJsonBtn.onclick = (e) => { e.stopPropagation(); baixarJSON(); };

    document.getElementById('import-json-btn').onclick = (e) => { e.stopPropagation(); document.getElementById('import-json').click(); };
    document.getElementById('import-json').onchange = importarJSON;

    editGaleriaInput.onchange = (e) => processarArquivos(e.target.files, galeriaEdicao, editGaleriaPreview, editGaleriaInput);
    addGaleriaInput.onchange = (e) => processarArquivos(e.target.files, galeriaAdicao, addGaleriaPreview, addGaleriaInput);
    if (editAddVideoBtn) editAddVideoBtn.onclick = () => {
        if (adicionarVideoPorUrl(editUrlVideo.value, galeriaEdicao, editGaleriaPreview, editGaleriaInput)) editUrlVideo.value = '';
    };
    if (addAddVideoBtn) addAddVideoBtn.onclick = () => {
        if (adicionarVideoPorUrl(addUrlVideo.value, galeriaAdicao, addGaleriaPreview, addGaleriaInput)) addUrlVideo.value = '';
    };

    if (editCapa) editCapa.onchange = (e) => {
        const f = (e.target.files && e.target.files[0]) || null;
        capaEdicao = f;
        mostrarPreviewCapa(editCapaPreview, editCapaPreview.dataset.atual || '', capaEdicao);
    };
    if (addCapa) addCapa.onchange = (e) => {
        const f = (e.target.files && e.target.files[0]) || null;
        capaAdicao = f;
        mostrarPreviewCapa(addCapaPreview, '', capaAdicao);
    };

    gridView.addEventListener('click', (e) => {
        const card = e.target.closest('.product-card');
        if (!card) return;
        const idx = Number(card.dataset.index);
        if (Number.isNaN(idx) || idx < 0) return;
        if (e.target.closest('.edit-badge')) {
            e.stopPropagation();
            abrirEdicao(idx);
        } else {
            abrirProdutoModal(allProducts[idx]);
        }
    });

    searchInput.oninput = filtrar;
    categoryFilter.onchange = filtrar;
    cityFilter.onchange = () => {
        cidadeSelecionada = cityFilter.value;
        filtrar();
    };

    // Lightbox events delegados
    document.addEventListener('click', (e) => {
        if (e.target.closest('#lightbox-close')) fecharLightbox();
        if (e.target.closest('#lightbox-prev')) { /* anterior - implementar se necessário */ }
        if (e.target.closest('#lightbox-next')) { /* próximo - implementar se necessário */ }
        if (e.target.id === 'lightbox') fecharLightbox();
    });

    document.addEventListener('keydown', (e) => {
        if (modal.classList.contains('visible') && midiasCarousel.length > 1) {
            if (e.key === 'ArrowLeft') { navegarMidia(-1); return; }
            if (e.key === 'ArrowRight') { navegarMidia(1); return; }
        }
        if (e.key === 'Escape') {
            fecharModal(modal);
            if (editMode) fecharEdicao();
            fecharConfirmarApagar();
            fecharGerenciarCidades();
            fecharLightbox();
        }
    });

    // Inicializa
    carregarDados();
});
