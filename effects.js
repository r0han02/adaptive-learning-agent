// ============================================================
// AdaptIQ — Visual Effects Engine
// Particles, Cursor Glow, Ripple Effects, Click Bubbles
// ============================================================

(function(){
  'use strict';

  // ===== FLOATING PARTICLES =====
  const canvas = document.getElementById('particle-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  const PARTICLE_COUNT = 60;
  const colors = ['rgba(129,140,248,','rgba(6,182,212,','rgba(167,139,250,','rgba(244,114,182,'];

  function resizeCanvas(){canvas.width=window.innerWidth;canvas.height=window.innerHeight}
  window.addEventListener('resize',resizeCanvas);resizeCanvas();

  class Particle{
    constructor(){this.reset()}
    reset(){
      this.x=Math.random()*canvas.width;
      this.y=Math.random()*canvas.height;
      this.size=Math.random()*2.5+0.5;
      this.speedX=(Math.random()-0.5)*0.3;
      this.speedY=(Math.random()-0.5)*0.3;
      this.opacity=Math.random()*0.4+0.1;
      this.color=colors[Math.floor(Math.random()*colors.length)];
      this.pulse=Math.random()*Math.PI*2;
      this.pulseSpeed=Math.random()*0.02+0.005;
    }
    update(){
      this.x+=this.speedX;this.y+=this.speedY;
      this.pulse+=this.pulseSpeed;
      const op=this.opacity*(0.6+Math.sin(this.pulse)*0.4);
      if(this.x<-10||this.x>canvas.width+10||this.y<-10||this.y>canvas.height+10)this.reset();
      return op;
    }
    draw(op){
      ctx.beginPath();ctx.arc(this.x,this.y,this.size,0,Math.PI*2);
      ctx.fillStyle=this.color+op+')';ctx.fill();
    }
  }

  for(let i=0;i<PARTICLE_COUNT;i++)particles.push(new Particle());

  function animateParticles(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach(p=>{const op=p.update();p.draw(op)});
    requestAnimationFrame(animateParticles);
  }
  animateParticles();

  // ===== CURSOR GLOW =====
  const glow = document.getElementById('cursor-glow');
  if(glow){
    let mx=-500,my=-500;
    document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;glow.style.left=mx+'px';glow.style.top=my+'px';glow.style.opacity='1'});
    document.addEventListener('mouseleave',()=>{glow.style.opacity='0'});
  }

  // ===== BUTTON RIPPLE EFFECT =====
  document.addEventListener('click',function(e){
    const btn=e.target.closest('.btn-primary,.btn-secondary,.btn-next');
    if(!btn)return;
    const rect=btn.getBoundingClientRect();
    const ripple=document.createElement('span');
    ripple.className='ripple';
    const size=Math.max(rect.width,rect.height);
    ripple.style.width=ripple.style.height=size+'px';
    ripple.style.left=(e.clientX-rect.left-size/2)+'px';
    ripple.style.top=(e.clientY-rect.top-size/2)+'px';
    btn.appendChild(ripple);
    setTimeout(()=>ripple.remove(),600);
  });

  // ===== CLICK BUBBLE GENERATION =====
  document.addEventListener('click',function(e){
    for(let i=0;i<6;i++){
      const bubble=document.createElement('div');
      bubble.style.cssText=`position:fixed;pointer-events:none;z-index:9999;border-radius:50%;
        width:${Math.random()*8+4}px;height:${Math.random()*8+4}px;
        left:${e.clientX}px;top:${e.clientY}px;
        background:${colors[Math.floor(Math.random()*colors.length)]+'0.6)'};
        box-shadow:0 0 6px ${colors[Math.floor(Math.random()*colors.length)]+'0.4)'};`;
      document.body.appendChild(bubble);
      const angle=Math.random()*Math.PI*2;
      const dist=Math.random()*60+30;
      const dx=Math.cos(angle)*dist;
      const dy=Math.sin(angle)*dist;
      bubble.animate([
        {transform:'translate(0,0) scale(1)',opacity:1},
        {transform:`translate(${dx}px,${dy}px) scale(0)`,opacity:0}
      ],{duration:600+Math.random()*400,easing:'cubic-bezier(.25,.46,.45,.94)'});
      setTimeout(()=>bubble.remove(),1000);
    }
  });

  // ===== INTERSECTION OBSERVER FOR CARD ANIMATIONS =====
  const observer=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.style.opacity='1';
        entry.target.style.transform='translateY(0)';
      }
    });
  },{threshold:0.1});

  document.querySelectorAll('.glass-card,.stat-card,.feature-card,.topic-card,.chart-box').forEach(el=>{
    el.style.opacity='0';el.style.transform='translateY(20px)';
    el.style.transition='opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });

  // ===== MOBILE SIDEBAR TOGGLE =====
  const mobileToggle=document.querySelector('.mobile-toggle');
  const sidebar=document.querySelector('.sidebar');
  if(mobileToggle&&sidebar){
    mobileToggle.addEventListener('click',()=>{sidebar.classList.toggle('open')});
    document.addEventListener('click',e=>{
      if(sidebar.classList.contains('open')&&!sidebar.contains(e.target)&&!mobileToggle.contains(e.target)){
        sidebar.classList.remove('open');
      }
    });
  }

})();
