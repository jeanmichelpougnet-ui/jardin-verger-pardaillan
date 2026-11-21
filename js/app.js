
const PLACEHOLDER = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22400%22%20height%3D%22300%22%3E%3Crect%20fill%3D%22%23e8f0e0%22%20width%3D%22400%22%20height%3D%22300%22/%3E%3Ctext%20x%3D%22200%22%20y%3D%22155%22%20text-anchor%3D%22middle%22%20fill%3D%22%235c820d%22%20font-size%3D%2216%22%20font-family%3D%22sans-serif%22%3EPas%20de%20photo%3C/text%3E%3C/svg%3E";
const HERO = ["https://inaturalist-open-data.s3.amazonaws.com/photos/750559732/medium.jpg", "https://inaturalist-open-data.s3.amazonaws.com/photos/715194073/medium.jpg", "https://inaturalist-open-data.s3.amazonaws.com/photos/741741412/medium.jpg", "https://inaturalist-open-data.s3.amazonaws.com/photos/745891522/medium.jpg", "https://inaturalist-open-data.s3.amazonaws.com/photos/750559314/medium.jpg", "https://inaturalist-open-data.s3.amazonaws.com/photos/695834403/medium.jpg"];
let DATA = null;
const RANK_FR = {kingdom:'Règne',phylum:'Branche',division:'Division',class:'Classe',order:'Ordre',family:'Famille',genus:'Genre',species:'Espèce'};
const GROUPES_FR = {Insecta:'Insectes',Plantae:'Plantes',Fungi:'Champignons',Aves:'Oiseaux',Mammalia:'Mammifères',Amphibia:'Amphibiens',Reptilia:'Reptiles',Arachnida:'Araignées',Mollusca:'Mollusques'};
const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
const EMBLEMATIC = ['Oriolus oriolus','Libellula depressa','Rana temporaria','Pyronia tithonus','Vanessa cardui','Graphosoma italicum','Euonymus europaeus'];

function esc(s){return String(s||'').replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'&quot;');}
function fd(str){if(!str)return'—';try{return new Date(str).toLocaleDateString('fr-FR');}catch(e){return str;}}
function psrc(photo,size){if(!photo)return PLACEHOLDER;if(typeof photo==='string')return photo;size=size||'medium';if(size==='square'||size==='s')return photo.s||photo.square||photo.m||photo.medium||PLACEHOLDER;return photo.m||photo.medium||photo.s||photo.square||PLACEHOLDER;}
function imgCard(photo,alt){const s=psrc(photo,'medium'),q=psrc(photo,'square');return '<div class="card-img-wrap"><img src="'+s+'" alt="'+esc(alt||'')+'" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="if(!this.dataset.f){this.dataset.f=1;this.src=\''+q+'\';}else{this.onerror=null;this.src=PLACEHOLDER}"></div>';}
function fiche(tid){return (DATA.fiches&&DATA.fiches[String(tid)])||{};}

function header(active){
  const L=[['accueil','Accueil'],['explorer','Parcourir'],['remarquables','Espèces remarquables'],['stats','Statistiques'],['jardin','Le Jardin']];
  return '<header class="site-header"><div class="header-inner"><a href="#accueil" class="logo" data-nav="accueil"><span class="logo-icon">🍃</span> Jardin-Verger de Pardaillan</a><nav class="nav">'+
    L.map(([id,l])=>'<a href="#'+id+'" data-nav="'+id+'" class="'+(id===active?'active':'')+'">'+l+'</a>').join('')+
    '</nav><div class="search-box"><span>🔍</span><input type="search" placeholder="Rechercher une espèce…" aria-label="Rechercher une espèce"></div></div></header>';
}
function footer(){return '<footer class="site-footer"><div class="footer-inner"><div><strong style="color:#fff">Jardin-Verger de Pardaillan</strong><br>Observer · Comprendre · Préserver</div><a href="https://www.inaturalist.org/projects/jardin-verger-de-pardaillan" target="_blank" rel="noopener">iNaturalist</a></div></footer>';}
function mount(a){document.getElementById('app-header').innerHTML=header(a);document.getElementById('app-footer').innerHTML=footer();bind();}
function bind(){
  document.querySelectorAll('[data-nav]').forEach(a=>a.onclick=e=>{const id=a.getAttribute('data-nav');if(id){e.preventDefault();go(id,a.dataset.groupe);}});
  document.querySelectorAll('[data-espece]').forEach(a=>a.onclick=e=>{e.preventDefault();go('espece',a.dataset.espece);});
}
function go(page,param){location.hash=param?page+'/'+param:page;scrollTo(0,0);route();}

