:root{
  --bg:#ffffff;
  --text:#15181f;
  --muted:#5a6472;
  --line:#e6e8ee;
  --soft:#f6f7fb;
  --card:#ffffff;
  --shadow: 0 10px 30px rgba(16,24,40,.08);
  --radius: 18px;
  --max: 1100px;
  --blue:#1f6fff;
}

*{
  box-sizing:border-box;
}

html, body{
  width:100%;
  max-width:100%;
  overflow-x:hidden;
}

html{
  -webkit-text-size-adjust:100%;
  text-size-adjust:100%;
}

body{
  margin:0;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  color:var(--text);
  background:var(--bg);
  line-height:1.45;
}

a{
  color:inherit;
}

.wrap{
  max-width:var(--max);
  width:100%;
  margin:0 auto;
  padding:28px 18px 70px;
  overflow-x:hidden;
}

.topbar{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:14px;
  flex-wrap:wrap;
  margin-bottom:18px;
  width:100%;
}

.pill{
  display:inline-flex;
  align-items:center;
  gap:10px;
  padding:8px 12px;
  border:1px solid var(--line);
  border-radius:999px;
  background:var(--soft);
  color:var(--muted);
  font-size:13px;
  max-width:100%;
}

.dot{
  width:8px;
  height:8px;
  border-radius:999px;
  background:#20c46a;
}

.nav{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  max-width:100%;
}

.navPageLinks{
  width:100%;
}

.btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  padding:10px 14px;
  border-radius:999px;
  border:1px solid var(--line);
  background:#fff;
  text-decoration:none;
  font-weight:700;
  font-size:14px;
  box-shadow: 0 1px 0 rgba(16,24,40,.04);
  transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
  cursor:pointer;
  max-width:100%;
}

.btn:hover{
  transform:translateY(-1px);
  box-shadow:0 8px 20px rgba(16,24,40,.10);
}

.btnPrimary{
  background:var(--blue);
  border-color:var(--blue);
  color:#fff;
}

.h1{
  font-size:44px;
  letter-spacing:-.02em;
  margin:0 0 10px;
  line-height:1.05;
  max-width:100%;
}

.lead{
  color:var(--muted);
  margin:0 0 14px;
  max-width:62ch;
}

.sublead{
  color:var(--muted);
  margin:0;
  max-width:68ch;
}

.grid{
  display:grid;
  grid-template-columns: 1.15fr .85fr;
  gap:18px;
  align-items:start;
  margin-top:16px;
  width:100%;
  max-width:100%;
}

.card{
  background:var(--card);
  border:1px solid var(--line);
  border-radius:var(--radius);
  box-shadow:var(--shadow);
  overflow:hidden;
  max-width:100%;
}

.pad{
  padding:18px;
}

.photos{
  display:grid;
  grid-template-columns: 1.45fr .55fr;
  gap:10px;
  padding:16px;
  background:var(--soft);
  border-bottom:1px solid var(--line);
  overflow:hidden;
  max-width:100%;
}

.heroPhoto{
  height:360px;
  max-height:45vh;
  overflow:hidden;
  border-radius:18px;
  background:linear-gradient(135deg, #e9ecf4, #f9fafc);
  border:1px solid #dde2ee;
  min-height:290px;
  max-width:100%;
}

.heroPhoto img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}

.thumbs{
  display:grid;
  gap:10px;
  grid-template-rows:repeat(3, 1fr);
  max-width:100%;
}

.thumb{
  height:110px;
  overflow:hidden;
  border-radius:14px;
  background:linear-gradient(135deg, #eceff6, #ffffff);
  border:1px solid #dde2ee;
  min-height:90px;
  max-width:100%;
}

.thumb img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}

.panelTitle{
  font-size:16px;
  margin:0 0 10px;
}

.meta{
  display:grid;
  gap:8px;
  color:var(--muted);
  font-size:14px;
  margin:0 0 14px;
}

