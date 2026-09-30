# -*- coding: utf-8 -*-
# Bouwstenen voor De James Robinson-gids: opmaak en helpers.

CSS = r"""
/* Layout: één kolom van 1080px, secties van rand tot rand; per stap een kopblok, feitenbalk en gekleurde vlakken voor klant, gevolgen en open punten. */
:root{
  --page:#fbfbfd; --card:#fff; --alt:#f5f5f7;
  --tx:#1d1d1f; --tx2:#5f5f64; --tx3:#86868b;
  --ln:#d2d2d7; --ln-s:#e5e5e9;
  --blue:#007aff; --link:#0066cc; --act:#0857c3;
  --b100:#e0efff; --b50:#f4f9ff;
  --lime:#c4f000; --lime-tx:#4f6300; --lime100:#f2fccc;
  --green-tx:#1d7d3f; --green100:#e6f7eb;
  --orange-tx:#8a5208; --orange100:#fef2e0;
  --red-tx:#c02a22; --red100:#fdecea;
  --black:#1c1c1e; --inv:#f5f5f7; --inv2:#a1a1a6;
  --p1:#0857c3; --p1b:#e0efff;
  --p2:#4f6300; --p2b:#f2fccc;
  --p3:#1d7d3f; --p3b:#e6f7eb;
  --fd:"Inter Tight","Inter",-apple-system,BlinkMacSystemFont,"Helvetica Neue",Helvetica,Arial,sans-serif;
  --ft:"Inter",-apple-system,BlinkMacSystemFont,"Helvetica Neue",Helvetica,Arial,sans-serif;
  --fm:"SF Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  --g:32px;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --page:#000;--card:#1c1c1e;--alt:#111113;--tx:#f5f5f7;--tx2:#a8a8ad;--tx3:#8e8e93;
  --ln:#38383c;--ln-s:#2a2a2d;--link:#2997ff;--act:#2997ff;
  --b100:rgba(0,122,255,.2);--b50:rgba(0,122,255,.08);
  --lime-tx:#d9ff33;--lime100:rgba(196,240,0,.13);
  --green-tx:#41c96a;--green100:rgba(52,199,89,.14);
  --orange-tx:#f0a040;--orange100:rgba(246,160,39,.15);
  --red-tx:#ff6b61;--red100:rgba(255,59,48,.14);
  --p1:#2997ff;--p1b:rgba(0,122,255,.2);--p2:#d9ff33;--p2b:rgba(196,240,0,.13);--p3:#41c96a;--p3b:rgba(52,199,89,.14);
  color-scheme:dark;
}}
:root[data-theme="dark"]{
  --page:#000;--card:#1c1c1e;--alt:#111113;--tx:#f5f5f7;--tx2:#a8a8ad;--tx3:#8e8e93;
  --ln:#38383c;--ln-s:#2a2a2d;--link:#2997ff;--act:#2997ff;
  --b100:rgba(0,122,255,.2);--b50:rgba(0,122,255,.08);
  --lime-tx:#d9ff33;--lime100:rgba(196,240,0,.13);
  --green-tx:#41c96a;--green100:rgba(52,199,89,.14);
  --orange-tx:#f0a040;--orange100:rgba(246,160,39,.15);
  --red-tx:#ff6b61;--red100:rgba(255,59,48,.14);
  --p1:#2997ff;--p1b:rgba(0,122,255,.2);--p2:#d9ff33;--p2b:rgba(196,240,0,.13);--p3:#41c96a;--p3b:rgba(52,199,89,.14);
  color-scheme:dark;
}
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:var(--page);color:var(--tx);font-family:var(--ft);font-size:16.5px;line-height:1.6;-webkit-font-smoothing:antialiased}
html{scroll-behavior:smooth;scroll-padding-top:64px}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
:focus-visible{outline:none;box-shadow:0 0 0 4px rgba(0,122,255,.4);border-radius:8px}
a{color:var(--link)}
p{margin:0 0 16px;max-width:70ch}
p:last-child{margin-bottom:0}
h1,h2,h3,h4{font-family:var(--fd);margin:0;text-wrap:balance}
b,strong{font-weight:600;color:var(--tx)}
ul.p{margin:0 0 16px;padding-left:20px;max-width:70ch} ul.p li{margin-bottom:6px}
ol.p{margin:0 0 16px;padding-left:22px;max-width:70ch} ol.p li{margin-bottom:8px}
.num{font-variant-numeric:tabular-nums}

.bar{position:sticky;top:env(safe-area-inset-top,0px);z-index:60;background:var(--page);border-bottom:1px solid var(--ln-s)}
.bar-in{max-width:1080px;margin:0 auto;padding-inline:var(--g);display:flex;align-items:center;gap:4px;min-height:50px;overflow-x:auto;scrollbar-width:none}
.bar-in::-webkit-scrollbar{display:none}
.bar b{font-family:var(--fd);font-size:14.5px;font-weight:700;margin-right:10px;white-space:nowrap}
.bar a{font-size:12.5px;color:var(--tx2);text-decoration:none;padding:6px 8px;border-radius:7px;white-space:nowrap}
.bar a:hover{color:var(--tx);background:var(--alt)}
.bar button{margin-left:auto;flex:none;font:inherit;font-size:12px;cursor:pointer;background:transparent;border:1px solid var(--ln);color:var(--tx2);border-radius:980px;padding:5px 13px}

.wrap{max-width:1080px;margin:0 auto;padding-inline:var(--g)}
.hero{padding-block:72px 44px}
.eyebrow{font-family:var(--fm);font-size:11px;letter-spacing:.06em;color:var(--tx3);margin-bottom:16px;display:block}
h1{font-size:clamp(38px,6vw,66px);font-weight:700;line-height:1.04;letter-spacing:-.028em;margin-bottom:22px}
.lead{font-size:20px;line-height:1.5;color:var(--tx2);max-width:62ch}
.hero .meta{display:flex;flex-wrap:wrap;gap:8px 22px;margin-top:26px;font-size:13.5px;color:var(--tx3)}
.hero .meta b{color:var(--tx2);font-weight:500}

.sec{padding-block:64px;border-top:1px solid var(--ln-s)}
.sec.alt{background:var(--alt)}
h2{font-size:clamp(28px,3.8vw,42px);font-weight:700;line-height:1.1;letter-spacing:-.022em;margin-bottom:14px}
h3{font-size:22px;font-weight:600;line-height:1.24;letter-spacing:-.012em;margin:44px 0 12px}
h4{font-size:17px;font-weight:600;margin:0 0 6px}
.sub{font-size:18.5px;line-height:1.5;color:var(--tx2);max-width:64ch;margin-bottom:8px}
.kick{font-family:var(--fm);font-size:11px;letter-spacing:.06em;color:var(--tx3);margin-bottom:14px;display:block}

/* deel-opener */
.deel{background:var(--black);color:var(--inv);padding-block:70px}
.deel .kick{color:var(--lime)}
.deel h2{color:#fff;font-size:clamp(34px,5vw,56px)}
.deel p{color:var(--inv2);font-size:18.5px;max-width:62ch}

/* route: het overzicht */
.route{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:30px}
.fase{border-radius:20px;padding:20px 20px 16px;background:var(--card);border:1px solid var(--ln-s);border-top:5px solid}
.fase.f1{border-top-color:var(--p1)} .fase.f2{border-top-color:var(--p2)} .fase.f3{border-top-color:var(--p3)}
.fase .fl{font-family:var(--fm);font-size:10.5px;letter-spacing:.06em;display:block;margin-bottom:4px}
.fase.f1 .fl{color:var(--p1)} .fase.f2 .fl{color:var(--p2)} .fase.f3 .fl{color:var(--p3)}
.fase h4{font-size:20px;margin-bottom:2px}
.fase .ft{font-size:13.5px;color:var(--tx3);display:block;margin-bottom:12px}
.fase ol{list-style:none;margin:0;padding:0}
.fase li{border-top:1px solid var(--ln-s)}
.fase li a{display:grid;grid-template-columns:30px 1fr;gap:8px;padding:9px 0;text-decoration:none;color:var(--tx)}
.fase li a:hover b{color:var(--act)}
.fase li .n{font-family:var(--fm);font-size:12px;color:var(--tx3);padding-top:2px}
.fase li b{display:block;font-size:15px}
.fase li span{display:block;font-size:13px;color:var(--tx2)}
.geld{margin-top:14px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.geld div{border-radius:14px;padding:12px 16px;font-size:13.5px;color:var(--tx2);background:var(--alt)}
.geld b{display:block;font-family:var(--fm);font-size:12px;font-weight:500;color:var(--tx)}

/* stapkop */
.stap{padding-block:70px 30px;border-top:1px solid var(--ln-s)}
.shd{display:grid;grid-template-columns:auto 1fr;gap:6px 22px;align-items:start}
.snr{font-family:var(--fd);font-size:clamp(54px,8vw,92px);font-weight:700;line-height:.9;letter-spacing:-.04em}
.f1 .snr{color:var(--p1)} .f2 .snr{color:var(--p2)} .f3 .snr{color:var(--p3)}
.spill{display:inline-block;font-family:var(--fm);font-size:10.5px;letter-spacing:.06em;border-radius:6px;padding:4px 8px;margin-bottom:10px}
.f1 .spill{background:var(--p1b);color:var(--p1)} .f2 .spill{background:var(--p2b);color:var(--p2)} .f3 .spill{background:var(--p3b);color:var(--p3)}
.shd h2{margin-bottom:10px}
.feit{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:var(--ln-s);border:1px solid var(--ln-s);border-radius:16px;overflow:hidden;margin-top:26px}
.feit > div{background:var(--card);padding:14px 16px;min-width:0}
.feit .fk{display:block;font-family:var(--fm);font-size:10px;letter-spacing:.06em;color:var(--tx3);margin-bottom:4px}
.feit .fv{font-size:14.5px;line-height:1.45}

/* vlakken */
.vlak{border-radius:16px;padding:18px 22px;margin:22px 0;max-width:860px}
.vlak .vk{display:block;font-family:var(--fm);font-size:10.5px;letter-spacing:.06em;margin-bottom:8px}
.vlak p,.vlak li{font-size:15.5px}
.vlak ul{margin:0;padding-left:18px} .vlak li{margin-bottom:6px} .vlak li:last-child{margin-bottom:0}
.vlak.klant{background:var(--b50);border-left:4px solid var(--act)} .vlak.klant .vk{color:var(--act)}
.vlak.raakt{background:var(--lime100);border-left:4px solid var(--lime-tx)} .vlak.raakt .vk{color:var(--lime-tx)}
.vlak.open{background:var(--orange100)} .vlak.open .vk{color:var(--orange-tx)}
.vlak.open p,.vlak.open li{color:var(--orange-tx)} .vlak.open b{color:var(--orange-tx)}
.vlak.let{background:var(--red100)} .vlak.let .vk{color:var(--red-tx)}
.vlak.let p,.vlak.let li{color:var(--red-tx)} .vlak.let b{color:var(--red-tx)}
.vlak.grijs{background:var(--alt)} .vlak.grijs .vk{color:var(--tx3)}

.key{background:var(--black);color:var(--inv);border-radius:22px;padding:30px 30px;margin:26px 0}
.key .k{display:block;font-family:var(--fm);font-size:10.5px;letter-spacing:.06em;color:var(--lime);margin-bottom:12px}
.key .big{font-family:var(--fd);font-size:clamp(21px,2.8vw,28px);font-weight:600;line-height:1.22;letter-spacing:-.016em;color:#fff;margin-bottom:12px;max-width:40ch}
.key p{color:var(--inv2);font-size:16.5px;max-width:66ch}
.key b{color:#fff}

/* tabellen */
.tw{overflow-x:auto;margin-top:18px}
table.t{width:100%;border-collapse:collapse;font-size:14.5px}
table.t th,table.t td{text-align:left;padding:11px 12px;border-bottom:1px solid var(--ln-s);vertical-align:top}
table.t thead th{font-family:var(--fm);font-size:10.5px;letter-spacing:.04em;color:var(--tx3);font-weight:500;border-bottom:1px solid var(--ln);white-space:nowrap}
table.t td{color:var(--tx2)}
table.t td:first-child{color:var(--tx);font-weight:500}
table.t td.r,table.t th.r{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
table.t td.m{font-family:var(--fm);font-size:13px;color:var(--tx);white-space:nowrap}
table.t tr.grp td{background:var(--alt);font-family:var(--fm);font-size:10.5px;letter-spacing:.05em;color:var(--tx);font-weight:500;padding:9px 12px}
table.t tr.tot td{border-top:2px solid var(--ln);color:var(--tx);font-weight:600}
table.t tr.oud td{opacity:.55}
table.t tbody tr:last-child td{border-bottom:none}

.chip{display:inline-block;font-family:var(--fm);font-size:9.5px;letter-spacing:.04em;border-radius:5px;padding:2px 6px;white-space:nowrap;font-style:normal;vertical-align:1px}
.chip.g{background:var(--green100);color:var(--green-tx)} .chip.o{background:var(--orange100);color:var(--orange-tx)}
.chip.r{background:var(--red100);color:var(--red-tx)} .chip.b{background:var(--b100);color:var(--act)}
.chip.l{background:var(--lime100);color:var(--lime-tx)} .chip.n{background:var(--alt);color:var(--tx2);border:1px solid var(--ln-s)}

/* kaarten */
.grid2,.grid3,.grid4{display:grid;gap:12px;margin-top:20px}
.grid2{grid-template-columns:repeat(2,minmax(0,1fr))}
.grid3{grid-template-columns:repeat(3,minmax(0,1fr))}
.grid4{grid-template-columns:repeat(4,minmax(0,1fr))}
.kaart{background:var(--card);border:1px solid var(--ln-s);border-radius:16px;padding:18px 20px;min-width:0}
.sec.alt .kaart{background:var(--card)}
.kaart .kl{display:block;font-family:var(--fm);font-size:10px;letter-spacing:.06em;color:var(--act);margin-bottom:6px}
.kaart h4{font-size:17.5px;margin-bottom:6px}
.kaart p,.kaart li{font-size:14.5px;color:var(--tx2)}
.kaart ul{margin:0;padding-left:18px} .kaart li{margin-bottom:4px}
.kaart.g{border-top:4px solid var(--green-tx)} .kaart.o{border-top:4px solid var(--orange-tx)} .kaart.r{border-top:4px solid var(--red-tx)} .kaart.b{border-top:4px solid var(--act)} .kaart.l{border-top:4px solid var(--lime-tx)}
.kaart.zw{background:var(--black);border-color:var(--black)} .kaart.zw h4{color:#fff} .kaart.zw p{color:var(--inv2)} .kaart.zw .kl{color:var(--lime)}

/* stroom: van links naar rechts */
.stroom{display:flex;flex-wrap:wrap;align-items:stretch;gap:8px;margin-top:20px}
.stroom .s{background:var(--card);border:1px solid var(--ln-s);border-radius:14px;padding:12px 14px;flex:1 1 150px;min-width:0}
.stroom .s .sl{display:block;font-family:var(--fm);font-size:10px;letter-spacing:.05em;color:var(--act);margin-bottom:3px}
.stroom .s b{display:block;font-size:15px}
.stroom .s span{display:block;font-size:13px;color:var(--tx2)}
.stroom .pijl{display:flex;align-items:center;color:var(--tx3);font-size:16px;flex:none;font-family:var(--fm)}
.stroom .pv{display:none}

/* keten van gevolgen */
.keten{list-style:none;margin:16px 0 0;padding:0;max-width:900px}
.keten li{display:grid;grid-template-columns:minmax(0,1fr) 28px minmax(0,1fr) 28px minmax(0,1fr);gap:6px;align-items:stretch;margin-bottom:8px}
.keten li > span{background:var(--card);border:1px solid var(--ln-s);border-radius:12px;padding:10px 12px;font-size:14px}
.keten li > i{display:flex;align-items:center;justify-content:center;font-style:normal;color:var(--tx3)}
.keten li > span:first-child{border-left:4px solid var(--act)}
.keten li > span:last-child{border-left:4px solid var(--lime-tx)}

/* vragenlijst */
.schermen{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:20px}
.scr{background:var(--card);border:1px solid var(--ln-s);border-radius:16px;padding:16px 18px;min-width:0}
.scr .sn{display:block;font-family:var(--fm);font-size:10px;letter-spacing:.06em;color:var(--tx3);margin-bottom:6px}
.scr h4{font-size:16.5px;margin-bottom:6px}
.scr .opt{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0 10px}
.scr .opt span{font-size:12.5px;border:1px solid var(--ln);border-radius:980px;padding:3px 10px;color:var(--tx2)}
.scr .w{font-size:13.5px;color:var(--tx2);border-top:1px solid var(--ln-s);padding-top:8px;margin:0}
.scr .w b{font-weight:600}

/* gesprek per blok */
.blk{border:1px solid var(--ln-s);border-radius:18px;background:var(--card);padding:20px 22px;margin-top:12px}
.blk .bh{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:6px}
.blk .bt{font-family:var(--fm);font-size:12px;color:var(--act);white-space:nowrap}
.blk h4{font-size:19px;margin:0;flex:1;min-width:180px}
.blk .bm{font-family:var(--fm);font-size:10.5px;color:var(--tx3)}
.blk .bd{font-size:15px;color:var(--tx2);margin:0 0 14px;max-width:none}
.blk .bg{display:grid;grid-template-columns:1.35fr 1fr;gap:16px}
.blk .kl{display:block;font-family:var(--fm);font-size:10px;letter-spacing:.06em;color:var(--tx3);margin-bottom:6px}
.zeg{list-style:none;margin:0;padding:0}
.zeg li{font-size:14.5px;line-height:1.5;padding:8px 12px;border-left:3px solid var(--act);background:var(--b50);border-radius:0 10px 10px 0;margin-bottom:6px}
.ls{list-style:none;margin:0 0 12px;padding:0}
.ls li{font-size:14px;line-height:1.5;padding:4px 0 4px 15px;position:relative}
.ls li::before{content:"";position:absolute;left:0;top:11px;width:6px;height:6px;border-radius:2px;background:var(--ln)}
.val{margin-top:12px;background:var(--orange100);color:var(--orange-tx);border-radius:10px;padding:10px 13px;font-size:13.5px}
.val b{color:var(--orange-tx)}

/* tijdbalk */
.klok{margin-top:22px;border-radius:12px;overflow:hidden;display:flex;height:36px;border:1px solid var(--ln-s)}
.klok span{display:flex;align-items:center;justify-content:center;font-family:var(--fm);font-size:10px;color:var(--tx2);border-right:1px solid var(--ln-s);background:var(--card);white-space:nowrap;overflow:hidden;padding:0 4px;min-width:0}
.klok span:nth-child(odd){background:var(--alt)}
.klok span.acc{background:var(--black);color:var(--lime)}

/* rekensom */
.rk{max-width:620px;margin-top:16px;background:var(--card);border:1px solid var(--ln-s);border-radius:16px;padding:4px 20px}
.rk div{display:grid;grid-template-columns:1fr auto;gap:2px 16px;padding:9px 0;border-bottom:1px solid var(--ln-s);font-size:14.5px}
.rk div:last-child{border-bottom:none}
.rk span{color:var(--tx2)}
.rk b{font-family:var(--fm);font-size:13.5px;font-weight:500;white-space:nowrap;text-align:right;font-variant-numeric:tabular-nums}
.rk i{grid-column:1/-1;font-style:normal;font-size:12px;color:var(--tx3);margin-top:-3px}
.rk div.tot{border-top:2px solid var(--ln)} .rk div.tot span{color:var(--tx);font-weight:600} .rk div.tot b{color:var(--act);font-weight:700}

/* tijdlijn */
.tl{list-style:none;margin:20px 0 0;padding:0;max-width:900px}
.tl li{display:grid;grid-template-columns:120px 1fr;gap:18px;padding:13px 0;border-bottom:1px solid var(--ln-s)}
.tl li:last-child{border-bottom:none}
.tl .d{font-family:var(--fm);font-size:11.5px;color:var(--act);padding-top:3px}
.tl b{display:block;font-size:16px;margin-bottom:2px}
.tl p{font-size:14.5px;color:var(--tx2);margin:0;max-width:74ch}

/* mails */
.mail{max-width:660px;margin-top:16px;background:var(--card);border:1px solid var(--ln-s);border-radius:16px;overflow:hidden}
.mail .mt{padding:9px 20px;font-family:var(--fm);font-size:10.5px;letter-spacing:.05em;color:var(--act);background:var(--b50);border-bottom:1px solid var(--ln-s)}
.mail .mh{padding:11px 20px;background:var(--alt);font-family:var(--fm);font-size:12px;color:var(--tx2);border-bottom:1px solid var(--ln-s)}
.mail .mh b{color:var(--tx);font-weight:500}
.mail .mb{padding:16px 20px;font-size:15px}
.mail .mb p{margin:0 0 11px}
.mail .mb ul,.mail .mb ol{margin:0 0 11px;padding-left:20px}
.mail .mb li{margin-bottom:5px}
.vv{background:var(--orange100);color:var(--orange-tx);border-radius:4px;padding:0 4px}
.knop{display:inline-block;background:var(--act);color:#fff;border-radius:980px;padding:6px 14px;font-size:13.5px;font-weight:500}

/* genummerde lijst in kaartjes */
.jk{counter-reset:j;list-style:none;margin:18px 0 0;padding:0;display:grid;gap:10px;max-width:900px}
.jk li{counter-increment:j;display:grid;grid-template-columns:34px 1fr;gap:12px;background:var(--card);border:1px solid var(--ln-s);border-radius:14px;padding:14px 16px}
.jk li::before{content:counter(j);font-family:var(--fd);font-size:22px;font-weight:700;color:var(--tx3);line-height:1}
.jk b{display:block;font-size:15.5px;margin-bottom:2px}
.jk span{font-size:14.5px;color:var(--tx2)}

/* kleurstalen */
.stalen{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:18px}
.staal{border:1px solid var(--ln-s);border-radius:14px;overflow:hidden;background:var(--card)}
.staal i{display:block;height:58px}
.staal div{padding:10px 12px;font-size:13px}
.staal b{display:block;font-size:14px}
.staal span{font-family:var(--fm);font-size:11.5px;color:var(--tx3)}
.staal p{font-size:12.5px;color:var(--tx2);margin:4px 0 0}

.voet{padding-block:50px 70px;font-size:13px;color:var(--tx3);text-align:center;border-top:1px solid var(--ln-s)}

@media (max-width:900px){
  .route,.geld,.grid3,.grid4,.stalen{grid-template-columns:repeat(2,minmax(0,1fr))}
  .blk .bg{grid-template-columns:1fr}
  .feit{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (max-width:640px){
  :root{--g:18px}
  body{font-size:16px}
  .sec,.stap{padding-block:48px 24px}
  .hero{padding-block:44px 30px}
  .route,.geld,.grid2,.grid3,.grid4,.schermen{grid-template-columns:1fr}
  .stalen{grid-template-columns:repeat(2,minmax(0,1fr))}
  .shd{grid-template-columns:1fr}
  .snr{font-size:56px}
  .tl li{grid-template-columns:1fr;gap:3px}
  .keten li{grid-template-columns:1fr;gap:4px}
  .keten li > i{transform:rotate(90deg);height:18px}
  .stroom .pijl{width:100%;justify-content:center}
  .stroom .ph{display:none} .stroom .pv{display:inline}
  .key{padding:24px 20px}
  .blk{padding:18px 16px}
  table.t.st thead{display:none}
  table.t.st,table.t.st tbody,table.t.st tr,table.t.st td{display:block;width:auto!important}
  table.t.st tr{padding:10px 0;border-bottom:1px solid var(--ln-s)}
  table.t.st tr.grp{padding:0;margin-top:10px}
  table.t.st td{border:0;padding:2px 0}
  table.t.st td[data-l]:not(:first-child)::before{content:attr(data-l) ": ";font-family:var(--fm);font-size:10px;letter-spacing:.04em;color:var(--tx3)}
  table.t.st td.r{text-align:left}
}
@media print{.bar{display:none}}
"""

