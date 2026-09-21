/**
 * National Hardware — "House of Hardwares"
 * Product Catalogue & Quote Cart Logic
 * Proprietor: Sunil Ji Seth | Ashwini Bazaar, Hathipole, Udaipur
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ── STATE ────────────────────────────────────────────── */
  const state = {
    products: [],
    business: {},
    finishTiers: {},
    activeFinishTier: 'standard', // 'standard' | 'premium'
    searchQuery: '',
    selectedSizes: {},  // { productId: '128mm' }
    cart: []            // [{ id, code, name, size, tier, price, qty, image }]
  };

  /* ── DOM REFS ─────────────────────────────────────────── */
  const productsGrid      = document.getElementById('productsGrid');
  const searchInput       = document.getElementById('catalogSearch');
  const btnTierStd        = document.getElementById('tierStandardBtn');
  const btnTierPvd        = document.getElementById('tierPremiumBtn');
  const productCountEl    = document.getElementById('activeProductsCount');

  // Cart / Drawer
  const quoteDrawer       = document.getElementById('quoteDrawer');
  const drawerOverlay     = document.getElementById('drawerOverlay');
  const openCartBtn       = document.getElementById('openCartBtn');
  const closeCartBtn      = document.getElementById('closeCartBtn');
  const cartBadgeCount    = document.getElementById('cartBadgeCount');
  const drawerItemsList   = document.getElementById('drawerItemsList');
  const drawerSubtotal    = document.getElementById('drawerSubtotal');
  const btnSendWhatsApp   = document.getElementById('btnSendWhatsApp');
  const custNameInput     = document.getElementById('custName');
  const custAddressInput  = document.getElementById('custAddress');
  const deliveryTypeRadios = document.getElementsByName('deliveryType');

  // Modal
  const productModal      = document.getElementById('productModal');
  const modalCloseBtn     = document.getElementById('modalCloseBtn');
  const modalImage        = document.getElementById('modalImage');
  const modalCode         = document.getElementById('modalCode');
  const modalName         = document.getElementById('modalName');
  const modalDesc         = document.getElementById('modalDesc');
  const modalMaterial     = document.getElementById('modalMaterial');
  const modalPriceBody    = document.getElementById('modalPriceTableBody');
  const modalAddQuoteBtn  = document.getElementById('modalAddQuoteBtn');

  let activeModalProduct = null;

  /* ── LOAD SAVED CART ──────────────────────────────────── */
  try {
    const saved = localStorage.getItem('nh_cart_v2');
    if (saved) {
      state.cart = JSON.parse(saved);
      renderCartUI();
    }
  } catch (e) { /* ignore */ }

  /* ── FETCH DATA ───────────────────────────────────────── */
  fetch('data/products.json')
    .then(r => r.json())
    .then(data => {
      state.products    = data.products || [];
      state.business    = data.business || {};
      state.finishTiers = data.finishTiers || {};

      // Set default size per product
      state.products.forEach(p => {
        state.selectedSizes[p.id] = p.defaultSize || p.sizes[0];
      });

      renderProducts();
    })
    .catch(() => {
      if (productsGrid) {
        productsGrid.innerHTML = `
          <div class="empty-state">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 1rem;color:#4a5568"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p>Couldn't load catalogue. Please refresh or call +91 9414058177.</p>
          </div>`;
      }
    });

  /* ── FINISH TIER TOGGLE ───────────────────────────────── */
  if (btnTierStd && btnTierPvd) {
    btnTierStd.addEventListener('click', () => {
      state.activeFinishTier = 'standard';
      btnTierStd.classList.add('active');
      btnTierPvd.classList.remove('active');
      renderProducts();
    });
    btnTierPvd.addEventListener('click', () => {
      state.activeFinishTier = 'premium';
      btnTierPvd.classList.add('active');
      btnTierStd.classList.remove('active');
      renderProducts();
    });
  }

  /* ── SEARCH ───────────────────────────────────────────── */
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      state.searchQuery = searchInput.value.trim().toLowerCase();
      renderProducts();
    });
  }

  /* ── RENDER PRODUCTS ──────────────────────────────────── */
  function renderProducts() {
    if (!productsGrid) return;

    const q = state.searchQuery;
    const filtered = state.products.filter(p => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.categoryName || '').toLowerCase().includes(q)
      );
    });

    if (productCountEl) {
      productCountEl.textContent = `${filtered.length} Model${filtered.length !== 1 ? 's' : ''}`;
    }

    if (!filtered.length) {
      productsGrid.innerHTML = `
        <div class="empty-state">
          <p>No models match "<strong>${q}</strong>".<br>Try searching by code like AH-SS-031 or by name like Rado, Diamond.</p>
        </div>`;
      return;
    }

    productsGrid.innerHTML = filtered.map(p => buildCard(p)).join('');
    attachCardEvents();
  }

  /* ── BUILD PRODUCT CARD ───────────────────────────────── */
  function buildCard(p) {
    const selSize = state.selectedSizes[p.id] || p.sizes[0];
    const priceData = p.prices[selSize];
    const price = priceData ? (state.activeFinishTier === 'premium' ? priceData.premium : priceData.standard) : null;
    const tierLabel = state.activeFinishTier === 'premium' ? 'Royal PVD/pc' : 'Standard/pc';

    const sizePills = p.sizes.map(s => `
      <button type="button"
        class="size-chip ${s === selSize ? 'active' : ''}"
        data-product-id="${p.id}"
        data-size="${s}"
        aria-label="Select size ${s}"
      >${s}</button>
    `).join('');

    return `
      <article class="product-card" data-id="${p.id}">
        <div class="card-img-wrap" data-open-modal="${p.id}">
          <img src="${p.image}" alt="${p.name} — ${p.code}" loading="lazy" />
        </div>
        <div class="card-body">
          <div class="card-top">
            <h3 class="card-name">${p.name}</h3>
            ${p.badge ? `<span class="card-badge">${p.badge}</span>` : ''}
          </div>
          <span class="card-code">${p.code}</span>

          <div class="card-size-row">${sizePills}</div>

          <div class="card-price-row">
            <div class="card-price">
              <span class="price-amt">₹${price !== null ? price : '—'}</span>
              <span class="price-label">${tierLabel}</span>
            </div>
            <div class="card-actions">
              <button type="button" class="card-view-btn" data-open-modal="${p.id}" title="View details & full price table">Details</button>
              <button type="button" class="card-add-btn" data-add-to-cart="${p.id}" title="Add to quote cart">+ Cart</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  /* ── CARD EVENT DELEGATION ────────────────────────────── */
  function attachCardEvents() {
    if (!productsGrid) return;

    productsGrid.addEventListener('click', e => {
      // Size chip
      const chip = e.target.closest('.size-chip');
      if (chip) {
        const pid  = chip.dataset.productId;
        const size = chip.dataset.size;
        state.selectedSizes[pid] = size;
        // Update chips & price in this card only
        const card = productsGrid.querySelector(`.product-card[data-id="${pid}"]`);
        if (card) {
          card.querySelectorAll('.size-chip').forEach(c => {
            c.classList.toggle('active', c.dataset.size === size);
          });
          const p = state.products.find(x => x.id === pid);
          if (p) {
            const pd = p.prices[size];
            const price = pd ? (state.activeFinishTier === 'premium' ? pd.premium : pd.standard) : null;
            const amtEl = card.querySelector('.price-amt');
            if (amtEl) amtEl.textContent = price !== null ? `₹${price}` : '—';
          }
        }
        return;
      }

      // Open modal
      const opener = e.target.closest('[data-open-modal]');
      if (opener) {
        const pid = opener.dataset.openModal;
        const product = state.products.find(x => x.id === pid);
        if (product) openModal(product);
        return;
      }

      // Add to cart
      const addBtn = e.target.closest('[data-add-to-cart]');
      if (addBtn) {
        const pid = addBtn.dataset.addToCart;
        const product = state.products.find(x => x.id === pid);
        if (product) addToCart(product);
        return;
      }
    }, { capture: false });
  }

  /* ── MODAL ────────────────────────────────────────────── */
  function openModal(product) {
    activeModalProduct = product;
    const selSize = state.selectedSizes[product.id] || product.sizes[0];

    modalImage.src       = product.image;
    modalImage.alt       = product.name;
    modalCode.textContent = product.code;
    modalName.textContent = product.name;
    modalDesc.textContent = product.description || '';
    modalMaterial.textContent = product.material || 'SS-304 Stainless Steel';

    // Price table
    modalPriceBody.innerHTML = product.sizes.map(size => {
      const pd = product.prices[size];
      if (!pd) return '';
      return `
        <tr>
          <td>${size}</td>
          <td class="price-highlight">₹${pd.standard}</td>
          <td class="price-highlight">₹${pd.premium}</td>
          <td>${pd.box} pcs</td>
        </tr>`;
    }).join('');

    productModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    productModal.classList.remove('open');
    document.body.style.overflow = '';
    activeModalProduct = null;
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (productModal)  productModal.addEventListener('click', e => { if (e.target === productModal) closeModal(); });

  if (modalAddQuoteBtn) {
    modalAddQuoteBtn.addEventListener('click', () => {
      if (activeModalProduct) {
        addToCart(activeModalProduct);
        closeModal();
        openDrawer();
      }
    });
  }

  /* ── CART ─────────────────────────────────────────────── */
  function addToCart(product) {
    const size     = state.selectedSizes[product.id] || product.sizes[0];
    const tier     = state.activeFinishTier;
    const pd       = product.prices[size];
    const price    = pd ? (tier === 'premium' ? pd.premium : pd.standard) : 0;
    const tierName = tier === 'premium' ? 'Royal PVD' : 'Standard';

    const existing = state.cart.find(
      i => i.id === product.id && i.size === size && i.tier === tier
    );

    if (existing) {
      existing.qty += 1;
    } else {
      state.cart.push({
        id:        product.id,
        code:      product.code,
        name:      product.name,
        size,
        tier,
        tierName,
        price,
        qty:       1,
        image:     product.image
      });
    }

    saveCart();
    renderCartUI();
    openDrawer();

    // Quick feedback on button
    const addBtns = document.querySelectorAll(`[data-add-to-cart="${product.id}"]`);
    addBtns.forEach(btn => {
      btn.textContent = '✓ Added';
      btn.style.background = '#25d366';
      btn.style.color = '#fff';
      setTimeout(() => {
        btn.textContent = '+ Cart';
        btn.style.background = '';
        btn.style.color = '';
      }, 1400);
    });
  }

  function removeFromCart(index) {
    state.cart.splice(index, 1);
    saveCart();
    renderCartUI();
  }

  function updateCartQty(index, delta) {
    if (state.cart[index]) {
      state.cart[index].qty += delta;
      if (state.cart[index].qty <= 0) {
        state.cart.splice(index, 1);
      }
      saveCart();
      renderCartUI();
    }
  }

  function saveCart() {
    try { localStorage.setItem('nh_cart_v2', JSON.stringify(state.cart)); } catch (e) {}
  }

  /* ── RENDER CART ──────────────────────────────────────── */
  function renderCartUI() {
    const total = state.cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const count = state.cart.reduce((sum, i) => sum + i.qty, 0);

    // Badge
    if (cartBadgeCount) {
      if (count > 0) {
        cartBadgeCount.style.display = 'flex';
        cartBadgeCount.textContent   = count;
      } else {
        cartBadgeCount.style.display = 'none';
      }
    }

    // Subtotal
    if (drawerSubtotal) drawerSubtotal.textContent = `₹${total.toLocaleString('en-IN')}`;

    // Items
    if (!drawerItemsList) return;
    if (!state.cart.length) {
      drawerItemsList.innerHTML = `<div class="drawer-empty">Your cart is empty.<br>Browse the catalogue and add items.</div>`;
      return;
    }

    drawerItemsList.innerHTML = state.cart.map((item, idx) => `
      <div class="drawer-item">
        <img class="drawer-item-img" src="${item.image}" alt="${item.name}" />
        <div class="drawer-item-info">
          <div class="drawer-item-name">${item.name}</div>
          <div class="drawer-item-meta">${item.code} · ${item.size} · ${item.tierName}</div>
          <div class="drawer-qty-row">
            <button type="button" class="qty-btn" data-qty-index="${idx}" data-delta="-1" title="Decrease quantity">−</button>
            <span class="qty-val">${item.qty}</span>
            <button type="button" class="qty-btn" data-qty-index="${idx}" data-delta="1" title="Increase quantity">+</button>
          </div>
        </div>
        <div class="drawer-item-right">
          <span class="drawer-item-price">₹${(item.price * item.qty).toLocaleString('en-IN')}</span>
          <button type="button" class="drawer-item-remove" data-remove-index="${idx}" title="Remove item">Remove</button>
        </div>
      </div>
    `).join('');

    // Quantity listeners
    drawerItemsList.querySelectorAll('[data-qty-index]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.qtyIndex);
        const delta = Number(btn.dataset.delta);
        updateCartQty(idx, delta);
      });
    });

    // Remove listeners
    drawerItemsList.querySelectorAll('[data-remove-index]').forEach(btn => {
      btn.addEventListener('click', () => removeFromCart(Number(btn.dataset.removeIndex)));
    });
  }

  /* ── DRAWER OPEN/CLOSE ────────────────────────────────── */
  function openDrawer() {
    quoteDrawer.classList.add('open');
    drawerOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    quoteDrawer.classList.remove('open');
    drawerOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (openCartBtn)   openCartBtn.addEventListener('click', openDrawer);
  if (closeCartBtn)  closeCartBtn.addEventListener('click', closeDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

  /* ── WHATSAPP ORDER ───────────────────────────────────── */
  if (btnSendWhatsApp) {
    btnSendWhatsApp.addEventListener('click', () => {
      if (!state.cart.length) {
        alert('Your cart is empty. Add some products first!');
        return;
      }

      const name    = custNameInput?.value.trim() || 'Customer';
      const address = custAddressInput?.value.trim() || '';
      const delivery = [...deliveryTypeRadios].find(r => r.checked)?.value || 'Showroom Pickup';

      const items = state.cart.map(i =>
        `• ${i.name} (${i.code}) — ${i.size} — ${i.tierName} — Qty: ${i.qty} — ₹${(i.price * i.qty).toLocaleString('en-IN')}`
      ).join('\n');

      const total = state.cart.reduce((s, i) => s + i.price * i.qty, 0);

      const msg = [
        `🛒 *New Order — National Hardware*`,
        ``,
        `*Customer:* ${name}`,
        address ? `*Location:* ${address}` : '',
        `*Fulfilment:* ${delivery}`,
        ``,
        `*Items:*`,
        items,
        ``,
        `*Estimated Total: ₹${total.toLocaleString('en-IN')}*`,
        ``,
        `_(Prices are from the website catalogue. Final invoice subject to stock confirmation.)_`
      ].filter(Boolean).join('\n');

      const url = `https://wa.me/919414058177?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  }

  /* ── MOBILE MENU ──────────────────────────────────────── */
  const mobileMenuBtn = document.getElementById('mobileMenuToggle');
  const navLinks      = document.getElementById('navLinks');
  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
    // Close on nav link click
    navLinks.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => navLinks.classList.remove('open'));
    });
  }

  /* ── NAVBAR SCROLL SHADOW ─────────────────────────────── */
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.style.boxShadow = window.scrollY > 10
        ? '0 4px 24px -4px rgba(0,0,0,0.5)'
        : 'none';
    }, { passive: true });
  }

});
