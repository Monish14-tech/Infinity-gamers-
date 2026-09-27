/**
 * Infinity Gamers — Landing Page Scripts
 * Handles navigation, arcade game filters, contact enquiry form, and UI notifications.
 */

document.addEventListener("DOMContentLoaded", () => {
  initMobileMenu();
  initArcadeFilters();
  initContactForm();
  initActiveNavLink();
  initHeroVideo();
  initFeaturedCarousel();
});

// HERO VIDEO PLAYBACK (MOBILE + DESKTOP)
function initHeroVideo() {
  const video = document.querySelector(".hero-video");
  if (!video) return;

  video.muted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");

  const startPlayback = () => {
    const promise = video.play();
    if (promise !== undefined) {
      promise.catch(() => {
        const playOnInteraction = () => {
          video.play().catch(() => {});
          window.removeEventListener("touchstart", playOnInteraction);
          window.removeEventListener("click", playOnInteraction);
        };
        window.addEventListener("touchstart", playOnInteraction, { once: true, passive: true });
        window.addEventListener("click", playOnInteraction, { once: true, passive: true });
      });
    }
  };

  startPlayback();

  // Keep video looping if low-power mode paused it
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && video.paused) {
      video.play().catch(() => {});
    }
  });
}

// MOBILE MENU TOGGLE
function initMobileMenu() {
  const menuBtn = document.getElementById("menuBtn");
  const navLinks = document.getElementById("navLinks");
  if (!menuBtn || !navLinks) return;

  menuBtn.addEventListener("click", () => {
    navLinks.classList.toggle("open");
  });

  // Close menu when clicking outside or clicking a link
  document.addEventListener("click", (e) => {
    if (!menuBtn.contains(e.target) && !navLinks.contains(e.target)) {
      navLinks.classList.remove("open");
    }
  });

  navLinks.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
    });
  });
}

// ACTIVE NAVIGATION LINK
function initActiveNavLink() {
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const links = document.querySelectorAll("#navLinks a");
  
  links.forEach(link => {
    const href = link.getAttribute("href");
    if (href === currentPath || (currentPath === "" && href === "index.html")) {
      link.classList.add("active");
    }
  });
}

// ARCADE CATEGORY FILTER
function initArcadeFilters() {
  const filterBtns = document.querySelectorAll(".filter-btn");
  const gameCards = document.querySelectorAll(".game-card-item");
  if (!filterBtns.length || !gameCards.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const filter = btn.dataset.filter;

      gameCards.forEach(card => {
        const category = card.dataset.category;
        if (filter === "all" || category === filter) {
          card.style.display = "flex";
          card.style.animation = "fadeIn 0.35s ease";
        } else {
          card.style.display = "none";
        }
      });
    });
  });
}

// CONTACT ENQUIRY FORM
function initContactForm() {
  const form = document.getElementById("enquiryForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("contactName")?.value.trim() || "";
    const phone = document.getElementById("contactPhone")?.value.trim() || "";
    const players = document.getElementById("playerCount")?.value || "1";
    const msg = document.getElementById("contactMsg")?.value.trim() || "";

    if (!name || !phone) {
      showToast("Please enter your name and phone number.");
      return;
    }

    // Save enquiry to local storage for offline backup
    try {
      const enquiries = JSON.parse(localStorage.getItem("infinity_enquiries") || "[]");
      enquiries.push({
        name,
        phone,
        players,
        msg,
        date: new Date().toISOString()
      });
      localStorage.setItem("infinity_enquiries", JSON.stringify(enquiries));
    } catch (err) {
      console.warn("Storage error", err);
    }

    // Sync enquiry with backend API
    fetch("/api/enquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, players, msg })
    }).catch(err => console.warn("Server enquiry sync error:", err));

    form.reset();
    showToast(`Thank you, ${name}! Your enquiry has been received. We will contact you shortly.`);
  });
}

// TOAST NOTIFICATION UTILITY
function showToast(message) {
  let toastEl = document.getElementById("toastMsg");
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.id = "toastMsg";
    toastEl.className = "toast-msg";
    document.body.appendChild(toastEl);
  }

  toastEl.textContent = message;
  toastEl.classList.add("show");

  setTimeout(() => {
    toastEl.classList.remove("show");
  }, 4000);
}

