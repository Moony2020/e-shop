// ========== CURRENCY SETTINGS ==========

const currencyRates = {
  USD: 1,
  SEK: 10.6,
  EURO: 0.93,
  GBP: 0.8,
};

const currencySymbols = {
  USD: '$',
  SEK: 'kr',
  EURO: '€',
  GBP: '£',
};

// ========== GLOBAL VARIABLES ==========
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
let selectedShippingCost = parseFloat(localStorage.getItem('selectedShippingCost')) || 0;
let couponApplied = JSON.parse(localStorage.getItem('couponApplied')) || false;
let couponCodeUsed = localStorage.getItem('couponCodeUsed') || null;
let currentCurrency = localStorage.getItem('currency') || 'USD';
let currentCurrencySymbol = currencySymbols[currentCurrency];

// ========== DOM READY HANDLER ==========
document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initSwipers();
  initCart();
  initWishlist();
  initCheckout();
  initPayment();
  initConfirmation();
  initCommonUI();
  initQuantityControls();
});

// Function to convert all visible prices based on selected currency
function convertPrices(newCurrency) {
  const rate = currencyRates[newCurrency];
  const symbol = currencySymbols[newCurrency];

  // Convert all visible prices in the page
  document.querySelectorAll('.current-price, .original-price, .cart-total, .cart-subtotal, .checkout-subtotal, .order-subtotal, .cart-grand-total, .checkout-grand-total, .order-total, .cart-shipping, .checkout-shipping, .order-shipping, .cart-discount, .checkout-discount, .order-discount').forEach(priceElement => {
    const basePrice = parseFloat(priceElement.dataset.base);
    if (!isNaN(basePrice)) {
      priceElement.textContent = symbol + ' ' + (basePrice * rate).toFixed(2);
    }
  });

  // Convert prices in cart table
  document.querySelectorAll('#cart-table td:nth-child(2), #cart-table td:nth-child(4)').forEach(cell => {
    const basePrice = parseFloat(cell.dataset.base);
    if (!isNaN(basePrice)) {
      cell.textContent = symbol + ' ' + (basePrice * rate).toFixed(2);
    }
  });

  // Fixed shipping method display
  document.querySelectorAll('.shipping-method label').forEach(label => {
    const base = parseFloat(label.dataset.base);
    if (!isNaN(base)) {
      // Get the original text before the price
      const originalText = label.textContent.split('-')[0].trim();
      
      // Determine which shipping method this is
      const isExpress = label.querySelector('input[value="express"]');
      const methodText = isExpress ? 'Express (2-3 days)' : 'Standard (7-14 days)';
      
      // Get the input element attributes
      const input = label.querySelector('input');
      const isChecked = input?.checked ? 'checked' : '';
      const inputValue = input?.value ? `value="${input.value}"` : '';
      
      // Rebuild the label with proper formatting
      label.innerHTML = `
        <input type="radio" name="shipping" ${isChecked} ${inputValue}>
        ${methodText} - ${symbol} ${(base * rate).toFixed(2)}
      `;
    }
  });

  // Update current currency
  currentCurrency = newCurrency;
  localStorage.setItem('currency', newCurrency);
  
  // Update currency label in both topbars
  updateCurrencyButton(newCurrency);
}

// Update currency label
function updateCurrencyButton(currency) {
  document.querySelectorAll('.currency-label').forEach(el => {
    el.textContent = currency;
  });
}

// Highlight selected currency
function updateActiveCurrency(selectedCurrency) {
  document.querySelectorAll('.headerTop .currency ul li a, .off-canvas .thetop-nav .currency ul li a').forEach(item => {
    item.parentElement.classList.remove('current');
    if (item.textContent.trim() === selectedCurrency) {
      item.parentElement.classList.add('current');
    }
  });
}

// Attach event listeners for currency selection
function setupCurrencyEventListeners() {
  document.querySelectorAll('.headerTop .currency ul li a, .off-canvas .thetop-nav .currency ul li a').forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const selectedCurrency = this.textContent.trim();
      if (currencyRates[selectedCurrency]) {
        currentCurrency = selectedCurrency;
        currentCurrencySymbol = currencySymbols[selectedCurrency];
        convertPrices(selectedCurrency);
        updateActiveCurrency(selectedCurrency);
        localStorage.setItem('currency', selectedCurrency);
        localStorage.setItem('selectedCurrency', selectedCurrency);
      }
    });
  });
}

// Delay setup until the DOM is fully loaded including copied canvas
document.addEventListener('DOMContentLoaded', () => {
  const savedCurrency = localStorage.getItem('currency') || 'USD';
  const savedSelectedCurrency = localStorage.getItem('selectedCurrency') || savedCurrency;
  currentCurrency = savedCurrency;
  currentCurrencySymbol = currencySymbols[savedCurrency];

  // Wait a bit to ensure off-canvas content is cloned (if dynamic)
  setTimeout(() => {
    setupCurrencyEventListeners();
    convertPrices(savedCurrency);
    updateCurrencyButton(savedSelectedCurrency);
    updateActiveCurrency(savedSelectedCurrency);
  }, 300);
});

// ========== MOBILE MENU ==========
const initMobileMenu = () => {
  // Copy menu elements for mobile
  const copyMenuElements = () => {
    const ctgCategory = document.querySelector(".departments-cat");
    const ctgPlace = document.querySelector(".departments");
    if (ctgCategory && ctgPlace) ctgPlace.innerHTML = ctgCategory.innerHTML;

    const mainNav = document.querySelector(".headerNav nav");
    const navPlace = document.querySelector(".off-canvas nav");
    if (mainNav && navPlace) navPlace.innerHTML = mainNav.innerHTML;

    const topNav = document.querySelector(".headerTop .wrapper");
    const topPlace = document.querySelector(".off-canvas .thetop-nav");
    if (topNav && topPlace) topPlace.innerHTML = topNav.innerHTML;
  };

  // Toggle mobile menu
  const menuButton = document.querySelector(".trigger");
  const closeButton = document.querySelector(".t-close");
  const siteElement = document.querySelector(".site");

  menuButton?.addEventListener("click", () => siteElement?.classList.toggle("showmenu"));
  closeButton?.addEventListener("click", () => siteElement?.classList.remove("showmenu"));

  // Handle submenu expansion in off-canvas
  const handleOffCanvasSubmenus = () => {
    document.querySelectorAll('.off-canvas .has-child > a').forEach(link => {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        const parent = this.closest('.has-child');
        parent?.classList.toggle('expand');
      });
    });
  };

  // Close mobile menu if window resized above 992px
  window.addEventListener('resize', () => {
    if (window.innerWidth > 992) {
      siteElement?.classList.remove("showmenu");
    }
  });

  copyMenuElements();
  handleOffCanvasSubmenus(); // Call submenu handler after copy
};


// ========== AUTHENTICATION SYSTEM ==========