.meta span{
  display:flex;
  gap:8px;
  align-items:center;
}

.badge{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:8px 10px;
  border:1px solid var(--line);
  border-radius:12px;
  background:var(--soft);
  color:var(--muted);
  font-size:13px;
}

.ctaRow{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  margin-top:10px;
  max-width:100%;
}

.section{
  margin-top:18px;
}

.section h2{
  font-size:20px;
  margin:0 0 10px;
  letter-spacing:-.01em;
}

.divider{
  height:1px;
  background:var(--line);
  margin:16px 0;
}

.qa{
  display:grid;
  gap:10px;
  margin-top:10px;
}

.q{
  font-weight:800;
  font-size:13px;
}

.a{
  color:var(--muted);
  font-size:14px;
}

.strip{
  display:grid;
  grid-auto-flow:column;
  grid-auto-columns:160px;
  gap:12px;
  overflow-x:auto;
  overflow-y:hidden;
  padding:14px 16px 18px;
  scroll-snap-type:x mandatory;
  max-width:100%;
}

.tile{
  scroll-snap-align:start;
  border:1px solid var(--line);
  border-radius:14px;
  background:#fff;
  overflow:hidden;
  box-shadow:0 6px 18px rgba(16,24,40,.06);
  min-height:150px;
}

.tileImg{
  height:105px;
  overflow:hidden;
  background:linear-gradient(135deg, #e9ecf4, #ffffff);
  border-bottom:1px solid var(--line);
}

.tileImg img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}

.tileMeta{
  padding:10px 10px 12px;
}

.tileName{
  font-weight:900;
  font-size:13px;
  margin:0 0 2px;
}

.tileSub{
  color:var(--muted);
  font-size:12px;
  margin:0;
}

.puppyGrid{
  display:grid;
  grid-template-columns:repeat(3, minmax(0, 1fr));
  gap:12px;
  padding:12px;
}

.puppyCard{
  border:1px solid var(--line);
  border-radius:14px;
  background:#fff;
  overflow:hidden;
  box-shadow:0 4px 14px rgba(16,24,40,.05);
}

.puppyImageWrap{
  aspect-ratio:4 / 3;
  background:var(--soft);
  overflow:hidden;
}

.puppyImage{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}

.puppyCardBody{
  padding:12px;
}

.puppyCardTop{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:10px;
  margin-bottom:8px;
}

.puppyName{
  margin:0;
  font-size:16px;
  line-height:1.15;
}

.puppyMetaLine{
  margin:0 0 6px;
  color:var(--muted);
  font-size:13px;
}

.puppyNotes{
  margin:0;
  color:var(--muted);
  font-size:13px;
  line-height:1.4;
}

.statusBadge{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  padding:6px 10px;
  border-radius:999px;
  font-size:12px;
  font-weight:800;
  white-space:nowrap;
  border:1px solid var(--line);
}

.status-available{
  background:#ecfdf3;
  color:#067647;
  border-color:#abefc6;
}

.status-hold{
  background:#fffaeb;
  color:#b54708;
  border-color:#fedf89;
}

.status-reserved{
  background:#eff8ff;
  color:#175cd3;
  border-color:#b2ddff;
}

.status-gone-home{
  background:#f2f4f7;
  color:#344054;
  border-color:#d0d5dd;
}

.footer{
  margin-top:26px;
  color:#8a93a2;
  font-size:12px;
  text-align:center;
}

.modal{
  position:fixed;
  inset:0;
  display:none;
  z-index:9999;
}

.modalShow{
  display:block;
}

.backdrop{
  position:absolute;
  inset:0;
  background:rgba(0,0,0,.55);
}

.sheet{
  position:relative;
  width:min(920px, calc(100% - 24px));
  margin:28px auto;
  background:#fff;
  border-radius:18px;
  overflow:hidden;
  box-shadow:0 26px 90px rgba(0,0,0,.35);
}