JS = r"""
<script>
(function(){
  var b=document.getElementById('thema');
  function cur(){var t=document.documentElement.getAttribute('data-theme');if(t)return t;return window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}
  try{var s=localStorage.getItem('jr-gids-thema');if(s)document.documentElement.setAttribute('data-theme',s)}catch(e){}
  function lab(){b.textContent=cur()==='dark'?'Licht':'Donker'}
  if(b){lab();b.addEventListener('click',function(){var n=cur()==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',n);try{localStorage.setItem('jr-gids-thema',n)}catch(e){}lab()})}
})();
</script>
"""

import re as _re

def tbl(head, rows, cls='st', right=()):
    """Tabel; rijen die met ('grp', tekst) beginnen worden groepskoppen, ('tot', [...]) totaalregels, ('oud',[...]) vervaagd."""
    h = ''.join('<th%s>%s</th>' % (' class="r"' if i in right else '', x) for i, x in enumerate(head))
    out = []
    for r in rows:
        kind = ''
        if isinstance(r, tuple):
            if r[0] == 'grp':
                out.append('<tr class="grp"><td colspan="%d">%s</td></tr>' % (len(head), r[1]))
                continue
            kind, r = r
        tds = []
        for i, c in enumerate(r):
            attrs = ''
            if i in right: attrs += ' class="r"'
            lab = _re.sub(r'<[^>]+>', '', head[i]) if i < len(head) else ''
            if lab: attrs += ' data-l="%s"' % lab
            tds.append('<td%s>%s</td>' % (attrs, c))
        out.append('<tr%s>%s</tr>' % (' class="%s"' % kind if kind else '', ''.join(tds)))
    return '<div class="tw"><table class="t %s"><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>' % (cls, h, ''.join(out))

