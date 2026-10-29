document.addEventListener('DOMContentLoaded', () => {
    console.log('=== CATÁLOGO LADE ===');

    const SERVIDOR_LOCAL = 'http://localhost:8000';
    const SALVAR_PHP = 'salvar.php';
    const SENHA_KEY = 'lade_senha_edicao';

    const gridView = document.getElementById('grid-view');
    const printView = document.getElementById('print-view');
    const searchInput = document.getElementById('search');
    const categoryFilter = document.getElementById('category-filter');
    const loading = document.getElementById('loading');
    const resultsCount = document.getElementById('results-count');
    const emptyState = document.getElementById('empty-state');

    // Modal de visualização
    const modal = document.getElementById('product-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const modalImg = document.getElementById('modal-img');
    const modalCategory = document.getElementById('modal-category');
    const modalTitle = document.getElementById('modal-title');
    const modalBrand = document.getElementById('modal-brand');
    const modalDescription = document.getElementById('modal-description');
    const modalUnit = document.getElementById('modal-unit');

    // Elementos de edição
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
    const editDescricao = document.getElementById('edit-descricao');
    const editUnidade = document.getElementById('edit-unidade');
    const editUrlImagem = document.getElementById('edit-url-imagem');
    const toast = document.getElementById('toast');
    const downloadJsonBtn = document.getElementById('download-json');

    // Elementos adicionar produto
    const addProdutoBtn = document.getElementById('add-produto');
    const addModal = document.getElementById('add-modal');
    const closeAddModalBtn = document.getElementById('close-add-modal');
    const cancelAddBtn = document.getElementById('cancel-add');
    const addForm = document.getElementById('add-form');
    const addEquipamento = document.getElementById('add-equipamento');
    const addMarca = document.getElementById('add-marca');
    const addCategoria = document.getElementById('add-categoria');
    const addDescricao = document.getElementById('add-descricao');
    const addUnidade = document.getElementById('add-unidade');
    const addUrlImagem = document.getElementById('add-url-imagem');

    // Elementos confirmação exclusão
    const confirmDeleteModal = document.getElementById('confirm-delete-modal');
    const closeConfirmDeleteBtn = document.getElementById('close-confirm-delete');
    const cancelDeleteBtn = document.getElementById('cancel-delete');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const itemNomeDelete = document.getElementById('item-nome-delete');

    let allProducts = [];
    let editMode = false;
    let editingIndex = null;
    let itemParaApagarIndex = null;
    const STORAGE_KEY = 'lade_catalogo_v1';

    // ============================================
    // HELPERS DE MODAL (resolve problema hidden/visible)
    // ============================================

    function abrirModal(modalEl, backdropEl = null) {
        if (modalEl) {
            modalEl.classList.remove('hidden');
            modalEl.classList.add('visible');
        }
        if (backdropEl) {
            backdropEl.classList.remove('hidden');
            backdropEl.classList.add('visible');
        }
        document.body.style.overflow = 'hidden';
    }

    function fecharModal(modalEl, backdropEl = null) {
        if (modalEl) {
            modalEl.classList.add('hidden');
            modalEl.classList.remove('visible');
        }
        if (backdropEl) {
            backdropEl.classList.add('hidden');
            backdropEl.classList.remove('visible');
        }
        document.body.style.overflow = 'auto';
    }

    // ============================================
    // CARREGAR DADOS - JSON local como fonte principal
    // ============================================

    async function carregarDados() {
        console.log('Carregando dados...');
        let dadosCarregados = false;

        // 1. Tentar JSON local
        try {
            console.log('Tentando carregar do JSON local...');
            const resposta = await fetch('produtos/catalogo.json');
            const data = await resposta.json();
            allProducts = data.filter(p => p.Equipamento);
            salvarLocal();
            dadosCarregados = true;
            console.log('Carregados do JSON local:', allProducts.length, 'produtos');
        } catch (e) {
            console.error('Erro ao carregar JSON local:', e);
        }

        // 2. Tentar localStorage como fallback
        if (!dadosCarregados) {
            try {
                const salvo = localStorage.getItem(STORAGE_KEY);
                if (salvo) {
                    const dados = JSON.parse(salvo).filter(p => p.Equipamento);
                    if (dados.length > 0) {
                        allProducts = dados;
                        dadosCarregados = true;
                        console.log('Carregados do localStorage:', allProducts.length, 'produtos');
                    }
                }
            } catch (e) {
                console.error('Erro ao ler localStorage:', e);
            }
        }

        populateCategories(allProducts);
        renderProducts(allProducts);
        loading.classList.add('hidden');
        console.log('Total de produtos:', allProducts.length);
    }

    function salvarLocal() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(allProducts));
        } catch (e) {
            console.error('Erro ao salvar no localStorage:', e);
        }
    }

    // ============================================
    // SALVAR NO SERVIDOR (local: Python / produção: PHP)
    // ============================================

    function ehServidorLocal() {
        return ['localhost', '127.0.0.1'].includes(window.location.hostname);
    }

    function ehGitHubPages() {
        return /\.github\.io$/i.test(window.location.hostname);
    }

    function pedirSenhaEdicao() {
        let senha = sessionStorage.getItem(SENHA_KEY);
        if (!senha) {
            senha = window.prompt('Senha de edição do catálogo:');
            if (senha) sessionStorage.setItem(SENHA_KEY, senha);
        }
        return senha;
    }

    async function salvarNoServidor() {
        if (ehServidorLocal()) {
            try {
                const response = await fetch(`${SERVIDOR_LOCAL}/salvar-catalogo`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(allProducts)
                });
                const resultado = await response.json();
                if (resultado.status === 'sucesso') {
                    mostrarToast('Salvo no servidor local!');
                } else {
                    mostrarToast('Salvo localmente (erro no servidor)');
                }
            } catch (err) {
                console.error('Servidor local não disponível:', err);
                mostrarToast('Servidor local não rodando. Salvo apenas no navegador.');
            }
            return;
        }

        if (ehGitHubPages()) {
            mostrarToast('Demonstração no GitHub Pages: alteração salva só no navegador. Use "Baixar JSON".');
            return;
        }

        const senha = pedirSenhaEdicao();
        if (!senha) {
            mostrarToast('Salvamento no servidor cancelado.');
            return;
        }

        try {
            const response = await fetch(SALVAR_PHP, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Save-Token': senha
                },
                body: JSON.stringify(allProducts)
            });

            let resultado = {};
            try {
                resultado = await response.json();
            } catch (e) {
                resultado = {};
            }

            if (response.ok && resultado.status === 'sucesso') {
                mostrarToast('Catálogo salvo no servidor!');
            } else if (response.status === 401) {
                sessionStorage.removeItem(SENHA_KEY);
                mostrarToast(resultado.mensagem || 'Senha de edição incorreta.');
            } else {
                console.error('Erro ao salvar no servidor:', resultado);
                mostrarToast(resultado.mensagem || 'Não foi possível salvar no servidor.');
            }
        } catch (err) {
            console.error('Falha ao salvar no servidor:', err);
            mostrarToast('Sem conexão com o servidor. Salvo apenas no navegador.');
        }
    }

    // ============================================
    // CATEGORIAS
    // ============================================

    function populateCategories(products) {
        const categories = [...new Set(products.map(p => p.Categoria))].filter(Boolean);
        categories.sort().forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categoryFilter.appendChild(option);
        });
    }

    function atualizarCategorias() {
        const categories = [...new Set(allProducts.map(p => p.Categoria))].filter(Boolean).sort();
        categoryFilter.innerHTML = '<option value="">Todas Categorias</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categoryFilter.appendChild(option);
        });
    }

    // ============================================
    // IMAGEM
    // ============================================

    function extractImageUrl(str) {
        if (!str || typeof str !== 'string') return 'https://via.placeholder.com/400x300?text=Sem+Imagem';
        const match = str.match(/imagem: (https?:\/\/[^\s|]+)/);
        return match ? match[1] : 'https://via.placeholder.com/400x300?text=Imagem+N%C3%A3o+Encontrada';
    }

    // ============================================
    // MODAL DE VISUALIZAÇÃO
    // ============================================

    function openModal(product, imageUrl) {
        modalImg.src = imageUrl;
        modalCategory.textContent = product.Categoria || '';
        modalTitle.textContent = product.Equipamento;
        modalBrand.textContent = product['Marca/Modelo'] || '';
        modalDescription.textContent = product['Descrição/Observações'] || 'Sem descrição adicional.';
        modalUnit.textContent = product.Unidade || 'UN';
        abrirModal(modal);
    }

    function closeModal() {
        fecharModal(modal);
    }

    // ============================================
    // MODAL DE EDIÇÃO
    // ============================================

    function toggleEditMode() {
        editMode = !editMode;
        document.body.classList.toggle('edit-mode', editMode);
        const editLabel = editToggleBtn.querySelector('.btn-label');
        if (editLabel) editLabel.textContent = editMode ? 'Sair da Edição' : 'Modo Edição';
        editToggleBtn.classList.toggle('btn-active', editMode);
        renderProducts(allProducts);
    }

    function openEditModal(index) {
        const product = allProducts[index];
        editingIndex = index;
        editIndexInput.value = index;

        editEquipamento.value = product.Equipamento || '';
        editMarca.value = product['Marca/Modelo'] || '';
        editCategoria.value = product.Categoria || '';
        editDescricao.value = product['Descrição/Observações'] || '';
        editUnidade.value = product.Unidade || '';

        const url = product['URL da imagem / fonte'] || '';
        const match = url.match(/imagem: (https?:\/\/[^\s|]+)/);
        editUrlImagem.value = match ? match[1] : '';

        abrirModal(editModal, editBackdrop);
    }

    function closeEditModal() {
        fecharModal(editModal, editBackdrop);
        editingIndex = null;
    }

    function abrirConfirmarApagar(index) {
        itemParaApagarIndex = index;
        const product = allProducts[index];
        itemNomeDelete.textContent = product.Equipamento || 'Item sem nome';
        fecharModal(editModal, editBackdrop);
        abrirModal(confirmDeleteModal);
    }

    function fecharConfirmarApagar() {
        fecharModal(confirmDeleteModal);
        itemParaApagarIndex = null;
    }

    // ============================================
    // MODAL ADICIONAR
    // ============================================

    function abrirAddModal() {
        addForm.reset();
        addUnidade.value = 'UN';
        abrirModal(addModal);
    }

    function fecharAddModal() {
        fecharModal(addModal);
    }

    // ============================================
    // CRUD
    // ============================================

    async function adicionarProduto(e) {
        e.preventDefault();

        const novoProduto = {
            Equipamento: addEquipamento.value.trim(),
            'Marca/Modelo': addMarca.value.trim(),
            Categoria: addCategoria.value.trim(),
            'Descrição/Observações': addDescricao.value.trim(),
            Unidade: addUnidade.value.trim() || 'UN',
            'URL da imagem / fonte': '',
            Imagem: ''
        };

        const imagemUrl = addUrlImagem.value.trim();
        if (imagemUrl) {
            novoProduto['URL da imagem / fonte'] = `imagem: ${imagemUrl}`;
            novoProduto['Imagem'] = imagemUrl;
        }

        if (!novoProduto.id) {
            novoProduto.id = Date.now().toString();
        }

        allProducts.push(novoProduto);
        atualizarCategorias();
        renderProducts(allProducts);
        fecharAddModal();

        salvarLocal();
        await salvarNoServidor();
        mostrarToast('Produto adicionado!');
    }

    async function apagarItem() {
        if (itemParaApagarIndex === null || itemParaApagarIndex === undefined) return;

        const idParaApagar = allProducts[itemParaApagarIndex].id || itemParaApagarIndex;
        allProducts.splice(itemParaApagarIndex, 1);

        atualizarCategorias();
        renderProducts(allProducts);
        fecharConfirmarApagar();

        salvarLocal();
        await salvarNoServidor();
        mostrarToast('Item apagado!');
    }

    function saveEdit(e) {
        e.preventDefault();

        if (editingIndex === null || editingIndex === undefined) return;

        const product = allProducts[editingIndex];
        product.Equipamento = editEquipamento.value.trim();
        product['Marca/Modelo'] = editMarca.value.trim();
        product.Categoria = editCategoria.value.trim();
        product['Descrição/Observações'] = editDescricao.value.trim();
        product.Unidade = editUnidade.value.trim();

        const imagemUrl = editUrlImagem.value.trim();
        if (imagemUrl) {
            product['URL da imagem / fonte'] = `imagem: ${imagemUrl}`;
            product['Imagem'] = imagemUrl;
        }

        if (!product.id) {
            product.id = Date.now().toString();
        }

        atualizarCategorias();
        renderProducts(allProducts);
        closeEditModal();

        salvarLocal();
        salvarNoServidor();
        mostrarToast('Alterações salvas!');
    }

    // ============================================
    // UTILITÁRIOS
    // ============================================

    function mostrarToast(msg) {
        toast.textContent = msg;
        toast.classList.remove('hidden');
        downloadJsonBtn.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 4000);
    }

    function downloadJson() {
        const dataStr = JSON.stringify(allProducts, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'catalogo_editado.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
                    renderProducts(allProducts);
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

        products.forEach((product, idx) => {
            const imageUrl = extractImageUrl(product['URL da imagem / fonte']);
            const description = product['Descrição/Observações'] || '';
            const brand = product['Marca/Modelo'] || '';

            const card = document.createElement('div');
            card.className = 'product-card card-editable';

            let editIconHtml = '';
            if (editMode) {
                editIconHtml = `
                    <button class="edit-badge" title="Editar" aria-label="Editar ${product.Equipamento}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                `;
            }

            card.innerHTML = `
                ${editIconHtml}
                <div class="product-card-image">
                    <img src="${imageUrl}" alt="${product.Equipamento}" loading="lazy" onerror="this.style.opacity='0'">
                    <span class="product-card-category">${product.Categoria || 'Geral'}</span>
                </div>
                <div class="product-card-content">
                    <h3 class="product-card-title">${product.Equipamento}</h3>
                    <p class="product-card-brand">${brand}</p>
                    <p class="product-card-description">${description}</p>
                    <span class="product-card-cta">
                        Ver detalhes
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                    </span>
                </div>
            `;

            if (!editMode) {
                card.addEventListener('click', () => openModal(product, imageUrl));
            }

            gridView.appendChild(card);

            const page = document.createElement('div');
            page.className = 'product-page';
            page.innerHTML = `
                <div class="print-header">
                    <h2 class="print-title">${product.Equipamento}</h2>
                    <p class="print-brand">${brand}</p>
                </div>
                <div class="print-image">
                    <img src="${imageUrl}" alt="${product.Equipamento}">
                </div>
                <div class="print-description">
                    <p>${description}</p>
                </div>
                <div class="print-meta">
                    <span><strong>Categoria:</strong> ${product.Categoria || '---'}</span>
                    <span><strong>Unidade:</strong> ${product.Unidade || 'UN'}</span>
                </div>
                <div class="print-footer">
                    LADE SOUND STAGE TECH | Catálogo Visual
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

    function filterProducts() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedCategory = categoryFilter.value;

        const filtered = allProducts.filter(p => {
            const matchesSearch = p.Equipamento.toLowerCase().includes(searchTerm) ||
                (p['Marca/Modelo'] && p['Marca/Modelo'].toLowerCase().includes(searchTerm)) ||
                (p['Descrição/Observações'] && p['Descrição/Observações'].toLowerCase().includes(searchTerm));
            const matchesCategory = !selectedCategory || p.Categoria === selectedCategory;
            return matchesSearch && matchesCategory;
        });

        renderProducts(filtered);
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================

    closeModalBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            if (editMode) closeEditModal();
            fecharConfirmarApagar();
        }
    });

    editToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleEditMode();
    });

    closeEditModalBtn.addEventListener('click', closeEditModal);
    cancelEditBtn.addEventListener('click', closeEditModal);
    editBackdrop.addEventListener('click', closeEditModal);
    editForm.addEventListener('submit', saveEdit);

    const apagarItemBtn = document.getElementById('apagar-item');
    apagarItemBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (editingIndex !== null && editingIndex !== undefined) {
            abrirConfirmarApagar(editingIndex);
        }
    });

    addProdutoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        abrirAddModal();
    });

    closeAddModalBtn.addEventListener('click', fecharAddModal);
    cancelAddBtn.addEventListener('click', fecharAddModal);
    addForm.addEventListener('submit', adicionarProduto);
    addModal.addEventListener('click', (e) => {
        if (e.target === addModal) fecharAddModal();
    });

    closeConfirmDeleteBtn.addEventListener('click', fecharConfirmarApagar);
    cancelDeleteBtn.addEventListener('click', fecharConfirmarApagar);
    confirmDeleteBtn.addEventListener('click', apagarItem);
    confirmDeleteModal.addEventListener('click', (e) => {
        if (e.target === confirmDeleteModal) fecharConfirmarApagar();
    });

    downloadJsonBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadJson();
    });

    const importJsonBtn = document.getElementById('import-json-btn');
    const importJsonInput = document.getElementById('import-json');

    importJsonBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        importJsonInput.click();
    });

    importJsonInput.addEventListener('change', importarJson);

    gridView.addEventListener('click', (e) => {
        if (e.target.closest('.edit-badge')) {
            e.stopPropagation();
            const card = e.target.closest('.product-card');
            const index = Array.from(gridView.children).indexOf(card);
            openEditModal(index);
        }
    });

    searchInput.addEventListener('input', filterProducts);
    categoryFilter.addEventListener('change', filterProducts);

    // Iniciar
    carregarDados();
});
