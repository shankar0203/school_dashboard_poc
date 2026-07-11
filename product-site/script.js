// Invisos landing page — cursor-tracking interactive effects.
// All effects are additive and safe to run even if a user has JS disabled
// (the page is fully readable and functional without this file).

(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) return;

  var root = document.documentElement;

  // 1. Global page-wide spotlight that follows the cursor.
  var rafPending = false;
  var lastX = window.innerWidth / 2;
  var lastY = window.innerHeight / 2;

  function applyGlobalGlow() {
    root.style.setProperty("--mx", lastX + "px");
    root.style.setProperty("--my", lastY + "px");
    rafPending = false;
  }

  window.addEventListener("mousemove", function (e) {
    lastX = e.clientX;
    lastY = e.clientY;
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(applyGlobalGlow);
    }
  }, { passive: true });

  // 2. Per-card spotlight — a soft highlight that follows the cursor
  //    within any card, role block, or pricing tile.
  var spotlightTargets = document.querySelectorAll(
    ".card, .role-block, .hero-preview"
  );

  spotlightTargets.forEach(function (el) {
    el.classList.add("spotlight-card");

    el.addEventListener("mousemove", function (e) {
      var rect = el.getBoundingClientRect();
      el.style.setProperty("--cx", (e.clientX - rect.left) + "px");
      el.style.setProperty("--cy", (e.clientY - rect.top) + "px");
    }, { passive: true });
  });

  // 3. Subtle 3D tilt on the hero stats preview, following the cursor
  //    within the hero section only.
  var hero = document.querySelector(".hero");
  var preview = document.getElementById("heroPreview");

  if (hero && preview) {
    hero.addEventListener("mousemove", function (e) {
      var rect = hero.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width - 0.5;
      var py = (e.clientY - rect.top) / rect.height - 0.5;
      var tiltX = (py * -4).toFixed(2);
      var tiltY = (px * 6).toFixed(2);
      preview.style.transform =
        "perspective(900px) rotateX(" + tiltX + "deg) rotateY(" + tiltY + "deg)";
    }, { passive: true });

    hero.addEventListener("mouseleave", function () {
      preview.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
    });
  }
})();
