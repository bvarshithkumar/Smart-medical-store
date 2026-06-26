document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // 1. Carousel Slider Logic
    const track = document.getElementById('carousel-track');
    const indicators = document.querySelectorAll('#carousel-indicators .indicator');
    let currentSlide = 0;
    const totalSlides = 3;
    let carouselInterval;

    function updateCarousel() {
        track.style.transform = `translateX(-${currentSlide * 33.333}%)`;
        indicators.forEach((indicator, index) => {
            if (index === currentSlide) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        });
    }

    function startCarousel() {
        carouselInterval = setInterval(() => {
            currentSlide = (currentSlide + 1) % totalSlides;
            updateCarousel();
        }, 4000);
    }

    function resetCarouselTimer() {
        clearInterval(carouselInterval);
        startCarousel();
    }

    // Indicator clicks
    indicators.forEach((indicator) => {
        indicator.addEventListener('click', (e) => {
            currentSlide = parseInt(e.target.getAttribute('data-index'));
            updateCarousel();
            resetCarouselTimer();
        });
    });

    // Simple touch support for sliding
    let touchStartX = 0;
    let touchEndX = 0;

    track.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    track.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const threshold = 50;
        if (touchStartX - touchEndX > threshold) {
            // Swipe Left -> next
            currentSlide = (currentSlide + 1) % totalSlides;
            updateCarousel();
            resetCarouselTimer();
        } else if (touchEndX - touchStartX > threshold) {
            // Swipe Right -> prev
            currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
            updateCarousel();
            resetCarouselTimer();
        }
    }

    startCarousel();

    // 2. Sticky Navbar Actions & Shared Reservation Cart System
    const cartBadge = document.getElementById('cart-badge');
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');
    const addButtons = document.querySelectorAll('.add-btn');

    function showToast(message, actionText = 'View Cart', callback = null) {
        toastMsg.textContent = message;
        const toastAction = document.getElementById('toast-action');
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

    function updateUIFromCart() {
        const cart = ReservationCart.getCart();
        const count = ReservationCart.getCartCount();
        if (cartBadge) {
            cartBadge.textContent = count;
        }
        
        addButtons.forEach(button => {
            const itemId = button.getAttribute('data-id');
            const isAdded = cart.some(item => item.id === itemId);
            if (isAdded) {
                button.classList.add('added');
                button.innerHTML = '<i class="lucide-check" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:2px;"></i> ✓';
            } else {
                button.classList.remove('added');
                button.textContent = 'ADD';
            }
        });
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    addButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const itemId = button.getAttribute('data-id');
            const itemName = button.getAttribute('data-name');
            
            const cart = ReservationCart.getCart();
            const isAdded = cart.some(item => item.id === itemId);
            
            if (isAdded) {
                ReservationCart.removeItem(itemId);
                showToast(`Removed ${itemName} from reservation`, 'Undo', () => {
                    ReservationCart.addItem(itemId, 1);
                });
            } else {
                ReservationCart.addItem(itemId, 1);
                showToast(`Added ${itemName} to reservation!`, 'View Cart', () => {
                    window.location.href = 'reservation-cart.html';
                });
            }
        });
    });

    // Product Card Clicks navigation to details
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.add-btn')) {
                return;
            }
            const id = card.getAttribute('data-id');
            if (id) {
                window.location.href = `medicine-detail.html?id=${id}`;
            }
        });
    });

    // Navbar icon actions
    document.getElementById('profile-btn').addEventListener('click', () => {
        showToast('Profile management is loading...', 'Login', () => {
            hideToast();
            showToast('Simulating secure OTP verification...', 'Close');
        });
    });

    document.getElementById('cart-btn').addEventListener('click', () => {
        const count = ReservationCart.getCartCount();
        if (count === 0) {
            showToast('Your reservation cart is empty. Add medicines below!', 'OK');
        } else {
            window.location.href = 'reservation-cart.html';
        }
    });

    // Listen for custom event updates
    window.addEventListener('cart-updated', updateUIFromCart);
    updateUIFromCart();

    // 3. Search Suggestions overlay
    const searchBar = document.getElementById('search-bar');
    const modalOverlay = document.getElementById('modal-overlay');
    const searchModal = document.getElementById('search-modal');
    const suggestionItems = document.querySelectorAll('.suggestion-item');

    searchBar.addEventListener('focus', () => {
        modalOverlay.classList.add('show');
        searchModal.classList.add('show');
    });

    modalOverlay.addEventListener('click', () => {
        modalOverlay.classList.remove('show');
        searchModal.classList.remove('show');
    });

    suggestionItems.forEach(item => {
        item.addEventListener('click', () => {
            const query = item.getAttribute('data-search');
            searchBar.value = query;
            modalOverlay.classList.remove('show');
            searchModal.classList.remove('show');
            showToast(`Showing results for "${query}"`, 'Clear', () => {
                searchBar.value = '';
                hideToast();
            });
        });
    });

    searchBar.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        let matchCount = 0;
        suggestionItems.forEach(item => {
            const text = item.querySelector('.suggestion-text').textContent.toLowerCase();
            if (text.includes(val)) {
                item.style.display = 'flex';
                matchCount++;
            } else {
                item.style.display = 'none';
            }
        });
        if (matchCount === 0) {
            searchModal.classList.remove('show');
        } else {
            searchModal.classList.add('show');
        }
    });

    // 4. Quick Actions Grid Click Listeners
    document.getElementById('action-pickup').addEventListener('click', () => {
        showToast('Select pickup slot: Today 6:00 PM', 'Confirm', () => {
            hideToast();
            showToast('Pickup slot confirmed! Code: SVMS-9280', 'Directions');
        });
    });

    document.getElementById('action-upload').addEventListener('click', () => {
        // Trigger simulated file upload
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,application/pdf';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                showToast(`Uploading: ${file.name.substring(0, 15)}...`, 'Verify', () => {
                    hideToast();
                    showToast('Prescription approved! Added items to cart.', 'View Cart');
                    // Add some items automatically on success
                    cartCount += 2;
                    cartBadge.textContent = cartCount;
                });
            }
        };
        input.click();
    });

    document.getElementById('action-repeat').addEventListener('click', () => {
        showToast('Repeat last order of Zincovit Tablets?', 'Reorder', () => {
            cartCount++;
            cartBadge.textContent = cartCount;
            const zincBtn = document.querySelector('.add-btn[data-id="vit-c-zinc"]');
            if (zincBtn) {
                zincBtn.classList.add('added');
                zincBtn.innerHTML = '<i class="lucide-check" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:2px;"></i> ✓';
            }
            hideToast();
            showToast('Zincovit Tablets added to cart!', 'View Cart');
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        });
    });

    document.getElementById('action-pharmacist').addEventListener('click', () => {
        showToast('Connecting to on-duty Pharmacist...', 'Chat Now', () => {
            triggerWhatsApp();
        });
    });

    // 5. Floating WhatsApp Button
    const whatsappBtn = document.getElementById('whatsapp-btn');
    whatsappBtn.addEventListener('click', () => {
        triggerWhatsApp();
    });

    function triggerWhatsApp() {
        const phoneNumber = '919876543210'; // Sri Venkateshwara Medical Store Mock number
        const message = encodeURIComponent('Hello Sri Venkateshwara Medical Store, I need assistance with ordering medicines.');
        const url = `https://wa.me/${phoneNumber}?text=${message}`;
        window.open(url, '_blank');
        showToast('Opening WhatsApp to chat with pharmacist...', 'Close');
    }
});
