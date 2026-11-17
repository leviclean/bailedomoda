/* Continuous camera path through the first four original Musée views.
 * The fifth (close-up) view is deliberately omitted for the Baile section.
 */
(() => {
  'use strict';
  const positions = [[0,0,20],[20,0,0],[0,5,15],[21.775,-4.44,18.33]];
  const targets = [[-.15,0,0],[0,0,1.25],[-.5,-.7,-2],[-2.35,-.5,0]];
  const mobileTargets = [[-.15,0,0],[0,-.1,.125],[-.2,-.7,-2],[0,-.75,0]];
  const narrow = matchMedia('(max-width:899px)');
  function point(points, t) {
    const value = Math.max(0, Math.min(1, t)) * (points.length - 1);
    const index = Math.min(points.length - 2, Math.floor(value));
    const u = value - index, u2 = u*u, u3 = u2*u;
    const a = points[Math.max(0,index-1)], b = points[index];
    const c = points[index+1], d = points[Math.min(points.length-1,index+2)];
    return b.map((v,axis) => .5*((2*v)+(-a[axis]+c[axis])*u+(2*a[axis]-5*v+4*c[axis]-d[axis])*u2+(-a[axis]+3*v-3*c[axis]+d[axis])*u3));
  }
  // Map scroll distance to curve distance, so the camera does not race between views.
  const samples = [{ t:0, distance:0 }];
  let previous = point(positions,0), length = 0;
  for (let i=1;i<=360;i++) {
    const t=i/360, next=point(positions,t);
    length += Math.hypot(...next.map((v,axis)=>v-previous[axis]));
    samples.push({t,distance:length}); previous=next;
  }
  function parameter(progress) {
    const distance=progress*length;
    let lo=0,hi=samples.length-1;
    while(hi-lo>1){const mid=(lo+hi)>>1;if(samples[mid].distance<distance)lo=mid;else hi=mid;}
    const a=samples[lo],b=samples[hi];
    return a.t+(b.t-a.t)*(distance-a.distance)/Math.max(.00001,b.distance-a.distance);
  }
  let current=0,last=0;
  window.__baileVenusCamera = camera => {
    const now=performance.now(),dt=last?Math.min(.05,(now-last)/1000):1/60;
    last=now;
    const scroll=window.__baileVenusProgress||0;
    current+=(scroll-current)*(1-Math.exp(-dt/.10));
    const t=parameter(current),position=point(positions,t);
    const look=point(narrow.matches?mobileTargets:targets,t);
    camera.position.set(...position);
    camera.lookAt(...look);
  };
})();
