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
  initLogoLoader();
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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("contactName")?.value.trim() || "";
    const phone = document.getElementById("contactPhone")?.value.trim() || "";
    const players = document.getElementById("playerCount")?.value || "1";
    const msg = document.getElementById("contactMsg")?.value.trim() || "";

    if (!name || !phone) {
      showToast("Please enter your name and phone number.");
      return;
    }

    // Show glowing logo loader during submission
    const loader = document.getElementById("logoLoader");
    const statusText = document.getElementById("loaderStatusText");
    if (loader) {
      if (statusText) statusText.textContent = "TRANSMITTING ENQUIRY";
      loader.style.display = "flex";
      loader.classList.remove("fade-out");
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

    // Send enquiry to FormSubmit API (email dispatch to infinitygamersofficial.8@gmail.com)
    const emailPayload = {
      name: name,
      phone: phone,
      players: players,
      message: msg,
      _subject: `New PS5 Lounge Enquiry from ${name} (${phone}) - Infinity Gamers`,
      _captcha: "false",
      _template: "table"
    };

    try {
      await fetch("https://formsubmit.co/ajax/infinitygamersofficial.8@gmail.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(emailPayload)
      });
    } catch (err) {
      console.warn("Email service notice:", err);
    }

    // Also sync with backend API if running
    fetch("/api/enquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, players, msg })
    }).catch(err => console.warn("Server enquiry sync error:", err));

    setTimeout(() => {
      if (loader) {
        loader.classList.add("fade-out");
        setTimeout(() => {
          loader.style.display = "none";
          if (statusText) statusText.textContent = "INITIALIZING PORTAL";
        }, 500);
      }
      form.reset();
      showToast(`Thank you, ${name}! Your enquiry has been sent to our team at infinitygamersofficial.8@gmail.com.`);
    }, 750);
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

// LOGO LOADING ANIMATION CONTROLLER (WITH NEON GLOW)
function initLogoLoader() {
  const loader = document.getElementById("logoLoader");
  if (!loader) return;

  const statusText = document.getElementById("loaderStatusText");

  const hideLoader = () => {
    loader.classList.add("fade-out");
    setTimeout(() => {
      loader.style.display = "none";
      if (statusText) statusText.textContent = "INITIALIZING PORTAL";
    }, 600);
  };

  // Ensure minimum visibility of 700ms so user experiences the glowing logo
  const startTime = Date.now();
  window.addEventListener("load", () => {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, 700 - elapsed);
    setTimeout(hideLoader, remaining);
  });

  // Fallback in case window load fired early
  setTimeout(hideLoader, 1300);

  // Restore on browser back/forward navigation
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      hideLoader();
    }
  });

  // Display glowing logo loader on internal page navigation clicks
  document.querySelectorAll("a[href]").forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      const target = link.getAttribute("target");
      if (!href) return;
      if (
        target === "_blank" ||
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("tel:") ||
        href.startsWith("mailto:") ||
        href.startsWith("#") ||
        href.startsWith("javascript:")
      ) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;

      if (statusText) {
        const dest = href.replace(".html", "").replace(/[^a-zA-Z]/g, "").toUpperCase();
        statusText.textContent = dest === "INDEX" ? "LOADING PORTAL" : `LOADING ${dest || "PORTAL"}`;
      }
      loader.style.display = "flex";
      loader.classList.remove("fade-out");
    });
  });
}