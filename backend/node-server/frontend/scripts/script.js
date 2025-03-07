document.addEventListener("DOMContentLoaded", () => {
    if (typeof initQuiz === "function") initQuiz();
    if (typeof initLogin === "function") initLogin();
    if (typeof initRegister === "function") initRegister();
   
    // Initialize UI on page load
    window.updateUI();

});