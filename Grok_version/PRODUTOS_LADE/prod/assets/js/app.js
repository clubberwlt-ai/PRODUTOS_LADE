// ============================================
// FUNÇÕES PURAS DA GALERIA (testáveis no Node)
// ============================================
const LadeGaleria = (() => {
    const MAX_FOTOS = 10;
    const MAX_LADO = 1600;
    const QUALIDADE = 0.85;
    const MAX_BYTES = 3 * 1024 * 1024;
    const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];
    const EXT_POR_TIPO = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    const PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">' +
        '<rect width="400" height="300" fill="#e8eaef"/>' +
        '<text x="200" y="158" font-family="sans-serif" font-size="18" fill="#93a0b4" text-anchor="middle">Sem imagem</text></svg>');

    function urlDoCampoLegado(str) {
        if (!str || typeof str !== 'string') return null;
        const m = str.match(/imagem: (https?:\/\/[^\s|]+)/);
        return m ? m[1] : null;
    }

    // Lista de imagens do produto, compatível com o formato antigo
    // ("URL da imagem / fonte" + "Imagem"). Não altera o produto.
    function imagensDoProduto(p) {
        if (!p) return [];
        if (Array.isArray(p.imagens)) {
            return p.imagens.filter(x => typeof x === 'string' && x.trim()).slice(0, MAX_FOTOS);
        }
        const legado = urlDoCampoLegado(p['URL da imagem / fonte']) ||
            (typeof p.Imagem === 'string' && /^https?:\/\//.test(p.Imagem) ? p.Imagem : null);
        return legado ? [legado] : [];
    }

    function ehCaminhoLocal(src) {
        return typeof src === 'string' && /^produtos\/imagens\/[A-Za-z0-9_-]{1,64}\/[A-Za-z0-9_-]{1,80}\.(jpg|jpeg|png|webp)$/.test(src);
    }

    function idValido(id) {
        return typeof id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(id);
    }

    function novoId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }

    // Próximo nome NN-hash.ext dentro da pasta do produto.
    function proximoNome(existentes, hash, ext) {
        let maior = 0;
        existentes.forEach(c => {
            const m = String(c).match(/\/(\d{2})-[^/]*$/);
            if (m) maior = Math.max(maior, parseInt(m[1], 10));
        });
        return `${String(maior + 1).padStart(2, '0')}-${hash.slice(0, 8)}.${ext}`;
    }

    function dimensoesAlvo(w, h, maxLado = MAX_LADO) {
        const maior = Math.max(w, h);
        if (maior <= maxLado) return { w, h };
        const f = maxLado / maior;
        return { w: Math.round(w * f), h: Math.round(h * f) };
    }

    function mover(lista, de, para) {
        const nova = lista.slice();
        if (de < 0 || de >= nova.length || para < 0 || para >= nova.length) return nova;
        const [item] = nova.splice(de, 1);
        nova.splice(para, 0, item);
        return nova;
    }

    function escapeHtml(v) {
        return String(v == null ? '' : v)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    return {
        MAX_FOTOS, MAX_LADO, QUALIDADE, MAX_BYTES, TIPOS_ACEITOS, EXT_POR_TIPO, PLACEHOLDER,
        urlDoCampoLegado, imagensDoProduto, ehCaminhoLocal, idValido, novoId, proximoNome,
        dimensoesAlvo, mover, escapeHtml
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LadeGaleria;
}

if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => {
    console.log('=== CATÁLOGO LADE ===');
    const G = LadeGaleria;
    const esc = G.escapeHtml;

    const SALVAR_PHP = 'salvar.php';
    const UPLOAD_PHP = 'upload.php';
    const SENHA_KEY = 'lade_senha_edicao';
    const STORAGE_KEY = 'lade_catalogo_v1';
    const ALTERADO_KEY = 'lade_catalogo_alterado';
    const REMOVIDAS_KEY = 'lade_imagens_removidas';
    const JSZIP_CDNS = [
        'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
        'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js'
    ];

    const $ = (id) => document.getElementById(id);
    const gridView = $('grid-view');
    const printView = $('print-view');
    const searchInput = $('search');
    const categoryFilter = $('category-filter');
    const loading = $('loading');
    const resultsCount = $('results-count');
    const emptyState = $('empty-state');

    // Visualização + galeria
    const modal = $('product-modal');
    const closeModalBtn = $('close-modal');
    const modalImg = $('modal-img');
    const modalCategory = $('modal-category');
    const modalTitle = $('modal-title');
    const modalBrand = $('modal-brand');
    const modalDescription = $('modal-description');
    const modalUnit = $('modal-unit');
    const galleryPrev = $('gallery-prev');
    const galleryNext = $('gallery-next');
    const galleryCounter = $('gallery-counter');
    const galleryThumbs = $('gallery-thumbs');
    const lightbox = $('lightbox');
    const lightboxImg = $('lightbox-img');
    const lightboxCounter = $('lightbox-counter');

    // Edição
    const editToggleBtn = $('edit-toggle');
    const editModal = $('edit-modal');
    const editBackdrop = $('edit-backdrop');
    const editForm = $('edit-form');
    const editIndexInput = $('edit-index');
    const editEquipamento = $('edit-equipamento');
    const editMarca = $('edit-marca');
    const editCategoria = $('edit-categoria');
    const editDescricao = $('edit-descricao');
    const editUnidade = $('edit-unidade');
    const editUrlImagem = $('edit-url-imagem');
    const editGaleria = $('edit-galeria');
    const editFotosInput = $('edit-fotos');
    const editFotosContador = $('edit-fotos-contador');
    const editFotosAviso = $('edit-fotos-aviso');
    const toast = $('toast');
    const downloadJsonBtn = $('download-json');
    const downloadPacoteBtn = $('download-pacote');
    const pagesAviso = $('pages-aviso');
    const pagesPendentes = $('pages-pendentes');

    // Adicionar
    const addModal = $('add-modal');
    const addForm = $('add-form');
    const addEquipamento = $('add-equipamento');
    const addMarca = $('add-marca');
    const addCategoria = $('add-categoria');
    const addDescricao = $('add-descricao');
    const addUnidade = $('add-unidade');
    const addUrlImagem = $('add-url-imagem');

    // Exclusão
    const confirmDeleteModal = $('confirm-delete-modal');
    const itemNomeDelete = $('item-nome-delete');

    let allProducts = [];
    let editMode = false;
    let editingIndex = null;
    let itemParaApagarIndex = null;

    // Estado da galeria na visualização
    let galeriaAtual = [];
    let fotoAtual = 0;

    // Estado da galeria na edição
    let galeriaEdicao = [];
    let enviadasNestaEdicao = [];
    let removidasNestaEdicao = [];
    let enviandoFotos = false;

    // Fotos pendentes (GitHub Pages): caminho -> data URL (persistidas no IndexedDB)
    const pendentes = new Map();

    // ============================================
    // MODO DE PERSISTÊNCIA
    // ============================================

    function modo() {
        if (['localhost', '127.0.0.1'].includes(window.location.hostname)) return 'local';
        if (/\.github\.io$/i.test(window.location.hostname) || window.location.protocol === 'file:') return 'pages';
        return 'php';
    }

    // ============================================
    // HELPERS DE MODAL
    // ============================================

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

    function estaAberto(el) {
        return el && !el.classList.contains('hidden');
    }

    // ============================================
    // INDEXEDDB (fotos pendentes no GitHub Pages)
    // ============================================

    function abrirIDB() {
        return new Promise((resolve, reject) => {
            if (!('indexedDB' in window)) { reject(new Error('IndexedDB indisponível')); return; }
            const req = indexedDB.open('lade_galeria', 1);
            req.onupgradeneeded = () => req.result.createObjectStore('pendentes', { keyPath: 'caminho' });
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function idb(modoTx, fn) {
        const db = await abrirIDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('pendentes', modoTx);
            const store = tx.objectStore('pendentes');
            const r = fn(store);
            tx.oncomplete = () => resolve(r && r.result);
            tx.onerror = () => reject(tx.error);
        });
    }

    async function carregarPendentes() {
        try {
            const todos = await idb('readonly', s => s.getAll());
            (todos || []).forEach(r => pendentes.set(r.caminho, r.dataUrl));
        } catch (e) {
            console.warn('Sem IndexedDB:', e);
        }
    }

    async function guardarPendente(caminho, dataUrl) {
        pendentes.set(caminho, dataUrl);
        try { await idb('readwrite', s => s.put({ caminho, dataUrl })); } catch (e) { console.warn(e); }
    }

    async function apagarPendente(caminho) {
        pendentes.delete(caminho);
        try { await idb('readwrite', s => s.delete(caminho)); } catch (e) { console.warn(e); }
    }

    function resolverSrc(src) {
        return pendentes.get(src) || src || G.PLACEHOLDER;
    }

    // ============================================
    // CARREGAR DADOS
    // ============================================

    async function carregarDados() {
        await carregarPendentes();
        let dadosCarregados = false;

        // No GitHub Pages, alterações locais ainda não publicadas têm prioridade.
        if (modo() === 'pages' && localStorage.getItem(ALTERADO_KEY) === '1') {
            try {
                const dados = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').filter(p => p.Equipamento);
                if (dados.length) {
                    allProducts = dados;
                    dadosCarregados = true;
                    setTimeout(() => mostrarToast('Usando alterações locais ainda não publicadas. Use "Baixar pacote".'), 300);
                }
            } catch (e) { console.error(e); }
        }

        if (!dadosCarregados) {
            try {
                const resposta = await fetch('produtos/catalogo.json', { cache: 'no-cache' });
                const data = await resposta.json();
                const lista = Array.isArray(data) ? data : (data && data.produtos) || [];
                allProducts = lista.filter(p => p.Equipamento);
                salvarLocal(false);
                dadosCarregados = true;
            } catch (e) {
                console.error('Erro ao carregar JSON local:', e);
            }
        }

        if (!dadosCarregados) {
            try {
                const dados = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').filter(p => p.Equipamento);
                if (dados.length) allProducts = dados;
            } catch (e) {
                console.error('Erro ao ler localStorage:', e);
            }
        }

        atualizarCategorias();
        renderProducts(allProducts);
        atualizarAvisoPages();
        loading.classList.add('hidden');
    }

    function salvarLocal(alterado = true) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(allProducts));
            if (alterado && modo() === 'pages') localStorage.setItem(ALTERADO_KEY, '1');
        } catch (e) {
            console.error('Erro ao salvar no localStorage:', e);
        }
        atualizarAvisoPages();
    }

    // ============================================
    // SENHA + REQUISIÇÕES AO SERVIDOR
    // ============================================

    function pedirSenhaEdicao(forcar = false) {
        let senha = forcar ? null : sessionStorage.getItem(SENHA_KEY);
        if (!senha) {
            senha = window.prompt('Senha de edição do catálogo:');
            if (senha) sessionStorage.setItem(SENHA_KEY, senha);
        }
        return senha;
    }

    // Envia com X-Save-Token. Em produção pede a senha antes; no servidor
    // local só pede se o servidor responder 401 (LADE_TOKEN definido).
    async function requisicaoProtegida(url, opcoes) {
        let senha = sessionStorage.getItem(SENHA_KEY);
        if (!senha && modo() === 'php') {
            senha = pedirSenhaEdicao();
            if (!senha) return { ok: false, status: 0, dados: { mensagem: 'Operação cancelada.' } };
        }
        for (let tentativa = 0; tentativa < 2; tentativa++) {
            const headers = Object.assign({}, opcoes.headers || {});
            if (senha) headers['X-Save-Token'] = senha;
            const resp = await fetch(url, Object.assign({}, opcoes, { headers }));
            let dados = {};
            try { dados = await resp.json(); } catch (e) { dados = {}; }
            if (resp.status === 401 && tentativa === 0) {
                sessionStorage.removeItem(SENHA_KEY);
                senha = pedirSenhaEdicao(true);
                if (!senha) return { ok: false, status: 401, dados };
                continue;
            }
            return { ok: resp.ok && dados.status === 'sucesso', status: resp.status, dados };
        }
        return { ok: false, status: 401, dados: { mensagem: 'Senha de edição incorreta.' } };
    }

    function urlEndpoint(acao) {
        if (modo() === 'local') {
            return { salvar: '/salvar-catalogo', enviar: '/upload-imagem', apagar: '/apagar-imagem' }[acao];
        }
        return { salvar: SALVAR_PHP, enviar: `${UPLOAD_PHP}?acao=enviar`, apagar: `${UPLOAD_PHP}?acao=apagar` }[acao];
    }

    async function salvarNoServidor() {
        if (modo() === 'pages') {
            mostrarToast('GitHub Pages: alteração salva só no navegador. Use "Baixar pacote".');
            return;
        }
        try {
            const r = await requisicaoProtegida(urlEndpoint('salvar'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(allProducts)
            });
            if (r.ok) {
                mostrarToast(modo() === 'local' ? 'Salvo no servidor local!' : 'Catálogo salvo no servidor!');
            } else {
                console.error('Erro ao salvar:', r);
                mostrarToast(r.dados.mensagem || 'Não foi possível salvar no servidor. Salvo no navegador.');
            }
        } catch (err) {
            console.error('Falha ao salvar no servidor:', err);
            mostrarToast('Sem conexão com o servidor. Salvo apenas no navegador.');
        }
    }

    // ============================================
    // CATEGORIAS
    // ============================================

    function atualizarCategorias() {
        const atual = categoryFilter.value;
        const categories = [...new Set(allProducts.map(p => p.Categoria))].filter(Boolean).sort();
        categoryFilter.innerHTML = '<option value="">Todas as categorias</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categoryFilter.appendChild(option);
        });
        if (categories.includes(atual)) categoryFilter.value = atual;
    }

    // ============================================
    // VISUALIZAÇÃO + GALERIA + LIGHTBOX
    // ============================================

    function mostrarFoto(i) {
        if (!galeriaAtual.length) {
            modalImg.src = G.PLACEHOLDER;
            galleryCounter.textContent = '';
            return;
        }
        fotoAtual = (i + galeriaAtual.length) % galeriaAtual.length;
        modalImg.src = resolverSrc(galeriaAtual[fotoAtual]);
        const multi = galeriaAtual.length > 1;
        galleryPrev.classList.toggle('hidden', !multi);
        galleryNext.classList.toggle('hidden', !multi);
        galleryCounter.textContent = multi ? `${fotoAtual + 1}/${galeriaAtual.length}` : '';
        Array.from(galleryThumbs.children).forEach((b, idx) => {
            b.classList.toggle('ativa', idx === fotoAtual);
            b.setAttribute('aria-selected', idx === fotoAtual ? 'true' : 'false');
        });
        if (estaAberto(lightbox)) atualizarLightbox();
    }

    function openModal(product) {
        galeriaAtual = G.imagensDoProduto(product);
        modalImg.alt = product.Equipamento || '';
        modalImg.onerror = () => { modalImg.onerror = null; modalImg.src = G.PLACEHOLDER; };
        galleryThumbs.innerHTML = '';
        if (galeriaAtual.length > 1) {
            galeriaAtual.forEach((src, idx) => {
                const b = document.createElement('button');
                b.type = 'button';
                b.setAttribute('role', 'tab');
                b.setAttribute('aria-label', `Foto ${idx + 1}`);
                const img = document.createElement('img');
                img.src = resolverSrc(src);
                img.alt = '';
                img.loading = 'lazy';
                b.appendChild(img);
                b.addEventListener('click', () => mostrarFoto(idx));
                galleryThumbs.appendChild(b);
            });
        }
        galleryPrev.classList.add('hidden');
        galleryNext.classList.add('hidden');
        mostrarFoto(0);
        modalCategory.textContent = product.Categoria || '';
        modalTitle.textContent = product.Equipamento;
        modalBrand.textContent = product['Marca/Modelo'] || '';
        modalDescription.textContent = product['Descrição/Observações'] || 'Sem descrição adicional.';
        modalUnit.textContent = product.Unidade || 'UN';
        abrirModal(modal);
    }

    function closeModal() {
        fecharLightbox();
        fecharModal(modal);
    }

    function atualizarLightbox() {
        lightboxImg.src = resolverSrc(galeriaAtual[fotoAtual]);
        lightboxImg.alt = modalImg.alt;
        const multi = galeriaAtual.length > 1;
        $('lightbox-prev').classList.toggle('hidden', !multi);
        $('lightbox-next').classList.toggle('hidden', !multi);
        lightboxCounter.textContent = multi ? `${fotoAtual + 1}/${galeriaAtual.length}` : '';
    }

    function abrirLightbox() {
        if (!galeriaAtual.length) return;
        lightbox.classList.remove('hidden');
        atualizarLightbox();
    }

    function fecharLightbox() {
        lightbox.classList.add('hidden');
    }

    // ============================================
    // EDIÇÃO
    // ============================================

    function toggleEditMode() {
        editMode = !editMode;
        document.body.classList.toggle('edit-mode', editMode);
        const editLabel = editToggleBtn.querySelector('.btn-label');
        if (editLabel) editLabel.textContent = editMode ? 'Sair da Edição' : 'Modo Edição';
        editToggleBtn.classList.toggle('btn-active', editMode);
        atualizarAvisoPages();
        filterProducts();
    }

    function openEditModal(index) {
        const product = allProducts[index];
        if (!product) return;
        editingIndex = index;
        editIndexInput.value = index;
        editEquipamento.value = product.Equipamento || '';
        editMarca.value = product['Marca/Modelo'] || '';
        editCategoria.value = product.Categoria || '';
        editDescricao.value = product['Descrição/Observações'] || '';
        editUnidade.value = product.Unidade || '';
        editUrlImagem.value = '';
        galeriaEdicao = G.imagensDoProduto(product);
        enviadasNestaEdicao = [];
        removidasNestaEdicao = [];
        avisoFotos('');
        renderGaleriaEdicao();
        abrirModal(editModal, editBackdrop);
    }

    async function closeEditModal() {
        if (editingIndex === null) return;
        // Cancelar: descarta fotos enviadas nesta edição e não salvas.
        const descartar = enviadasNestaEdicao.slice();
        enviadasNestaEdicao = [];
        fecharModal(editModal, editBackdrop);
        editingIndex = null;
        for (const c of descartar) await apagarArquivoImagem(c, true);
    }

    function avisoFotos(msg) {
        editFotosAviso.textContent = msg;
        editFotosAviso.classList.toggle('hidden', !msg);
    }

    function renderGaleriaEdicao() {
        editGaleria.innerHTML = '';
        galeriaEdicao.forEach((src, idx) => {
            const div = document.createElement('div');
            div.className = 'edit-foto' + (idx === 0 ? ' principal' : '');
            const img = document.createElement('img');
            img.src = resolverSrc(src);
            img.alt = `Foto ${idx + 1}`;
            img.onerror = () => { img.onerror = null; img.src = G.PLACEHOLDER; };
            div.appendChild(img);
            if (idx === 0) div.insertAdjacentHTML('beforeend', '<span class="edit-foto-tag">Principal</span>');
            if (pendentes.has(src)) div.insertAdjacentHTML('beforeend', '<span class="edit-foto-tag pendente" title="Só neste navegador">Pendente</span>');
            const acoes = document.createElement('div');
            acoes.className = 'edit-foto-acoes';
            acoes.innerHTML = `
                <button type="button" data-acao="esq" title="Mover para a esquerda" ${idx === 0 ? 'disabled' : ''}>&#8592;</button>
                <button type="button" data-acao="principal" title="Tornar principal" ${idx === 0 ? 'disabled' : ''}>&#9733;</button>
                <button type="button" data-acao="dir" title="Mover para a direita" ${idx === galeriaEdicao.length - 1 ? 'disabled' : ''}>&#8594;</button>
                <button type="button" data-acao="apagar" class="apagar" title="Apagar foto">&#128465;</button>`;
            acoes.addEventListener('click', (e) => {
                const b = e.target.closest('button');
                if (!b || b.disabled) return;
                acaoFoto(b.dataset.acao, idx);
            });
            div.appendChild(acoes);
            editGaleria.appendChild(div);
        });
        editFotosContador.textContent = `(${galeriaEdicao.length}/${G.MAX_FOTOS})`;
        const cheio = galeriaEdicao.length >= G.MAX_FOTOS;
        editFotosInput.disabled = cheio || enviandoFotos;
        editFotosInput.closest('label').classList.toggle('disabled', cheio);
    }

    async function acaoFoto(acao, idx) {
        if (acao === 'esq') galeriaEdicao = G.mover(galeriaEdicao, idx, idx - 1);
        if (acao === 'dir') galeriaEdicao = G.mover(galeriaEdicao, idx, idx + 1);
        if (acao === 'principal') galeriaEdicao = G.mover(galeriaEdicao, idx, 0);
        if (acao === 'apagar') {
            const [src] = galeriaEdicao.splice(idx, 1);
            if (enviadasNestaEdicao.includes(src)) {
                enviadasNestaEdicao = enviadasNestaEdicao.filter(c => c !== src);
                await apagarArquivoImagem(src, true);
            } else if (G.ehCaminhoLocal(src)) {
                removidasNestaEdicao.push(src); // apagado do servidor só ao Salvar
            }
        }
        renderGaleriaEdicao();
    }

    function garantirIdProduto(product) {
        if (!G.idValido(product.id ? String(product.id) : '')) {
            product.id = G.novoId();
        }
        product.id = String(product.id);
        return product.id;
    }

    function lerArquivoComoImagem(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagem inválida')); };
            img.src = url;
        });
    }

    function canvasParaBlob(canvas, tipo, qualidade) {
        return new Promise(resolve => canvas.toBlob(resolve, tipo, qualidade));
    }

    // Redimensiona para ~1600px no lado maior e comprime (qualidade 0.85).
    async function comprimirImagem(file) {
        const img = await lerArquivoComoImagem(file);
        const { w, h } = G.dimensoesAlvo(img.naturalWidth, img.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        let tipo = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
        if (tipo === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
        ctx.drawImage(img, 0, 0, w, h);
        let blob = await canvasParaBlob(canvas, tipo, G.QUALIDADE);
        if (!blob || blob.type !== tipo) {
            // Navegador sem WEBP no canvas: cai para JPEG (PNG ficaria grande demais).
            tipo = 'image/jpeg';
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, w, h);
            blob = await canvasParaBlob(canvas, tipo, G.QUALIDADE);
        }
        if (blob.size > G.MAX_BYTES) blob = await canvasParaBlob(canvas, 'image/jpeg', 0.7);
        return blob;
    }

    function blobParaDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = () => reject(r.error);
            r.readAsDataURL(blob);
        });
    }

    async function hashBlob(blob) {
        try {
            const buf = await blob.arrayBuffer();
            const dig = await crypto.subtle.digest('SHA-256', buf);
            return Array.from(new Uint8Array(dig)).map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            return Math.random().toString(16).slice(2, 10).padEnd(8, '0');
        }
    }

    async function enviarFoto(produtoId, blob) {
        if (modo() === 'pages') {
            const ext = G.EXT_POR_TIPO[blob.type] || 'jpg';
            const daPasta = galeriaEdicao.concat([...pendentes.keys()])
                .filter(c => c.startsWith(`produtos/imagens/${produtoId}/`));
            const nome = G.proximoNome(daPasta, await hashBlob(blob), ext);
            const caminho = `produtos/imagens/${produtoId}/${nome}`;
            await guardarPendente(caminho, await blobParaDataUrl(blob));
            return caminho;
        }
        const r = await requisicaoProtegida(urlEndpoint('enviar'), {
            method: 'POST',
            headers: { 'Content-Type': blob.type, 'X-Produto-Id': produtoId },
            body: blob
        });
        if (!r.ok) throw new Error(r.dados.mensagem || `Falha no envio (HTTP ${r.status}).`);
        return r.dados.caminho;
    }

    async function apagarArquivoImagem(caminho, silencioso = false) {
        if (!G.ehCaminhoLocal(caminho)) return;
        if (pendentes.has(caminho)) {
            await apagarPendente(caminho);
            return;
        }
        if (modo() === 'pages') {
            // Arquivo já está no repositório: registra para o usuário remover no commit.
            const lista = JSON.parse(localStorage.getItem(REMOVIDAS_KEY) || '[]');
            if (!lista.includes(caminho)) lista.push(caminho);
            localStorage.setItem(REMOVIDAS_KEY, JSON.stringify(lista));
            return;
        }
        try {
            const r = await requisicaoProtegida(urlEndpoint('apagar'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ caminho })
            });
            if (!r.ok && r.status !== 404 && !silencioso) mostrarToast(r.dados.mensagem || 'Não foi possível apagar a foto no servidor.');
        } catch (e) {
            if (!silencioso) mostrarToast('Sem conexão: a foto não foi apagada no servidor.');
        }
    }

    async function onFotosSelecionadas() {
        const arquivos = Array.from(editFotosInput.files || []);
        editFotosInput.value = '';
        if (!arquivos.length || editingIndex === null) return;
        const product = allProducts[editingIndex];
        const produtoId = garantirIdProduto(product);
        const avisos = [];
        enviandoFotos = true;
        renderGaleriaEdicao();
        try {
            for (const file of arquivos) {
                if (galeriaEdicao.length >= G.MAX_FOTOS) {
                    avisos.push(`Limite de ${G.MAX_FOTOS} fotos: ${file.name} ignorada.`);
                    continue;
                }
                if (!G.TIPOS_ACEITOS.includes(file.type)) {
                    avisos.push(`${file.name}: tipo não aceito (use JPG, PNG ou WEBP).`);
                    continue;
                }
                avisoFotos(`Processando ${file.name}...`);
                try {
                    const blob = await comprimirImagem(file);
                    if (blob.size > G.MAX_BYTES) { avisos.push(`${file.name}: maior que 3 MB mesmo comprimida.`); continue; }
                    const caminho = await enviarFoto(produtoId, blob);
                    galeriaEdicao.push(caminho);
                    enviadasNestaEdicao.push(caminho);
                    renderGaleriaEdicao();
                } catch (e) {
                    console.error(e);
                    avisos.push(`${file.name}: ${e.message}`);
                }
            }
        } finally {
            enviandoFotos = false;
            avisoFotos(avisos.join(' '));
            renderGaleriaEdicao();
        }
    }

    function adicionarUrlExterna() {
        const url = editUrlImagem.value.trim();
        if (!url) return;
        if (!/^https?:\/\//i.test(url)) { avisoFotos('Informe uma URL começando com http:// ou https://'); return; }
        if (galeriaEdicao.length >= G.MAX_FOTOS) { avisoFotos(`Limite de ${G.MAX_FOTOS} fotos atingido.`); return; }
        if (!galeriaEdicao.includes(url)) galeriaEdicao.push(url);
        editUrlImagem.value = '';
        avisoFotos('');
        renderGaleriaEdicao();
    }

    function aplicarImagens(product, lista) {
        product.imagens = lista.slice(0, G.MAX_FOTOS);
        // Mantém "Imagem" coerente para quem ainda lê o campo antigo.
        product.Imagem = product.imagens[0] || null;
    }

    async function saveEdit(e) {
        e.preventDefault();
        if (editingIndex === null || editingIndex === undefined) return;
        if (enviandoFotos) { avisoFotos('Aguarde o envio das fotos terminar.'); return; }
        if (editUrlImagem.value.trim()) adicionarUrlExterna();

        const product = allProducts[editingIndex];
        product.Equipamento = editEquipamento.value.trim();
        product['Marca/Modelo'] = editMarca.value.trim();
        product.Categoria = editCategoria.value.trim();
        product['Descrição/Observações'] = editDescricao.value.trim();
        product.Unidade = editUnidade.value.trim();

        const antes = G.imagensDoProduto(product);
        const mudou = antes.length !== galeriaEdicao.length || antes.some((x, i) => x !== galeriaEdicao[i]) || !!product.imagens;
        if (mudou) aplicarImagens(product, galeriaEdicao);
        garantirIdProduto(product);

        const remover = removidasNestaEdicao.slice();
        enviadasNestaEdicao = [];
        removidasNestaEdicao = [];
        fecharModal(editModal, editBackdrop);
        editingIndex = null;

        atualizarCategorias();
        filterProducts();
        salvarLocal();
        await salvarNoServidor();
        for (const c of remover) await apagarArquivoImagem(c);
        atualizarAvisoPages();
    }

    function abrirConfirmarApagar(index) {
        itemParaApagarIndex = index;
        itemNomeDelete.textContent = allProducts[index].Equipamento || 'Item sem nome';
        closeEditModal();
        abrirModal(confirmDeleteModal);
    }

    function fecharConfirmarApagar() {
        fecharModal(confirmDeleteModal);
        itemParaApagarIndex = null;
    }

    // ============================================
    // ADICIONAR / APAGAR PRODUTO
    // ============================================

    function abrirAddModal() {
        addForm.reset();
        addUnidade.value = 'UN';
        abrirModal(addModal);
    }

    function fecharAddModal() {
        fecharModal(addModal);
    }

    async function adicionarProduto(e) {
        e.preventDefault();
        const novoProduto = {
            Equipamento: addEquipamento.value.trim(),
            'Marca/Modelo': addMarca.value.trim(),
            Categoria: addCategoria.value.trim(),
            'Descrição/Observações': addDescricao.value.trim(),
            Unidade: addUnidade.value.trim() || 'UN',
            'URL da imagem / fonte': '',
            Imagem: '',
            imagens: [],
            id: G.novoId()
        };
        const imagemUrl = addUrlImagem.value.trim();
        if (imagemUrl) {
            novoProduto['URL da imagem / fonte'] = `imagem: ${imagemUrl}`;
            aplicarImagens(novoProduto, [imagemUrl]);
        }
        allProducts.push(novoProduto);
        atualizarCategorias();
        filterProducts();
        fecharAddModal();
        salvarLocal();
        await salvarNoServidor();
        mostrarToast('Produto adicionado! Abra a edição para enviar fotos.');
    }

    async function apagarItem() {
        if (itemParaApagarIndex === null || itemParaApagarIndex === undefined) return;
        const [removido] = allProducts.splice(itemParaApagarIndex, 1);
        atualizarCategorias();
        filterProducts();
        fecharConfirmarApagar();
        salvarLocal();
        await salvarNoServidor();
        for (const c of G.imagensDoProduto(removido)) await apagarArquivoImagem(c, true);
        mostrarToast('Item apagado!');
    }

    // ============================================
    // UTILITÁRIOS / EXPORTAÇÃO
    // ============================================

    function mostrarToast(msg) {
        toast.textContent = msg;
        toast.classList.remove('hidden');
        downloadJsonBtn.classList.remove('hidden');
        clearTimeout(mostrarToast._t);
        mostrarToast._t = setTimeout(() => toast.classList.add('hidden'), 4500);
    }

    function baixarBlob(blob, nome) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nome;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function downloadJson() {
        baixarBlob(new Blob([JSON.stringify(allProducts, null, 2)], { type: 'application/json' }), 'catalogo_editado.json');
    }

    function carregarScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = () => { s.remove(); reject(new Error('Falha ao carregar ' + src)); };
            document.head.appendChild(s);
        });
    }

    async function obterJSZip() {
        if (window.JSZip) return window.JSZip;
        for (const src of JSZIP_CDNS) {
            try { await carregarScript(src); if (window.JSZip) return window.JSZip; } catch (e) { console.warn(e); }
        }
        return null;
    }

    function caminhosUsados() {
        const usados = new Set();
        allProducts.forEach(p => G.imagensDoProduto(p).forEach(c => usados.add(c)));
        return usados;
    }

    // Pacote para commitar: catalogo.json + produtos/imagens/** pendentes + LEIA-ME.
    async function baixarPacote() {
        const usados = caminhosUsados();
        const fotos = [...pendentes.entries()].filter(([c]) => usados.has(c));
        const removidas = JSON.parse(localStorage.getItem(REMOVIDAS_KEY) || '[]').filter(c => !usados.has(c));
        const leiaMe = [
            'Pacote do Catálogo LADE gerado em ' + new Date().toLocaleString('pt-BR'),
            '',
            '1. Copie "produtos/catalogo.json" e a pasta "produtos/imagens/" para a raiz do repositório.',
            '2. git add produtos/catalogo.json produtos/imagens && git commit -m "Atualiza catálogo e fotos" && git push',
            removidas.length ? '3. Remova também estas fotos apagadas no site (git rm):' : '',
            ...removidas.map(c => '   git rm ' + c),
            '',
            'Depois do push (e do GitHub Pages atualizar), use "Descartar alterações locais" no aviso do Modo Edição.'
        ].join('\n');

        const JSZip = await obterJSZip();
        if (JSZip) {
            const zip = new JSZip();
            zip.file('produtos/catalogo.json', JSON.stringify(allProducts, null, 2) + '\n');
            fotos.forEach(([c, dataUrl]) => zip.file(c, dataUrl.split(',')[1], { base64: true }));
            zip.file('LEIA-ME.txt', leiaMe);
            const blob = await zip.generateAsync({ type: 'blob' });
            baixarBlob(blob, 'catalogo-lade-pacote.zip');
            mostrarToast(`Pacote baixado: catálogo + ${fotos.length} foto(s).`);
            return;
        }
        // Sem JSZip (CDN bloqueada/offline): JSON com as fotos embutidas.
        const embutido = { catalogo: allProducts, imagens: Object.fromEntries(fotos), removidas, instrucoes: leiaMe };
        baixarBlob(new Blob([JSON.stringify(embutido)], { type: 'application/json' }), 'catalogo-lade-com-imagens.json');
        mostrarToast('Não foi possível carregar o ZIP; baixado JSON com imagens embutidas.');
    }

    function atualizarAvisoPages() {
        const ehPages = modo() === 'pages';
        pagesAviso.classList.toggle('hidden', !(ehPages && editMode));
        downloadPacoteBtn.classList.toggle('hidden', !(editMode || (ehPages && pendentes.size > 0)));
        if (pagesPendentes) {
            const n = [...pendentes.keys()].filter(c => caminhosUsados().has(c)).length;
            pagesPendentes.textContent = n ? ` ${n} foto(s) pendente(s) neste navegador.` : '';
        }
    }

    function importarJson(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const dados = JSON.parse(event.target.result);
                if (Array.isArray(dados) && dados.length > 0) {
                    allProducts = dados.filter(p => p.Equipamento);
                    atualizarCategorias();
                    filterProducts();
                    salvarLocal();
                    mostrarToast('JSON importado com sucesso!');
                } else {
                    alert('Arquivo JSON inválido ou vazio.');
                }
            } catch (err) {
                alert('Erro ao ler o arquivo JSON.');
            }
        };
        reader.readAsText(file);
    }

    // ============================================
    // RENDERIZAÇÃO
    // ============================================

    function renderProducts(products) {
        gridView.innerHTML = '';
        printView.innerHTML = '';

        products.forEach((product) => {
            const indiceReal = allProducts.indexOf(product);
            const imagens = G.imagensDoProduto(product);
            const imageUrl = resolverSrc(imagens[0]);
            const nome = esc(product.Equipamento);
            const description = esc(product['Descrição/Observações'] || '');
            const brand = esc(product['Marca/Modelo'] || '');

            const card = document.createElement('div');
            card.className = 'product-card card-editable';
            card.dataset.index = String(indiceReal);

            const editIconHtml = editMode ? `
                    <button class="edit-badge" title="Editar" aria-label="Editar ${nome}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>` : '';

            card.innerHTML = `
                ${editIconHtml}
                <div class="product-card-image">
                    <img src="${esc(imageUrl)}" alt="${nome}" loading="lazy">
                    <span class="product-card-category">${esc(product.Categoria || 'Geral')}</span>
                    ${imagens.length > 1 ? `<span class="product-card-fotos" title="${imagens.length} fotos">&#128247; ${imagens.length}</span>` : ''}
                </div>
                <div class="product-card-content">
                    <h3 class="product-card-title">${nome}</h3>
                    <p class="product-card-brand">${brand}</p>
                    <p class="product-card-description">${description}</p>
                    <span class="product-card-cta">
                        Ver detalhes
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                    </span>
                </div>
            `;
            const cardImg = card.querySelector('.product-card-image img');
            cardImg.addEventListener('error', () => { cardImg.src = G.PLACEHOLDER; }, { once: true });

            if (!editMode) card.addEventListener('click', () => openModal(product));
            gridView.appendChild(card);

            const page = document.createElement('div');
            page.className = 'product-page';
            page.innerHTML = `
                <div class="print-header">
                    <h2 class="print-title">${nome}</h2>
                    <p class="print-brand">${brand}</p>
                </div>
                <div class="print-image">
                    <img src="${esc(imageUrl)}" alt="${nome}">
                </div>
                <div class="print-description">
                    <p>${description}</p>
                </div>
                <div class="print-meta">
                    <span><strong>Categoria:</strong> ${esc(product.Categoria || '---')}</span>
                    <span><strong>Unidade:</strong> ${esc(product.Unidade || 'UN')}</span>
                </div>
                <div class="print-footer">
                    LADE SOUND STAGE TECH | Catálogo Visual
                </div>
            `;
            printView.appendChild(page);
        });

        if (resultsCount) resultsCount.textContent = `${products.length} ${products.length === 1 ? 'item' : 'itens'}`;
        if (emptyState) emptyState.classList.toggle('hidden', products.length > 0);
    }

    function filterProducts() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedCategory = categoryFilter.value;
        const filtered = allProducts.filter(p => {
            const matchesSearch = String(p.Equipamento).toLowerCase().includes(searchTerm) ||
                (p['Marca/Modelo'] && String(p['Marca/Modelo']).toLowerCase().includes(searchTerm)) ||
                (p['Descrição/Observações'] && String(p['Descrição/Observações']).toLowerCase().includes(searchTerm));
            const matchesCategory = !selectedCategory || p.Categoria === selectedCategory;
            return matchesSearch && matchesCategory;
        });
        renderProducts(filtered);
    }

    // ============================================
    // EVENTOS
    // ============================================

    closeModalBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    galleryPrev.addEventListener('click', (e) => { e.stopPropagation(); mostrarFoto(fotoAtual - 1); });
    galleryNext.addEventListener('click', (e) => { e.stopPropagation(); mostrarFoto(fotoAtual + 1); });
    modalImg.addEventListener('click', abrirLightbox);
    $('lightbox-close').addEventListener('click', fecharLightbox);
    $('lightbox-prev').addEventListener('click', (e) => { e.stopPropagation(); mostrarFoto(fotoAtual - 1); });
    $('lightbox-next').addEventListener('click', (e) => { e.stopPropagation(); mostrarFoto(fotoAtual + 1); });
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) fecharLightbox(); });

    document.addEventListener('keydown', (e) => {
        const vendo = estaAberto(modal) || estaAberto(lightbox);
        if (vendo && e.key === 'ArrowLeft') { mostrarFoto(fotoAtual - 1); e.preventDefault(); return; }
        if (vendo && e.key === 'ArrowRight') { mostrarFoto(fotoAtual + 1); e.preventDefault(); return; }
        if (e.key === 'Escape') {
            if (estaAberto(lightbox)) { fecharLightbox(); return; }
            closeModal();
            if (editMode && editingIndex !== null) closeEditModal();
            fecharConfirmarApagar();
            fecharAddModal();
        }
    });

    editToggleBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleEditMode(); });
    $('close-edit-modal').addEventListener('click', closeEditModal);
    $('cancel-edit').addEventListener('click', closeEditModal);
    editBackdrop.addEventListener('click', closeEditModal);
    editForm.addEventListener('submit', saveEdit);
    editFotosInput.addEventListener('change', onFotosSelecionadas);
    $('edit-add-url').addEventListener('click', adicionarUrlExterna);
    editUrlImagem.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarUrlExterna(); } });

    $('apagar-item').addEventListener('click', (e) => {
        e.preventDefault();
        if (editingIndex !== null && editingIndex !== undefined) abrirConfirmarApagar(editingIndex);
    });

    $('add-produto').addEventListener('click', (e) => { e.stopPropagation(); abrirAddModal(); });
    $('close-add-modal').addEventListener('click', fecharAddModal);
    $('cancel-add').addEventListener('click', fecharAddModal);
    addForm.addEventListener('submit', adicionarProduto);
    addModal.addEventListener('click', (e) => { if (e.target === addModal) fecharAddModal(); });

    $('close-confirm-delete').addEventListener('click', fecharConfirmarApagar);
    $('cancel-delete').addEventListener('click', fecharConfirmarApagar);
    $('confirm-delete-btn').addEventListener('click', apagarItem);
    confirmDeleteModal.addEventListener('click', (e) => { if (e.target === confirmDeleteModal) fecharConfirmarApagar(); });

    downloadJsonBtn.addEventListener('click', (e) => { e.stopPropagation(); downloadJson(); });
    $('descartar-locais').addEventListener('click', async () => {
        if (!confirm('Descartar alterações e fotos pendentes deste navegador? Baixe o pacote antes, se precisar.')) return;
        for (const c of [...pendentes.keys()]) await apagarPendente(c);
        localStorage.removeItem(ALTERADO_KEY);
        localStorage.removeItem(REMOVIDAS_KEY);
        localStorage.removeItem(STORAGE_KEY);
        window.location.reload();
    });
    downloadPacoteBtn.addEventListener('click', (e) => { e.stopPropagation(); baixarPacote(); });

    const importJsonInput = $('import-json');
    $('import-json-btn').addEventListener('click', (e) => { e.stopPropagation(); importJsonInput.click(); });
    importJsonInput.addEventListener('change', importarJson);

    gridView.addEventListener('click', (e) => {
        if (e.target.closest('.edit-badge')) {
            e.stopPropagation();
            const card = e.target.closest('.product-card');
            openEditModal(parseInt(card.dataset.index, 10));
        }
    });

    searchInput.addEventListener('input', filterProducts);
    categoryFilter.addEventListener('change', filterProducts);

    carregarDados();
});
