import { useState, useEffect, useRef } from "react";

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Instrument+Serif:ital@0;1&family=DM+Mono:wght@300;400;500&family=Outfit:wght@300;400;500;600&display=swap');
`;

const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root[data-theme="dark"]{
  --bg:#0c0c0c;
  --bg2:#111111;
  --text:#f0ede8;
  --muted:#7a7570;
  --muted2:#b0ada8;
  --accent:#e8d5b7;
  --accent-hot:#ff4d1c;
  --border:rgba(240,237,232,0.08);
  --border2:rgba(240,237,232,0.15);
  --noise-opacity:.03;
  --scan-color:rgba(232,213,183,.4);
  --grid-color:rgba(240,237,232,.03);
  --video-bg:linear-gradient(135deg,#0f0f0f 0%,#1a1a1a 50%,#111 100%);
  --cta-bg:radial-gradient(ellipse 60% 60% at 50% 50%,rgba(232,213,183,.03) 0%,transparent 70%);
  --quote-border:rgba(240,237,232,0.15);
  --toggle-bg:#1a1a1a;
  --toggle-border:rgba(240,237,232,0.15);
  --shape-color:rgba(232,213,183,0.55);
  --shape-hover:rgba(232,213,183,0.85);
}

:root[data-theme="light"]{
  --bg:#f5f0ff;
  --bg2:#ede8ff;
  --text:#1a0a3c;
  --muted:#9b8abf;
  --muted2:#6b5a9a;
  --accent:#7c3aed;
  --accent-hot:#c026d3;
  --border:rgba(124,58,237,0.12);
  --border2:rgba(124,58,237,0.25);
  --noise-opacity:.025;
  --scan-color:rgba(192,38,211,.35);
  --grid-color:rgba(124,58,237,.05);
  --video-bg:linear-gradient(135deg,#ede8ff 0%,#ddd6fe 50%,#f0e6ff 100%);
  --cta-bg:radial-gradient(ellipse 60% 60% at 50% 50%,rgba(124,58,237,.06) 0%,transparent 70%);
  --quote-border:rgba(124,58,237,0.25);
  --toggle-bg:#ede8ff;
  --toggle-border:rgba(124,58,237,0.25);
  --shape-color:rgba(124,58,237,0.55);
  --shape-hover:rgba(124,58,237,0.9);
}

html{scroll-behavior:smooth;scrollbar-width:none}
html::-webkit-scrollbar{display:none}

body{
  background:var(--bg);
  color:var(--text);
  font-family:'Outfit',sans-serif;
  -webkit-font-smoothing:antialiased;
  overflow-x:hidden;
  cursor:none;
  transition:background .4s ease, color .4s ease;
}

body::before{
  content:'';position:fixed;inset:0;z-index:9999;pointer-events:none;opacity:var(--noise-opacity);
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size:200px;
}

.cursor{position:fixed;top:0;left:0;z-index:10000;pointer-events:none;mix-blend-mode:difference}
.cursor-dot{width:8px;height:8px;background:#f0ede8;border-radius:50%;transform:translate(-50%,-50%);transition:width .2s,height .2s,border-radius .2s}
.cursor-ring{width:36px;height:36px;border:1px solid rgba(240,237,232,.5);border-radius:50%;transform:translate(-50%,-50%);transition:width .4s,height .4s,opacity .3s;position:absolute;top:0;left:0}

.theme-toggle{
  display:flex;align-items:center;gap:8px;
  background:var(--toggle-bg);
  border:1px solid var(--toggle-border);
  border-radius:99px;
  padding:4px;
  cursor:pointer;
  transition:all .3s ease;
  position:relative;
  width:64px;
  height:32px;
}
.toggle-thumb{
  position:absolute;
  width:24px;height:24px;border-radius:50%;
  background:var(--text);
  top:3px;
  transition:left .3s cubic-bezier(.4,0,.2,1),background .3s;
  display:flex;align-items:center;justify-content:center;
  font-size:12px;
}
.toggle-thumb.dark-mode{left:3px;}
.toggle-thumb.light-mode{left:35px;}
.footer-link {
  position: relative;
  transition: 0.3s ease;
}

.footer-link:hover {
  color: white;
  text-shadow: 0 0 8px rgba(232,213,183,0.5);
}

/* ✨ subtle underline animation */
.footer-link::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -2px;
  width: 0%;
  height: 1px;
  background: rgba(232,213,183,0.6);
  transition: width 0.3s ease;
}

.footer-link:hover::after {
  width: 100%;
}
.nav{
  position:fixed;top:0;left:0;right:0;z-index:100;
  display:flex;align-items:center;justify-content:space-between;
  padding:20px 40px;
  transition:background .3s,backdrop-filter .3s,border-bottom .3s,mix-blend-mode .3s;
  mix-blend-mode:difference;
}
.nav.scrolled{
  background:var(--bg);
  backdrop-filter:blur(16px);
  mix-blend-mode:normal;
  border-bottom:1px solid var(--border);
  opacity:.95;
}
.nav-logo{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.1em;color:var(--text);text-decoration:none;}
.nav-links{display:flex;align-items:center;gap:32px}
.nav-link{font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--text);text-decoration:none;opacity:.6;transition:opacity .2s;}
.nav-link:hover{opacity:1}
.nav-login{
  font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.1em;
  text-transform:uppercase;color:var(--bg);background:var(--text);
  padding:8px 16px;border-radius:2px;text-decoration:none;
  transition:opacity .15s,transform .2s;border:none;cursor:pointer;
  display:inline-flex;align-items:center;gap:6px;position:relative;overflow:hidden;
}
.nav-login::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.15) 50%,transparent 100%);transform:translateX(-100%);transition:transform .5s ease;}
.nav-login:hover::after{transform:translateX(100%)}
.nav-login:hover{opacity:.9;transform:translateY(-1px)}
.nav-login-icon{font-size:12px;transition:transform .2s}
.nav-login:hover .nav-login-icon{transform:translateX(2px)}
.nav-status{display:flex;align-items:center;gap:7px;font-family:'DM Mono',monospace;font-size:10px;color:var(--muted)}
.nav-dot{width:6px;height:6px;border-radius:50%;background:#4ade80;animation:blink 2s ease-in-out infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
.hamburger{display:none;flex-direction:column;gap:5px;cursor:pointer;padding:4px;background:none;border:none}
.hamburger span{display:block;width:22px;height:1.5px;background:var(--text);border-radius:2px;transition:transform .3s,opacity .3s}
.mobile-menu{display:none;position:fixed;inset:0;z-index:99;background:var(--bg2);flex-direction:column;align-items:center;justify-content:center;gap:32px}
.mobile-menu.open{display:flex}
.mobile-menu a{font-family:'Bebas Neue',sans-serif;font-size:48px;letter-spacing:.05em;text-decoration:none;color:var(--text)}
.mobile-menu .mobile-login{font-family:'DM Mono',monospace;font-size:16px;letter-spacing:.1em;text-transform:uppercase;padding:14px 40px;background:var(--text);color:var(--bg);border-radius:2px;display:inline-flex;align-items:center;gap:8px;}

/* ── IMAGE TRAIL ── */
.trail-img-el{
  position:fixed;
  pointer-events:none;
  z-index:9998;
  border-radius:6px;
  overflow:hidden;
  width:160px;
  height:112px;
  will-change:transform,opacity;
  box-shadow:0 12px 40px rgba(0,0,0,.55),0 2px 8px rgba(0,0,0,.3);
  border:1px solid rgba(240,237,232,0.12);
  opacity:0;
  transform:translate(-50%,-50%) scale(0.6) rotate(0deg);
  transition:none;
}
.trail-img-el img{
  width:100%;height:100%;object-fit:cover;display:block;
  filter:saturate(0.9) contrast(1.05);
}
.trail-img-el.trail-in{
  transition:opacity 0.18s ease,transform 0.35s cubic-bezier(0.16,1,0.3,1);
}
.trail-img-el.trail-out{
  transition:opacity 0.4s ease 0.1s,transform 0.4s ease 0.1s;
}

/* ── HEADLINE HOVER GLOW ── */
.hero-headline-wrap{
  position:relative;
  display:inline-block;
  cursor:none;
}
.hero-headline{
  font-family:'Bebas Neue',sans-serif;
  font-size:clamp(72px,14vw,220px);
  line-height:.9;letter-spacing:-.01em;
  text-align:center;position:relative;z-index:2;
  animation:heroReveal 1.1s .05s cubic-bezier(0.16,1,0.3,1) both;
  transition:text-shadow .4s ease;
}
.hero-headline-wrap:hover .hero-headline{
  text-shadow:0 0 60px rgba(232,213,183,0.3),0 0 120px rgba(232,213,183,0.12);
}
[data-theme="light"] .hero-headline-wrap:hover .hero-headline{
  text-shadow:0 0 60px rgba(124,58,237,0.25),0 0 120px rgba(124,58,237,0.1);
}
.hero-headline .line2{
  font-family:'Instrument Serif',Georgia,serif;
  font-style:italic;
  font-size:clamp(48px,9vw,140px);
  color:var(--accent);
  display:block;margin-top:8px;
  animation:heroReveal 1.1s .2s cubic-bezier(0.16,1,0.3,1) both;
}
  .faculty-avatar-img {
  width: 75px;   /* 🔽 reduced from 100 */
  height: 75px;
  border-radius: 50%;
  overflow: hidden;
  margin-bottom: 10px;
  border: 2px solid rgba(232,213,183,0.25);
}

.faculty-avatar-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.shape-grid-canvas{position:absolute;inset:0;z-index:0;width:100%;height:100%;pointer-events:none;opacity:1;transition:opacity .4s ease;}

.hero{
  min-height:100vh;display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  padding:100px 40px 60px;
  position:relative;overflow:hidden;
}
[data-theme="light"] .hero::after{
  content:'';position:absolute;inset:0;z-index:0;
  background-image:url('/mnt/user-data/uploads/1777114969612_image.png');
  background-size:cover;background-position:center;opacity:0.3;pointer-events:none;
}
.hero > *{position:relative;z-index:2;}

.hero-eyebrow{
  font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.2em;
  text-transform:uppercase;color:var(--muted);margin-bottom:24px;
  display:flex;align-items:center;gap:12px;
  animation:fadeUp .8s ease both;z-index:2;position:relative;
}
.hero-eyebrow::before{content:'';width:32px;height:1px;background:var(--muted)}

.hero-sub{font-family:'Outfit',sans-serif;font-size:clamp(15px,2vw,18px);color:var(--muted2);text-align:center;max-width:520px;line-height:1.7;margin-top:28px;animation:fadeUp 1s .35s ease both;z-index:2;position:relative;}
.hero-sub em{color:var(--text);font-style:normal}
.hero-cta-row{display:flex;align-items:center;gap:20px;margin-top:40px;animation:fadeUp 1s .45s ease both;z-index:2;position:relative;}
.btn-primary{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;background:var(--text);color:var(--bg);font-family:'DM Mono',monospace;font-size:12px;letter-spacing:.1em;text-transform:uppercase;border-radius:2px;text-decoration:none;transition:background .2s,transform .2s,color .2s,box-shadow .2s;position:relative;overflow:hidden;}
.btn-primary::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.12) 50%,transparent 100%);transform:translateX(-100%);transition:transform .6s ease;}
.btn-primary:hover::after{transform:translateX(100%)}
.btn-primary:hover{background:var(--accent);color:var(--bg);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.2)}
.btn-ghost{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border:1px solid var(--border2);color:var(--text);font-family:'DM Mono',monospace;font-size:12px;letter-spacing:.1em;text-transform:uppercase;border-radius:2px;text-decoration:none;transition:border-color .2s,transform .2s,background .2s;}
.btn-ghost:hover{border-color:var(--text);transform:translateY(-2px);background:rgba(240,237,232,.04)}
.btn-arrow{font-size:16px;transition:transform .2s;display:inline-block}
.btn-primary:hover .btn-arrow,.btn-ghost:hover .btn-arrow{transform:translateX(4px)}

.hero-float{position:absolute;z-index:3;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);border:1px solid var(--border2);border-radius:2px;padding:6px 12px;background:var(--bg2);animation:floatBadge 6s ease-in-out infinite;pointer-events:none;}
.hero-float-1{top:22%;left:8%;animation-delay:0s}
.hero-float-2{top:30%;right:7%;animation-delay:1.5s}
.hero-float-3{bottom:22%;left:6%;animation-delay:3s}
.hero-float-4{bottom:28%;right:8%;animation-delay:2s}
@keyframes floatBadge{0%,100%{transform:translateY(0px) rotate(-1deg)}33%{transform:translateY(-8px) rotate(0.5deg)}66%{transform:translateY(4px) rotate(-0.5deg)}}

.hero-scroll{position:absolute;bottom:32px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);animation:fadeUp 1s .6s ease both;}
.scroll-line{width:1px;height:48px;background:linear-gradient(to bottom,var(--muted),transparent);animation:scrollPulse 2s ease-in-out infinite}
@keyframes scrollPulse{0%,100%{transform:scaleY(1);opacity:.5}50%{transform:scaleY(1.3);opacity:1}}

.section-video{padding:0 40px;margin:0 auto;max-width:1400px;opacity:0;transform:translateY(40px);transition:opacity .8s ease,transform .8s ease;}
.section-video.visible{opacity:1;transform:translateY(0)}
.video-wrap{position:relative;border-radius:4px;overflow:hidden;aspect-ratio:16/9;background:#0a0a0a;border:1px solid var(--border);transition:border-color .3s,box-shadow .3s;}
.video-wrap:hover{border-color:var(--border2);box-shadow:0 20px 60px rgba(0,0,0,.4)}
.video-tag{background:var(--bg2);border:1px solid var(--border);border-bottom:none;padding:6px 20px;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);border-radius:4px 4px 0 0;display:inline-block;margin-top:0;}

.section-phrase{padding:120px 40px;text-align:center;opacity:0;transform:translateY(40px);transition:opacity .8s ease,transform .8s ease;}
.section-phrase.visible{opacity:1;transform:translateY(0)}
.phrase-mono{font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin-bottom:32px;display:flex;align-items:center;justify-content:center;gap:12px;}
.phrase-mono::before,.phrase-mono::after{content:'';flex:1;max-width:60px;height:1px;background:var(--border2)}
.phrase-text{font-family:'Instrument Serif',Georgia,serif;font-size:clamp(28px,5vw,68px);line-height:1.2;color:var(--text);max-width:860px;margin:0 auto;}
.phrase-text em{color:var(--accent);font-style:italic}
.phrase-dash{color:var(--muted);font-family:'DM Mono',monospace;font-size:13px;margin-top:20px;display:block;letter-spacing:.1em}

.marquee-wrap{border-top:1px solid var(--border);border-bottom:1px solid var(--border);overflow:hidden;padding:16px 0;margin:0;}
.marquee-track{display:flex;gap:0;width:max-content;animation:marquee 20s linear infinite;}
.marquee-track:hover{animation-play-state:paused}
.marquee-item{font-family:'Bebas Neue',sans-serif;font-size:clamp(18px,2.5vw,24px);letter-spacing:.08em;color:var(--muted);padding:0 40px;white-space:nowrap;transition:color .2s;}
.marquee-item:hover{color:var(--text)}
.marquee-sep{color:var(--accent);margin:0 -30px}
@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}

.section-events{padding:80px 40px;max-width:1400px;margin:0 auto;}
.section-header{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:48px;opacity:0;transform:translateY(30px);transition:opacity .7s ease,transform .7s ease;}
.section-header.visible{opacity:1;transform:translateY(0)}
.section-eyebrow{font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);margin-bottom:10px;}
.section-title-big{font-family:'Bebas Neue',sans-serif;font-size:clamp(52px,8vw,110px);line-height:.9;letter-spacing:-.01em;}
.section-title-big span{font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-size:.6em;color:var(--accent);}
.see-all{display:flex;align-items:center;gap:8px;font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);text-decoration:none;transition:color .2s;margin-bottom:8px;}
.see-all:hover{color:var(--text)}
.see-all .arr{transition:transform .2s;display:inline-block}
.see-all:hover .arr{transform:translateX(4px)}
.events-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px}
.event-card{position:relative;overflow:hidden;aspect-ratio:4/3;cursor:pointer;opacity:0;transform:translateY(30px);transition:opacity .7s ease,transform .7s ease,box-shadow .3s;}
.event-card:hover{box-shadow:0 24px 80px rgba(0,0,0,.5);z-index:2}
.event-card.visible{opacity:1;transform:translateY(0)}
.event-card:nth-child(1).visible{transition-delay:.05s}
.event-card:nth-child(2).visible{transition-delay:.1s}
.event-card:nth-child(3).visible{transition-delay:.15s}
.event-card:nth-child(4).visible{transition-delay:.2s}
.ev-placeholder{width:100%;height:100%;display:flex;align-items:flex-end;padding:28px;position:relative;}
.ev-p1{background:linear-gradient(135deg,#1a0a2e,#2d1b69,#1a0a2e)}
.ev-p2{background:linear-gradient(135deg,#1a2e0a,#2d6919,#0a1a0a)}
.ev-p3{background:linear-gradient(135deg,#2e1a0a,#693919,#1a0a0a)}
.ev-p4{background:linear-gradient(135deg,#0a1a2e,#194969,#0a0a1a)}
[data-theme="light"] .ev-p1{background:linear-gradient(135deg,#c4b5fd,#7c3aed,#a78bfa)}
[data-theme="light"] .ev-p2{background:linear-gradient(135deg,#d8b4fe,#9333ea,#e879f9)}
[data-theme="light"] .ev-p3{background:linear-gradient(135deg,#fde68a,#c026d3,#f59e0b)}
[data-theme="light"] .ev-p4{background:linear-gradient(135deg,#bfdbfe,#7c3aed,#93c5fd)}
.ev-inner-geo{position:absolute;inset:0;overflow:hidden;}
.ev-inner-geo::after{content:attr(data-label);position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'Bebas Neue',sans-serif;font-size:10vw;color:transparent;-webkit-text-stroke:1px rgba(255,255,255,.07);white-space:nowrap;}
.ev-shimmer{position:absolute;inset:0;z-index:1;background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.06) 50%,transparent 60%);transform:translateX(-100%);transition:transform .6s ease;}
.event-card:hover .ev-shimmer{transform:translateX(100%)}
.event-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.85) 0%,transparent 60%);display:flex;flex-direction:column;justify-content:flex-end;padding:28px;transition:background .3s;}
.event-card:hover .event-overlay{background:linear-gradient(to top,rgba(0,0,0,.9) 0%,rgba(0,0,0,.1) 60%)}
.ev-tag{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:var(--accent);margin-bottom:8px;display:flex;align-items:center;gap:8px;transform:translateY(4px);transition:transform .3s ease;}
.event-card:hover .ev-tag{transform:translateY(0)}
.ev-tag::before{content:'';width:16px;height:1px;background:var(--accent)}
.ev-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(22px,3vw,36px);letter-spacing:.02em;line-height:1;color:#fff;transform:translateY(4px);transition:transform .3s .04s ease;}
.event-card:hover .ev-title{transform:translateY(0)}
.ev-meta{font-family:'DM Mono',monospace;font-size:10px;color:rgba(255,255,255,.5);margin-top:8px;letter-spacing:.08em;}
.ev-arrow{position:absolute;top:24px;right:24px;width:36px;height:36px;border-radius:50%;border:1px solid rgba(240,237,232,.2);display:flex;align-items:center;justify-content:center;font-size:14px;color:#fff;transform:rotate(-45deg) scale(0);transition:transform .3s ease,border-color .3s;}
.event-card:hover .ev-arrow{transform:rotate(-45deg) scale(1);border-color:rgba(240,237,232,.6)}

.section-divisions{padding:100px 40px;max-width:1400px;margin:0 auto;}
.divisions-intro{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-bottom:60px;align-items:end;opacity:0;transform:translateY(30px);transition:opacity .7s ease,transform .7s ease;}
.divisions-intro.visible{opacity:1;transform:translateY(0)}
.div-list{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--border);border:1px solid var(--border);border-radius:4px;overflow:hidden;}
.div-card{background:var(--bg2);padding:32px 28px;cursor:pointer;position:relative;opacity:0;transform:translateY(20px);transition:opacity .7s ease,transform .7s ease,background .2s;}
.div-card.visible{opacity:1;transform:translateY(0)}
.div-card:nth-child(1).visible{transition-delay:.05s}
.div-card:nth-child(2).visible{transition-delay:.1s}
.div-card:nth-child(3).visible{transition-delay:.15s}
.div-card:nth-child(4).visible{transition-delay:.2s}
.div-card:hover{background:var(--bg)}
.div-num{font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);letter-spacing:.1em;margin-bottom:16px;}
.div-name{font-family:'Bebas Neue',sans-serif;font-size:clamp(24px,3vw,38px);letter-spacing:.02em;margin-bottom:12px;line-height:1;}
.div-desc{font-size:13px;color:var(--muted2);line-height:1.6;margin-bottom:20px}
.div-tags{display:flex;flex-wrap:wrap;gap:6px}
.div-tag{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.08em;padding:4px 10px;border:1px solid var(--border2);border-radius:2px;color:var(--muted);text-transform:uppercase;transition:border-color .2s,color .2s,background .2s;}
.div-card:hover .div-tag{border-color:var(--border2);color:var(--muted2)}
.div-accent-line{position:absolute;bottom:0;left:0;height:2px;width:0;transition:width .4s ease;}
.div-card:hover .div-accent-line{width:100%}
.d1 .div-accent-line{background:linear-gradient(to right,#6c63ff,transparent)}
.d2 .div-accent-line{background:linear-gradient(to right,#ff6584,transparent)}
.d3 .div-accent-line{background:linear-gradient(to right,#43e8c0,transparent)}
.d4 .div-accent-line{background:linear-gradient(to right,#ffb347,transparent)}

.section-cta{padding:120px 40px;text-align:center;border-top:1px solid var(--border);position:relative;overflow:hidden;}
.cta-bg{position:absolute;inset:0;background:var(--cta-bg);pointer-events:none;}
.cta-eyebrow{font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin-bottom:24px;}
.cta-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(52px,9vw,130px);line-height:.9;letter-spacing:-.01em;margin-bottom:8px;opacity:0;transform:translateY(30px);transition:opacity .8s ease,transform .8s ease;}
.cta-title.visible{opacity:1;transform:translateY(0)}
.cta-title-italic{font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-size:clamp(36px,6.5vw,90px);color:var(--accent);display:block;opacity:0;transform:translateY(30px);transition:opacity .8s .1s ease,transform .8s .1s ease;}
.cta-title-italic.visible{opacity:1;transform:translateY(0)}
.cta-sub{font-size:16px;color:var(--muted2);max-width:400px;margin:24px auto 40px;line-height:1.7;opacity:0;transition:opacity .8s .2s ease;}
.cta-sub.visible{opacity:1}

.section-faculty{padding:100px 40px;max-width:1400px;margin:0 auto;border-top:1px solid var(--border);}
.faculty-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:48px;}
.faculty-card{background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:28px;opacity:0;transform:translateY(20px);transition:opacity .7s ease,transform .7s ease,border-color .2s,background .2s;position:relative;overflow:hidden;}
.faculty-card:hover{border-color:var(--border2);background:var(--bg)}
.faculty-card.visible{opacity:1;transform:translateY(0)}
.faculty-card:nth-child(1).visible{transition-delay:.05s}
.faculty-card:nth-child(2).visible{transition-delay:.1s}
.faculty-card:nth-child(3).visible{transition-delay:.15s}
.faculty-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(to right,transparent,var(--border2),transparent);}
.faculty-avatar{width:72px;height:72px;border-radius:50%;margin-bottom:16px;background:linear-gradient(135deg,var(--border2),var(--border));border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:.05em;color:var(--muted);transition:transform .3s ease;}
.faculty-card:hover .faculty-avatar{transform:scale(1.05)}
.faculty-name{font-size:16px;font-weight:600;margin-bottom:4px}
.faculty-role{font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.08em;color:var(--muted);text-transform:uppercase;margin-bottom:12px}
.faculty-dept{font-size:13px;color:var(--muted2);line-height:1.5}
.faculty-placeholder{display:inline-block;padding:3px 8px;background:var(--border);border:1px dashed var(--border2);border-radius:2px;font-family:'DM Mono',monospace;font-size:10px;color:var(--muted);letter-spacing:.08em;margin-top:10px;}

.section-about{padding:80px 40px;border-top:1px solid var(--border);display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;max-width:1400px;margin:0 auto;}
.about-label{font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);margin-bottom:16px;display:flex;align-items:center;gap:10px;}
.about-label::before{content:'';width:24px;height:1px;background:var(--muted)}
.about-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,5vw,64px);line-height:1;letter-spacing:-.01em;margin-bottom:20px;}
.about-text{font-size:15px;color:var(--muted2);line-height:1.8;margin-bottom:24px}
.about-stats{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.about-stat-val{font-family:'Bebas Neue',sans-serif;font-size:52px;letter-spacing:-.02em;line-height:1;color:var(--text);transition:transform .3s ease;}
.about-stat-val:hover{transform:scale(1.05)}
.about-stat-label{font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.1em;color:var(--muted);text-transform:uppercase;margin-top:4px}
.about-quote{font-family:'Instrument Serif',Georgia,serif;font-size:clamp(22px,3.5vw,36px);font-style:italic;line-height:1.5;color:var(--text);padding:40px;border:1px solid var(--quote-border);border-radius:4px;position:relative;transition:border-color .3s ease;}
.about-quote:hover{border-color:var(--accent)}
.about-quote::before{content:'"';position:absolute;top:-20px;left:32px;font-family:'Instrument Serif',Georgia,serif;font-size:80px;color:var(--accent);line-height:1;}
.about-quote cite{display:block;margin-top:20px;font-family:'DM Mono',monospace;font-size:11px;font-style:normal;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);}

.footer{border-top:1px solid var(--border);padding:60px 40px 40px;max-width:1400px;margin:0 auto;}
.footer-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:48px;flex-wrap:wrap;gap:40px;}
.footer-brand{font-family:'Bebas Neue',sans-serif;font-size:64px;letter-spacing:.05em;line-height:.9;color:var(--text);opacity:.08;transition:opacity .4s ease;}
.footer:hover .footer-brand{opacity:.14}
.footer-links{display:flex;flex-direction:column;gap:10px}
.footer-link{font-family:'DM Mono',monospace;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);text-decoration:none;transition:color .2s;}
.footer-link:hover{color:var(--text)}
.footer-bottom{display:flex;align-items:center;justify-content:space-between;padding-top:32px;border-top:1px solid var(--border);font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);letter-spacing:.06em;flex-wrap:wrap;gap:12px;}

@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes heroReveal{from{opacity:0;transform:translateY(40px) scaleY(1.04);filter:blur(4px)}to{opacity:1;transform:translateY(0) scaleY(1);filter:blur(0)}}

@media(max-width:1024px){
  .faculty-grid{grid-template-columns:1fr 1fr}
  .nav-links .nav-link{display:none}
  .nav-links .nav-login{display:none}
  .hamburger{display:flex}
  .divisions-intro{grid-template-columns:1fr}
  .hero-float{display:none}
}
@media(max-width:768px){
  .nav{padding:16px 20px}
  .hero{padding:80px 20px 60px}
  .hero-headline{font-size:clamp(56px,16vw,120px)}
  .events-grid{grid-template-columns:1fr}
  .div-list{grid-template-columns:1fr}
  .section-events,.section-divisions,.section-faculty,.section-about,.footer{padding-left:20px;padding-right:20px}
  .section-phrase{padding:80px 20px}
  .section-cta{padding:80px 20px}
  .section-about{grid-template-columns:1fr;gap:40px}
  .faculty-grid{grid-template-columns:1fr}
  .footer-brand{font-size:40px}
  .section-video{padding:0 20px}
  .trail-img-el{display:none}
}
@media(max-width:480px){
  .events-grid{grid-template-columns:1fr}
  .nav-status{display:none}
}
`;