// User session management
const AuthService = {
  currentUser: null,
  
  init() {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      this.currentUser = JSON.parse(userData);
      this.updateAuthStateOnAllPages(); // New method
    }
  },
  
  // New method to ensure auth state is consistent across all pages
  updateAuthStateOnAllPages() {
    // const userName = document.querySelector('.user-name');
    
    if (this.isAuthenticated()) {
      document.querySelectorAll('.user-name').forEach(el => {
        el.textContent = this.currentUser.name.split(' ')[0];
       // ✅ Make sure the link doesn't go to signin.html
        const parentLink = el.closest('a');
        if (parentLink) parentLink.setAttribute('href', '#');
      });
  
      document.querySelectorAll('#signin-link, #signup-link').forEach(el => {
        el.style.display = 'none';
      });
  
      document.querySelectorAll('#logout-link').forEach(el => {
        el.style.display = 'block';
      });
  
      // console.log("User is authenticated:", this.isAuthenticated());
    } else {
      // ✅ Logout status
      document.querySelectorAll('.user-name').forEach(el => {
        el.textContent = 'Sign In';
        const parentLink = el.closest('a');
        if (parentLink) parentLink.setAttribute('href', 'signin.html');
      });
  
      document.querySelectorAll('#signin-link, #signup-link').forEach(el => {
        el.style.display = 'block';
      });
  
      document.querySelectorAll('#logout-link').forEach(el => {
        el.style.display = 'none';
      });
  
      // console.log("User is not authenticated");
    }
  },
  
  login(email, password) {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const user = users.find(u => u.email === email && u.password === password);
      
      if (user) {
          this.currentUser = user;
          localStorage.setItem('currentUser', JSON.stringify(user));
          return true;
      }
      return false;
  },
  
  register(name, email, password) {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      
      if (users.some(u => u.email === email)) {
          return { success: false, message: 'Email already exists' };
      }
      
      const newUser = { name, email, password, id: Date.now().toString() };
      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
      this.currentUser = newUser;
      localStorage.setItem('currentUser', JSON.stringify(newUser));
      
      return { success: true };
  },
  
  logout() {
      this.currentUser = null;
      localStorage.removeItem('currentUser');
  },
  
  isAuthenticated() {
      return this.currentUser !== null;
  }
};

// UI State Management
const AuthUI = {
  init() {
      this.updateAuthState();
      this.setupEventListeners();
  },
  
// In the AuthUI object, update the updateAuthState method:
updateAuthState() {
  const userName = document.querySelector('.user-name');
  const logoutLink = document.getElementById('logout-link');
  const mobileAccount = document.querySelector('.menu-bottom .nav-item[href="#"] span');

  if (AuthService.isAuthenticated()) {
    // User is logged in
    if (userName) {
      userName.textContent = AuthService.currentUser.name.split(' ')[0];
      userName.closest('a').setAttribute('href', '#');// No login required
    }
    if (logoutLink) logoutLink.style.display = 'flex'; // Show logout button
    if (mobileAccount) {
      mobileAccount.textContent = AuthService.currentUser.name.split(' ')[0];
      mobileAccount.closest('a').href = "#"; // No login required
    }

    // Add a class to make it easier to control the display of the logout button via CSS
    document.body.classList.add('logged-in');
  } else {
    // User logged out
    if (userName) {
      userName.textContent = 'Sign In';
      userName.closest('a').setAttribute('href', 'signin.html');  // Only when the user is logged out/ Return to the login link/page signin.html    
    }
    if (logoutLink) logoutLink.style.display = 'none'; // Hide the logout button
    if (mobileAccount) {
      mobileAccount.textContent = 'Account';
      mobileAccount.closest('a').href = "signin.html"; // Return to the login link/page signin.html   
    }

    // Delete the class when you log out
    document.body.classList.remove('logged-in');
  }
},

  
  setupEventListeners() {
      // Logout handler
      document.addEventListener('click', (e) => {
          if (e.target.closest('#logout-link')) {
              e.preventDefault();
              AuthService.logout();
              this.showNotification('Logged out successfully');
              this.updateAuthState();
              window.location.href = 'index.html';
          }
      });
  },
  
  showNotification(message, isError = false) {
      const notification = document.createElement('div');
      notification.className = `notification ${isError ? 'error' : 'success'}`;
      notification.textContent = message;
      document.body.appendChild(notification);
      
      setTimeout(() => {
          notification.remove();
      }, 3000);
  }
};

// Form Handlers
const AuthForms = {
  init() {
      this.initSignupForm();
      this.initSigninForm();
  },
  
  initSignupForm() {
    const form = document.getElementById('signupForm');
    if (!form) return;
    
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const name = form.querySelector('#signupName').value.trim();
      const email = form.querySelector('#signupEmail').value.trim();
      const password = form.querySelector('#signupPassword').value.trim();
      const confirmPassword = form.querySelector('#signupConfirmPassword').value.trim();
      
      if (password !== confirmPassword) {
        AuthUI.showNotification('Passwords do not match', true);
        return;
      }
      
      const result = AuthService.register(name, email, password);
      
      if (result.success) {
        AuthUI.showNotification('Account created successfully!');
        AuthUI.updateAuthState(); // Update UI immediately
        setTimeout(() => {
          // Redirect to home page
          window.location.href = 'index.html';
        }, 1500);
      } else {
        AuthUI.showNotification(result.message, true);
      }
    });
  },
  
  initSigninForm() {
    const form = document.getElementById('signinForm');
    if (!form) return;
    
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const email = form.querySelector('#signinEmail').value.trim();
      const password = form.querySelector('#signinPassword').value.trim();
      
      if (AuthService.login(email, password)) {
        AuthUI.showNotification('Login successful!');
        AuthUI.updateAuthState(); // Update UI immediately
        setTimeout(() => {
          // Redirect to home page instead of account.html
          window.location.href = 'index.html';
        }, 1500);
      } else {
        AuthUI.showNotification('Invalid email or password', true);
      }
    });
  }
};

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
  AuthService.init();
  AuthUI.init();
  AuthForms.init();
});

// ========== SWIPERS ==========
const initSwipers = () => {
  // Main swiper
  if (document.querySelector('.swiper')) {
    new Swiper(".swiper", {
      loop: true,
      pagination: { el: ".swiper-pagination", clickable: true },
      navigation: {
        nextEl: ".swiper-button-next-custom",
        prevEl: ".swiper-button-prev-custom"
      },
      autoplay: { delay: 5000 }
    });
  }

  // Product detail swipers
  const productThumbnail = document.querySelector('.small-image');
  const productBig = document.querySelector('.big-image');
  
  if (productThumbnail && productBig) {
    const thumbSwiper = new Swiper(".small-image", {
      loop: false,
      spaceBetween: 10,
      slidesPerView: 4,
      freeMode: true,
      watchSlidesProgress: true,
      breakpoints: { 481: { spaceBetween: 32 } }
    });

    new Swiper(".big-image", {
      loop: true,
      autoHeight: true,
      navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev"
      },
      thumbs: { swiper: thumbSwiper }
    });

    // Color selection functionality
    const colorInputs = document.querySelectorAll("input[name='color']");
    colorInputs.forEach(input => {
      input.addEventListener('change', () => {
        const imagePath = input.dataset.image;
        if (!imagePath) return;

        const bigSlides = document.querySelectorAll(".big-image .swiper-slide img");
        let slideIndex = -1;
        
        bigSlides.forEach((slide, index) => {
          if (slide.src.includes(imagePath)) slideIndex = index;
        });

        if (slideIndex >= 0) {
          thumbSwiper.slideTo(slideIndex);
        }
      });
    });
  }
};

// function to handle quantity controls for the single page
function initQuantityControls() {
  document.querySelectorAll('.qty-control').forEach(control => {
    const input = control.querySelector('input');
    const plus = control.querySelector('.plus');
    const minus = control.querySelector('.minus');

    if (!input || !plus || !minus) return;

    // Plus button functionality
    plus.addEventListener('click', (e) => {
      e.preventDefault();
      input.value = parseInt(input.value || '1') + 1;
      input.dispatchEvent(new Event('change'));
    });

    // Minus button functionality
    minus.addEventListener('click', (e) => {
      e.preventDefault();
      const currentValue = parseInt(input.value || '1');
      if (currentValue > 1) {
        input.value = currentValue - 1;
        input.dispatchEvent(new Event('change'));
      }
    });

    // Input validation
    input.addEventListener('change', () => {
      let value = parseInt(input.value);
      if (isNaN(value) || value < 1) {
        value = 1;
      }
      input.value = value;
    });
  });
}

