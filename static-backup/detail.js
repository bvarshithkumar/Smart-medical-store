document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // 1. Load Medicine Details from URL Parameter
    const urlParams = new URLSearchParams(window.location.search);
    const medicineId = urlParams.get('id') || 'dolo-650'; // Default to dolo-650 if not specified
    const medicine = MEDICINE_DB[medicineId];

    if (!medicine) {
        // Redirect back to home page if medicine not found
        window.location.href = 'index.html';
        return;
    }

    // 2. Render Page Dynamic Details
    document.title = `${medicine.name} - Sri Venkateshwara Medical Store`;
    document.getElementById('detail-header-title').textContent = medicine.name;
    document.getElementById('medicine-name').textContent = medicine.name;
    document.getElementById('medicine-meta-brand').textContent = medicine.brand;
    document.getElementById('medicine-pack-info').textContent = medicine.packInfo;

    // Pricing
    document.getElementById('med-price-original').textContent = `MRP ₹${medicine.priceOriginal.toFixed(2)}`;
    document.getElementById('med-price-discounted').textContent = `₹${medicine.priceDiscounted.toFixed(2)}`;
    document.getElementById('med-discount-pill').textContent = medicine.discountPercent;

    // Badges (Rx vs OTC)
    const badgesContainer = document.getElementById('medicine-badges');
    badgesContainer.innerHTML = '';
    if (medicine.requiresPrescription) {
        badgesContainer.innerHTML += `<span class="badge badge-rx"><i data-lucide="file-text" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:3px;"></i> Rx Required</span>`;
    } else {
        badgesContainer.innerHTML += `<span class="badge badge-otc">OTC</span>`;
    }
    if (medicine.isOTC) {
        badgesContainer.innerHTML += `<span class="badge badge-otc-label">General Health</span>`;
    }

    // Stock status
    const stockContainer = document.getElementById('medicine-stock-row');
    stockContainer.innerHTML = '';
    if (medicine.stockStatus === 'instock') {
        stockContainer.innerHTML = `<div class="med-stock status-instock"><span class="status-dot"></span> In Stock</div>`;
    } else if (medicine.stockStatus === 'low') {
        stockContainer.innerHTML = `<div class="med-stock status-low"><span class="status-dot"></span> ${medicine.stockLabel}</div>`;
    } else {
        stockContainer.innerHTML = `<div class="med-stock status-outofstock"><span class="status-dot"></span> Out of Stock</div>`;
    }

    // Gallery images (SVGs)
    const primaryImgWrap = document.getElementById('gallery-img-primary');
    primaryImgWrap.innerHTML = medicine.svg;

    // Alt gallery views (simulate different angles by applying scale/rotation to SVG)
    const alt1Wrap = document.querySelector('.gallery-img-alt1');
    const alt2Wrap = document.querySelector('.gallery-img-alt2');
    
    // Alt 1: Rotated view
    alt1Wrap.innerHTML = medicine.svg.replace('<svg ', '<svg style="transform: rotate(5deg) scale(0.95); transition: transform 0.3s;" ');
    // Alt 2: Perspective view
    alt2Wrap.innerHTML = medicine.svg.replace('<svg ', '<svg style="transform: skewY(-2deg) scale(0.9); transition: transform 0.3s;" ');

    // Populate thumbnails content
    const thumbs = document.querySelectorAll('.gallery-thumb');
    thumbs[0].innerHTML = medicine.svg;
    thumbs[1].innerHTML = medicine.svg.replace('<svg ', '<svg style="transform: rotate(5deg) scale(0.9);" ');
    thumbs[2].innerHTML = medicine.svg.replace('<svg ', '<svg style="transform: skewY(-2deg) scale(0.95);" ');

    // 3. Info Tabs Contents
    document.getElementById('tab-desc-text').textContent = medicine.description;
    
    const populateList = (listId, arrayData) => {
        const listEl = document.getElementById(listId);
        listEl.innerHTML = '';
        arrayData.forEach(text => {
            const li = document.createElement('li');
            li.textContent = text;
            listEl.appendChild(li);
        });
    };

    populateList('tab-dosage-list', medicine.dosage);
    populateList('tab-side-effects-list', medicine.sideEffects);
    populateList('tab-storage-list', medicine.storage);

    // Dynamic Lucide rendering for dynamic contents
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // 4. Render Similar Medicines
    const similarContainer = document.getElementById('similar-scroll');
    similarContainer.innerHTML = '';
    medicine.similar.forEach(simId => {
        const simMed = MEDICINE_DB[simId];
        if (simMed) {
            const card = document.createElement('div');
            card.className = 'sim-card';
            card.innerHTML = `
                <div class="sim-img-wrap">
                    ${simMed.svg}
                </div>
                <div class="sim-details">
                    <h5 class="sim-name">${simMed.name}</h5>
                    <p class="sim-brand">${simMed.brand}</p>
                    <div class="sim-footer">
                        <span class="sim-price">₹${simMed.priceDiscounted.toFixed(2)}</span>
                        <button class="sim-add-btn" data-id="${simMed.id}">Add</button>
                    </div>
                </div>
            `;
            // Add click to navigate to this medicine
            card.addEventListener('click', (e) => {
                if (e.target.classList.contains('sim-add-btn')) {
                    return;
                }
                window.location.href = `medicine-detail.html?id=${simMed.id}`;
            });
            similarContainer.appendChild(card);
        }
    });

    // Add click listeners to SIM add buttons
    document.querySelectorAll('.sim-add-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            const med = MEDICINE_DB[id];
            if (med) {
                ReservationCart.addItem(id, 1);
                showToast(`Added ${med.name} to reservation!`, 'View Cart', () => {
                    window.location.href = 'reservation-cart.html';
                });
            }
        });
    });

    // 5. Render Frequently Bought Together (FBT)
    const fbtContainer = document.getElementById('fbt-list');
    fbtContainer.innerHTML = '';
    
    // Add current medicine to FBT row visual first
    const primaryFbtRow = document.createElement('div');
    primaryFbtRow.className = 'fbt-row-item';
    primaryFbtRow.innerHTML = `
        <div class="fbt-check-box checked disabled">
            <i data-lucide="check"></i>
        </div>
        <div class="fbt-item-image">
            ${medicine.svg}
        </div>
        <div class="fbt-item-info">
            <h6>${medicine.name}</h6>
            <p>₹${medicine.priceDiscounted.toFixed(2)}</p>
        </div>
    `;
    fbtContainer.appendChild(primaryFbtRow);

    // Track selected items to purchase in FBT
    const selectedFbtIds = new Set([medicine.id]);

    medicine.boughtTogether.forEach(fbtId => {
        const fbtMed = MEDICINE_DB[fbtId];
        if (fbtMed) {
            selectedFbtIds.add(fbtId); // Default to checked
            
            const fbtRow = document.createElement('div');
            fbtRow.className = 'fbt-row-item';
            fbtRow.setAttribute('data-id', fbtId);
            fbtRow.innerHTML = `
                <div class="fbt-check-box checked" data-action="toggle">
                    <i data-lucide="check"></i>
                </div>
                <div class="fbt-item-image">
                    ${fbtMed.svg}
                </div>
                <div class="fbt-item-info">
                    <h6>${fbtMed.name}</h6>
                    <p>₹${fbtMed.priceDiscounted.toFixed(2)}</p>
                </div>
            `;
            
            // Checkbox toggle functionality
            const checkbox = fbtRow.querySelector('[data-action="toggle"]');
            checkbox.addEventListener('click', () => {
                if (checkbox.classList.contains('checked')) {
                    checkbox.classList.remove('checked');
                    selectedFbtIds.delete(fbtId);
                } else {
                    checkbox.classList.add('checked');
                    selectedFbtIds.add(fbtId);
                }
                updateFbtTotalBtn();
            });

            fbtContainer.appendChild(fbtRow);
        }
    });

    const fbtAddAllBtn = document.getElementById('fbt-add-all-btn');
    
    function updateFbtTotalBtn() {
        let total = 0;
        selectedFbtIds.forEach(id => {
            const m = MEDICINE_DB[id];
            if (m) total += m.priceDiscounted;
        });
        fbtAddAllBtn.innerHTML = `<i data-lucide="shopping-cart"></i> Add Selected to Cart &nbsp;·&nbsp; ₹${total.toFixed(2)}`;
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    updateFbtTotalBtn();

    fbtAddAllBtn.addEventListener('click', () => {
        selectedFbtIds.forEach(id => {
            ReservationCart.addItem(id, 1);
        });
        showToast(`Added ${selectedFbtIds.size} items to reservation!`, 'View Cart', () => {
            window.location.href = 'reservation-cart.html';
        });
    });

    // 6. Gallery Slider Navigation Logic
    const track = document.getElementById('gallery-track');
    const thumbnails = document.querySelectorAll('.gallery-thumb');
    const dots = document.querySelectorAll('.gdot');
    let currentSlide = 0;

    function setSlide(index) {
        currentSlide = index;
        track.style.transform = `translateX(-${currentSlide * 33.333}%)`;
        thumbnails.forEach((t, idx) => t.classList.toggle('active', idx === currentSlide));
        dots.forEach((d, idx) => d.classList.toggle('active', idx === currentSlide));
    }

    thumbnails.forEach((t) => {
        t.addEventListener('click', () => {
            setSlide(parseInt(t.getAttribute('data-index')));
        });
    });

    dots.forEach((d) => {
        d.addEventListener('click', () => {
            setSlide(parseInt(d.getAttribute('data-index')));
        });
    });

    // Swipe triggers for mobile
    let touchStartX = 0;
    let touchEndX = 0;
    track.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    track.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                // Swipe left, go next
                setSlide(Math.min(2, currentSlide + 1));
            } else {
                // Swipe right, go prev
                setSlide(Math.max(0, currentSlide - 1));
            }
        }
    }, { passive: true });

    // 7. Info Tabs Toggle Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(`tab-${targetTab}`).classList.add('active');
        });
    });

    // 8. Dynamic Quantity & Sticky Bottom Bar
    let quantity = 1;
    const qtyDisplay = document.getElementById('qty-display');
    const qtyMinus = document.getElementById('qty-minus');
    const qtyPlus = document.getElementById('qty-plus');

    qtyMinus.addEventListener('click', () => {
        if (quantity > 1) {
            quantity--;
            qtyDisplay.textContent = quantity;
        }
    });

    qtyPlus.addEventListener('click', () => {
        if (quantity < 10) {
            quantity++;
            qtyDisplay.textContent = quantity;
        } else {
            showToast('Maximum reservation limit is 10 units per medicine.', 'OK');
        }
    });

    // Header Back navigation
    document.getElementById('back-btn').addEventListener('click', () => {
        window.history.back();
    });

    // Toast logic
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');
    const toastAction = document.getElementById('toast-action');

    function showToast(message, actionText = 'View Cart', callback = null) {
        toastMsg.textContent = message;
        toastAction.textContent = actionText;
        
        // Remove previous listener to avoid stack
        const newAction = toastAction.cloneNode(true);
        toastAction.parentNode.replaceChild(newAction, toastAction);
        
        if (callback) {
            newAction.addEventListener('click', callback);
        } else {
            newAction.addEventListener('click', () => {
                hideToast();
                window.location.href = 'reservation-cart.html';
            });
        }

        toast.classList.add('show');

        // Auto hide after 3.5s
        clearTimeout(toast.timeoutId);
        toast.timeoutId = setTimeout(hideToast, 3500);
    }

    function hideToast() {
        toast.classList.remove('show');
    }

    // Reservation Cart Actions (Sticky bottom bar)
    const addReservationBtn = document.getElementById('detail-add-reservation-btn');
    const reserveNowBtn = document.getElementById('detail-reserve-now-btn');

    // Update buttons visual state based on whether item is in reservation cart
    function updateDetailCartState() {
        const cart = ReservationCart.getCart();
        const isInCart = cart.some(item => item.id === medicine.id);
        const headerBadge = document.getElementById('cart-badge');
        
        if (headerBadge) {
            headerBadge.textContent = ReservationCart.getCartCount();
        }

        if (isInCart) {
            addReservationBtn.classList.add('added');
            addReservationBtn.innerHTML = `<i data-lucide="check"></i> Added to Reservation`;
        } else {
            addReservationBtn.classList.remove('added');
            addReservationBtn.innerHTML = `<i data-lucide="bookmark"></i> Add to Reservation`;
        }

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // Initial run
    updateDetailCartState();
    window.addEventListener('cart-updated', updateDetailCartState);

    // Click: Add to Reservation
    addReservationBtn.addEventListener('click', () => {
        const cart = ReservationCart.getCart();
        const isInCart = cart.some(item => item.id === medicine.id);
        
        if (isInCart) {
            ReservationCart.removeItem(medicine.id);
            showToast(`Removed ${medicine.name} from reservation`, 'Undo', () => {
                ReservationCart.addItem(medicine.id, quantity);
            });
        } else {
            ReservationCart.addItem(medicine.id, quantity);
            showToast(`Added ${medicine.name} (Qty: ${quantity}) to reservation!`, 'View Cart', () => {
                window.location.href = 'reservation-cart.html';
            });
        }
    });

    // Click: Reserve Medicine (Primary CTA) -> Add to reservation and go immediately to checkout
    reserveNowBtn.addEventListener('click', () => {
        ReservationCart.addItem(medicine.id, quantity);
        window.location.href = 'reservation-cart.html';
    });

    // Navigation Cart button
    document.getElementById('cart-btn').addEventListener('click', () => {
        const count = ReservationCart.getCartCount();
        if (count === 0) {
            showToast('Your reservation cart is empty. Add medicines first!', 'OK');
        } else {
            window.location.href = 'reservation-cart.html';
        }
    });
});
