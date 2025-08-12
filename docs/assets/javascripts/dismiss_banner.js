// docs/assets/javascripts/dismiss_banner.js

document.addEventListener("DOMContentLoaded", function() {
  // Find the banner and the close button
  const banner = document.querySelector(".md-banner--warning");
  const closeButton = document.querySelector(".banner-close-button");

  // If they don't exist, do nothing
  if (!banner || !closeButton) {
    return;
  }

  // Check if the banner was already dismissed
  if (localStorage.getItem("bannerDismissed") === "true") {
    banner.style.display = "none";
    return;
  }

  // Add a click event to the close button
  closeButton.addEventListener("click", function() {
    banner.style.display = "none";
    localStorage.setItem("bannerDismissed", "true");
  });
});
