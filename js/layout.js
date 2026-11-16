/** Header + Footer partagés — entièrement en français */
function renderHeader(active = 'accueil') {
  const links = [
    { id: 'accueil', href: 'index.html', label: 'Accueil' },
    { id: 'explorer', href: 'explorer.html', label: 'Parcourir' },
    { id: 'remarquables', href: 'remarquables.html', label: 'Espèces remarquables' },
    { id: 'stats', href: 'statistiques.html', label: 'Statistiques' },
    { id: 'jardin', href: 'jardin.html', label: 'Le Jardin' },
  ];
  return `
  <header class="site-header">
    <div class="header-inner">
      <a href="index.html" class="logo">
        <span class="logo-icon">🍃</span>
        Jardin-Verger de Pardaillan
      </a>
      <nav class="nav">
        ${links.map(l => `<a href="${l.href}" class="${l.id === active ? 'active' : ''}">${l.label}</a>`).join('')}
      </nav>
      <div class="search-box">
        <span>🔍</span>
        <input type="search" id="global-search" placeholder="Rechercher une espèce…" />
      </div>
    </div>
  </header>`;
}

function renderFooter() {
  return `
  <footer class="site-footer">
    <div class="footer-inner">
      <div>
        <strong style="color:#fff">Jardin-Verger de Pardaillan</strong><br>
        Lieu de biodiversité partagé · Données issues d'<a href="https://www.inaturalist.org/projects/jardin-verger-de-pardaillan" target="_blank" rel="noopener">iNaturalist</a>
      </div>
      <div style="display:flex;gap:1.25rem;flex-wrap:wrap">
        <a href="https://www.inaturalist.org/projects/jardin-verger-de-pardaillan" target="_blank" rel="noopener">Projet iNaturalist</a>
        <a href="explorer.html">Parcourir les espèces</a>
        <a href="statistiques.html">Statistiques</a>
      </div>
    </div>
  </footer>`;
}

function mountLayout(active) {
  const headerEl = document.getElementById('site-header');
  const footerEl = document.getElementById('site-footer');
  if (headerEl) headerEl.outerHTML = renderHeader(active);
  if (footerEl) footerEl.outerHTML = renderFooter();
}

window.mountLayout = mountLayout;