def vlak(kind, label, body):
    if not body.lstrip().startswith('<'):
        body = '<p>%s</p>' % body
    return '<div class="vlak %s"><span class="vk">%s</span>%s</div>' % (kind, label, body)

def klant(body): return vlak('klant', 'WAT DE KLANT MERKT', body)
def raakt(body): return vlak('raakt', 'WAT DIT RAAKT', body)
def open_(body, label='NOG OPEN'): return vlak('open', label, body)
def let(body, label='LET OP'): return vlak('let', label, body)

def ul(items, cls='p'):
    return '<ul class="%s">%s</ul>' % (cls, ''.join('<li>%s</li>' % i for i in items))

def ol(items, cls='p'):
    return '<ol class="%s">%s</ol>' % (cls, ''.join('<li>%s</li>' % i for i in items))

def feit(pairs):
    return '<div class="feit">%s</div>' % ''.join('<div><span class="fk">%s</span><div class="fv">%s</div></div>' % (k, v) for k, v in pairs)

def stap_kop(nr, fase_cls, fase_lab, titel, lead, feiten, anchor):
    return ('<section class="stap %s" id="%s"><div class="wrap"><div class="shd"><div class="snr">%s</div><div>'
            '<span class="spill">%s</span><h2>%s</h2><p class="sub">%s</p></div></div>%s') % (
        fase_cls, anchor, nr, fase_lab, titel, lead, feit(feiten))

