// NORNA public background: only animated lines, no particles or floating dots.
const canvas=document.getElementById("threadCanvas");
if(canvas){
  const ctx=canvas.getContext("2d");
  let time=0;
  let w=innerWidth,h=innerHeight;
  function resize(){
    w=innerWidth;h=innerHeight;
    canvas.width=w*devicePixelRatio;
    canvas.height=h*devicePixelRatio;
    ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  }
  addEventListener("resize",resize);resize();

  const threads=[
    {base:.27,amp:54,freq:.0064,phase:0,speed:1.00,color:"rgba(137,111,133,.20)",width:.9},
    {base:.32,amp:78,freq:.0054,phase:.7,speed:.82,color:"rgba(176,145,170,.18)",width:1.0},
    {base:.38,amp:46,freq:.0078,phase:1.5,speed:1.14,color:"rgba(205,176,198,.22)",width:.8},
    {base:.44,amp:88,freq:.0048,phase:2.1,speed:.73,color:"rgba(116,91,113,.15)",width:1.1},
    {base:.50,amp:60,freq:.0069,phase:2.9,speed:.92,color:"rgba(188,153,181,.19)",width:.9},
    {base:.56,amp:82,freq:.0056,phase:3.8,speed:.78,color:"rgba(128,101,124,.14)",width:1.0},
    {base:.62,amp:50,freq:.0073,phase:4.6,speed:1.08,color:"rgba(218,191,211,.20)",width:.75},
    {base:.68,amp:74,freq:.0051,phase:5.2,speed:.86,color:"rgba(151,119,145,.14)",width:.85}
  ];

  function drawThread(t){
    ctx.beginPath();
    for(let x=-120;x<=w+120;x+=8){
      // Phase advances horizontally, creating the impression that the whole thread travels across the screen.
      const travel=time*t.speed*1.55;
      const y=h*t.base
        +Math.sin((x-travel*145)*t.freq+t.phase)*t.amp
        +Math.sin((x+travel*72)*t.freq*1.9+t.phase*.63)*13;
      if(x===-120)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.strokeStyle=t.color;
    ctx.lineWidth=t.width;
    ctx.lineCap="round";
    ctx.stroke();
  }

  function draw(){
    ctx.clearRect(0,0,w,h);
    threads.forEach(drawThread);
    time+=.012;
    requestAnimationFrame(draw);
  }
  draw();
}

// A página pública não instala a NORNA no dispositivo atual.
// O botão "Baixar aplicativo" aponta para um APK Android real em aplicativo.html.