// ========== SEARCH FUNCTIONALITY ==========

let allProducts = []; // This will store our product data

const initSearch = async () => {
  try {
    const response = await fetch('products.json');
    allProducts = await response.json();
    setupSearchForms();
    processSearchQuery();
    
    // Initialize search functionality for category page
    if (document.querySelector('.category-page')) {
      handleCategoryPageSearch();
    }
  } catch (error) {
    console.error('Error loading products:', error);
  }
};

const setupSearchForms = () => {
  const handleSearchSubmit = (formId, redirect = true) => {
    const form = document.getElementById(formId);
    if (!form) return;
    
    form.addEventListener("submit", function(e) {
      e.preventDefault();
      const input = form.querySelector("input[type='search']");
      const query = input.value.trim();
      
      if (!query) return;
      
      localStorage.setItem('currentSearchQuery', query);
      
      if (redirect) {
        window.location.href = `category-page.html?search=${encodeURIComponent(query)}`;
      } else {
        // Handle search on current page (category page)
        filterAndDisplayProducts(query);
      }
    });
  };

  // Desktop search - redirects to category page
  handleSearchSubmit("search-form-desktop", true);
  
  // Mobile search - redirects to category page
  handleSearchSubmit("search-form-mobile", true);
  
  // Category page search - stays on same page
  handleSearchSubmit("category-search-form", false);
};

const handleCategoryPageSearch = () => {
  // Set up the category page search form if it exists
  const categorySearchForm = document.getElementById('category-search-form');
  if (categorySearchForm) {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get("search");
    
    if (query) {
      categorySearchForm.querySelector("input[type='search']").value = query;
      filterAndDisplayProducts(query);
    }
  }
};

const processSearchQuery = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get("search");
  
  if (!query) return;
  
  // Set search input value
  document.querySelectorAll("input[type='search']").forEach(input => {
    input.value = query;
  });
  
  filterAndDisplayProducts(query);
};

const filterAndDisplayProducts = (query) => {
  const searchResults = allProducts.filter(product => {
    const searchFields = [
      product.title,
      product.description,
      product.category,
      product.subcategory,
      product.brand,
      ...product.tags
    ].join(' ').toLowerCase();
    
    return searchFields.includes(query.toLowerCase());
  });
  
  displaySearchResults(searchResults);
};