def stap_eind():
    return '</div></section>'

def mail(label, onderwerp, body):
    return ('<div class="mail">%s<div class="mh">Onderwerp: <b>%s</b></div><div class="mb">%s</div></div>' % (
        '<div class="mt">%s</div>' % label if label else '', onderwerp, body))

def key(label, big, body=''):
    return '<div class="key"><span class="k">%s</span><div class="big">%s</div>%s</div>' % (label, big, body)

def kaart(titel, body, kl='', cls=''):
    if not body.lstrip().startswith('<'): body = '<p>%s</p>' % body
    return '<div class="kaart %s">%s<h4>%s</h4>%s</div>' % (cls, '<span class="kl">%s</span>' % kl if kl else '', titel, body)

def grid(n, items):
    return '<div class="grid%d">%s</div>' % (n, ''.join(items))

def rk(rows):
    out = []
    for r in rows:
        cls = ' class="tot"' if len(r) > 3 and r[3] == 'tot' else ''
        note = '<i>%s</i>' % r[2] if len(r) > 2 and r[2] else ''
        out.append('<div%s><span>%s</span><b>%s</b>%s</div>' % (cls, r[0], r[1], note))
    return '<div class="rk">%s</div>' % ''.join(out)

def tl(items):
    return '<ul class="tl">%s</ul>' % ''.join('<li><span class="d">%s</span><div><b>%s</b><p>%s</p></div></li>' % i for i in items)