// FEATURED ARCADE TITLES SLIDING CAROUSEL
function initFeaturedCarousel() {
  const track = document.getElementById("featuredCarouselTrack");
  if (!track) return;

  const prevBtn = document.getElementById("featuredCarouselPrev");
  const nextBtn = document.getElementById("featuredCarouselNext");
  const dotsContainer = document.getElementById("featuredCarouselDots");

  function getMetrics() {
    const cards = track.querySelectorAll(".game-card-item");
    if (!cards.length) return null;
    const firstCard = cards[0];
    const cardRect = firstCard.getBoundingClientRect();
    const cardWidth = cardRect.width;

    const style = window.getComputedStyle(track);
    const gap = parseFloat(style.columnGap || style.gap || 20);
    const step = cardWidth + gap;

    const visibleCards = Math.max(1, Math.round((track.clientWidth + gap) / step));
    const totalCards = cards.length;
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    const totalPages = Math.ceil(totalCards / visibleCards);

    return { cards, cardWidth, gap, step, visibleCards, totalCards, maxScroll, totalPages };
  }

  function scrollNext() {
    const m = getMetrics();
    if (!m) return;
    const scrollPageWidth = m.step * m.visibleCards;
    if (track.scrollLeft + scrollPageWidth >= m.maxScroll - 10) {
      track.scrollTo({ left: 0, behavior: "smooth" });
    } else {
      track.scrollBy({ left: scrollPageWidth, behavior: "smooth" });
    }
  }

  function scrollPrev() {
    const m = getMetrics();
    if (!m) return;
    const scrollPageWidth = m.step * m.visibleCards;
    if (track.scrollLeft <= 10) {
      track.scrollTo({ left: m.maxScroll, behavior: "smooth" });
    } else {
      track.scrollBy({ left: -scrollPageWidth, behavior: "smooth" });
    }
  }

  function buildDots() {
    if (!dotsContainer) return;
    const m = getMetrics();
    if (!m) return;

    dotsContainer.innerHTML = "";
    for (let i = 0; i < m.totalPages; i++) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = `carousel-dot ${i === 0 ? "active" : ""}`;
      dot.setAttribute("aria-label", `Slide ${i + 1}`);
      dot.addEventListener("click", () => {
        const target = Math.min(m.maxScroll, i * m.step * m.visibleCards);
        track.scrollTo({ left: target, behavior: "smooth" });
        resetAutoSlide();
      });
      dotsContainer.appendChild(dot);
    }
  }

  function updateActiveDot() {
    if (!dotsContainer || !dotsContainer.children.length) return;
    const m = getMetrics();
    if (!m) return;

    const scrollPageWidth = m.step * m.visibleCards;
    const activeIndex = Math.min(
      m.totalPages - 1,
      Math.max(0, Math.round(track.scrollLeft / scrollPageWidth))
    );

    Array.from(dotsContainer.children).forEach((dot, idx) => {
      dot.classList.toggle("active", idx === activeIndex);
    });
  }

  let autoSlideTimer = null;
  function startAutoSlide() {
    stopAutoSlide();
    autoSlideTimer = setInterval(() => {
      scrollNext();
    }, 4500);
  }

  function stopAutoSlide() {
    if (autoSlideTimer) {
      clearInterval(autoSlideTimer);
      autoSlideTimer = null;
    }
  }

  function resetAutoSlide() {
    stopAutoSlide();
    startAutoSlide();
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      scrollPrev();
      resetAutoSlide();
    });
    prevBtn.addEventListener("mouseenter", stopAutoSlide);
    prevBtn.addEventListener("mouseleave", startAutoSlide);
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      scrollNext();
      resetAutoSlide();
    });
    nextBtn.addEventListener("mouseenter", stopAutoSlide);
    nextBtn.addEventListener("mouseleave", startAutoSlide);
  }

  track.addEventListener("mouseenter", stopAutoSlide);
  track.addEventListener("mouseleave", startAutoSlide);
  track.addEventListener("touchstart", stopAutoSlide, { passive: true });
  track.addEventListener("touchend", () => {
    setTimeout(startAutoSlide, 2000);
  }, { passive: true });

  let isScrolling = false;
  track.addEventListener("scroll", () => {
    if (!isScrolling) {
      window.requestAnimationFrame(() => {
        updateActiveDot();
        isScrolling = false;
      });
      isScrolling = true;
    }
  }, { passive: true });

  // Mouse drag support for smooth horizontal interaction
  let isDown = false;
  let startX = 0;
  let scrollStartLeft = 0;

  track.addEventListener("mousedown", (e) => {
    isDown = true;
    startX = e.pageX - track.offsetLeft;
    scrollStartLeft = track.scrollLeft;
    track.style.scrollBehavior = "auto";
    track.style.cursor = "grabbing";
    stopAutoSlide();
  });

  window.addEventListener("mouseup", () => {
    if (!isDown) return;
    isDown = false;
    track.style.scrollBehavior = "smooth";
    track.style.cursor = "";
    startAutoSlide();
    setTimeout(updateActiveDot, 150);
  });

  track.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - track.offsetLeft;
    const walk = (x - startX) * 1.4;
    track.scrollLeft = scrollStartLeft - walk;
  });

  // Rebuild dots on window resize or load
  window.addEventListener("resize", () => {
    buildDots();
    updateActiveDot();
  });

  window.addEventListener("load", () => {
    buildDots();
    updateActiveDot();
  });

  // Initialize
  buildDots();
  startAutoSlide();
}