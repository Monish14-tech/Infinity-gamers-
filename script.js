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
        const category = card.dataset.category || "";
        const matchesFilter = filter === "all" || category === filter || category.split(" ").includes(filter);
        if (matchesFilter) {
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