def jk(items):
    return '<ol class="jk">%s</ol>' % ''.join('<li><div><b>%s</b><span>%s</span></div></li>' % i for i in items)

def keten(items):
    return '<ul class="keten">%s</ul>' % ''.join('<li><span>%s</span><i>→</i><span>%s</span><i>→</i><span>%s</span></li>' % i for i in items)

def blk(tijd, titel, duur, doel, zeg, laat, haal, valkuil):
    left = '<span class="kl">WAT JE ZEGT</span><ul class="zeg">%s</ul>' % ''.join('<li>%s</li>' % z for z in zeg)
    right = ''
    if laat: right += '<span class="kl">WAT JE LAAT ZIEN</span><ul class="ls">%s</ul>' % ''.join('<li>%s</li>' % x for x in laat)
    if haal: right += '<span class="kl">WAT JE OPHAALT</span><ul class="ls">%s</ul>' % ''.join('<li>%s</li>' % x for x in haal)
    return ('<div class="blk"><div class="bh"><span class="bt">%s</span><h4>%s</h4><span class="bm">%s</span></div>'
            '<p class="bd">%s</p><div class="bg"><div>%s</div><div>%s</div></div><div class="val"><b>Valkuil.</b> %s</div></div>') % (
        tijd, titel, duur, doel, left, right, valkuil)

def chip(kind, t): return '<span class="chip %s">%s</span>' % (kind, t)
G = lambda t='GROEN': chip('g', t)
O = lambda t='ORANJE': chip('o', t)
R = lambda t='ROOD': chip('r', t)
L = lambda t='LATER': chip('b', t)