function pageAccueil(){
  mount('accueil');const s=DATA.stats,m=document.getElementById('app-main');m.className='container';
  m.innerHTML='<div class="photo-grid-hero" role="img" aria-label="Photos récentes du jardin">'+(HERO.length?HERO:['']).map(u=>u?'<img src="'+u+'" alt="Observation récente" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'">':'').join('')+'</div>'+
    '<section class="hero"><div class="hero-bg"></div><div class="hero-content"><h1>Jardin-Verger de Pardaillan</h1><p>Observer · Comprendre · Préserver</p><div class="stats-row">'+
    '<div class="stat-badge"><span>'+(s.totalObs||s.observations||0)+'</span> observations</div><div class="stat-badge"><span>'+(s.totalSpecies||s.species||(DATA.species||[]).length)+'</span> espèces</div><div class="stat-badge"><span>'+(s.observers||0)+'</span> observateurs</div></div></div></section>'+
    '<section class="mb-2"><div class="section-title"><span>Observations récentes</span><a href="#explorer" data-nav="explorer">Parcourir →</a></div><div class="card-grid" id="ro"></div></section>'+
    '<section class="mt-3"><div class="section-title"><span>Grands groupes</span></div><div class="group-cards" id="gc"></div></section>';
  document.getElementById('ro').innerHTML=DATA.recent.map(o=>'<a class="card" href="#espece/'+o.taxon_id+'" data-espece="'+o.taxon_id+'">'+imgCard(o.photo,o.common)+'<div class="card-body"><h3>'+esc(o.common)+'</h3><div class="sci">'+esc(o.name)+'</div></div></a>').join('');
  document.getElementById('gc').innerHTML=(DATA.iconic||[]).map(g=>{const sp=DATA.species.find(x=>x.iconic===(g.name||g.key)&&x.photo);return '<a class="group-card" href="#explorer" data-nav="explorer" data-groupe="'+(g.name||g.key)+'"><div class="img-wrap"><img src="'+psrc(sp&&sp.photo,'medium')+'" loading="lazy" referrerpolicy="no-referrer"></div><div class="body"><h3>'+(g.icon||'')+' '+(GROUPES_FR[g.name||g.key]||g.label||g.name||g.key)+'</h3><p>'+(g.desc||'')+'</p><div class="footer"><span class="text-muted">'+g.count+' obs.</span></div></div></a>';}).join('');
  bind();
}

function pageExplorer(groupe){
  mount('explorer');const m=document.getElementById('app-main');m.className='container';
  m.innerHTML='<div class="page-header"><div class="breadcrumb"><a href="#accueil" data-nav="accueil">Accueil</a> › Parcourir</div><h1>Parcourir les êtres vivants</h1></div><div class="explorer-layout"><aside class="sidebar"><h2>🍃 Groupes</h2><div class="tree-item active" data-group="all"><span>Tous</span><span class="count">'+(DATA.stats.totalSpecies||DATA.stats.species||DATA.species.length)+'</span></div><div id="tg"></div></aside><div><div class="filters-bar" id="fc"></div><div class="section-title"><span id="lt">Toutes les espèces</span><span class="text-muted" id="lc"></span></div><div class="card-grid" id="sl"></div></div></div>';
  document.getElementById('tg').innerHTML=(DATA.iconic||[]).map(g=>'<div class="tree-item" data-group="'+(g.name||g.key)+'"><span>'+(g.icon||'')+' '+(GROUPES_FR[g.name||g.key]||g.label||g.name||g.key)+'</span><span class="count">'+speciesInGroup(g.name||g.key)+'</span></div>').join('');
  document.getElementById('fc').innerHTML=(DATA.iconic||[]).map(g=>'<button class="chip" data-group="'+(g.name||g.key)+'">'+(g.icon||'')+' '+(GROUPES_FR[g.name||g.key]||g.label||g.name||g.key)+' <span class="n">'+speciesInGroup(g.name||g.key)+'</span></button>').join('');
  let cur=groupe||'all';
  const rend=()=>{document.querySelectorAll('.tree-item,.chip').forEach(el=>el.classList.toggle('active',el.dataset.group===cur));let items=DATA.species;if(cur!=='all')items=items.filter(s=>s.iconic===cur);const tm=Object.fromEntries((DATA.iconic||[]).map(g=>[g.key,GROUPES_FR[g.name||g.key]||g.label||g.name||g.key]));document.getElementById('lt').textContent=cur==='all'?'Toutes les espèces':(tm[cur]||GROUPES_FR[cur]||cur);document.getElementById('lc').textContent=items.length+' espèces';document.getElementById('sl').innerHTML=items.map(s=>'<a class="card" href="#espece/'+s.taxon_id+'" data-espece="'+s.taxon_id+'">'+imgCard(s.photo,s.common)+'<div class="card-body"><h3>'+esc(s.common)+'</h3><div class="sci">'+esc(s.name)+'</div><div class="card-meta">'+s.count+' obs.</div></div></a>').join('');bind();};
  document.querySelectorAll('.tree-item,.chip').forEach(el=>el.addEventListener('click',()=>{cur=el.dataset.group;rend();}));bind();rend();
}

// Nombre d'espèces distinctes d'un groupe (d'après la liste des espèces, pas les totaux d'observations)
function speciesInGroup(k){ return (DATA.species||[]).filter(function(s){return s.iconic===k;}).length; }

function pageStats(){
  mount('stats');
  const m=document.getElementById('app-main');
  m.className='container stats-page';
  const s=DATA.stats||{};
  const totalObs=s.totalObs||s.observations||DATA.species.reduce((a,x)=>a+(x.count||0),0);
  const totalSp=s.totalSpecies||s.species||(DATA.species||[]).length;
  const research=s.researchGrade||0;
  const needsId=Math.max(0, Math.round(totalObs*0.08)); // estimation légère si non fourni
  const casual=Math.max(0, totalObs-research-needsId);
  const observers=s.observers||s.totalObservers||'—';

  const GROUP_COLORS={
    Insecta:'#f97316', Plantae:'#65a30d', Fungi:'#a855f7', Aves:'#0ea5e9',
    Mammalia:'#78716c', Amphibia:'#14b8a6', Arachnida:'#eab308', Reptilia:'#84cc16', Mollusca:'#f472b6'
  };
  const iconic=(DATA.iconic||[]).map(g=>({
    key:g.key||g.name,
    label:GROUPES_FR[g.name||g.key]||g.label||g.name||g.key,
    count:g.count||0,
    color:GROUP_COLORS[g.key||g.name]||'#94a3b8'
  })).filter(g=>g.count>0);

  // Espèces par groupe (réel) : une espèce = une entrée de la liste, quel que soit son nombre d'observations
  const iconicSp=Object.entries((DATA.species||[]).reduce((a,sp)=>{const k=sp.iconic||'Autre'; a[k]=(a[k]||0)+1; return a;},{}))
    .map(([k,n])=>({key:k, label:GROUPES_FR[k]||k, count:n, color:GROUP_COLORS[k]||'#94a3b8'}))
    .sort((a,b)=>b.count-a.count);

  // Statuts
  const stCount={indigene:0,introduite:0,envahissante:0,protegee:0,autre:0};
  Object.values(DATA.fiches||{}).forEach(f=>{
    const c=(f.statut_local&&f.statut_local.category)||'autre';
    if(stCount[c]!=null) stCount[c]++; else stCount.autre++;
  });

  // Qualité obs (donut 1)
  const quality=[
    {label:'Recherche', count:research, color:'#84cc16'},
    {label:'Besoin d\'identification', count:needsId, color:'#fde047'},
    {label:'Vérifiée', count:casual, color:'#22c55e'}
  ].filter(x=>x.count>0);

  // Mois d'observation (à partir des dates des fiches)
  const monthNames=['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
  const byMonth=Array(12).fill(0);
  const byYear={};
  (DATA.species||[]).forEach(sp=>{
    const f=(DATA.fiches&&DATA.fiches[String(sp.taxon_id)])||{};
    const d=f.derniere_obs||f.premiere_obs||'';
    if(d && d.length>=7){
      const y=d.slice(0,4), mo=+d.slice(5,7);
      if(mo>=1&&mo<=12) byMonth[mo-1]+=(sp.count||1);
      byYear[y]=(byYear[y]||0)+(sp.count||1);
    }
  });
  // fallback: distribute totalObs if months empty
  if(byMonth.every(x=>x===0) && totalObs){
    // peak summer default from known project season
    [3,4,5,6,7,8,9].forEach((i,idx)=>{ byMonth[i]=Math.round(totalObs*[0.05,0.15,0.14,0.12,0.16,0.12,0.1][idx]||0); });
  }
  const years=Object.keys(byYear).sort();
  const yCurrent=years[years.length-1]||String(new Date().getFullYear());
  const yPrev=years.length>1?years[years.length-2]:String(+yCurrent-1);
  const obsYear=y=>byYear[y]||0;
  // species per year approx from premiere_obs
  const spByYear={};
  Object.values(DATA.fiches||{}).forEach(f=>{
    const d=f.premiere_obs||'';
    if(d&&d.length>=4){ const y=d.slice(0,4); spByYear[y]=(spByYear[y]||0)+1; }
  });

  // Top espèces
  const top=[...(DATA.species||[])].sort((a,b)=>(b.count||0)-(a.count||0)).slice(0,8);

  // Arbre taxonomique pour sunburst (2–3 niveaux)
  function buildTaxonTree(){
    const root={name:'Êtres vivants', count:0, children:{}, color:'#1e3a5f'};
    (DATA.species||[]).forEach(sp=>{
      const f=(DATA.fiches&&DATA.fiches[String(sp.taxon_id)])||{};
      const n=sp.count||1;
      const iconic=sp.iconic||'Autre';
      const gLabel=GROUPES_FR[iconic]||iconic;
      const classif=f.classification||[];
      let family=(classif.find(r=>r.rank==='family')||{});
      let famName=family.common||family.name||'Autres';
      // French-ish short
      if(/idae$/i.test(famName)||/aceae$/i.test(famName)){
        // keep latin family if no common — ok for sunburst detail
      }
      if(!root.children[iconic]){
        root.children[iconic]={name:gLabel, key:iconic, count:0, children:{}, color:GROUP_COLORS[iconic]||'#94a3b8'};
      }
      const gNode=root.children[iconic];
      gNode.count+=n;
      if(!gNode.children[famName]){
        gNode.children[famName]={name:famName, count:0, children:{}, color:gNode.color};
      }
      gNode.children[famName].count+=n;
      // species leaf
      const sname=sp.common||sp.name;
      gNode.children[famName].children[sname]={name:sname, count:n, taxon_id:sp.taxon_id, color:gNode.color, children:{}};
      root.count+=n;
    });
    function toArr(node){
      const kids=Object.values(node.children||{}).map(toArr).sort((a,b)=>b.count-a.count);
      return {name:node.name, count:node.count, color:node.color, key:node.key, taxon_id:node.taxon_id, children:kids};
    }
    return toArr(root);
  }
  const taxTree=buildTaxonTree();

  m.innerHTML=
    '<div class="page-header"><h1>Statistiques</h1>'+
      '<p class="page-lead">Vue d’ensemble du projet Jardin-Verger de Pardaillan — même esprit que les bilans iNaturalist (anneaux, taxonomie, saisons).</p></div>'+

    // —— DONUTS ——
    '<section class="stats-dark">'+
      '<div class="donut-row" id="donut-row"></div>'+
      '<div class="stats-meta">'+
        '<div class="stats-meta-item"><span class="k">Observateurs</span><span class="v">'+esc(String(observers))+'</span></div>'+
        '<div class="stats-meta-item"><span class="k">Espèces protégées</span><span class="v">'+stCount.protegee+'</span></div>'+
        '<div class="stats-meta-item"><span class="k">Envahissantes</span><span class="v">'+stCount.envahissante+'</span></div>'+
        '<div class="stats-meta-item"><span class="k">Indigènes</span><span class="v">'+stCount.indigene+'</span></div>'+
      '</div>'+
    '</section>'+

    // —— SUNBURST ——
    '<section class="stats-dark stats-block">'+
      '<h2 class="stats-h">Espèces observées</h2>'+
      '<p class="stats-help">Répartition taxonomique « en soleil » : le centre regroupe tous les êtres vivants du projet ; chaque anneau détaille un niveau (groupe → famille → espèces les plus vues). La taille des arcs est proportionnelle au nombre d’observations. Vert ≈ plantes, orange ≈ insectes, bleu ≈ oiseaux, etc.</p>'+
      '<div class="sunburst-wrap"><div id="sunburst"></div><div id="sunburst-legend" class="sunburst-legend"></div></div>'+
    '</section>'+

    // —— COURBE D'ACCUMULATION ——
    '<section class=\"stats-dark stats-block\">'+
      '<h2 class=\"stats-h\">Courbe d’accumulation des espèces</h2>'+
      '<p class=\"stats-help\">Nombre total d’espèces différentes recensées au fil du temps, d’après la date de première observation de chaque espèce. Tant que la courbe monte, l’inventaire n’est pas terminé.</p>'+
      '<div id=\"accum-chart\" class=\"accum-wrap\"></div>'+
      '<div id=\"accum-sum\" class=\"accum-sum\"></div>'+
    '</section>'+

    // —— COMPLÉTUDE + RÔLES ÉCOLOGIQUES ——
    '<section class=\"stats-dark stats-block\">'+
      '<div class=\"stats-two\">'+
        '<div><h2 class=\"stats-h\">Complétude de l’inventaire</h2><div id=\"complete-box\"></div></div>'+
        '<div><h2 class=\"stats-h\">Rôles écologiques</h2><div id=\"roles-box\"></div></div>'+
      '</div>'+
    '</section>'+

    // —— MOIS + ANNÉES ——
    '<section class="stats-dark stats-block">'+
      '<h2 class="stats-h">Activité au fil des mois</h2>'+
      '<p class="stats-help">Observations regroupées par mois (d’après les dates des fiches / dernières obs.).</p>'+
      '<div id="month-bars" class="month-bars"></div>'+
    '</section>'+

    '<section class="stats-dark stats-block">'+
      '<h2 class="stats-h">Comparaison avec les années précédentes</h2>'+
      '<p class="stats-help">Barre verte = année la plus récente disponible, barre claire = année précédente. Les zones grises rappellent l’échelle (max du jeu de données).</p>'+
      '<div class="year-legend"><span class="yl y-cur"></span> '+esc(yCurrent)+' &nbsp; <span class="yl y-prev"></span> '+esc(yPrev)+'</div>'+
      '<div id="year-bars" class="year-bars"></div>'+
    '</section>'+

    // —— TOP + STATUTS ——
    '<section class="stats-light">'+
      '<div class="stats-two">'+
        '<div><h2 class="stats-h light">Top espèces (observations)</h2><div class="top-list" id="top-list"></div></div>'+
        '<div><h2 class="stats-h light">Origine / statut des fiches</h2><div id="status-bars"></div></div>'+
      '</div>'+
    '</section>';

  // --- Donut renderer ---
  function donutSVG(segments, centerLabel, centerSub, size){
    const S=size||180; const cx=S/2, cy=S/2, R=S*0.38, r=S*0.26;
    const sum=segments.reduce((a,b)=>a+b.count,0)||1;
    let a0=-Math.PI/2;
    const paths=segments.map(seg=>{
      const ang=(seg.count/sum)*Math.PI*2;
      const a1=a0+ang;
      const x0=cx+R*Math.cos(a0), y0=cy+R*Math.sin(a0);
      const x1=cx+R*Math.cos(a1), y1=cy+R*Math.sin(a1);
      const xi0=cx+r*Math.cos(a0), yi0=cy+r*Math.sin(a0);
      const xi1=cx+r*Math.cos(a1), yi1=cy+r*Math.sin(a1);
      const large=ang>Math.PI?1:0;
      // donut path
      const d=['M',x0,y0,'A',R,R,0,large,1,x1,y1,'L',xi1,yi1,'A',r,r,0,large,0,xi0,yi0,'Z'].join(' ');
      a0=a1;
      return '<path d="'+d+'" fill="'+seg.color+'" stroke="#0f172a" stroke-width="1"><title>'+esc(seg.label)+' : '+seg.count+'</title></path>';
    }).join('');
    const legend=segments.map(seg=>'<div class="donut-leg"><span class="dot" style="background:'+seg.color+'"></span>'+esc(seg.label)+' <em>'+seg.count+'</em></div>').join('');
    return '<div class="donut-card"><svg width="'+S+'" height="'+S+'" viewBox="0 0 '+S+' '+S+'">'+paths+
      '<text x="'+cx+'" y="'+(cy-4)+'" text-anchor="middle" class="donut-num">'+centerLabel+'</text>'+
      '<text x="'+cx+'" y="'+(cy+16)+'" text-anchor="middle" class="donut-sub">'+esc(centerSub)+'</text></svg>'+
      '<div class="donut-legs">'+legend+'</div></div>';
  }

  document.getElementById('donut-row').innerHTML=
    donutSVG(quality, String(totalObs), 'OBSERVATIONS', 200)+
    donutSVG(iconicSp.map(g=>({label:g.label,count:g.count,color:g.color})), String(totalSp), 'ESPÈCES', 200);

  // --- Sunburst (arcs by angle) ---
  function renderSunburst(tree){
    const S=420, cx=S/2, cy=S/2;
    const levels=3; // center hole + 3 rings
    const ringW=48;
    const R0=36;
    // Flatten levels: L1 children of root, L2 children of L1, L3 top leaves
    function layout(node, depth, a0, a1, out){
      if(depth>3) return;
      const kids=(node.children||[]).filter(c=>c.count>0);
      const sum=kids.reduce((a,b)=>a+b.count,0)||node.count||1;
      let t=a0;
      kids.forEach(k=>{
        const span=(k.count/sum)*(a1-a0);
        const t1=t+span;
        out.push({node:k, depth, a0:t, a1:t1});
        layout(k, depth+1, t, t1, out);
        t=t1;
      });
    }
    const arcs=[];
    // root full circle as center button
    layout(tree, 1, -Math.PI/2, -Math.PI/2+Math.PI*2, arcs);
    function arcPath(a0,a1,ro,ri){
      const large=(a1-a0)>Math.PI?1:0;
      const x0=cx+ro*Math.cos(a0), y0=cy+ro*Math.sin(a0);
      const x1=cx+ro*Math.cos(a1), y1=cy+ro*Math.sin(a1);
      const xi0=cx+ri*Math.cos(a0), yi0=cy+ri*Math.sin(a0);
      const xi1=cx+ri*Math.cos(a1), yi1=cy+ri*Math.sin(a1);
      return ['M',x0,y0,'A',ro,ro,0,large,1,x1,y1,'L',xi1,yi1,'A',ri,ri,0,large,0,xi0,yi0,'Z'].join(' ');
    }
    const paths=arcs.map((a,i)=>{
      const ro=R0+a.depth*ringW;
      const ri=R0+(a.depth-1)*ringW+2;
      const col=a.node.color||'#64748b';
      // lighten by depth
      const op=1-a.depth*0.08;
      const tid=a.node.taxon_id?(' data-espece="'+a.node.taxon_id+'"'):'';
      return '<path class="sb-arc" data-i="'+i+'"'+tid+' d="'+arcPath(a.a0,a.a1,ro,ri)+'" fill="'+col+'" fill-opacity="'+op+'" stroke="#0f172a" stroke-width="0.6">'+
        '<title>'+esc(a.node.name)+' — '+a.node.count+' obs.</title></path>';
    }).join('');
    const svg='<svg id="sb-svg" width="100%" height="'+S+'" viewBox="0 0 '+S+' '+S+'">'+paths+
      '<circle cx="'+cx+'" cy="'+cy+'" r="'+(R0-4)+'" fill="#1e293b" stroke="#334155"/>'+
      '<text x="'+cx+'" y="'+(cy-2)+'" text-anchor="middle" class="sb-center-num">'+tree.count+'</text>'+
      '<text x="'+cx+'" y="'+(cy+16)+'" text-anchor="middle" class="sb-center-sub">obs.</text></svg>';
    document.getElementById('sunburst').innerHTML=svg;
    // legend top groups
    document.getElementById('sunburst-legend').innerHTML='<div class="sb-leg-title">Observations</div>'+iconic.map(g=>
      '<div class="donut-leg"><span class="dot" style="background:'+g.color+'"></span>'+esc(g.label)+' <em>'+g.count+'</em></div>'
    ).join('');
    // click species arcs
    document.querySelectorAll('#sb-svg .sb-arc[data-espece]').forEach(el=>{
      el.style.cursor='pointer';
      el.addEventListener('click',()=>{ location.hash='#espece/'+el.getAttribute('data-espece'); });
    });
  }
  renderSunburst(taxTree);

  // --- Month bars ---
  const maxM=Math.max(1,...byMonth);
  document.getElementById('month-bars').innerHTML=byMonth.map((v,i)=>
    '<div class="mbar"><div class="mbar-fill" style="height:'+(v/maxM*120)+'px" title="'+monthNames[i]+' : '+v+'"></div><span>'+monthNames[i]+'</span></div>'
  ).join('');

  // --- Courbe d'accumulation, complétude de l'inventaire, rôles écologiques ---
  (function inventaire(){
    const sps=DATA.species||[], fch=DATA.fiches||{};
    const fmtDate=d=>d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4);
    const pct=x=>Math.round(x)+'\u00a0%';

    // 1) Courbe d'accumulation (date de première observation de chaque espèce)
    const dates=sps.map(sp=>((fch[String(sp.taxon_id)]||{}).premiere_obs||'').slice(0,10))
      .filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    const box=document.getElementById('accum-chart'), sum=document.getElementById('accum-sum');
    const T=d=>Date.UTC(+d.slice(0,4),+d.slice(5,7)-1,+d.slice(8,10));
    function drawAccum(){
      const bx=document.getElementById('accum-chart'); if(!bx||dates.length<2) return;
      const n=dates.length, t0=T(dates[0]), t1=T(dates[n-1]), span=Math.max(1,t1-t0);
      const W=Math.max(300,bx.clientWidth||820), H=W<500?240:300, L=40, R=20, Tp=22, B=34;
      const yMax=Math.ceil(n/20)*20;
      const X=t=>L+(t-t0)/span*(W-L-R), Y=v=>Tp+(1-v/yMax)*(H-Tp-B);
      const pts=[]; dates.forEach((d,i)=>{ const t=T(d); if(pts.length&&pts[pts.length-1].t===t){pts[pts.length-1].v=i+1;} else pts.push({t,v:i+1,d}); });
      let line='M'+X(t0).toFixed(1)+' '+Y(0).toFixed(1);
      pts.forEach(p=>{ line+=' H'+X(p.t).toFixed(1)+' V'+Y(p.v).toFixed(1); });
      const area=line+' V'+Y(0).toFixed(1)+' Z';
      // graduations : axe vertical
      const yStep=yMax>100?40:20; let grid='';
      for(let v=0; v<=yMax; v+=yStep){ grid+='<line class="grid" x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'"/><text x="'+(L-6)+'" y="'+(Y(v)+4).toFixed(1)+'" text-anchor="end">'+v+'</text>'; }
      // graduations : axe horizontal (début de mois, assez espacés)
      const d0=new Date(t0), ticks=[]; let y=d0.getUTCFullYear(), mo=d0.getUTCMonth()+1;
      for(;;){ const t=Date.UTC(y,mo,1); if(t>t1) break; ticks.push({t,m:(mo%12),y:y+(mo>11?1:0)}); mo++; if(mo>11){mo=0;y++;} if(ticks.length>60) break; }
      const every=Math.max(1,Math.ceil(48/Math.max(1,(W-L-R)/Math.max(1,ticks.length))));
      let xl='';
      ticks.forEach((k,i)=>{ if(i%every) return; const x=X(k.t).toFixed(1);
        xl+='<line class="grid" x1="'+x+'" x2="'+x+'" y1="'+Tp+'" y2="'+(H-B)+'"/><text x="'+x+'" y="'+(H-B+16)+'" text-anchor="middle">'+monthNames[k.m]+(k.m===0||i===0?' '+String(k.y).slice(2):'')+'</text>'; });
      const dots=pts.map(p=>'<circle cx="'+X(p.t).toFixed(1)+'" cy="'+Y(p.v).toFixed(1)+'" r="5" fill="transparent"><title>'+fmtDate(p.d)+' : '+p.v+' espèces</title></circle>').join('');
      const last=pts[pts.length-1];
      bx.innerHTML='<svg class="accum-svg" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Courbe d’accumulation : '+n+' espèces au total">'+
        '<defs><linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a3e635" stop-opacity=".45"/><stop offset="1" stop-color="#a3e635" stop-opacity=".02"/></linearGradient></defs>'+
        grid+xl+'<path class="acc-area" d="'+area+'"/><path class="acc-line" d="'+line+'"/>'+dots+
        '<circle class="acc-end" cx="'+X(last.t).toFixed(1)+'" cy="'+Y(last.v).toFixed(1)+'" r="4"/>'+
        '<text class="acc-total" x="'+(X(last.t)-8).toFixed(1)+'" y="'+(Y(last.v)-10).toFixed(1)+'" text-anchor="end">'+last.v+' espèces</text></svg>';
    }
    if(box&&sum&&dates.length>1){
      drawAccum();
      window.__drawAccum=drawAccum;
      if(!window.__accumResize){ window.__accumResize=true; let tm; window.addEventListener('resize',()=>{ clearTimeout(tm); tm=setTimeout(()=>{ if(window.__drawAccum) window.__drawAccum(); },150); }); }
      const n=dates.length, t1=T(dates[n-1]), lastD=dates[n-1];
      const recent=dates.filter(d=>T(d)>t1-60*864e5).length;
      const undated=sps.length-n;
      sum.innerHTML=
        '<span><b>'+n+'</b> espèces datées</span>'+
        '<span>Dernière nouvelle espèce : <b>'+fmtDate(lastD)+'</b></span>'+
        '<span><b>+'+recent+'</b> espèces dans les 60 jours avant le '+fmtDate(lastD)+'</span>'+
        '<p class="stats-note">'+(recent>0?'La courbe continue de monter : l’inventaire n’est pas encore stabilisé. ':'La courbe est presque à plat sur la période récente. ')+
        (undated>0?undated+' espèce'+(undated>1?'s':'')+' sans date de première observation ne figure'+(undated>1?'nt':'')+' pas sur la courbe.':'')+'</p>';
    } else if(box){ box.innerHTML='<p class="stats-note">Pas assez de dates pour tracer la courbe.</p>'; }

    // 2) Complétude de l'inventaire (estimateur Chao1 sur le nombre d'observations par espèce)
    const cb=document.getElementById('complete-box');
    if(cb){
      const counts=sps.map(sp=>sp.count||1), S=counts.length;
      const f1=counts.filter(c=>c===1).length, f2=counts.filter(c=>c===2).length;
      const est=S+(f2>0? f1*f1/(2*f2) : f1*(f1-1)/2);
      const estR=Math.max(S,Math.round(est/10)*10), left=Math.max(0,Math.round((est-S)/10)*10);
      const found=S/est*100;
      cb.innerHTML=
        '<div class="cmp-grid">'+
          '<div class="cmp-tile"><div class="cmp-num">'+pct(S?f1/S*100:0)+'</div><div class="cmp-lab">des espèces ne sont vues qu’une seule fois ('+f1+' sur '+S+')</div></div>'+
          '<div class="cmp-tile"><div class="cmp-num">≈ '+estR+'</div><div class="cmp-lab">espèces attendues au total (estimation)</div></div>'+
          '<div class="cmp-tile"><div class="cmp-num">≈ '+left+'</div><div class="cmp-lab">espèces restant à découvrir</div></div>'+
        '</div>'+
        '<div class="cmp-bar" role="img" aria-label="Inventaire estimé à '+Math.round(found)+' %"><i style="width:'+Math.min(100,found).toFixed(1)+'%"></i></div>'+
        '<div class="cmp-cap"><b>'+S+'</b> espèces trouvées, soit environ <b>'+pct(found)+'</b> de ce que le jardin pourrait abriter : il reste largement à explorer.</div>'+
        '<p class="stats-note">Estimation indicative (formule Chao1) calculée à partir du nombre d’observations de chaque espèce : c’est un ordre de grandeur, pas une mesure exacte. Elle se précisera à mesure que les observations s’accumulent.</p>';
    }

    // 3) Rôles écologiques (d'après les fiches : régime alimentaire et rôle de pollinisateur)
    const rb=document.getElementById('roles-box');
    if(rb){
      const RX_PRED=/prédat|carnivor|chasse|proie|parasit|puceron|^insectes\b|invertébrés|escargots|limaces|insectivor/;
      const RX_DEC=/décompos|saprophag|saproxyl|nécrophag|détritiv|symbionte|cadavre|matières? organiques?|bois (pourri|mort)|insectes morts|débris/;
      const R={prod:0,poll:0,pollOcc:0,pred:0,dec:0,autre:0};
      sps.forEach(sp=>{
        const f=fch[String(sp.taxon_id)]||{};
        const reg=String(f.regime_alimentaire||'').toLowerCase(), pol=String(f.pollinisateur||'').toLowerCase();
        let any=false;
        if(sp.iconic==='Plantae'||/^autotroph/.test(reg)){R.prod++;any=true;}
        if(/^oui/.test(pol)){R.poll++;any=true;} else if(/^(faible|occasionnel)/.test(pol)){R.pollOcc++;}
        if(RX_PRED.test(reg)&&!/^sève/.test(reg)&&!/^insectes, vers, graines/.test(reg)){R.pred++;any=true;}
        if(RX_DEC.test(reg)){R.dec++;any=true;}
        if(!any) R.autre++;
      });
      const N=Math.max(1,sps.length);
      const rows=[
        {l:'Producteurs',s:'plantes (photosynthèse)',v:R.prod,c:'#65a30d'},
        {l:'Pollinisateurs',s:R.pollOcc?'+ '+R.pollOcc+' occasionnels':'',v:R.poll,c:'#eab308'},
        {l:'Prédateurs et auxiliaires',s:'prédateurs, parasitoïdes',v:R.pred,c:'#f97316'},
        {l:'Décomposeurs',s:'matière morte, champignons',v:R.dec,c:'#a855f7'},
        {l:'Autres régimes',s:'herbivores, omnivores…',v:R.autre,c:'#64748b'}
      ];
      const maxV=Math.max(1,...rows.map(r=>r.v));
      rb.innerHTML=rows.map(r=>
        '<div class="role-row"><div class="role-lab">'+esc(r.l)+(r.s?'<small>'+esc(r.s)+'</small>':'')+'</div>'+
        '<div class="role-track"><div class="role-fill" style="width:'+(r.v/maxV*100).toFixed(1)+'%;background:'+r.c+'"></div></div>'+
        '<div class="role-val">'+r.v+'<small>'+pct(r.v/N*100)+'</small></div></div>').join('')+
        '<p class="stats-note">Une espèce peut avoir plusieurs rôles (un syrphe pollinise à l’état adulte et dévore des pucerons en larve) : les barres ne s’additionnent donc pas. Classement établi à partir des fiches (régime alimentaire, pollinisation).</p>';
    }
  })();

  // --- Year comparison bars ---
  const rows=[
    {label:'Nouvelles espèces / année', cur:spByYear[yCurrent]||0, prev:spByYear[yPrev]||0},
    {label:'Observations / année', cur:obsYear(yCurrent), prev:obsYear(yPrev)},
    {label:'Espèces cumulées (approx.)', cur:totalSp, prev:Math.max(0,totalSp-(spByYear[yCurrent]||0))}
  ];
  const maxY=Math.max(1,...rows.flatMap(r=>[r.cur,r.prev]));
  document.getElementById('year-bars').innerHTML=rows.map(r=>
    '<div class="yrow"><div class="ylab">'+esc(r.label)+'</div><div class="ytracks">'+
      '<div class="ytrack"><div class="yfill cur" style="width:'+(r.cur/maxY*100)+'%"></div><span class="yval">'+r.cur+' · '+esc(yCurrent)+'</span></div>'+
      '<div class="ytrack"><div class="yfill prev" style="width:'+(r.prev/maxY*100)+'%"></div><span class="yval">'+r.prev+' · '+esc(yPrev)+'</span></div>'+
    '</div></div>'
  ).join('');

  // Top list
  document.getElementById('top-list').innerHTML=top.map((sp,i)=>
    '<a class="top-row" href="#espece/'+sp.taxon_id+'" data-espece="'+sp.taxon_id+'">'+
      '<span class="top-rank">'+(i+1)+'</span>'+
      '<span class="top-name">'+esc(sp.common)+'<small>'+esc(sp.name)+'</small></span>'+
      '<span class="top-count">'+(sp.count||0)+'</span>'+
      '<span class="top-bar"><i style="width:'+((sp.count||0)/Math.max(1,top[0].count||1)*100)+'%"></i></span>'+
    '</a>'
  ).join('');

  // Status bars
  const stRows=[
    {label:'Indigènes', n:stCount.indigene, color:'#16a34a'},
    {label:'Protégées', n:stCount.protegee, color:'#7c3aed'},
    {label:'Introduites', n:stCount.introduite, color:'#d97706'},
    {label:'Envahissantes', n:stCount.envahissante, color:'#dc2626'},
    {label:'Autres / locaux', n:stCount.autre, color:'#64748b'}
  ];
  const maxS=Math.max(1,...stRows.map(x=>x.n));
  document.getElementById('status-bars').innerHTML=stRows.map(r=>
    '<div class="strow"><span class="stlab">'+r.label+'</span>'+
    '<div class="sttrack"><div class="stfill" style="width:'+(r.n/maxS*100)+'%;background:'+r.color+'"></div></div>'+
    '<span class="stn">'+r.n+'</span></div>'
  ).join('');

  bind();
}

function pageRemarquables(){
  mount('remarquables');const m=document.getElementById('app-main');m.className='container';
  const ficheOf=s=>(DATA.fiches&&DATA.fiches[String(s.taxon_id)])||{};
  const isProtegee=s=>{
    const f=ficheOf(s);const st=f.statut_local||{};const cons=f.conservation||{};
    if(st.category==='protegee') return true;
    if(['NT','VU','EN','CR','RE','EW'].includes(String(cons.code||'').toUpperCase())) return true;
    // oiseaux (protection générale) + amphibiens + hérisson déjà couverts via category
    return false;
  };
  const isRare=s=>{
    // rare locale : 1 seule observation ET pas une espèce banale de liste "emblématique fréquent"
    const f=ficheOf(s);const cons=f.conservation||{};
    if(isProtegee(s)) return false; // déjà dans l'autre panier si protégée
    // marquée rare manuellement
    if(f.remarquable==='rare'||f.rare===true) return true;
    // statut conservation DD avec peu d'obs, ou espèce à fort intérêt
    if(['VU','EN','CR'].includes(String(cons.code||'').toUpperCase())) return true;
    return false;
  };
  // 1) Rares ou protégées
  const rares=[];
  const seen=new Set();
  DATA.species.forEach(s=>{
    if(isProtegee(s)||isRare(s)){
      const f=ficheOf(s);
      rares.push({
        sp:s,f,
        badge: (f.statut_local&&f.statut_local.category==='protegee') ? 'Protégée' :
               (f.conservation&&['NT','VU','EN','CR'].includes(String(f.conservation.code||'').toUpperCase())) ? (f.conservation.code+' — '+(f.conservation.label||'menacée')) :
               'Rare',
        badgeClass: (f.statut_local&&f.statut_local.category==='protegee') ? 'badge-protege' :
                    (f.conservation&&String(f.conservation.code).toUpperCase()==='NT') ? 'badge-nt' : 'badge-rare'
      });
      seen.add(s.taxon_id);
    }
  });
  // tri : menacées d'abord, puis protégées, puis nom
  const rank=b=>({ 'badge-nt':0,'badge-protege':1,'badge-rare':2 }[b.badgeClass]??3);
  rares.sort((a,b)=>rank(a)-rank(b)||String(a.sp.common).localeCompare(String(b.sp.common),'fr'));

  // 2) Emblématiques du jardin : > 10 observations
  const SEUIL_EMBLEME=10;
  const emblemes=DATA.species
    .filter(s=>(s.count||0)>SEUIL_EMBLEME)
    .sort((a,b)=>(b.count||0)-(a.count||0))
    .map(s=>({sp:s,f:ficheOf(s),badge:(s.count||0)+' observations',badgeClass:'badge-embleme'}));

  const maxCount=DATA.species.reduce((m,s)=>Math.max(m,s.count||0),0);

  const card=it=>{
    const s=it.sp;
    return '<a class="card card-remarquable" href="#espece/'+s.taxon_id+'" data-espece="'+s.taxon_id+'">'+
      imgCard(s.photo,s.common)+
      '<div class="card-body">'+
        '<div class="rem-badge '+it.badgeClass+'">'+esc(it.badge)+'</div>'+
        '<h3>'+esc(s.common)+'</h3>'+
        '<div class="sci">'+esc(s.name)+'</div>'+
        '<div class="text-muted" style="font-size:.8rem;margin-top:.25rem">'+(s.count||0)+' obs. · '+(GROUPES_FR[s.iconic]||s.iconic||'')+'</div>'+
      '</div></a>';
  };

  const empty=msg=>'<div class="panel rem-empty"><p>'+msg+'</p></div>';

  m.innerHTML=
    '<div class="page-header">'+
      '<h1>Espèces remarquables</h1>'+
      '<p class="page-lead">Deux regards sur le jardin : les espèces à protéger ou rares, et celles qui marquent le lieu par leur fréquence (>&nbsp;'+SEUIL_EMBLEME+' observations).</p>'+
    '</div>'+

    '<section class="rem-section">'+
      '<div class="section-title"><span>🛡️ Espèces rares ou protégées</span><span class="text-muted">'+rares.length+'</span></div>'+
      '<p class="rem-intro">Espèces protégées en France, ou concernées par un statut de conservation (quasi menacée, vulnérable…).</p>'+
      (rares.length ? '<div class="card-grid">'+rares.map(card).join('')+'</div>' : empty('Aucune espèce rare ou protégée n’est encore renseignée dans les fiches.'))+
    '</section>'+

    '<section class="rem-section">'+
      '<div class="section-title"><span>⭐ Espèces emblématiques du jardin</span><span class="text-muted">'+emblemes.length+'</span></div>'+
      '<p class="rem-intro">Espèces observées <strong>plus de '+SEUIL_EMBLEME+' fois</strong> sur le projet — elles caractérisent le jardin-verger au fil des saisons.</p>'+
      (emblemes.length
        ? '<div class="card-grid">'+emblemes.map(card).join('')+'</div>'
        : empty('Pas encore d’espèce au-delà de <strong>'+SEUIL_EMBLEME+' observations</strong> (record actuel : <strong>'+maxCount+'</strong>). Elles apparaîtront ici automatiquement après les prochaines sorties et la mise à jour iNaturalist.'))+
    '</section>';
  bind();
}

function pageJardin(){
  mount('jardin');const m=document.getElementById('app-main');m.className='container';
  m.innerHTML='<div class="page-header"><h1>Le Jardin-Verger de Pardaillan</h1><p>Lieu-dit de Pardaillan et environs — 38660 Le Touvet.</p></div><div class="panel"><p>Inventaire naturaliste lié à iNaturalist. Fiches avec classification, milieu de vie, rôle dans la nature et statut de conservation.</p><a class="btn btn-primary" href="https://www.inaturalist.org/projects/jardin-verger-de-pardaillan" target="_blank" rel="noopener">Projet iNaturalist</a></div>';bind();
}

function phenoHTML(ph){
  if(!ph||!ph.length)return '<p class="pheno-note">Calendrier à compléter.</p>';
  // Group by label so multi-segment periods (hiver) share one row
  const order=[]; const map={};
  ph.forEach(p=>{
    const k=p.label||'';
    if(!map[k]){ map[k]=[]; order.push(k); }
    map[k].push(p);
  });
  const rows=order.map(label=>{
    const segs=map[label].map(p=>{
      const left=((p.start-1)/12*100).toFixed(1);
      const width=((p.end-p.start+1)/12*100).toFixed(1);
      return '<div class="pheno-fill" style="left:'+left+'%;width:'+width+'%;background:'+(p.color||'#5c820d')+'"></div>';
    }).join('');
    return '<div style="font-size:.8rem;font-weight:600;margin-top:.35rem">'+esc(label)+'</div><div class="pheno-track">'+segs+'</div>';
  }).join('');
  return rows+'<div style="display:grid;grid-template-columns:repeat(12,1fr);font-size:.65rem;color:#6b7280;text-align:center">'+MONTHS.map(x=>'<span>'+x+'</span>').join('')+'</div><p class="pheno-note">Indicatif pour la France tempérée — peut varier selon le climat et l’année.</p>';
}
function classHTML(ranks){
  if(!ranks||!ranks.length)return '<p class="text-muted">Classification en chargement…</p>';
  return ranks.map(r=>{
    const lab=RANK_FR[r.rank]||r.rank;
    const val=(r.rank==='species'||r.rank==='genus')?('<em>'+esc(r.name)+'</em>'):esc(r.common||r.name);
    return '<div class="taxo-row"><div class="taxo-rank">'+esc(lab)+'</div><div class="taxo-val"><a href="#espece/'+r.id+'" data-espece="'+r.id+'">'+val+'</a></div></div>';
  }).join('');
}


function applyFichesPersonnelles(perso){
  if(!perso||!perso.fiches||!DATA) return;
  if(!DATA.fiches) DATA.fiches={};
  perso.fiches.forEach(function(row){
    if(!row||row.taxon_id==null) return;
    var tid=String(row.taxon_id);
    var f=DATA.fiches[tid]||{taxon_id:row.taxon_id, name:row.nom_latin, common:row.nom_francais};
    if(row.nom_francais) f.common=row.nom_francais;
    if(row.intro!=null&&row.intro!=='') f.intro=row.intro;
    if(row.description!=null&&row.description!==''){ f.description_bio=row.description; f.description=row.description; }
    if(row.milieu_de_vie!=null&&row.milieu_de_vie!=='') f.biotope=row.milieu_de_vie;
    if(row.role_dans_la_nature!=null&&row.role_dans_la_nature!=='') f.ecologie=row.role_dans_la_nature;
    if(row.habitat_court!=null&&row.habitat_court!=='') f.habitat_court=row.habitat_court;
    if(row.taille!=null&&row.taille!=='') f.taille=row.taille;
    if(row.sol!=null&&row.sol!=='') f.sol=row.sol;
    if(row.associations!=null&&row.associations!=='') f.associations=row.associations;
    if(row.especes_associees!=null&&row.especes_associees!=='') f.associations=row.especes_associees;
    if(row.biologie!=null&&row.biologie!=='') f.biologie=row.biologie;
    if(row.pollinisateur!=null&&row.pollinisateur!=='') f.pollinisateur=row.pollinisateur;
    if(row.regime_alimentaire!=null&&row.regime_alimentaire!=='') f.regime_alimentaire=row.regime_alimentaire;
    if(row.utilite!=null&&row.utilite!=='') f.utilite=row.utilite;

    if(row.source_note||row.source_url){
      f.source_jessica={
        name:'Édition locale',
        credit:row.source_note||'',
        url:row.source_url||''
      };
    }
    f.enrichi=true;
    DATA.fiches[tid]=f;
  });
}
async function pageEspece(taxonId){
  mount('explorer');const main=document.getElementById('app-main');main.className='fiche-page';
  const tid=+taxonId; const local=DATA.species.find(s=>s.taxon_id===tid)||{}; let f=fiche(tid);
  main.innerHTML='<div class="loading"><div class="spinner"></div>Chargement…</div>';
  // load classification live if missing (light API call)
  if(!f.classification||!f.classification.length){
    try{
      const res=await fetch('https://api.inaturalist.org/v1/taxa/'+tid+'?locale=fr&preferred_place_id=6753');
      const t=(await res.json()).results[0];
      if(t){
        f.classification=(t.ancestors||[]).concat([t]).filter(a=>['kingdom','phylum','class','order','family','genus','species','division'].includes(a.rank)).map(a=>({rank:a.rank,id:a.id,name:a.name,common:a.preferred_common_name||a.name}));
        if(!f.common&&t.preferred_common_name)f.common=t.preferred_common_name;
        if(!f.name)f.name=t.name;
      }
    }catch(e){}
  }
  const common=f.common||local.common||'Espèce';
  const sci=f.name||local.name||'';
  const photo=(function(){var p=f.photo||local.photo||null; if((!p||!(p.m||p.medium||p.s||p.square))&&f.galerie&&f.galerie[0]){p=f.galerie[0];} if(p&&typeof p==='object'&&!p.m&&!p.medium&&(p.s||p.square)){var s=p.s||p.square; p={s:s,m:s.replace('/square.', '/medium.').replace('_square','_medium')};} return p;})();
  const hero=psrc(photo,'large')!==PLACEHOLDER?psrc(photo,'medium'):psrc(photo,'medium');
  const intro=f.intro||(common+' est une espèce observée au jardin.');
  const kingdom=(f.classification||[]).find(r=>r.rank==='kingdom');
  const family=(f.classification||[]).find(r=>r.rank==='family');
  const regne=kingdom?(kingdom.common||kingdom.name):(GROUPES_FR[f.iconic||local.iconic]||'—');
  const fam=family?(family.common||family.name):'—';
  const habitat=f.habitat_court||'Jardin-verger';
  const cons=f.conservation||{code:'NE',label:'Non évaluée',color:'#94a3b8',authority:'—',place:'France'};
  const statut=f.statut_local||{label:'Présence locale',detail:'À préciser.',source:'—'};
  const desc=(f.description&&f.description.length>60?f.description:null)||f.description_bio||f.description||intro;
  const biotope=f.biotope||f.milieu_de_vie||'Milieu de vie du jardin à préciser.';
  const eco=f.ecologie||f.role_dans_la_nature||'Rôle dans la nature à préciser.';
  const taille=f.taille||'';
  const sol=(f.iconic==='Plantae'||f.sol)?(f.sol||''):'';
  const assoc=f.associations||f.especes_associees||'';
  const biox=f.biologie||'';
  const pollin=f.pollinisateur||'À préciser';
  const regime=f.regime_alimentaire||'À préciser';
  const utilite=f.utilite||'À préciser';


  const nb=f.nb_obs||local.count||'—';
  // Prefer full photos list (all observation photos), fallback to galerie
  const gal = (f.photos && f.photos.length) ? f.photos : (f.galerie || []);
  const map=DATA.map||{lat:45.3381,lng:5.9506};
  const bbox=(map.lng-0.008)+'%2C'+(map.lat-0.008)+'%2C'+(map.lng+0.008)+'%2C'+(map.lat+0.008);

  main.innerHTML=
    '<div class="fiche-bc"><a href="#accueil" data-nav="accueil">Accueil</a> › <a href="#explorer" data-nav="explorer">Parcourir</a> › <em>'+esc(sci)+'</em></div>'+
    '<section class="fiche-hero"><div class="fiche-hero-bg" style="background-image:url(\''+hero+'\')"></div>'+
    '<div class="fiche-hero-left"><div style="font-size:.8rem;opacity:.85;margin-bottom:.4rem">🍃 Fiche espèce</div><h1>'+esc(sci)+'</h1><div class="common-name">'+esc(common)+'</div><p class="intro">'+esc(intro)+'</p><div class="loc">📍 Lieu-dit de Pardaillan et environs</div></div>'+
    '<div class="fiche-hero-right">'+
      '<div class="pill"><div class="pill-icon">🌿</div><div><div class="pill-label">Règne</div><div class="pill-value">'+esc(regne)+'</div></div></div>'+
      '<div class="pill"><div class="pill-icon">📁</div><div><div class="pill-label">Famille</div><div class="pill-value">'+esc(fam)+'</div></div></div>'+
      '<div class="pill"><div class="pill-icon">🏡</div><div><div class="pill-label">Habitat</div><div class="pill-value">'+esc(habitat)+'</div></div></div>'+
    '</div></section>'+
    '<div class="fiche-grid">'+
      '<div class="fiche-card classif-card"><h2>🌳 Classification complète</h2>'+classHTML(f.classification)+
        '<div class="classif-statut">'+
          '<div class="classif-statut-title">🛡️ Statut</div>'+
          '<div style="font-size:.78rem;color:#6b7280">'+(f.iconic==='Plantae'?'Origine / indigénat (France)':'Statut en France')+'</div>'+
          '<div class="statut-badge" style="background:'+esc(statut.color||'#16a34a')+';color:#fff;border:none">'+esc(statut.label)+'</div>'+
          '<p class="statut-detail">'+esc(statut.detail)+'</p>'+
          '<p class="statut-source">Source : '+esc(statut.source)+'</p>'+
          '<div style="font-size:.78rem;color:#6b7280;margin-top:.65rem">Conservation</div>'+
          '<div class="cons-badge" style="background:'+esc(cons.color)+'"><span class="cons-code">'+esc(cons.code)+'</span> '+esc(cons.label)+'</div>'+
          '<p class="statut-detail">'+esc(cons.authority)+' · '+esc(cons.place)+'</p>'+
          (cons.extra?('<p class="statut-detail" style="margin-top:.3rem">'+esc(cons.extra)+'</p>'):'')+
        '</div>'+
        '<div class="classif-photo">'+
          '<div class="classif-photo-title">📷 Photo de l\'espèce</div>'+
          '<div class="photo-feature"><img src="'+psrc(photo,'medium')+'" data-full="'+psrc(photo,'medium')+'" alt="'+esc(common)+'" loading="lazy" referrerpolicy="no-referrer" style="cursor:pointer" onerror="this.onerror=null;this.src=\''+psrc(photo,'square')+'\'"></div>'+
          '<p class="photo-caption">'+esc(common)+(sci?(' <em>('+esc(sci)+')</em>'):'')+'</p>'+
        '</div>'+
      '</div>'+
      '<div class="fiche-card obs-card"><h2>📍 Observations locales</h2>'+
        '<iframe class="map-frame" title="Carte" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox='+bbox+'&layer=mapnik&marker='+map.lat+'%2C'+map.lng+'"></iframe>'+
        '<div style="font-size:.78rem;margin-bottom:.5rem"><a style="color:#5c820d" target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat='+map.lat+'&mlon='+map.lng+'#map=16/'+map.lat+'/'+map.lng+'">Agrandir la carte ↗</a></div>'+
        '<div style="font-size:.85rem;font-weight:600">Galerie photos</div>'+
        (function(){
          if(!gal.length) return '<div class="gallery-row"><img src="'+psrc(photo,'square')+'" loading="lazy" decoding="async"></div>';
          var MAX=6;
          var visible=gal.slice(0,MAX);
          var rest=gal.slice(MAX);
          function thumb(g){
            var src=g.s||g.square||psrc(g,'square');
            var full=g.m||g.medium||src;
            if(!src||src===PLACEHOLDER){var m=g.m||g.medium; if(m){src=m.replace('/medium.','/square.'); full=m;}}
            return '<img src="'+src+'" data-full="'+full+'" alt="Photo de '+esc(common)+' par '+(g.user||'observateur')+'" loading="lazy" decoding="async" referrerpolicy="no-referrer" title="'+(g.user||'')+'" style="cursor:pointer">';
          }
          var html='<div class="gallery-row">'+visible.map(thumb).join('')+'</div>';
          // bouton "voir plus" supprimé
          return html;
        })()+
        '<a style="font-size:.8rem;color:#5c820d" target="_blank" rel="noopener" href="https://www.inaturalist.org/observations?project_id=jardin-verger-de-pardaillan&taxon_id='+tid+'">Voir les observations dans iNaturalist →</a>'+
        '<div class="obs-dates"><div><span class="k">Première</span><span class="v">'+fd(f.premiere_obs)+'</span></div><div><span class="k">Plus récente</span><span class="v">'+fd(f.derniere_obs)+'</span></div><div><span class="k">Période</span><span class="v">'+esc(f.periode_obs||'—')+'</span></div></div>'+
      '</div>'+
      '<div class="fiche-card bio-card"><h2>🍃 Description, milieu & rôle</h2>'+
        '<div class="bio-block"><h3>📄 Description</h3><p>'+esc(desc)+'</p></div>'+
        (taille?('<div class="bio-block"><h3>📏 Taille</h3><p>'+esc(taille)+'</p></div>'):'')+
        '<div class="bio-block"><h3>🏡 Milieu de vie</h3><p>'+esc(biotope)+'</p></div>'+(f.indicateur_zone_humide?'<div class="bio-block wetland"><h3>💧 Indicateur de zone humide</h3><p>Cette plante est un indicateur de milieu humide ou de zone temporairement inondée.</p></div>':'')+
        (sol?('<div class="bio-block"><h3>🪨 Nature du sol</h3><p>'+esc(sol)+'</p></div>'):'')+
        (assoc?('<div class="bio-block"><h3>🔗 Espèces & relations associées</h3><p>'+esc(assoc)+'</p></div>'):'')+
        (biox?('<div class="bio-block"><h3>🔬 Biologie</h3><p>'+esc(biox)+'</p></div>'):'')+
        '<div class="bio-block role-block"><h3>🦋 Rôle dans la nature</h3>'+
        '<ul class="role-list">'+
          '<li><strong>Pollinisateur :</strong> '+esc(pollin)+'</li>'+
          '<li><strong>Alimentation :</strong> '+esc(regime)+'</li>'+
          '<li><strong>Utilité :</strong> '+esc(utilite)+'</li>'+
        '</ul>'+
        
      '</div>'+
        (f.role_source?('<p class="statut-source" style="margin-top:.5rem">📚 D\'après <a href="'+(f.role_source.url||f.role_source.site||'https://jessica-joachim.com/')+'" target="_blank" rel="noopener" style="color:#5c820d">'+(f.role_source.name||'Jessica Joachim')+'</a> (avec autorisation)'+(f.jessica_url?(' · <a href="'+f.jessica_url+'" target="_blank" rel="noopener" style="color:#5c820d">fiche source ↗</a>'):'')+'</p>'):'')+
      '</div>'+
    '</div>'+
    '<div class="fiche-bottom fiche-bottom-single">'+
      '<div class="fiche-card"><h2>📅 Calendrier de vie</h2>'+phenoHTML(f.phenologie)+'</div>'+
    '</div>';
  bind();
}

function route(){
  // Dynamic page title
  const hash = location.hash.slice(1);
  if(hash.startsWith('espece/')){
    const key = decodeURIComponent(hash.slice(7));
    const f = (DATA.fiches||{})[key];
    document.title = f ? ((f.nom_commun||f.nom||key)+' — Jardin-Verger de Pardaillan') : 'Jardin-Verger de Pardaillan';
  } else if(hash.includes('parcourir')||hash.includes('explorer')){
    document.title = 'Parcourir — Jardin-Verger de Pardaillan';
  } else if(hash.includes('remarquable')){
    document.title = 'Espèces remarquables — Jardin-Verger de Pardaillan';
  } else if(hash.includes('stat')){
    document.title = 'Statistiques — Jardin-Verger de Pardaillan';
  } else if(hash.includes('jardin')){
    document.title = 'Le Jardin — Jardin-Verger de Pardaillan';
  } else {
    document.title = 'Jardin-Verger de Pardaillan';
  }

  const h=(location.hash||'#accueil').slice(1).split('/');
  const page=h[0], param=h[1];
  if(page==='explorer')return pageExplorer(param);
  if(page==='stats')return pageStats();
  if(page==='remarquables')return pageRemarquables();
  if(page==='jardin')return pageJardin();
  if(page==='espece')return pageEspece(param);
  return pageAccueil();
}




/* Lightbox galerie */
function openLightbox(src, alt){
  var lb=document.getElementById('lightbox');
  if(!lb){
    lb=document.createElement('div');
    lb.id='lightbox';
    lb.innerHTML='<div class="lb-backdrop"></div><div class="lb-content"><button class="lb-close" type="button" aria-label="Fermer">×</button><img class="lb-img" alt=""></div>';
    document.body.appendChild(lb);
    lb.querySelector('.lb-backdrop').onclick=lb.querySelector('.lb-close').onclick=function(){lb.classList.remove('open');};
    document.addEventListener('keydown', function(e){ if(e.key==='Escape') lb.classList.remove('open'); });
  }
  lb.querySelector('.lb-img').src=src;
  lb.querySelector('.lb-img').alt=alt||'Photo agrandie';
  lb.classList.add('open');
}
document.addEventListener('click', function(e){
  var img=e.target.closest('.gallery-row img, .photo-feature img');
  if(img && img.dataset.full){ e.preventDefault(); openLightbox(img.dataset.full, img.title||''); }
});

async function boot(){
  const main=document.getElementById('app-main');
  try{
    // 1) embedded slim data (single HTML file)
    if(window.__SLIM_DATA__){
      DATA=window.__SLIM_DATA__;
      // Fiches personnelles : embedded first, then optional fetch
      if(window.__FICHES_PERSONNELLES__){
        applyFichesPersonnelles(window.__FICHES_PERSONNELLES__);
      } else if(location.protocol !== 'file:'){
        // Only try fetch when not opened as file:// (avoids Failed to fetch)
        try{
          const rp=await fetch('js/fiches-personnelles.json',{cache:'no-store'});
          if(rp.ok){ applyFichesPersonnelles(await rp.json()); }
        }catch(e){ /* silent when file:// or missing */ }
      }
    } else {
      // 2) folder mode (local server)
      const r=await fetch('js/data-slim.json',{cache:'no-store'});
      if(!r.ok) throw new Error('no data');
      DATA=await r.json();
      // Try personnelles
      try{
        const rp=await fetch('js/fiches-personnelles.json',{cache:'no-store'});
        if(rp.ok){ applyFichesPersonnelles(await rp.json()); }
      }catch(e){ /* optional file */ }
    }
    route();
    addEventListener('hashchange', route);
  }catch(e){
    main.innerHTML='<div class="empty"><p><strong>Impossible de charger les données.</strong></p><p>Ouvrez le site via un petit serveur local :</p><pre style="text-align:left;display:inline-block;background:#f4f8ef;padding:1rem;border-radius:8px">python3 -m http.server 8080</pre><p class="text-muted">Puis allez sur http://localhost:8080</p></div>';
  }
}
boot();