.sheetHead{
  display:flex;
  justify-content:space-between;
  gap:12px;
  align-items:flex-start;
  padding:16px 16px 12px;
  border-bottom:1px solid var(--line);
  background:var(--soft);
}

.sheetTitle{
  font-weight:950;
  font-size:16px;
  margin:0;
}

.sheetSub{
  color:var(--muted);
  font-size:13px;
  margin:4px 0 0;
}

.closeBtn{
  border:1px solid var(--line);
  background:#fff;
  border-radius:12px;
  padding:8px 10px;
  cursor:pointer;
  font-weight:900;
}

.sheetBody{
  padding:14px;
}

.sheetBody iframe{
  width:100%;
  border:0;
  border-radius:14px;
  background:#fff;
  height:720px;
}

@media (max-width:980px){
  .grid{
    grid-template-columns:1fr;
  }

  .puppyGrid{
    grid-template-columns:repeat(2, minmax(0, 1fr));
  }
}

@media (max-width:680px){
  .wrap{
    padding:16px 12px 40px;
  }

  .navPageLinks{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:8px;
    width:100%;
    margin-bottom:12px;
  }

  .navPageLinks .btn{
    width:100%;
    min-width:0;
    padding:9px 10px;
    font-size:13px;
    min-height:40px;
    white-space:normal;
    text-align:center;
  }

  .topbar{
    display:flex;
    flex-direction:column;
    align-items:flex-start;
    justify-content:flex-start;
    gap:10px;
    margin-bottom:12px;
    width:100%;
  }

  .navActions{
    width:100%;
    display:grid;
    grid-template-columns:1fr;
    gap:8px;
  }

  .navActions .btn{
    width:100%;
    min-width:0;
    padding:10px 12px;
    font-size:13px;
    min-height:42px;
    white-space:normal;
    text-align:center;
  }

  .pill{
    font-size:12px;
    padding:7px 11px;
    max-width:100%;
  }

  .h1{
    font-size:26px;
    line-height:1.02;
    margin:0 0 8px;
    overflow-wrap:anywhere;
  }

  .h1Home{
    font-size:22px;
    line-height:1.02;
    white-space:normal;
    word-break:break-word;
    overflow-wrap:anywhere;
  }

  .lead{
    font-size:14px;
    line-height:1.4;
    margin:0 0 10px;
    max-width:100%;
    overflow-wrap:anywhere;
  }

  .sublead{
    font-size:14px;
    line-height:1.4;
    max-width:100%;
    overflow-wrap:anywhere;
  }

  .grid{
    gap:14px;
    margin-top:14px;
  }

  .card{
    border-radius:16px;
  }

  .pad{
    padding:14px;
  }

  .photos{
    grid-template-columns:1fr;
    padding:12px;
    gap:8px;
  }

  .photosHome{
    grid-template-columns:1fr;
  }

  .heroPhoto{
    height:auto;
    min-height:0;
    max-height:none;
    aspect-ratio:1 / 1;
    border-radius:16px;
  }

  .thumbsHome{
    display:none;
  }

  .ctaRow{
    gap:8px;
  }

  .section{
    margin-top:14px;
  }

  .divider{
    margin:14px 0;
  }

  .strip{
    grid-auto-columns:140px;
    gap:10px;
    padding:12px 12px 16px;
  }

  .tileImg{
    height:92px;
  }

  .puppyGrid{
    grid-template-columns:1fr;
    gap:10px;
    padding:10px;
  }

  .puppyImageWrap{
    aspect-ratio:4 / 3;
  }

  .puppyCardBody{
    padding:12px;
  }

  .puppyName{
    font-size:17px;
  }
}

@media (max-width:520px){
  .sheet{
    margin:12px auto;
  }

  .sheetBody iframe{
    height:820px;
  }
}

.puppyCardLink{
  text-decoration:none;
  color:inherit;
  display:block;
}
