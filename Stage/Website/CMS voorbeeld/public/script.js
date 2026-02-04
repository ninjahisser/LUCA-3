// Simple mockup for button actions

document.addEventListener('DOMContentLoaded', function() {
  var manageBtn = document.getElementById('manage-articles');
  if (manageBtn) {
    manageBtn.onclick = function() {
      alert('Manage Articles page would open (mockup)');
    };
  }
  var editBtns = document.querySelectorAll('.edit-btn');
  editBtns.forEach(function(btn) {
    btn.onclick = function() {
      window.location.href = 'edit-article.html';
    };
  });
});
