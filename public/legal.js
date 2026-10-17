(function () {
  function apply() {
    var zh = window.ME_LANG && window.ME_LANG() === 'zh';
    var blocks = document.querySelectorAll('[data-block]');
    for (var i = 0; i < blocks.length; i++) {
      blocks[i].style.display = blocks[i].getAttribute('data-block') === (zh ? 'zh' : 'en') ? '' : 'none';
    }
    document.documentElement.lang = zh ? 'zh-CN' : 'en';
    var t = document.body.getAttribute(zh ? 'data-title-zh' : 'data-title-en');
    if (t) document.title = t;
  }
  window.addEventListener('melangchange', apply);
  apply();
})();