const displaySearchResults = (results) => {
  const container = document.querySelector('.products.main') || 
                    document.querySelector('.products.flexwrap') ||
                    document.querySelector('#product-list');
  
  if (!container) return;
  
  if (results.length === 0) {
    container.innerHTML = `
      <div class="no-results" style="text-align: center; padding: 40px 20px; width: 100%;">
        <i class="ri-search-line" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
        <h3 style="font-size: 24px; margin-bottom: 10px;">No products found</h3>
        <p style="color: #777; margin-bottom: 20px;">We couldn't find any products matching "${localStorage.getItem('currentSearchQuery')}"</p>
        <div class="suggestions" style="margin-top: 30px;">
          <p style="margin-bottom: 15px;">Try these suggestions:</p>
          <ul style="list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
            <li><a href="category-page.html" class="secondary-button" style="padding: 8px 16px; border-radius: 4px;">Browse All Products</a></li>
            <li><a href="index.html" class="secondary-button" style="padding: 8px 16px; border-radius: 4px;">Return Home</a></li>
          </ul>
        </div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = results.map(product => `
    <div class="item" data-id="${product.id}">
      <div class="media">
        <div class="thumbnail object-cover">
          <a href="./single-page.html?id=${product.id}">
            <img src="${product.image}" alt="${product.title}" />
          </a>
        </div>
        <div class="hoverable">
          <ul>
            <li class="active"><a href="#"><i class="ri-heart-line"></i></a></li>
            <li class="active"><a href="#" class="add-to-cart"><i class="ri-shopping-cart-line"></i></a></li>
          </ul>
        </div>
        ${product.originalPrice ? `
          <div class="discount flexcenter">
            <span>${Math.round((1 - product.price/product.originalPrice) * 100)}%</span>
          </div>
        ` : ''}
      </div>
      <div class="product-details">
        <div class="rating">
          <div class="stars" style="--rating: ${product.rating || 0}"></div>
          <span class="mini-text">(${product.reviews || 0} Reviews)</span>
        </div>
        <h3 class="product-title">
          <a href="./single-page.html?id=${product.id}">${product.title}</a>
        </h3>
        <div class="price">
          <span class="current-price" data-base="${product.price}">$${product.price.toFixed(2)}</span>
          ${product.originalPrice ? `
            <span class="original-price mini-text" data-base="${product.originalPrice}">$${product.originalPrice.toFixed(2)}</span>
          ` : ''}
        </div>
        ${product.highlights ? `
          <div class="product-highlights">
            ${product.highlights.map(highlight => `
              <span>${highlight}</span><br>
            `).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
  
  // Reinitialize event listeners
  initCart();
  initWishlist();
};

// Initialize search when DOM is loaded
document.addEventListener('DOMContentLoaded', initSearch);

//========== filter search ==========
document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get("search")?.toLowerCase();

  if (query) {
    fetch("products.json")
      .then(res => res.json())
      .then(products => {
        const results = products.filter(p =>
          p.title.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query)
        );
        const container = document.getElementById("product-list");
        container.innerHTML = results.map(product => `
          <div class="product-item">
            <img src="${product.image}" alt="${product.title}" />
            <h4>${product.title}</h4>
            <p>${product.price}</p>
          </div>
        `).join("") || `<p>No results found for "${query}".</p>`;
      });
  }
});

// ========== CART MANAGEMENT ==========

// Initialize shipping cost if not set
if (!localStorage.getItem('selectedShippingCost')) {
  selectedShippingCost = 0;
  localStorage.setItem('selectedShippingCost', selectedShippingCost);
}

const initCart = () => {
  // Load cart from localStorage
  cart = JSON.parse(localStorage.getItem('cart')) || [];
  
    // Listen for storage changes (from other tabs)
    window.addEventListener('storage', (e) => {
      if (e.key === 'cart') {
        cart = JSON.parse(e.newValue) || [];
        renderCartItems();
        updateCartCounter();
      }
    });
    
  // Rest of your cart initialization code...
  document.querySelectorAll('.add-to-cart').forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const productElement = e.target.closest('.item') || document.querySelector('.single-product');
      if (productElement) addToCart(productElement);
    });
  });

  // Render cart items
  renderCartItems();

  // Cart quantity adjustments
  document.addEventListener('click', (e) => {
    if (e.target.matches('.plus, .minus')) {
      const row = e.target.closest('tr, li');
      if (!row) return;
      
      const id = row.dataset?.id;
      const color = row.querySelector('.product-color')?.textContent.trim() || '';
      const size = row.querySelector('.product-size')?.textContent.trim() || '';
      
      const product = cart.find(p => p.id === id && p.color === color && p.size === size);
      if (!product) return;
      
      const input = row.querySelector('input');
      if (!input) return;
      
      if (e.target.matches('.plus')) {
        product.quantity++;
        input.value = product.quantity;
      } else if (e.target.matches('.minus') && product.quantity > 1) {
        product.quantity--;
        input.value = product.quantity;
      }
      
      saveCart();
      renderCartItems();
    }

    // Remove item from cart
    if (e.target.closest('.item-remove')) {
      e.preventDefault();
      const row = e.target.closest('tr, li');
      if (!row) return;
      
      const id = row.dataset?.id;
      const color = row.querySelector('.product-color')?.textContent.trim() || '';
      const size = row.querySelector('.product-size')?.textContent.trim() || '';
      
      cart = cart.filter(p => !(p.id === id && p.color === color && p.size === size));
      saveCart();
      renderCartItems();
    }
  });

  // Coupon code handling
  document.querySelector('.coupon button')?.addEventListener('click', (e) => {
    e.preventDefault();
    const couponInput = document.querySelector('.coupon input');
    const enteredCoupon = couponInput?.value.trim().toUpperCase();

    if (enteredCoupon === 'SAVE5') {
      if (couponApplied && couponCodeUsed === 'SAVE5') {
        showNotification('This coupon has already been applied', true);
      } else {
        couponApplied = true;
        couponCodeUsed = 'SAVE5';
        localStorage.setItem('couponApplied', 'true');
        localStorage.setItem('couponCodeUsed', 'SAVE5');
        showNotification('Coupon applied successfully! 5% discount added');
        if (couponInput) {
          couponInput.value = '';
          couponInput.placeholder = 'Coupon applied!';
        }
      }
    } else {
      showNotification('Invalid coupon code!', true);
      couponInput?.classList.add('error');
      setTimeout(() => couponInput?.classList.remove('error'), 2000);
    }

    calculateCartTotals();
  });

  // Shipping method selection
  document.addEventListener('change', (e) => {
    if (e.target.matches('input[name="shipping"]')) {
      selectedShippingCost = e.target.value === 'express' ? 10 : 5;
      localStorage.setItem('selectedShippingCost', selectedShippingCost);
      calculateCartTotals();
    }
  });

  // Listen for storage changes to update cart in real-time
  window.addEventListener('storage', (e) => {
    if (e.key === 'cart') {
      cart = JSON.parse(e.newValue) || [];
      renderCartItems();
      updateCartCounter();
    }
  });
};

// ========== WISHLIST ==========
const initWishlist = () => {
  // Load initial state
  wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
  
  // Set up click handlers "Toggle wishlist items"
  document.querySelectorAll('.hoverable li:first-child').forEach(heart => {
    heart.addEventListener('click', function(e) {
      e.preventDefault();
      const item = this.closest('.item');
      if (item?.dataset?.id) toggleWishlist(item.dataset.id);
    });
  });

  // Wishlist panel toggle
  document.querySelectorAll('.wish-trigger').forEach(trigger => {
    trigger.addEventListener('click', e => {
      e.preventDefault();
      document.querySelector('.wish-list').classList.toggle('show');
    });
  });

  // Wishlist close button
  document.querySelector('.wish-list .t-close')?.addEventListener('click', e => {
    e.preventDefault();
    document.querySelector('.wish-list').classList.remove('show');
  });

  // Wishlist item removal
  document.addEventListener('click', e => {
    const removeBtn = e.target.closest('.wish-list-body .item-remove');
    if (!removeBtn) return;

    e.preventDefault();
    const id = removeBtn.dataset.id;
    if (!id) return;

    const index = wishlist.indexOf(id);
    if (index > -1) {
      wishlist.splice(index, 1);
      localStorage.setItem('wishlist', JSON.stringify(wishlist));
      updateWishlistUI();
      updateWishlistDisplay();
    }
  });

  updateWishlistUI();
  updateWishlistDisplay();
};

// ========== CHECKOUT PAGE ==========
const initCheckout = () => {
  if (!document.querySelector('.checkout-page')) return;

  // 🛠 Reset shipping cost to default on checkout page load
  selectedShippingCost = 5;
  localStorage.setItem('selectedShippingCost', selectedShippingCost);

  // Set default shipping method (Standard) selected
  const defaultShipping = document.querySelector('input[name="shipping"][value="standard"]');
  if (defaultShipping) defaultShipping.checked = true;

  renderCartItems();
  calculateCartTotals();
  convertPrices(currentCurrency);

  // Handle shipping method changes
  document.querySelectorAll('input[name="shipping"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      selectedShippingCost = e.target.value === 'express' ? 10 : 5;
      localStorage.setItem('selectedShippingCost', selectedShippingCost);
      calculateCartTotals();

      // ✅ Update shipping price on page
      document.querySelectorAll('.cart-shipping, .checkout-shipping, .order-shipping').forEach(el => {
        el.textContent = `${currentCurrencySymbol} ${selectedShippingCost.toFixed(2)}`;
        el.dataset.base = selectedShippingCost.toFixed(2);
      });

      // ✅ Update shipping labels
      document.querySelectorAll('.shipping-method label').forEach(label => {
        const base = parseFloat(label.dataset.base);
        if (!isNaN(base)) {
          const input = label.querySelector('input');
          if (!label.dataset.originalText) {
            const fullText = label.textContent.trim();
            const textWithoutPrice = fullText.replace(/\s-\s.*$/, '').trim();
            label.dataset.originalText = textWithoutPrice;
          }
          const originalText = label.dataset.originalText;
          label.innerHTML = `
            ${input.outerHTML}
            ${originalText} - ${currentCurrencySymbol} ${(base * currencyRates[currentCurrency]).toFixed(2)}
          `;
        }
      });

      convertPrices(currentCurrency);
    });
  });

  // Handle "Make an order" button
  document.querySelector('.primary-checkout .primary-button')?.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Validate form
    const requiredFields = ['email', 'fname', 'lname', 'address', 'city', 'state', 'postal', 'phone'];
    const isValid = requiredFields.every(field => {
      const value = document.getElementById(field)?.value.trim();
      if (!value) {
        showValidationMessage(`Please fill in the ${field.replace('fname', 'first name').replace('lname', 'last name')} field`);
        return false;
      }
      return true;
    });

    if (!isValid) return;

    // Save shipping details
    const shippingDetails = {
      email: document.getElementById('email').value,
      fname: document.getElementById('fname').value,
      lname: document.getElementById('lname').value,
      address: document.getElementById('address').value,
      city: document.getElementById('city').value,
      state: document.getElementById('state').value,
      postal: document.getElementById('postal').value,
      country: document.getElementById('country').value,
      phone: document.getElementById('phone').value,
      shippingMethod: document.querySelector('input[name="shipping"]:checked').value
    };

    localStorage.setItem('shippingDetails', JSON.stringify(shippingDetails));
    window.location.href = 'payment.html';
  });
};


// ========== PAYMENT PAGE ==========
let stripe;
let elements;
let cardElement;

let initPayment = () => {
  if (!document.querySelector('.payment-page')) return;

  // Initialize shipping cost
  selectedShippingCost = parseFloat(localStorage.getItem('selectedShippingCost')) || 5;

  renderCartItems();
  calculateCartTotals();

  // Show shipping method
  const shippingMethodEl = document.createElement('div');
  shippingMethodEl.className = 'summary-row';
  shippingMethodEl.innerHTML = `
    <span>Shipping Method</span>
    <span class="shipping-method">
      ${selectedShippingCost === 10 ? 'Express (2-3 days)' : 'Standard (7-14 days)'}
    </span>
  `;
  
  document.querySelector('.summary-totals')?.insertBefore(
    shippingMethodEl, 
    document.querySelector('.summary-totals .grand-total')
  );

  // Initialize payment methods - now using await
  (async () => {
    await initializeStripe();
    setTimeout(initPayPalButton, 500);
  })();

  // Tab switching
  document.querySelectorAll('.payment-tabs .tab').forEach(tab => {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.payment-tabs .tab, .tab-content').forEach(el => el.classList.remove('active'));
      this.classList.add('active');
      document.getElementById(this.dataset.tab).classList.add('active');
  
      const paymentMethod = this.dataset.tab;
      const payNowBtn = document.getElementById('place-order');
      
      // ✅  hide Pay now button from PayPal section cuz payment is handled by PayPal
      // and show it for other methods like credit card and apple pay
      if (paymentMethod === 'paypal') {
        payNowBtn.style.display = 'none';
      } else {
        payNowBtn.style.display = 'inline-block'; // or 'block' ,,, 
      }
    });
  });

  // Place order button
  document.getElementById('place-order')?.addEventListener('click', (e) => {
    e.preventDefault();
    const activeTab = document.querySelector('.payment-tabs .tab.active');
    const paymentMethod = activeTab?.dataset.tab || 'credit-card';
  
    if (paymentMethod === 'credit-card') {
      handleStripePayment();
    } else if (paymentMethod === 'paypal') {
      // PayPal will handle its own flow
    } else {
      // Apple Pay or other methods
      createOrder();
    }
  });
  // Force currency conversion after all totals are rendered (payment page)
  const savedCurrency = localStorage.getItem('currency') || 'USD';
  convertPrices(savedCurrency);
};

async function initializeStripe() {
  try {
    const res = await fetch('http://localhost:3000/config');
    const { publishableKey } = await res.json();

    if (!publishableKey) {
      throw new Error(`Stripe publishable key not found from server`);
    }

    stripe = Stripe(publishableKey);
    elements = stripe.elements();

    const style = {
      base: {
        color: '#32325d',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '16px',
        '::placeholder': {
          color: '#aab7c4'
        }
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a'
      }
    };

    cardElement = elements.create('card', {
      style: style,
      hidePostalCode: true
    });

    cardElement.mount('#card-element');

    cardElement.on('change', (event) => {
      const displayError = document.getElementById('card-errors');
      if (event.error) {
        displayError.textContent = event.error.message;
        displayError.style.display = 'block';
      } else {
        displayError.textContent = '';
        displayError.style.display = 'none';
      }
    });

  } catch (err) {
    console.error('Stripe initialization failed:', err);
    showNotification('Stripe failed to load. Please try again later.', true);
  }
}

async function handleStripePayment() {
  const submitButton = document.getElementById('place-order');
  if (!submitButton) return;
  
  // Show loading state
  submitButton.disabled = true;
  submitButton.innerHTML = '<i class="ri-loader-4-line spin"></i> Processing...';

  try {
    // Get cart totals
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const total = Math.round((subtotal - discount + selectedShippingCost) * 100);
    
    // Create payment intent
    const response = await fetch('http://localhost:3000/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: total,
        metadata: {
          order_id: 'ORD-' + Date.now().toString().slice(-6)
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.clientSecret) {
      throw new Error('No client secret received');
    }

    // ✅ get shipping details from localStorage
    const shippingDetails = JSON.parse(localStorage.getItem('shippingDetails'));

    // Confirm the payment with Stripe
    const { error, paymentIntent } = await stripe.confirmCardPayment(
      data.clientSecret, 
      {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: document.getElementById('card-name').value.trim(),
            email: shippingDetails.email,
            phone: shippingDetails.phone,
            address: {
              line1: shippingDetails.address,
              city: shippingDetails.city,
              state: shippingDetails.state,
              postal_code: shippingDetails.postal,
              country: getCountryCode(shippingDetails.country)
            }
          }
        }        
      }
    );

    if (error) {
      showNotification(error.message, true);
    } else if (paymentIntent.status === 'succeeded') {
      createOrder('Card', paymentIntent.id);
    }
  } catch (err) {
    console.error('Payment Error:', err);
    showNotification(
      err.message || 'Payment processing failed. Please try again.', 
      true
    );
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Pay now';
  }
}

function calculateGrandTotal() {
  const subtotal = calculateSubtotal();
  const discount = calculateDiscount();
  return subtotal - discount + selectedShippingCost;
}

function createOrder(paymentMethod = 'Credit Card', paymentId = null) {
  const orderData = {
    orderNumber: 'ORD-' + Date.now().toString().slice(-6),
    orderDate: new Date().toISOString(),
    cart: [...cart],
    shippingDetails: JSON.parse(localStorage.getItem('shippingDetails')),
    shippingCost: selectedShippingCost,
    couponApplied,
    couponCodeUsed,
    paymentMethod,
    paymentId
  };

  // Save order data and clear cart
  localStorage.setItem('orderData', JSON.stringify(orderData));
  clearCart();
  
  // Redirect to confirmation
  window.location.href = 'confirmation.html';
}

// ========== PAYPAL BUTTON INIT ==========
function initPayPalButton() {
  const paypalButtonContainer = document.querySelector('.paypal-button-container');
  if (!paypalButtonContainer) return;

  // Show loading state initially
  paypalButtonContainer.innerHTML = '<div class="paypal-loading"></div>';

  // First check if PayPal SDK is loaded
  if (typeof paypal === 'undefined') {
    console.error('PayPal SDK not loaded');
    paypalButtonContainer.innerHTML = `
      <div class="paypal-error">
        Error loading PayPal. Please refresh the page.
        <button class="retry-paypal">Retry</button>
      </div>
    `;
    document.querySelector('.retry-paypal')?.addEventListener('click', initPayPalButton);
    return;
  }

  // Get cart totals
  const subtotal = calculateSubtotal();
  const discount = calculateDiscount();
  const shippingCost = selectedShippingCost;
  const total = subtotal - discount + shippingCost;

  try {
    paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'paypal'
      },
      createOrder: function(data, actions) {
        return actions.order.create({
          purchase_units: [{
            amount: {
              value: total.toFixed(2),
              currency_code: 'USD',
              breakdown: {
                item_total: {
                  value: subtotal.toFixed(2),
                  currency_code: 'USD'
                },
                shipping: {
                  value: shippingCost.toFixed(2),
                  currency_code: 'USD'
                },
                discount: {
                  value: discount.toFixed(2),
                  currency_code: 'USD'
                }
              }
            },
            items: cart.map(item => ({
              name: item.title,
              unit_amount: {
                value: item.price.toFixed(2),
                currency_code: 'USD'
              },
              quantity: item.quantity.toString(),
              sku: item.id
            }))
          }]
        });
      },
      onApprove: async function(data, actions) {
        paypalButtonContainer.querySelector('.paypal-loading')?.remove();
        const loadingMessage = document.createElement('div');
        loadingMessage.className = 'paypal-loading';
        loadingMessage.textContent = 'Processing payment...';
        paypalButtonContainer.appendChild(loadingMessage);
      
        const details = await actions.order.capture();
      
        const orderData = {
          orderNumber: 'ORD-' + Date.now().toString().slice(-6),
          orderDate: new Date().toISOString(),
          cart: JSON.parse(JSON.stringify(cart)), // ❗ نسخة مجمدة
          shippingDetails: JSON.parse(localStorage.getItem('shippingDetails')),
          shippingCost: selectedShippingCost,
          couponApplied,
          couponCodeUsed,
          paymentMethod: 'PayPal',
          paymentId: data.orderID,
          payer: details.payer
        };
      
        // Save before redirect
        localStorage.setItem('orderData', JSON.stringify(orderData));
      
        // Important: Clear cart AFTER saving order
        clearCart();
      
        // Delay redirect slightly to ensure data is saved
        setTimeout(() => {
          window.location.href = 'confirmation.html';
        }, 300);
      },

      onError: function(err) {
        console.error('PayPal Error:', err);
        paypalButtonContainer.innerHTML = `
          <div class="paypal-error">
            <i class="ri-alert-line"></i>
            Payment failed. Please try again or use another method.
            <button class="retry-paypal">Retry PayPal</button>
          </div>
        `;
        document.querySelector('.retry-paypal')?.addEventListener('click', initPayPalButton);
      }
    }).render('.paypal-button-container');
  } catch (err) {
    console.error('PayPal Button Error:', err);
    paypalButtonContainer.innerHTML = `
      <div class="paypal-error">
        Error initializing PayPal. Please refresh the page.
      </div>
    `;
  }
}

// Helper functions for PayPal calculations
function calculateSubtotal() {
  return parseFloat(cart.reduce((sum, item) => 
    sum + parseFloat((item.price * item.quantity).toFixed(2)), 0
  ).toFixed(2));
}

function calculateDiscount() {
  const subtotal = calculateSubtotal();
  let discount = 0;
  
  // Automatic discount for orders over $500
  if (subtotal >= 500) discount += parseFloat((subtotal * 0.05).toFixed(2));
  
  // Coupon discount if applied
  if (couponApplied) discount += parseFloat((subtotal * 0.05).toFixed(2));
  
  return parseFloat(discount.toFixed(2));
}

// Helper function to get country name from value
function getCountryName(value) {
  const countries = {
    '1': 'Norway',
    '2': 'UK',
    '3': 'Denmark',
    '4': 'Sweden',
    '5': 'Other'
  };
  return countries[value] || value;
}

function getCountryCode(value) {
  const countryCodes = {
    '1': 'NO',  // Norway
    '2': 'GB',  // UK
    '3': 'DK',  // Denmark
    '4': 'SE',  // Sweden
    '5': 'US'   // Other (default to United States)
  };
  return countryCodes[value] || 'US';
}

// Validate expiry date (MM/YY format)
// Enhanced expiry date validation with detailed messages
function validateExpiryDate() {
  const expiryInput = document.getElementById('expiry-date');
  const value = expiryInput.value.trim();
  const errorContainer = document.createElement('div');
  errorContainer.className = 'error-message';
  
  // Remove any existing error messages
  const existingError = expiryInput.nextElementSibling;
  if (existingError && existingError.classList.contains('error-message')) {
    existingError.remove();
  }
  
  // Check format (MM/YY where MM is 01-12)
  const regex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
  if (!regex.test(value)) {
    errorContainer.innerHTML = `
      <div class="error-detail">
        <i class="ri-error-warning-line"></i>
        <span>Please enter a valid expiry date in MM/YY format (e.g. 12/25)</span>
      </div>
    `;
    expiryInput.after(errorContainer);
    expiryInput.classList.add('error');
    showValidationMessage('Please check your card expiry date');
    return false;
  }
  
  // Parse month and year
  const [month, year] = value.split('/');
  const expiryMonth = parseInt(month);
  const expiryYear = 2000 + parseInt(year); // Convert YY to YYYY
  
  // Get current date
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // Months are 0-indexed
  
  // Check if card is expired
  if (expiryYear < currentYear || 
    (expiryYear === currentYear && expiryMonth < currentMonth)) {
    errorContainer.innerHTML = `
      <div class="error-detail">
        <i class="ri-error-warning-line"></i>
        <span>This card expired on ${month}/${year}</span>
      </div>
      <div class="error-example">Current date: ${currentMonth.toString().padStart(2, '0')}/${currentYear.toString().slice(-2)}</div>
    `;
    expiryInput.after(errorContainer);
    expiryInput.classList.add('error');
    showValidationMessage('This card has expired');
    return false;
  }
  
  // Check if date is too far in future (optional)
  if (expiryYear > currentYear + 20) {
    errorContainer.innerHTML = `
      <div class="error-detail">
        <i class="ri-error-warning-line"></i>
        <span>Please check the expiry date</span>
      </div>
      <div class="error-example">Cards are typically valid for 3-5 years</div>
    `;
    expiryInput.after(errorContainer);
    expiryInput.classList.add('error');
    showValidationMessage('Please check the expiry date');
    return false;
  }
  
  expiryInput.classList.remove('error');
  return true;
}

// Validate entire credit card form
function validateCreditCardForm() {
  let isValid = true;
  
  // Clear previous errors
  document.querySelectorAll('.form-group').forEach(el => el.classList.remove('error'));
  
  // Validate card number (16 digits, may contain spaces)
  const cardNumber = document.getElementById('card-number').value.replace(/\s+/g, '');
  if (!/^\d{16}$/.test(cardNumber)) {
    document.getElementById('card-number').classList.add('error');
    showValidationMessage('Please enter a valid 16-digit card number');
    isValid = false;
  }
  
  // Validate card name (at least 2 characters)
  const cardName = document.getElementById('card-name').value.trim();
  if (cardName.length < 2) {
    document.getElementById('card-name').classList.add('error');
    showValidationMessage('Please enter the name as shown on card');
    isValid = false;
  }
  
  // Validate expiry date
  if (!validateExpiryDate()) {
    isValid = false;
  }
  
  // Validate CVV (3 or 4 digits)
  const cvv = document.getElementById('cvv').value.trim();
  if (!/^\d{3,4}$/.test(cvv)) {
    document.getElementById('cvv').classList.add('error');
    showValidationMessage('Please enter a valid CVV (3-4 digits)');
    isValid = false;
  }
  
  return isValid;
}

// ========== CONFIRMATION PAGE ==========
const initConfirmation = () => {
  if (!document.querySelector('.confirmation-page')) return;

  const orderData = JSON.parse(localStorage.getItem('orderData'));
  if (!orderData) {
    window.location.href = 'index.html';
    return;
  }

  // Get current currency settings
  const savedCurrency = localStorage.getItem('currency') || 'USD';
  const currencySymbol = currencySymbols[savedCurrency];
  const currencyRate = currencyRates[savedCurrency];

  // Display order info
  document.getElementById('order-number').textContent = orderData.orderNumber;
  document.getElementById('order-date-print').textContent = new Date(orderData.orderDate).toLocaleDateString();

  // Calculate totals with currency conversion
  const subtotal = orderData.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const autoDiscount = subtotal >= 500 ? subtotal * 0.05 : 0;
  const couponDiscount = orderData.couponApplied ? subtotal * 0.05 : 0;
  const total = subtotal - autoDiscount - couponDiscount + (orderData.shippingCost || 0);

  // Update order summary with converted prices
  document.querySelector('.order-subtotal').textContent = `${currencySymbol} ${(subtotal * currencyRate).toFixed(2)}`;
  document.querySelector('.order-discount').textContent = `-${currencySymbol} ${((autoDiscount + couponDiscount) * currencyRate).toFixed(2)}`;
  document.querySelector('.order-shipping').textContent = `${currencySymbol} ${((orderData.shippingCost || 0) * currencyRate).toFixed(2)}`;
  document.querySelector('.order-total').textContent = `${currencySymbol} ${(total * currencyRate).toFixed(2)}`;

  // Update shipping details
  if (orderData.shippingDetails) {
    const address = orderData.shippingDetails.address.replace(/^\d+\s*/, '');
    document.getElementById('shipping-address').innerHTML = `
      ${orderData.shippingDetails.fname} ${orderData.shippingDetails.lname}<br>
      ${address}<br>
      ${orderData.shippingDetails.city}, ${orderData.shippingDetails.state} ${orderData.shippingDetails.postal}<br>
      ${getCountryName(orderData.shippingDetails.country)}
    `;
    
    document.getElementById('shipping-method').textContent = 
      orderData.shippingDetails.shippingMethod === 'express' ? 
      'Express Shipping (2-3 days)' : 'Standard Shipping (5-7 days)';
    
    document.getElementById('payment-method').textContent = orderData.paymentMethod || 'Credit Card';
    
    const deliveryDate = new Date(orderData.orderDate);
    deliveryDate.setDate(deliveryDate.getDate() + 
      (orderData.shippingDetails.shippingMethod === 'express' ? 3 : 7));
    document.getElementById('delivery-date').textContent = deliveryDate.toDateString();
    
    document.querySelector('.customer-email').textContent = orderData.shippingDetails.email;
  }

  // Render order items with converted prices
  const orderItemsContainer = document.querySelector('.order-items');
  if (orderItemsContainer) {
    orderItemsContainer.innerHTML = orderData.cart.map(item => {
      const itemPrice = (item.price * currencyRate).toFixed(2);
      const itemTotal = (item.price * item.quantity * currencyRate).toFixed(2);
      
      return `
        <div class="order-item">
          <div class="item-thumbnail object-cover">
            <img src="${item.image}" alt="${item.title}">
          </div>
          <div class="item-details">
            <h4>${item.title}</h4>
            <p class="product-variation">
              ${item.color ? `Color: <span class="product-color">${item.color}</span>` : ''}
              ${item.size ? `Size: <span class="product-size">${item.size}</span>` : ''}
            </p>
            <div class="price">
              <div class="item-quantity">${item.quantity}</div>
              <div class="item-price">${currencySymbol} ${itemTotal}</div>
            </div>
          </div>
        </div>
      `;
    }).join('') || '<p>No items in order</p>';
  }

  // Print button
  document.getElementById('print-receipt')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.print();
  });

  // Clear cart only when going back to home page
  document.querySelector('.primary-button[href="index.html"]')?.addEventListener('click', () => {
    localStorage.removeItem('orderData');
    clearCart();
  });
};

// ========== COMMON UI ELEMENTS ==========
const initCommonUI = () => {
  // Listen for storage changes (cart/wishlist updates from other tabs)
  window.addEventListener('storage', (e) => {
    if (e.key === 'wishlist') {
      try {
        wishlist = JSON.parse(e.newValue) || [];
        updateWishlistUI();
        updateWishlistDisplay();
      } catch (err) {
        console.error('Error parsing wishlist:', err);
      }
    }
  });

  // Back to top button
  window.addEventListener("scroll", () => {
    const topButton = document.querySelector(".backtotop");
    if (!topButton) return;
    topButton.classList.toggle("show", window.scrollY > 300);
  });

  // Search functionality
  document.querySelector(".search-trigger")?.addEventListener("click", () => {
    document.querySelector(".site")?.classList.toggle("showsearch");
  });

  document.querySelector(".search-close")?.addEventListener("click", () => {
    document.querySelector(".site")?.classList.remove("showsearch");
  });

  // Department menu
  document.querySelector(".departments-cat .departments-trigger")?.addEventListener("click", () => {
    document.querySelector(".site")?.classList.toggle("showdepartment");
  });

  // Modal window
  window.onload = () => {
    const siteElement = document.querySelector('.site');
    const modalCloseBtn = document.querySelector('.modalclose');
    if (siteElement && modalCloseBtn) {
      siteElement.classList.add('showmodal');
      modalCloseBtn.addEventListener('click', () => siteElement.classList.remove('showmodal'));
    }
  };
};

// ========== HELPER FUNCTIONS ==========
const createProductObject = (productElement) => {
  const id = productElement?.dataset?.id || 'unknown';
  const title = productElement?.querySelector('.product-title, .product-details h3 a, .item-content a')?.textContent?.trim() || "Product";
  
  // Improved price extraction
  const priceEl = productElement.querySelector('.current-price');
  let price = 0;
  
  if (priceEl) {
    const priceText = priceEl.textContent.replace(/[^0-9.]/g, '');
    price = parseFloat(priceText) || 0;
    
    // Alternatively use data-base attribute if available
    if (priceEl.dataset.base) {
      price = parseFloat(priceEl.dataset.base) || 0;
    }
  }

  let productImage = '';
  const selectedColor = document.querySelector("input[name='color']:checked");
  
  if (selectedColor?.dataset?.image) {
    productImage = selectedColor.dataset.image;
  } else {
    const activeImageSlide = document.querySelector(".big-image .swiper-slide-active img, .product-image");
    productImage = activeImageSlide?.src || productElement.querySelector('img')?.src || '';
  }

  const color = selectedColor?.dataset.color || 
               selectedColor?.id?.replace('co', '') || 
               productElement.querySelector('.product-color')?.textContent.trim() || 
               'Default';
  
  const sizeEl = document.querySelector("input[name='size']:checked") || 
                 productElement.querySelector('.product-size');
  const size = sizeEl?.id?.replace('size-', '') || 
              sizeEl?.textContent?.trim() || 
              'Default';

  // Get quantity from the closest qty-control or default to 1
  const qtyInput = productElement.closest('.item')?.querySelector('.qty-control input') || 
                   document.querySelector('.qty-control input');
  const quantity = qtyInput ? parseInt(qtyInput.value || '1') : 1;

  return {
    id,
    title,
    price: Math.round(price * 100) / 100, // Ensure proper rounding
    image: productImage,
    color,
    size,
    quantity,
    link: window.location.href
  };
};

const addToCart = (productElement) => {
  const product = createProductObject(productElement);
  
  const exists = cart.some(p => 
    p.id === product.id &&
    p.color.toLowerCase() === product.color.toLowerCase() &&
    p.size.toLowerCase() === product.size.toLowerCase()
  );

  if (exists) {
    showNotification("This product is already in your cart", true);
    return false;
  }

  // Get the current quantity from the input field
  const qtyInput = productElement.querySelector('.qty-control input') || 
                   document.querySelector('.qty-control input');
  if (qtyInput) {
    product.quantity = parseInt(qtyInput.value || '1');
  }

  cart.push(product);
  saveCart();
  renderCartItems();
  updateCartCounter();
  showNotification("Product added to cart");
  return true;
};

const renderCartItems = () => {
  const containers = document.querySelectorAll('.cart-items-container, .checkout-items-container, .order-items');
  
  containers.forEach(container => {
    if (container.classList.contains('order-items')) return;
    
    const isCheckout = container.classList.contains('checkout-items-container');
    container.innerHTML = cart.length === 0 
      ? (isCheckout ? '<li class="empty">Your cart is empty</li>' : '<tr><td colspan="5">Your cart is empty</td></tr>')
      : cart.map(item => {
          // Ensure price is properly formatted 
          const price = parseFloat(item.price) || 0;
          const itemTotal = price * (item.quantity || 1);
          
          return isCheckout 
            ? `
              <li class="flexitem" data-id="${item.id}">
                <div class="thumbnail object-cover">
                  <img src="${item.image || ''}" alt="${item.title || 'Product'}">
                </div>
                <div class="content">
                  <div><a href="${item.link || '#'}">${item.title || 'Product'}</a></div>
                  <p class="product-variation">
                    ${item.color ? `Color: <span class="product-color">${item.color}</span>` : ''}
                    ${item.size ? `Size: <span class="product-size">${item.size}</span>` : ''}
                  </p>
                  <div class="price">
                    <div class="item-quantity">${item.quantity}</div>
                    <span class="current-price silver-price" data-base="${price.toFixed(2)}">${currentCurrencySymbol} ${(price * currencyRates[currentCurrency]).toFixed(2)}</span>
                  </div>
                  </div>
                </div>
              </li>
            `
            : `
              <tr data-id="${item.id}">
                <td class="flexitem">
                  <div class="thumbnail object-cover">
                    <a href="${item.link || '#'}"><img src="${item.image || ''}" alt="${item.title || 'Product'}"></a>
                  </div>
                  <div class="content">
                    <strong><a href="${item.link || '#'}">${item.title || 'Product'}</a></strong>
                    <p class="product-variation">
                      ${item.color ? `Color: <span class="product-color">${item.color}</span>` : ''}
                      ${item.size ? `Size: <span class="product-size">${item.size}</span>` : ''}
                    </p>
                  </div>
                </td>
                <td data-base="${price}">${currentCurrencySymbol} ${(price * currencyRates[currentCurrency]).toFixed(2)}</td>
                <td>
                  <div class="qty-control flexitem">
                    <button class="minus circle">-</button>
                    <input type="text" value="${item.quantity || 1}" min="1" readonly>
                    <button class="plus circle">+</button>
                  </div>
                </td>
                <td data-base="${itemTotal}">${currentCurrencySymbol} ${(itemTotal * currencyRates[currentCurrency]).toFixed(2)}</td>
                <td><a href="#" class="item-remove"><i class="ri-close-line"></i></a></td>
              </tr>
            `;
        }).join('');
  });

  updateCartCounter();
  /* skip it on the confirmation page / Prevent calculateCartTotals() from affecting the confirmation page */
  if (!document.querySelector('.confirmation-page')) {
    calculateCartTotals();
    convertPrices(currentCurrency); 
  }
};

const calculateCartTotals = () => {
  // Calculate subtotal with proper rounding at each step
  const subtotal = cart.reduce((sum, item) => {
    const itemTotal = parseFloat((item.price * item.quantity).toFixed(2));
    return parseFloat((sum + itemTotal).toFixed(2));
  }, 0);
  
  // Automatic 5% discount for orders over $500
  const autoDiscount = subtotal >= 500 ? parseFloat((subtotal * 0.05).toFixed(2)) : 0;
  
  // Additional 5% discount if coupon is applied
  const couponDiscount = couponApplied ? parseFloat((subtotal * 0.05).toFixed(2)) : 0;
  
  const totalAfterDiscounts = parseFloat((subtotal - autoDiscount - couponDiscount).toFixed(2));
  
  const isCheckoutOrPayment = document.querySelector('.checkout-page') || document.querySelector('.payment-page');
  const grandTotal = parseFloat((totalAfterDiscounts + (isCheckoutOrPayment ? selectedShippingCost : 0)).toFixed(2));

  // ✅ Update dataset.base for all totals properly
  document.querySelectorAll('.cart-subtotal, .checkout-subtotal, .order-subtotal').forEach(el => {
    el.dataset.base = subtotal.toFixed(2);
  });

  document.querySelectorAll('.cart-discount, .checkout-discount, .order-discount').forEach(el => {
    el.dataset.base = (autoDiscount + couponDiscount).toFixed(2);
  });

  document.querySelectorAll('.cart-shipping, .checkout-shipping, .order-shipping').forEach(el => {
    el.dataset.base = selectedShippingCost.toFixed(2);
  });

  document.querySelectorAll('.cart-grand-total, .checkout-grand-total, .order-total').forEach(el => {
    el.dataset.base = grandTotal.toFixed(2);
  });

  // ✅ Update textContent with the correct default currency (USD) before converting
  document.querySelectorAll('.cart-subtotal, .checkout-subtotal, .order-subtotal').forEach(el => {
    el.textContent = `${currentCurrencySymbol} ${subtotal.toFixed(2)}`;
  });

  document.querySelectorAll('.cart-discount, .checkout-discount, .order-discount').forEach(el => {
    el.textContent = `${currentCurrencySymbol} -${(autoDiscount + couponDiscount).toFixed(2)}`;
  });

  document.querySelectorAll('.cart-shipping, .checkout-shipping, .order-shipping').forEach(el => {
    el.textContent = `${currentCurrencySymbol} ${selectedShippingCost.toFixed(2)}`;
  });

  document.querySelectorAll('.cart-grand-total, .checkout-grand-total, .order-total').forEach(el => {
    el.textContent = `${currentCurrencySymbol} ${grandTotal.toFixed(2)}`;
  });

  document.querySelectorAll('.iscart .cart-total').forEach(el => {
    el.textContent = `${currentCurrencySymbol} ${grandTotal.toFixed(2)}`;
    el.dataset.base = grandTotal.toFixed(2);
  });

  // ✅ Update cart counter
  updateCartCounter();

  // ✅ After everything, reconvert prices if needed
  convertPrices(currentCurrency);
};


const updateCartCounter = () => {
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = totalItems;
  });
};

const saveCart = () => {
  localStorage.setItem('cart', JSON.stringify(cart));
  // Dispatch a storage event to notify other tabs
  window.dispatchEvent(new Event('storage'));
  updateCartCounter();
};

const saveWishlist = () => {
  localStorage.setItem('wishlist', JSON.stringify(wishlist));
  // Dispatch storage event to sync across tabs
  window.dispatchEvent(new StorageEvent('storage', {
    key: 'wishlist',
    newValue: JSON.stringify(wishlist)
  }));
};

const clearCart = () => {
  cart = [];
  couponApplied = false;
  couponCodeUsed = null;
  selectedShippingCost = 0;
  
  localStorage.removeItem('cart');
  localStorage.removeItem('couponApplied');
  localStorage.removeItem('couponCodeUsed');
  localStorage.removeItem('selectedShippingCost');

  // Update UI immediately
  renderCartItems();
  calculateCartTotals();
  updateCartCounter();

  // Dispatch storage event to sync across tabs
  window.dispatchEvent(new Event('storage'));
};

const updateWishlistUI = () => {
  // Update heart icons
  document.querySelectorAll('.hoverable li:first-child').forEach(heart => {
    heart.classList.remove('active');
  });

  wishlist.forEach(id => {
    document.querySelectorAll(`[data-id="${id}"] .hoverable li:first-child`).forEach(heart => {
      heart.classList.add('active');
    });
  });

  // Update wishlist counters
  document.querySelectorAll('.wishlist-count').forEach(el => {
    el.textContent = wishlist.length;
  });
}

const updateWishlistDisplay = () => {
  const container = document.querySelector('.wish-list-body');
  if (!container) return;

  container.innerHTML = wishlist.length === 0 
    ? '<p class="empty-wishlist">Your wishlist is empty</p>'
    : wishlist.map(id => {
        const product = document.querySelector(`.item[data-id="${id}"]`);
        if (!product) return '';
        
        const thumb = product.querySelector('.product-image-link') || product.querySelector('.thumbnail');
        const titleEl = product.querySelector('.product-title, .product-details h3 a, .item-content a');
        const title = titleEl?.textContent.trim() || "Product";
        const image = product.querySelector('img')?.getAttribute('src') || '';
        const priceValue = product.querySelector('.price .current-price')?.outerHTML || '';
        
        return `
          <div class="item">
            <div class="thumbnail">${thumb ? thumb.innerHTML : ''}</div>
            <div class="item-content">${title}<div class="price">${priceValue}</div></div>
            <a href="#" class="item-remove" data-id="${id}"><i class="ri-close-line"></i></a>
          </div>
        `;
      }).join('');
};

const toggleWishlist = (productId) => {
  const index = wishlist.indexOf(productId);
  if (index > -1) {
    wishlist.splice(index, 1);
  } else {
    wishlist.push(productId);
  }
  
  // Save to localStorage and dispatch event
  saveWishlist();
  
  // Update UI immediately
  updateWishlistUI();
  updateWishlistDisplay();
};

const showNotification = (message, isError = false) => {
  const notification = document.getElementById('cartNotification');
  const messageEl = document.getElementById('notificationMessage');
  
  if (!notification || !messageEl) return;
  
  notification.classList.remove('show', 'error');
  messageEl.textContent = message;
  
  if (isError) notification.classList.add('error');
  notification.classList.add('show');
  
  setTimeout(() => notification.classList.remove('show'), 4000);
};

const showValidationMessage = (message) => {
  const validationMessage = document.getElementById('validation-message');
  const validationText = document.getElementById('validation-text');
  
  if (validationMessage && validationText) {
    validationText.textContent = message;
    validationMessage.style.display = 'flex';
    
    setTimeout(() => {
      validationMessage.style.display = 'none';
    }, 5000);
  } else {
    alert(message);
  }
};
