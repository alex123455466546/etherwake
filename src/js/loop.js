function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = cv.clientWidth || 800;
  H = cv.clientHeight || 600;
  cv.width = W * DPR;
  cv.height = H * DPR;
  UI = clamp(H / 1080, 1, 2) * SET.ui;
  root.style.setProperty("--u", UI + "px");
  BSIDE = Math.round(Math.min(300 * UI, W * 0.27));
  root.style.setProperty("--bside", BSIDE + "px");
  zBase = clamp(H / 1080, 0.6, 2) * 1.3;
  zoom = zBase * zUser;
  const mm = Math.round(Math.min(300 * UI, H * 0.33));
  root.style.setProperty("--mm", mm + "px");
  const N = Math.round(mm * DPR);
  if (mini.width !== N) {
    mini.width = mini.height = N;
  }
  resetPartInfo();
}
function frame(t) {
  try {
    const raw = t - last;
    let dt = Math.min(0.034, raw / 1e3 || 0.016);
    last = t;
    DT = dt;
    S.frame++;
    if (S.hitStop > 0) {
      S.hitStop -= raw / 1e3;
    } else if (S.started && !S.paused && !S.over) {
      safely("update", update, dt);
      if (LOG && raw > 0 && raw < 1e3) logFrame(raw);
    } else if (!S.paused) ambient(0.8, 1.3);
    if (!S.paused) safely("particles", updParticles, dt);
    const cr = SET.camLag ? TUNE.camLag : 6;
    cam.x += (P.x + P.vx * 0.22 - cam.x) * Math.min(1, dt * cr);
    cam.y += (P.y + P.vy * 0.22 - cam.y) * Math.min(1, dt * cr);
    if (!S.paused || build || S.frame % 15 === 0) {
      safely("draw", draw);
      safely("hud", hud);
      safely("sound", soundscape);
    }
  } catch (e) {
    logErr("frame", e);
  }
  requestAnimationFrame(frame);
}