// ── Trail Images (use your own paths — these are placeholder Unsplash URLs) ───
const TRAIL_IMAGES = [
  "/image1.jpeg",
  "/image2.jpeg",
  "/image3.jpeg",
  "/image4.jpg",
  "/image5.jpg",
];

const POOL_SIZE = 8;
const TRAIL_THRESHOLD = 80; // px mouse must move before next image spawns
const ROTATIONS = [-8, -5, -3, -1, 1, 3, 5, 8, -6, 6, -4, 4, -2, 2];
const SCALE_RANGE = [0.88, 1.08]; // slight size variation per image

// ── ImageTrail hook ───────────────────────────────────────────────────────────
function useImageTrail(targetRef) {
  const poolRef = useRef([]);
  const idxRef = useRef(0);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const isHoveringRef = useRef(false);
  const timersRef = useRef([]);

  useEffect(() => {
    // Build DOM pool once
    const pool = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const wrap = document.createElement("div");
      wrap.className = "trail-img-el";
      const img = document.createElement("img");
      img.src = TRAIL_IMAGES[i % TRAIL_IMAGES.length];
      img.alt = "";
      img.draggable = false;
      wrap.appendChild(img);
      document.body.appendChild(wrap);
      pool.push(wrap);
    }
    poolRef.current = pool;

    const spawn = (x, y) => {
      const slot = idxRef.current % POOL_SIZE;
      const el = pool[slot];
      const rot = ROTATIONS[idxRef.current % ROTATIONS.length];
      const scale = SCALE_RANGE[0] + Math.random() * (SCALE_RANGE[1] - SCALE_RANGE[0]);

      // Update image src cycling
      const img = el.querySelector("img");
      img.src = TRAIL_IMAGES[idxRef.current % TRAIL_IMAGES.length];

      // Reset — snap to position instantly (no transition)
      el.classList.remove("trail-in", "trail-out");
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.opacity = "0";
      el.style.transform = `translate(-50%,-50%) scale(0.55) rotate(${rot * 0.4}deg)`;

      // Force reflow so transitions fire fresh
      void el.offsetWidth;

      // Animate IN
      el.classList.add("trail-in");
      el.style.opacity = "1";
      el.style.transform = `translate(-50%,-50%) scale(${scale}) rotate(${rot}deg)`;

      idxRef.current++;

      // Animate OUT after delay
      const t = setTimeout(() => {
        el.classList.remove("trail-in");
        el.classList.add("trail-out");
        el.style.opacity = "0";
        el.style.transform = `translate(-50%,-50%) scale(${scale * 0.75}) rotate(${rot * 1.3}deg)`;
      }, 500 + Math.random() * 150);

      timersRef.current.push(t);
    };

    const onMouseMove = (e) => {
      if (!isHoveringRef.current) return;
      const { x: lx, y: ly } = lastPosRef.current;
      const dist = Math.hypot(e.clientX - lx, e.clientY - ly);
      if (dist >= TRAIL_THRESHOLD) {
        spawn(e.clientX, e.clientY);
        lastPosRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseEnter = (e) => {
      isHoveringRef.current = true;
      lastPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseLeave = () => {
      isHoveringRef.current = false;
      // Fade all visible trail images out
      pool.forEach((el) => {
        el.classList.remove("trail-in");
        el.classList.add("trail-out");
        el.style.opacity = "0";
        const currentTransform = el.style.transform;
        el.style.transform = currentTransform.replace(/scale\([^)]+\)/, "scale(0.7)");
      });
      idxRef.current = 0;
    };

    const target = targetRef.current;
    if (target) {
      target.addEventListener("mouseenter", onMouseEnter);
      target.addEventListener("mouseleave", onMouseLeave);
      target.addEventListener("mousemove", onMouseMove);
    }

    return () => {
      timersRef.current.forEach(clearTimeout);
      pool.forEach((el) => el.remove());
      if (target) {
        target.removeEventListener("mouseenter", onMouseEnter);
        target.removeEventListener("mouseleave", onMouseLeave);
        target.removeEventListener("mousemove", onMouseMove);
      }
    };
  }, [targetRef]);
}

// ── ShapeGrid ─────────────────────────────────────────────────────────────────
function ShapeGrid({ theme }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    const SIZE = 44;
    let time = 0;
    const baseColor = theme === "dark" ? { r: 232, g: 213, b: 183 } : { r: 124, g: 58, b: 237 };
    const onMouse = (e) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", onMouse, { passive: true });
    const onResize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener("resize", onResize, { passive: true });
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const cols = Math.ceil(W / SIZE) + 1;
      const rows = Math.ceil(H / SIZE) + 1;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const cx = i * SIZE;
          const cy = j * SIZE;
          const wave = Math.sin(time * 1.2 + i * 0.4 + j * 0.4) * 0.5 + Math.cos(time * 0.8 + i * 0.3 - j * 0.5) * 0.5;
          const dx = cx - mx; const dy = cy - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const proximity = Math.max(0, 1 - dist / 200);
          const baseAlpha = 0.1 + (wave + 1) * 0.12;
          const alpha = Math.min(0.9, baseAlpha + proximity * 0.6);
          const dotSize = 2.5 + proximity * 3.5 + (wave + 1) * 0.6;
          const offsetX = wave * 3;
          const offsetY = Math.cos(time * 0.9 + i * 0.5 + j * 0.3) * 3;
          ctx.beginPath();
          ctx.arc(cx + offsetX, cy + offsetY, dotSize / 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${baseColor.r},${baseColor.g},${baseColor.b},${alpha})`;
          ctx.fill();
        }
      }
      time += 0.018;
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
    };
  }, [theme]);

  return (
    <canvas ref={canvasRef} className="shape-grid-canvas"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} />
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Cintel() {
  const [theme, setTheme] = useState("dark");
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const cursorDotRef = useRef(null);
  const cursorRingRef = useRef(null);
  const mxRef = useRef(0);
  const myRef = useRef(0);
  const rxRef = useRef(0);
  const ryRef = useRef(0);

  // ── Trail target ref
  const trailWrapRef = useRef(null);
  useImageTrail(trailWrapRef);

  useEffect(() => {
    const fontEl = document.createElement("style");
    fontEl.textContent = FONTS;
    document.head.appendChild(fontEl);
    const cssEl = document.createElement("style");
    cssEl.textContent = CSS;
    document.head.appendChild(cssEl);
    return () => { document.head.removeChild(fontEl); document.head.removeChild(cssEl); };
  }, []);

  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); }, [theme]);

  useEffect(() => {
    const onMove = (e) => {
      mxRef.current = e.clientX; myRef.current = e.clientY;
      if (cursorDotRef.current) cursorDotRef.current.style.transform = `translate(${e.clientX}px,${e.clientY}px) translate(-50%,-50%)`;
    };
    document.addEventListener("mousemove", onMove);
    let raf;
    const animRing = () => {
      rxRef.current += (mxRef.current - rxRef.current) * 0.12;
      ryRef.current += (myRef.current - ryRef.current) * 0.12;
      if (cursorRingRef.current) cursorRingRef.current.style.transform = `translate(${rxRef.current}px,${ryRef.current}px) translate(-50%,-50%)`;
      raf = requestAnimationFrame(animRing);
    };
    raf = requestAnimationFrame(animRing);
    return () => { document.removeEventListener("mousemove", onMove); cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const h = document.querySelector(".hero-headline");
      if (h) h.style.transform = `translateY(${y * 0.18}px)`;
      const s = document.querySelector(".hero-sub");
      if (s) s.style.transform = `translateY(${y * 0.1}px)`;
      const c = document.querySelector(".shape-grid-canvas");
      if (c) c.style.opacity = Math.max(0, 1 - y / 600);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.1, rootMargin: "0px 0px -60px 0px" }
    );
    const selectors = [".section-video",".section-phrase",".section-header",".event-card",".div-card",".divisions-intro",".faculty-card","#ctaTitle","#ctaItalic","#ctaSub"];
    document.querySelectorAll(selectors.join(",")).forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const cards = document.querySelectorAll(".event-card");
    const handlers = [];
    cards.forEach((card) => {
      const onMove = (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(600px) rotateX(${-y * 5}deg) rotateY(${x * 5}deg) translateY(-6px) scale(1.01)`;
      };
      const onLeave = () => { card.style.transform = ""; };
      card.addEventListener("mousemove", onMove);
      card.addEventListener("mouseleave", onLeave);
      handlers.push({ card, onMove, onLeave });
    });
    return () => handlers.forEach(({ card, onMove, onLeave }) => {
      card.removeEventListener("mousemove", onMove);
      card.removeEventListener("mouseleave", onLeave);
    });
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const vals = e.target.querySelectorAll(".about-stat-val");
            vals.forEach((v) => {
              const txt = v.textContent.trim();
              if (txt === "∞") return;
              const num = parseInt(txt);
              const start = performance.now();
              const update = (now) => {
                const prog = Math.min((now - start) / 1800, 1);
                const ease = 1 - Math.pow(1 - prog, 4);
                v.textContent = Math.round(ease * num) + "+";
                if (prog < 1) requestAnimationFrame(update);
              };
              requestAnimationFrame(update);
            });
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    const section = document.querySelector(".section-about");
    if (section) io.observe(section);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = document.querySelector(".hero-eyebrow");
    if (!el) return;
    const original = "Department of Computational Intelligence · SRMIST";
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·";
    let frame = 0; let raf;
    const scramble = () => {
      el.textContent = original.split("").map((c, i) => {
        if (c === " ") return " ";
        if (i < frame * 2) return c;
        return chars[Math.floor(Math.random() * chars.length)];
      }).join("");
      frame++;
      if (frame < original.length / 2) raf = requestAnimationFrame(scramble);
      else el.textContent = original;
    };
    const t = setTimeout(() => { raf = requestAnimationFrame(scramble); }, 600);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, []);

  const marqueeItems = ["Hackathons", "Workshops", "Tech Talks", "CTF Challenges", "CSR Drives", "Drone Builds", "Competitions"];

  return (
    <>
      <div className="cursor">
        <div className="cursor-dot" ref={cursorDotRef}></div>
        <div className="cursor-ring" ref={cursorRingRef}></div>
      </div>

      {/* NAV */}
      <nav className={`nav${scrolled ? " scrolled" : ""}`}>
        <a href="#" className="nav-logo">CINTEL</a>
        <div className="nav-links">
          <a href="#events" className="nav-link">Events</a>
          <a href="#divisions" className="nav-link">Divisions</a>
          <a href="#about" className="nav-link">About</a>
          <a href="#faculty" className="nav-link">Faculty</a>
          <a href="/login" className="nav-login">Login <span className="nav-login-icon">→</span></a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button className="theme-toggle" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} aria-label="Toggle theme">
            <div className={`toggle-thumb ${theme === "dark" ? "dark-mode" : "light-mode"}`}>{theme === "dark" ? "🌙" : "☀️"}</div>
          </button>
          <div className="nav-status"><div className="nav-dot"></div>SRMIST · Active</div>
          <button className="hamburger" onClick={() => setMobileOpen(o => !o)} aria-label="Menu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </nav>

      <div className={`mobile-menu${mobileOpen ? " open" : ""}`}>
        <a href="#events" onClick={() => setMobileOpen(false)}>Events</a>
        <a href="#divisions" onClick={() => setMobileOpen(false)}>Divisions</a>
        <a href="#about" onClick={() => setMobileOpen(false)}>About</a>
        <a href="#faculty" onClick={() => setMobileOpen(false)}>Faculty</a>
        <a href="/login" className="mobile-login" onClick={() => setMobileOpen(false)}>Login →</a>
      </div>

      {/* HERO */}
      <section className="hero">
        <ShapeGrid theme={theme} />

        <div className="hero-float hero-float-1">✦ SRM · KTR</div>
        <div className="hero-float hero-float-2">Est. 2020</div>
        <div className="hero-float hero-float-3">50+ Members</div>
        <div className="hero-float hero-float-4">20+ Events</div>

        <div className="hero-eyebrow">Department of Computational Intelligence · SRMIST</div>

        {/* ── IMAGE TRAIL WRAPPER — only on headline ── */}
        <div ref={trailWrapRef} className="hero-headline-wrap">
          <h1 className="hero-headline">
            CINTEL
            <span className="line2">Student Association</span>
          </h1>
        </div>

        <p className="hero-sub">
          Where <em>curiosity meets computation.</em> Building the next generation of engineers, innovators, and problem-solvers at SRMIST.
        </p>
        <div className="hero-cta-row">
          <a href="#events" className="btn-primary">Explore Events <span className="btn-arrow">→</span></a>
          <a href="#about" className="btn-ghost">Our Story <span className="btn-arrow">→</span></a>
        </div>
        <div className="hero-scroll">
          <div className="scroll-line"></div>
          <span>Scroll</span>
        </div>
      </section>

      {/* VIDEO */}
      <div className="section-video" id="videoSection">
        <div className="video-wrap relative overflow-hidden">
          <video className="w-full h-full object-cover scale-105" src="/cintel.mp4" autoPlay muted loop playsInline />
          <div className="absolute inset-0 bg-black/30 pointer-events-none" />
          <div className="absolute bottom-6 left-6 z-10">
            <p className="text-white text-sm opacity-80 tracking-wide">Watch our showreel · 2024</p>
          </div>
        </div>
        <div className="video-tag">Cintel · What we do</div>
      </div>

      {/* PHRASE */}
      <section className="section-phrase" id="phrase">
        <div className="phrase-mono">Est. 2020 · SRMIST</div>
        <p className="phrase-text">
          We don't just learn technology.<br />We <em>build it, break it,</em> and make it better — together.
        </p>
        <span className="phrase-dash">— Cintel Student Association</span>
      </section>

      {/* MARQUEE */}
      <div className="marquee-wrap">
        <div className="marquee-track">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={i}>
              <span className="marquee-item">{item}</span>
              <span className="marquee-item marquee-sep">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* EVENTS */}
      <section className="section-events" id="events">
        <div className="section-header">
          <div>
            <div className="section-eyebrow">Selected highlights</div>
            <div className="section-title-big">Events <span>& moments</span></div>
          </div>
          <a href="#" className="see-all">See all <span className="arr">→</span></a>
        </div>
        <div className="events-grid">
          {[
            { cls: "ev-p1", label: "CTF", tag: "Cybersecurity", title: "Capture The Flag & Bug Busters", meta: "2024 · Ethical Hacking · Debugging" },
            { cls: "ev-p2", label: "Q", tag: "Tech Quiz · HCL Collab", title: "Tech-Q Challenge", meta: "Aug 2023 · ₹10K Prize · Ramachandran Hall" },
            { cls: "ev-p3", label: "✈", tag: "Workshop · Siemens", title: "5-Day Drone Workshop", meta: "Build · Fly · Innovate" },
            { cls: "ev-p4", label: "♡", tag: "CSR Initiative", title: "Community & Social Impact", meta: "Teaching · Hope Trust · Autism Care" },
          ].map((ev, i) => (
            <div className="event-card" key={i}>
              <div className={`ev-placeholder ${ev.cls}`}>
                <div className="ev-inner-geo" data-label={ev.label}></div>
              </div>
              <div className="ev-shimmer"></div>
              <div className="event-overlay">
                <div className="ev-tag">{ev.tag}</div>
                <div className="ev-title">{ev.title}</div>
                <div className="ev-meta">{ev.meta}</div>
              </div>
              <div className="ev-arrow">↗</div>
            </div>
          ))}
        </div>
      </section>

      {/* DIVISIONS */}
      <section className="section-divisions" id="divisions">
        <div className="divisions-intro">
          <div>
            <div className="section-eyebrow">How we operate</div>
            <div className="section-title-big">Our <span>Divisions</span></div>
          </div>
          <p style={{ fontSize: "15px", color: "var(--muted2)", lineHeight: "1.8", maxWidth: "400px" }}>
            Four focused verticals, each with a distinct purpose — working in sync to power every event, initiative, and idea Cintel brings to life.
          </p>
        </div>
        <div className="div-list">
          {[
            { n: "01", name: "Technical", desc: "The engine room. Building, hacking, and deploying real technology.", tags: ["Web Dev", "AI & ML", "Cybersecurity", "CTF", "Projects"], cls: "d1" },
            { n: "02", name: "Public Relations", desc: "The voice of Cintel. Crafting our story, outreach, and brand presence.", tags: ["Outreach", "Branding", "Social Media", "PR"], cls: "d2" },
            { n: "03", name: "Event Management", desc: "The orchestrators. From logistics to stage — every event runs on us.", tags: ["Tech Events", "Non-Tech", "Workshops", "Fests"], cls: "d3" },
            { n: "04", name: "Corporate", desc: "The bridge to industry. Sponsorships, partnerships, and opportunities.", tags: ["Sponsorships", "Partnerships", "Internships", "Industry"], cls: "d4" },
          ].map((d, i) => (
            <div className={`div-card ${d.cls}`} key={i}>
              <div className="div-num">{d.n} /</div>
              <div className="div-name">{d.name}</div>
              <div className="div-desc">{d.desc}</div>
              <div className="div-tags">{d.tags.map((t, j) => <span className="div-tag" key={j}>{t}</span>)}</div>
              <div className="div-accent-line"></div>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section className="section-about" id="about">
        <div>
          <div className="about-label">Who we are</div>
          <div className="about-title">Built by students,<br />for students.</div>
          <p className="about-text">
            The Cintel Student Association at SRMIST is a platform that fosters innovation, skill development, and real-world problem-solving in the field of Computational Intelligence. We bridge academics and industry through workshops, competitions, research, and community service.
          </p>
          <div className="about-stats">
            {[["50+", "Active Members"], ["20+", "Events Hosted"], ["3+", "Industry Collabs"], ["∞", "Ideas in Progress"]].map(([val, label], i) => (
              <div key={i}>
                <div className="about-stat-val">{val}</div>
                <div className="about-stat-label">{label}</div>
              </div>
            ))}
          </div>
        </div>
        <blockquote className="about-quote">
          Our vision is to create a community where everyone can hone their skills whilst contributing to the overall development of the college community.
          <cite>— Cintel Vision Statement</cite>
        </blockquote>
      </section>

      {/* FACULTY */}
      <section className="section-faculty" id="faculty">
        <div className="section-header" style={{ marginBottom: 0 }}>
          <div>
            <div className="section-eyebrow">Guidance & mentorship</div>
            <div className="section-title-big">Faculty <span>Coordinators</span></div>
          </div>
        </div>
       <div className="faculty-grid">
  {[
    {
      name: "Ms. Sasi Rekha Sankar",
      role: "Primary Advisor",
      designation: "Assistant Professor",
      email: "sasireks@srmist.edu.in",
      img: "/FC1.png",
    },
    {
      name: "Dr. Babu R",
      role: "Primary Advisor",
      designation: "Associate Professor",
      email: "babur@srmist.edu.in",
      img: "/FC2.png",
    },
  ].map((fc, i) => (
    <div className="faculty-card" key={i}>

      {/* 🔥 IMAGE */}
      <div className="faculty-avatar-img">
        <img src={fc.img} alt={fc.name} />
      </div>

      {/* TEXT */}
      <div className="faculty-name">{fc.name}</div>
      <div className="faculty-role">{fc.role}</div>
      <div className="faculty-designation">{fc.designation}</div>
      <div className="faculty-email">{fc.email}</div>

      <div className="faculty-dept">
        Department of Computational Intelligence · Faculty of Engineering & Technology
      </div>

    </div>
  ))}
</div>
      </section>

      {/* CTA */}
      <section className="section-cta">
        <div className="cta-bg"></div>
        <div className="cta-eyebrow">Ready to join?</div>
        <div className="cta-title" id="ctaTitle">Let's build</div>
        <div className="cta-title-italic" id="ctaItalic">something great.</div>
        <p className="cta-sub" id="ctaSub">
          Whether you code, design, manage, or just have a wild idea — there's a place for you at Cintel.
        </p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
<a
  href="https://mail.google.com/mail/?view=cm&fs=1&to=studentassociation.cintel.ktr@srmist.edu.in"
  target="_blank"
  rel="noopener noreferrer"
  className="btn-primary"
>
  Get in touch <span className="btn-arrow">↗</span>
</a>          <a href="/login" className="btn-ghost">Login <span className="btn-arrow">→</span></a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-top">
          <div className="footer-brand">CINTEL</div>
          <div className="footer-links">
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", letterSpacing: ".15em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>Navigation</span>
            <a href="#events" className="footer-link">Events</a>
            <a href="#divisions" className="footer-link">Divisions</a>
            <a href="#about" className="footer-link">About</a>
            <a href="#faculty" className="footer-link">Faculty</a>
          </div>
          <div className="footer-links">
  <span style={{
    fontFamily: "'DM Mono',monospace",
    fontSize: "10px",
    letterSpacing: ".15em",
    textTransform: "uppercase",
    color: "var(--muted)",
    marginBottom: "4px"
  }}>
    Connect
  </span>

  {/* 📸 Instagram */}
  <a
    href="https://www.instagram.com/cintel_association/"
    target="_blank"
    rel="noopener noreferrer"
    className="footer-link"
  >
    Instagram ↗
  </a>

  {/* 💼 LinkedIn */}
  <a
    href="https://www.linkedin.com/company/cintel-association"
    target="_blank"
    rel="noopener noreferrer"
    className="footer-link"
  >
    LinkedIn ↗
  </a>

  {/* 📧 Email */}
  <a
  href="mailto:studentassociation.cintel.ktr@srmist.edu.in"
  onClick={(e) => {
    setTimeout(() => {
      window.open(
        "https://mail.google.com/mail/?view=cm&fs=1&to=studentassociation.cintel.ktr@srmist.edu.in",
        "_blank"
      );
    }, 500);
  }}
  className="footer-link"
>
  Email us
</a>
</div>
          <div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", letterSpacing: ".08em", color: "var(--muted)", lineHeight: "1.8", maxWidth: "220px" }}>
              Department of Computational Intelligence<br />
              Faculty of Engineering & Technology<br />
              SRMIST, Kattankulathur
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2025 Cintel Student Association · SRMIST</span>
          <span>Student-run · Dept. of Computational Intelligence</span>
        </div>
      </footer>
    </>
  );
}