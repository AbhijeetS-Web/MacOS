/* Abhijeet Sharma - macOS Premium Interactive Portfolio Logic Core */

// --- GLOBAL APP STATE ---
const STATE = {
  theme: 'light', // Set light mode as default as requested
  soundEnabled: true,
  wifiConnected: true,
  bluetoothOn: true,
  openApps: new Set(),
  activeApp: 'Finder',
  windows: {}, // Stores positions, dimensions, minimized/maximized state of apps
  musicPlaying: false,
  musicTrackIndex: 0,
  trashItems: [
    { id: 'old_resume', name: 'Old_Resume_2023.docx', type: 'doc' },
    { id: 'bad_ad', name: 'Bad_Ad_Creative_v1.png', type: 'image' }
  ],
  finderPath: ['Root'], // Path navigation inside Finder
  activeNoteId: 'welcome',
  zIndexStack: [], // Array of appIds in order of focus (highest z-index last)
  
  // Custom Spotify Tracks list (Editable by the user!)
  spotifyTracks: [
    { id: '37i9dQZF1DWWQRwui0ExPn', name: 'Lo-Fi Beats (Warm Focus)', artist: 'Spotify Playlist', type: 'playlist' },
    { id: '4PTG3Z6ehGkBF3sIqRZr4W', name: 'Digital Marketing Flow', artist: 'Abhijeet Beats', type: 'track' },
    { id: '4uLU6hMCjMI0g1t194WK36', name: 'Porsche Driving Chills', artist: 'Synth Chill', type: 'track' },
    { id: '37i9dQZF1DX8UebhpvM87n', name: 'Chill Lofi Study Beats', artist: 'Lofi Girl', type: 'playlist' }
  ],
  activeSpotifyMedia: { type: 'playlist', id: '37i9dQZF1DWWQRwui0ExPn' }
};

// Restore user-custom Spotify playlist from localStorage if available
try {
  const localSpotify = localStorage.getItem('abhijeet_spotify_tracks');
  if (localSpotify) {
    STATE.spotifyTracks = JSON.parse(localSpotify);
  }
} catch (e) {
  console.error("Local storage error:", e);
}

// --- AUDIO SYNTHESIZER (Web Audio API - Zero External Dependencies) ---
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

// Play macOS Boot Chime (Rich, deep synthesized chime chord)
function playBootChime() {
  if (!STATE.soundEnabled) return;
  initAudio();
  const ctx = audioCtx;
  const now = ctx.currentTime;
  
  // Create synth voices for a rich major chord (C Major 9)
  const frequencies = [65.41, 130.81, 196.00, 261.63, 329.63, 392.00, 493.88]; // C1, C2, G2, C3, E3, G3, B3
  
  frequencies.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Choose wave shapes to mix sound character
    if (index === 0) {
      osc.type = 'sine'; // Sub-bass foundation
    } else if (index < 3) {
      osc.type = 'triangle'; // Warm mid register
    } else {
      osc.type = 'sawtooth'; // Bright harmonics
      // Low pass filter to remove harshness from sawtooth
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(150, now + 4);
      osc.connect(filter);
      filter.connect(gainNode);
    }
    
    osc.frequency.setValueAtTime(freq, now);
    
    // Slight detune for chorus warmth
    osc.detune.setValueAtTime((Math.random() - 0.5) * 8, now);
    
    // Envelope: slow rise, long lush decay
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2 / frequencies.length, now + 0.15);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);
    
    if (index >= 3) {
      osc.connect(gainNode);
    }
    
    // Add dynamic stereo spatial feel
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.setValueAtTime((index % 2 === 0 ? -0.3 : 0.3), now);
      gainNode.connect(panner);
      panner.connect(ctx.destination);
    } else {
      gainNode.connect(ctx.destination);
    }
    
    osc.start(now);
    osc.stop(now + 4.8);
  });
}

// Synthesize window click sound (sharp, clean high-freq click)
function playClickSound() {
  if (!STATE.soundEnabled) return;
  initAudio();
  const ctx = audioCtx;
  const now = ctx.currentTime;
  
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1000, now);
  osc.frequency.exponentialRampToValueAtTime(150, now + 0.05);
  
  gainNode.gain.setValueAtTime(0.1, now);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
  
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  osc.start(now);
  osc.stop(now + 0.06);
}

// Synthesize email swoosh sound (sweeping filter on white noise)
function playSwooshSound() {
  if (!STATE.soundEnabled) return;
  initAudio();
  const ctx = audioCtx;
  const now = ctx.currentTime;
  
  // Create noise buffer
  const bufferSize = ctx.sampleRate * 0.5; // 0.5s duration
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noiseNode = ctx.createBufferSource();
  noiseNode.buffer = buffer;
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.setValueAtTime(3.0, now);
  // Upward frequency sweep for the swoosh
  filter.frequency.setValueAtTime(200, now);
  filter.frequency.exponentialRampToValueAtTime(1600, now + 0.45);
  
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0.0, now);
  gainNode.gain.linearRampToValueAtTime(0.2, now + 0.15);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
  
  noiseNode.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  noiseNode.start(now);
  noiseNode.stop(now + 0.55);
}

// Synthesize trash emptying crinkle sound
function playCrinkleSound() {
  if (!STATE.soundEnabled) return;
  initAudio();
  const ctx = audioCtx;
  const now = ctx.currentTime;
  
  // Synthesize repeated random crackles using noise bursts
  const crackleCount = 7;
  for (let i = 0; i < crackleCount; i++) {
    const delay = i * 0.04 + Math.random() * 0.02;
    const duration = 0.02 + Math.random() * 0.03;
    
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let j = 0; j < bufferSize; j++) {
      data[j] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(5000 + Math.random() * 3000, now + delay);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.07, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    noise.start(now + delay);
    noise.stop(now + delay + duration + 0.01);
  }
}

// --- MUSIC OSCILLATOR SYNTHESIZER (For internal lo-fi music player fallback) ---
let musicOsc = null;
let musicGain = null;
let musicInterval = null;
const lofiTracks = [
  { name: 'Performance Marketing Flow', artist: 'Abhijeet Sharma', duration: '1:45', beats: [261.63, 293.66, 329.63, 392.00, 329.63, 293.66] },
  { name: 'Shopify Storefront Ambience', artist: 'Lofi Digital', duration: '2:12', beats: [329.63, 349.23, 392.00, 440.00, 392.00, 349.23] },
  { name: 'SEO Crawler Beats', artist: 'The Algorithm', duration: '1:58', beats: [196.00, 220.00, 261.63, 293.66, 261.63, 220.00] }
];

function playLofiSynthNotes() {
  if (!STATE.musicPlaying) return;
  initAudio();
  const ctx = audioCtx;
  
  const beats = lofiTracks[STATE.musicTrackIndex].beats;
  let beatStep = 0;
  
  musicInterval = setInterval(() => {
    if (!STATE.musicPlaying) return;
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(beats[beatStep % beats.length], now);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 1.3);
    
    beatStep++;
  }, 1500);
}

function stopLofiSynthNotes() {
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
}

// --- BOOT PROCESS LOGIC ---
document.getElementById('boot-button').addEventListener('click', () => {
  const bootBtn = document.getElementById('boot-button');
  const progressWrapper = document.getElementById('progress-bar-container');
  const bootProgress = document.getElementById('boot-progress');
  const bootScreen = document.getElementById('boot-screen');
  const desktop = document.getElementById('desktop-container');
  
  // Enable audio context
  initAudio();
  playBootChime();
  
  // Transition Boot UI
  bootBtn.classList.add('hide');
  setTimeout(() => bootBtn.style.display = 'none', 300);
  progressWrapper.classList.remove('hide');
  
  // Progress bar filling
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 8 + 2;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      
      // Unveil Desktop
      setTimeout(() => {
        bootScreen.classList.add('fade-out');
        desktop.classList.remove('blur-in');
        desktop.classList.add('unblur');
        
        // Hide boot completely after fade animation
        setTimeout(() => {
          bootScreen.style.display = 'none';
        }, 800);
      }, 500);
    }
    bootProgress.style.width = `${progress}%`;
  }, 120);
});

// --- CLOCK & STATUS BAR ---
function updateClock() {
  const clockEl = document.getElementById('menu-clock');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const now = new Date();
  const day = days[now.getDay()];
  const date = now.getDate();
  const month = months[now.getMonth()];
  
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // conversion 0 to 12
  
  clockEl.textContent = `${day} ${month} ${date}   ${hours}:${minutes} ${ampm}`;
}
setInterval(updateClock, 1000);
updateClock();

// Dropdowns in Menu Bar
document.getElementById('apple-menu-trigger').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('apple-dropdown').classList.toggle('show');
  document.getElementById('control-center').classList.remove('show');
});

// Control Center Panel
document.getElementById('cc-toggle').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('control-center').classList.toggle('show');
  document.getElementById('apple-dropdown').classList.remove('show');
});

// Close open dropdowns when clicking outside
window.addEventListener('click', () => {
  document.getElementById('apple-dropdown').classList.remove('show');
  document.getElementById('control-center').classList.remove('show');
});

// Avoid closing Control Center when interacting inside it
document.getElementById('control-center').addEventListener('click', (e) => {
  e.stopPropagation();
});

// --- SYSTEM PREFERENCE ACTIONS & TOGGLES ---
function toggleWiFi() {
  STATE.wifiConnected = !STATE.wifiConnected;
  const wifiStatus = document.getElementById('cc-wifi-status');
  wifiStatus.textContent = STATE.wifiConnected ? 'HomeNet_5G' : 'Disconnected';
  playClickSound();
}

function toggleBluetooth() {
  STATE.bluetoothOn = !STATE.bluetoothOn;
  const btStatus = document.getElementById('cc-bt-status');
  btStatus.textContent = STATE.bluetoothOn ? 'On' : 'Off';
  playClickSound();
}

function toggleDarkMode() {
  STATE.theme = STATE.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', STATE.theme);
  const darkModeBox = document.getElementById('cc-dark-mode');
  if (STATE.theme === 'light') {
    darkModeBox.classList.remove('active');
  } else {
    darkModeBox.classList.add('active');
  }
  playClickSound();
}

function toggleSystemSounds() {
  STATE.soundEnabled = !STATE.soundEnabled;
  const soundBox = document.getElementById('cc-sound-toggle');
  if (STATE.soundEnabled) {
    soundBox.classList.add('active');
    soundBox.querySelector('.cc-label').textContent = 'SFX Enabled';
    playClickSound();
  } else {
    soundBox.classList.remove('active');
    soundBox.querySelector('.cc-label').textContent = 'SFX Muted';
  }
}

function changeBrightness(val) {
  // val represents percentage. Set overlay opacity as inversed brightness
  const overlay = document.getElementById('system-brightness-overlay');
  const opacity = (100 - val) / 100 * 0.75; // Cap at 75% max darkness
  overlay.style.opacity = opacity;
}

function changeVolume(val) {
  // Update state volume factor
  STATE.sfxVolume = val / 100;
  // Dynamic play sound review
  if (val % 10 === 0) playClickSound();
}

function triggerRestart() {
  window.location.reload();
}

function triggerShutDown() {
  document.body.innerHTML = `
    <div style="background: black; width: 100vw; height: 100vh; display: flex; justify-content: center; align-items: center; flex-direction: column; font-family: -apple-system, sans-serif; color: white;">
      <h2 style="font-weight: 500; font-size: 20px; margin-bottom: 20px;">System Shutdown Successful.</h2>
      <button onclick="window.location.reload()" style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2); padding: 8px 16px; color: white; border-radius: 6px; cursor: pointer;">Power On</button>
    </div>
  `;
}

// --- WINDOW MANAGER SYSTEM ---
function bringToFront(appId) {
  // Remove appId from stack if already there, then push to top/end
  STATE.zIndexStack = STATE.zIndexStack.filter(id => id !== appId);
  STATE.zIndexStack.push(appId);
  
  // Update real DOM z-indexes
  STATE.zIndexStack.forEach((id, index) => {
    const win = document.getElementById(`window-${id}`);
    if (win) {
      win.style.zIndex = 100 + index;
      if (id === appId) {
        win.classList.add('focused');
      } else {
        win.classList.remove('focused');
      }
    }
  });

  // Update top menu-bar name
  const formattedNames = {
    'finder': 'Finder',
    'notes': 'Notes',
    'mail': 'Mail',
    'photos': 'Photos',
    'music': 'Music',
    'terminal': 'Terminal',
    'spotify': 'Spotify',
    'trash': 'Trash',
    'about-mac': 'About This Mac'
  };
  document.getElementById('menu-active-app').textContent = formattedNames[appId] || 'Finder';
}

function closeApp(appId) {
  playClickSound();
  const win = document.getElementById(`window-${appId}`);
  if (win) {
    win.remove();
  }
  STATE.openApps.delete(appId);
  STATE.zIndexStack = STATE.zIndexStack.filter(id => id !== appId);
  
  // Turn off active indicator dot in dock
  const dot = document.getElementById(`dot-${appId}`);
  if (dot) dot.classList.remove('active');
}

function minimizeApp(appId) {
  playClickSound();
  const win = document.getElementById(`window-${appId}`);
  if (win) {
    win.classList.add('minimized');
  }
}

function toggleMaximizeApp(appId) {
  playClickSound();
  const win = document.getElementById(`window-${appId}`);
  if (win) {
    win.classList.toggle('maximized');
  }
}

function openApp(appId) {
  playClickSound();
  
  // If app is already open but minimized, restore it
  const existingWin = document.getElementById(`window-${appId}`);
  if (existingWin) {
    if (existingWin.classList.contains('minimized')) {
      existingWin.classList.remove('minimized');
    }
    bringToFront(appId);
    return;
  }
  
  // Turn on active indicator dot in dock
  const dot = document.getElementById(`dot-${appId}`);
  if (dot) dot.classList.add('active');

  // Trigger bounce animation in dock icon
  const dockBtn = document.querySelector(`.dock-item[data-app="${appId}"]`);
  if (dockBtn) {
    dockBtn.classList.add('bounce');
    setTimeout(() => dockBtn.classList.remove('bounce'), 1000);
  }

  // Create standard macOS Window template wrapper
  const win = document.createElement('div');
  win.id = `window-${appId}`;
  win.className = 'window';
  
  // Starting position coordinates
  const offset = STATE.openApps.size * 25;
  const initialTop = 100 + offset;
  const initialLeft = 150 + offset;
  
  // Establish baseline size and styles
  const defaultSizes = {
    'finder': { w: 550, h: 360 },
    'notes': { w: 650, h: 420 },
    'mail': { w: 500, h: 440 },
    'photos': { w: 620, h: 440 },
    'music': { w: 400, h: 500 },
    'terminal': { w: 580, h: 380 },
    'spotify': { w: 800, h: 520 },
    'trash': { w: 450, h: 320 },
    'about-mac': { w: 320, h: 360 }
  };
  const size = defaultSizes[appId] || { w: 450, h: 320 };
  
  win.style.top = `${initialTop}px`;
  win.style.left = `${initialLeft}px`;
  win.style.width = `${size.w}px`;
  win.style.height = `${size.h}px`;
  
  // App-specific window configurations
  const appTitles = {
    'finder': 'Finder',
    'notes': 'Notes - About Abhijeet',
    'mail': 'Mail - Contact Abhijeet',
    'photos': 'Photos - Design Creative Portfolio',
    'music': 'Music Player',
    'terminal': 'zsh -- terminal',
    'spotify': 'Spotify Web Player',
    'trash': 'Trash',
    'about-mac': 'About This Mac'
  };
  
  win.innerHTML = `
    <div class="window-header" onmousedown="startDrag(event, '${appId}')">
      <div class="window-controls-btns">
        <button class="win-btn btn-close" onclick="closeApp('${appId}')" aria-label="Close">
          <svg viewBox="0 0 12 12" width="6" height="6"><path fill="currentColor" d="M1.5 1.5l9 9m-9 0l9-9" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
        <button class="win-btn btn-minimize" onclick="minimizeApp('${appId}')" aria-label="Minimize">
          <svg viewBox="0 0 12 12" width="6" height="6"><path fill="currentColor" d="M1 6h10" stroke="currentColor" stroke-width="2"/></svg>
        </button>
        <button class="win-btn btn-maximize" onclick="toggleMaximizeApp('${appId}')" aria-label="Maximize">
          <svg viewBox="0 0 12 12" width="6" height="6"><path fill="currentColor" d="M2 2h8v8H2z" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
      </div>
      <div class="window-title">${appTitles[appId] || 'Application'}</div>
    </div>
    <div class="window-content" id="content-${appId}">
      <!-- Content loaded below dynamically -->
    </div>
    <div class="resize-handle" onmousedown="startResize(event, '${appId}')"></div>
  `;
  
  document.getElementById('desktop-canvas').appendChild(win);
  STATE.openApps.add(appId);
  bringToFront(appId);
  
  // Load specialized views for each application
  loadAppContent(appId);
}

// --- WINDOW MOUSE INTERACTION LOGIC (Drag & Resize) ---
let dragObj = null;

function startDrag(e, appId) {
  // If maximized or clicking window button, do not drag
  if (e.target.closest('.win-btn') || document.getElementById(`window-${appId}`).classList.contains('maximized')) {
    return;
  }
  
  bringToFront(appId);
  const win = document.getElementById(`window-${appId}`);
  dragObj = {
    el: win,
    offsetX: e.clientX - win.offsetLeft,
    offsetY: e.clientY - win.offsetTop
  };
  
  document.addEventListener('mousemove', dragMove);
  document.addEventListener('mouseup', dragEnd);
}

function dragMove(e) {
  if (!dragObj) return;
  // Keep boundaries inside screen (allowing slight overlap)
  let left = e.clientX - dragObj.offsetX;
  let top = e.clientY - dragObj.offsetY;
  
  // Bound limit check
  if (top < 28) top = 28; // Don't drag above menu bar
  
  dragObj.el.style.left = `${left}px`;
  dragObj.el.style.top = `${top}px`;
}

function dragEnd() {
  dragObj = null;
  document.removeEventListener('mousemove', dragMove);
  document.removeEventListener('mouseup', dragEnd);
}

// Resize logic
let resizeObj = null;

function startResize(e, appId) {
  e.stopPropagation();
  e.preventDefault();
  
  bringToFront(appId);
  const win = document.getElementById(`window-${appId}`);
  resizeObj = {
    el: win,
    startW: win.offsetWidth,
    startH: win.offsetHeight,
    startX: e.clientX,
    startY: e.clientY
  };
  
  document.addEventListener('mousemove', resizeMove);
  document.addEventListener('mouseup', resizeEnd);
}

function resizeMove(e) {
  if (!resizeObj) return;
  
  let w = resizeObj.startW + (e.clientX - resizeObj.startX);
  let h = resizeObj.startH + (e.clientY - resizeObj.startY);
  
  // Set window boundaries
  if (w < 320) w = 320;
  if (h < 240) h = 240;
  
  resizeObj.el.style.width = `${w}px`;
  resizeObj.el.style.height = `${h}px`;
}

function resizeEnd() {
  resizeObj = null;
  document.removeEventListener('mousemove', resizeMove);
  document.removeEventListener('mouseup', resizeEnd);
}

// --- DOCK MOUSE POSITION MAGNIFICATION LOGIC ---
const dock = document.getElementById('dock');
const dockItems = document.querySelectorAll('.dock-item');

document.addEventListener('mousemove', (e) => {
  // Mobile screens skip dock magnify to maintain responsiveness
  if (window.innerWidth <= 768) return;
  
  const mouseX = e.clientX;
  const mouseY = e.clientY;
  
  // Only trigger scaling when mouse is close to the bottom dock region
  const dockRect = dock.getBoundingClientRect();
  const dockCenterY = dockRect.top + dockRect.height / 2;
  const distanceY = Math.abs(mouseY - dockCenterY);
  
  if (distanceY < 120) {
    dockItems.forEach(item => {
      const rect = item.getBoundingClientRect();
      const itemCenterX = rect.left + rect.width / 2;
      const distanceX = Math.abs(mouseX - itemCenterX);
      
      // Scale based on Gaussian distribution function
      const maxScale = 1.35; // Cap multiplier scale
      const scaleRange = 150; // Distance reach in pixels
      
      if (distanceX < scaleRange) {
        const factor = 1 - (distanceX / scaleRange);
        const scale = 1 + (maxScale - 1) * factor * (1 - (distanceY / 120));
        item.style.transform = `scale(${scale})`;
      } else {
        item.style.transform = 'scale(1)';
      }
    });
  } else {
    dockItems.forEach(item => {
      item.style.transform = 'scale(1)';
    });
  }
});

dock.addEventListener('mouseleave', () => {
  dockItems.forEach(item => {
    item.style.transform = 'scale(1)';
  });
});

// --- DOCK BOUNCE ANIMATION DEFINITION ---
// Inject keyframes dynamically for the bounce icon
const bounceStyle = document.createElement('style');
bounceStyle.innerHTML = `
  @keyframes dockBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-18px) scaleY(1.08); }
  }
  .dock-item.bounce {
    animation: dockBounce 0.4s ease 2;
  }
`;
document.head.appendChild(bounceStyle);

// --- LAUNCHPAD TOGGLE ---
function toggleLaunchpad() {
  playClickSound();
  const launchpad = document.getElementById('launchpad');
  launchpad.classList.toggle('hide');
  document.getElementById('launchpad-search').focus();
}

function closeLaunchpad() {
  document.getElementById('launchpad').classList.add('hide');
}

function filterLaunchpadApps(query) {
  const q = query.toLowerCase();
  const apps = document.querySelectorAll('.launchpad-app');
  apps.forEach(app => {
    const name = app.querySelector('.launchpad-label').textContent.toLowerCase();
    if (name.includes(q)) {
      app.style.display = 'flex';
    } else {
      app.style.display = 'none';
    }
  });
}

// --- LIGHTBOX GALLERY OVERLAY SYSTEM ---
function createLightboxElements() {
  if (document.getElementById('lightbox')) return;
  const modal = document.createElement('div');
  modal.id = 'lightbox';
  modal.className = 'lightbox-modal';
  modal.onclick = closeLightbox;
  modal.innerHTML = `
    <button class="lightbox-close" onclick="closeLightbox()">&times;</button>
    <div class="lightbox-content" onclick="event.stopPropagation()">
      <img id="lightbox-img" class="lightbox-image" src="" alt="Expanded View">
      <h3 id="lightbox-title" class="lightbox-title">Title</h3>
      <p id="lightbox-desc" class="lightbox-desc">Description</p>
    </div>
  `;
  document.body.appendChild(modal);
}

function openLightbox(src, title, desc) {
  createLightboxElements();
  const modal = document.getElementById('lightbox');
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox-title').textContent = title;
  document.getElementById('lightbox-desc').textContent = desc;
  
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('show'), 10);
  playClickSound();
}

function closeLightbox() {
  const modal = document.getElementById('lightbox');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);
    playClickSound();
  }
}

// --- DYNAMIC MUSIC CONTROLS ---
function togglePlayPauseMusic() {
  const btnCC = document.getElementById('cc-play-btn');
  const widgetArt = document.getElementById('cc-album-art');
  const musicTitleEl = document.getElementById('cc-track-name');
  
  const currentTrack = lofiTracks[STATE.musicTrackIndex];
  
  STATE.musicPlaying = !STATE.musicPlaying;
  
  // Sync Music App controls if open
  const winPlayBtn = document.getElementById('music-play-btn');
  const winArt = document.getElementById('music-album-art-large');
  const winWave = document.getElementById('music-wave-anim');
  
  if (STATE.musicPlaying) {
    btnCC.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
    widgetArt.classList.add('active');
    musicTitleEl.textContent = currentTrack.name;
    
    if (winPlayBtn) winPlayBtn.innerHTML = `⏸`;
    if (winArt) winArt.classList.add('playing');
    if (winWave) winWave.classList.add('active');
    
    // Play synthesis
    playLofiSynthNotes();
  } else {
    btnCC.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
    widgetArt.classList.remove('active');
    
    if (winPlayBtn) winPlayBtn.innerHTML = `▶`;
    if (winArt) winArt.classList.remove('playing');
    if (winWave) winWave.classList.remove('active');
    
    // Stop synthesis
    stopLofiSynthNotes();
  }
  playClickSound();
}

function selectMusicTrack(index) {
  STATE.musicTrackIndex = index;
  
  // Stop running osc
  stopLofiSynthNotes();
  
  // Reset state play toggles
  STATE.musicPlaying = false;
  togglePlayPauseMusic();
  
  // Re-sync active row highlights inside Note window
  const rows = document.querySelectorAll('.track-row');
  rows.forEach((row, i) => {
    if (i === index) row.classList.add('active');
    else row.classList.remove('active');
  });
  
  // Sync window items
  const mainTitle = document.getElementById('music-title-text');
  const mainArtist = document.getElementById('music-artist-text');
  if (mainTitle) mainTitle.textContent = lofiTracks[index].name;
  if (mainArtist) mainArtist.textContent = lofiTracks[index].artist;
}

// --- DYNAMIC APPLICATION CONTENT LOADER ---
function loadAppContent(appId) {
  const container = document.getElementById(`content-${appId}`);
  
  if (appId === 'about-mac') {
    container.innerHTML = `
      <div class="about-mac-container">
        <div class="about-avatar">👨🏽‍💻</div>
        <div class="about-mac-title">Abhijeet Sharma</div>
        <div class="about-mac-sub">Marketing Specialist & Web Dev</div>
        <div class="about-specs">
          <div class="spec-row">
            <span class="spec-name">Chipset</span>
            <span class="spec-val">Apple M3 Max</span>
          </div>
          <div class="spec-row">
            <span class="spec-name">Memory</span>
            <span class="spec-val">16 GB Unified LPDDR5</span>
          </div>
          <div class="spec-row">
            <span class="spec-name">Graphics</span>
            <span class="spec-val">SEO & Performance Engine</span>
          </div>
          <div class="spec-row">
            <span class="spec-name">Serial Number</span>
            <span class="spec-val">MARKET-IN-2026</span>
          </div>
          <div class="spec-row">
            <span class="spec-name">System OS</span>
            <span class="spec-val">macOS Sequoia (v15.0)</span>
          </div>
        </div>
      </div>
    `;
  }
  
  else if (appId === 'finder') {
    container.innerHTML = `
      <div class="finder-container">
        <div class="finder-sidebar">
          <div class="sidebar-section">
            <span class="sidebar-title">Favorites</span>
            <button class="sidebar-item active" onclick="navigateFinder('Root')">
              🏠 <span>My Studio</span>
            </button>
            <button class="sidebar-item" onclick="navigateFinder('Skills')">
              🛠️ <span>Specialties</span>
            </button>
            <button class="sidebar-item" onclick="navigateFinder('Projects')">
              💼 <span>Projects</span>
            </button>
          </div>
        </div>
        <div class="finder-main" id="finder-grid">
          <!-- Files rendered dynamically -->
        </div>
      </div>
    `;
    navigateFinder('Root');
  }
  
  else if (appId === 'notes') {
    container.innerHTML = `
      <div class="notes-container">
        <div class="notes-sidebar">
          <div class="notes-search">
            <input type="text" placeholder="Search Notes" oninput="filterNotes(this.value)">
          </div>
          <div class="notes-list" id="notes-list-items">
            <div class="note-item active" onclick="selectNote('welcome')" id="note-welcome">
              <span class="note-item-title">Welcome Note</span>
              <span class="note-item-date">May 26</span>
              <span class="note-item-snippet">Hi, I'm Abhijeet! Digital marketing specialist with...</span>
            </div>
            <div class="note-item" onclick="selectNote('performance')" id="note-performance">
              <span class="note-item-title">Performance Marketing</span>
              <span class="note-item-date">May 25</span>
              <span class="note-item-snippet">Proven records running dynamic High-ROI ad campaigns...</span>
            </div>
            <div class="note-item" onclick="selectNote('development')" id="note-development">
              <span class="note-item-title">Web Development</span>
              <span class="note-item-date">May 24</span>
              <span class="note-item-snippet">Custom Shopify and WordPress full stack design...</span>
            </div>
            <div class="note-item" onclick="selectNote('seo')" id="note-seo">
              <span class="note-item-title">SEO & AI Catalogs</span>
              <span class="note-item-date">May 23</span>
              <span class="note-item-snippet">Organic search engine rankings optimization combined...</span>
            </div>
            <div class="note-item" onclick="selectNote('creative')" id="note-creative">
              <span class="note-item-title">Graphic & Video Editing</span>
              <span class="note-item-date">May 22</span>
              <span class="note-item-snippet">Premium visual creatives tailored to convert audiences...</span>
            </div>
          </div>
        </div>
        <div class="notes-body" id="note-body-content">
          <!-- Note body loaded dynamically -->
        </div>
      </div>
    `;
    selectNote('welcome');
  }
  
  else if (appId === 'mail') {
    container.innerHTML = `
      <div class="mail-container">
        <form id="mail-form" onsubmit="sendMail(event)">
          <div class="mail-header-bar">
            <div class="mail-input-row">
              <span class="mail-label">To:</span>
              <input type="text" class="mail-input" value="abhijeet@sharmadigital.com" readonly>
            </div>
            <div class="mail-input-row">
              <span class="mail-label">From:</span>
              <input type="email" id="mail-sender" class="mail-input" placeholder="yourname@email.com" required>
            </div>
            <div class="mail-input-row">
              <span class="mail-label">Subject:</span>
              <input type="text" id="mail-subject" class="mail-input" placeholder="Collaboration / Job Opportunity" required>
            </div>
          </div>
          <div class="mail-body-editor">
            <textarea id="mail-body" class="mail-textarea" placeholder="Dear Abhijeet,\n\nI was exploring your interactive macOS portfolio and would love to collaborate on a digital marketing or WordPress project..." required></textarea>
          </div>
          <div class="mail-footer">
            <button type="submit" class="mail-send-btn">
              <span>Send Mail</span> ✈️
            </button>
          </div>
        </form>
      </div>
    `;
  }
  
  else if (appId === 'photos') {
    container.innerHTML = `
      <div class="photos-container">
        <h2 class="photos-title">My Creatives</h2>
        <p class="photos-subtitle">Graphic Design & Video Editing Showcases</p>
        <div class="photos-grid">
          <div class="photo-card" onclick="openLightbox('https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=60', 'Marketing Campaigns Dashboard', 'Analytics of a dynamic performance marketing campaign showing substantial ROI growth.')">
            <img class="photo-img" src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300&auto=format&fit=crop&q=60" alt="Item">
            <div class="photo-overlay">
              <span class="photo-tag">Performance Marketing</span>
              <span class="photo-label-large">Campaign Report</span>
            </div>
          </div>
          
          <div class="photo-card" onclick="openLightbox('https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=600&auto=format&fit=crop&q=60', 'E-commerce Shopify Storefront', 'Pixel-perfect, fast-loading, highly converting customized Shopify store layout.')">
            <img class="photo-img" src="https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=300&auto=format&fit=crop&q=60" alt="Item">
            <div class="photo-overlay">
              <span class="photo-tag">Shopify Dev</span>
              <span class="photo-label-large">Active Storefront</span>
            </div>
          </div>

          <div class="photo-card" onclick="openLightbox('https://images.unsplash.com/photo-1561070791-26c113006238?w=600&auto=format&fit=crop&q=60', 'Creative Graphic Advertisements', 'Visually stunning, click-driving social media graphic ad.')">
            <img class="photo-img" src="https://images.unsplash.com/photo-1561070791-26c113006238?w=300&auto=format&fit=crop&q=60" alt="Item">
            <div class="photo-overlay">
              <span class="photo-tag">Graphic Design</span>
              <span class="photo-label-large">Social Media Creative</span>
            </div>
          </div>

          <div class="photo-card" onclick="openLightbox('https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=600&auto=format&fit=crop&q=60', 'Aesthetic Video Production', 'High-quality frame grab of a custom product promotional video edited with professional cuts.')">
            <img class="photo-img" src="https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=300&auto=format&fit=crop&q=60" alt="Item">
            <div class="photo-overlay">
              <span class="photo-tag">Video Editor</span>
              <span class="photo-label-large">Product Promo Video</span>
            </div>
          </div>
          
          <div class="photo-card" onclick="openLightbox('https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&auto=format&fit=crop&q=60', 'Custom WordPress Portfolio', 'A fully responsive, user friendly personal branding platform built on WordPress.')">
            <img class="photo-img" src="https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=300&auto=format&fit=crop&q=60" alt="Item">
            <div class="photo-overlay">
              <span class="photo-tag">WordPress Dev</span>
              <span class="photo-label-large">Responsive Website</span>
            </div>
          </div>

          <div class="photo-card" onclick="openLightbox('https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=600&auto=format&fit=crop&q=60', 'AI-Driven E-commerce Cataloguing', 'Dynamic, AI-optimized high-accuracy catalog cards generated for enterprise products.')">
            <img class="photo-img" src="https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=300&auto=format&fit=crop&q=60" alt="Item">
            <div class="photo-overlay">
              <span class="photo-tag">AI Cataloguing</span>
              <span class="photo-label-large">Interactive Catalog Cards</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  else if (appId === 'music') {
    const track = lofiTracks[STATE.musicTrackIndex];
    container.innerHTML = `
      <div class="music-container">
        <div class="music-player-card">
          <div class="album-art-large ${STATE.musicPlaying ? 'playing' : ''}" id="music-album-art-large">🎵</div>
          <div class="music-info">
            <span class="music-title-large" id="music-title-text">${track.name}</span>
            <span class="music-artist-large" id="music-artist-text">${track.artist}</span>
          </div>
          
          <div class="music-wave ${STATE.musicPlaying ? 'active' : ''}" id="music-wave-anim">
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
          </div>
        </div>
        
        <div class="music-timeline">
          <input type="range" class="time-slider" min="0" max="100" value="30">
          <div class="time-row">
            <span>0:32</span>
            <span id="music-duration">${track.duration}</span>
          </div>
        </div>
        
        <div class="playback-controls">
          <button class="ctrl-btn" onclick="prevTrack()" aria-label="Previous">⏮</button>
          <button class="ctrl-btn btn-play-large" id="music-play-btn" onclick="togglePlayPauseMusic()" aria-label="Play/Pause">
            ${STATE.musicPlaying ? '⏸' : '▶'}
          </button>
          <button class="ctrl-btn" onclick="nextTrack()" aria-label="Next">⏭</button>
        </div>
        
        <div class="playlist-container">
          <h4 class="playlist-title">Tracks Playlist</h4>
          <div class="playlist-list">
            ${lofiTracks.map((t, idx) => `
              <div class="track-row ${idx === STATE.musicTrackIndex ? 'active' : ''}" onclick="selectMusicTrack(${idx})">
                <span>${idx + 1}. ${t.name}</span>
                <span>${t.duration}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }
  
  else if (appId === 'spotify') {
    renderSpotifyApp(container);
  }
  
  else if (appId === 'terminal') {
    container.innerHTML = `
      <div class="terminal-container" onclick="focusTerminalInput()">
        <div class="terminal-history" id="terminal-history">
          <div class="terminal-line">Welcome to Abhijeet Sharma macOS Terminal emulator!</div>
          <div class="terminal-line">Type <span style="color: #4df8a9; font-weight: 700;">help</span> to see a list of available CLI commands.</div>
          <br>
        </div>
        <div class="terminal-prompt-row">
          <span class="terminal-prompt">abhijeet@macbook:~$</span>
          <input type="text" id="terminal-cli-input" class="terminal-input" autocomplete="off" onkeydown="handleTerminalSubmit(event)">
        </div>
      </div>
    `;
    setTimeout(focusTerminalInput, 50);
  }
  
  else if (appId === 'trash') {
    renderTrash(container);
  }
}

// --- APP SPECIFIC MODULE HELPER LOGICS ---

// 1. Finder Directory Traversing
const finderVirtualFS = {
  Root: [
    { name: 'About_Me.txt', type: 'doc', action: () => openApp('notes') },
    { name: 'Specialties', type: 'folder', target: 'Skills' },
    { name: 'My_Projects', type: 'folder', target: 'Projects' },
    { name: 'Trash_Bin', type: 'folder', target: 'Trash' }
  ],
  Skills: [
    { name: 'Performance_Marketing.doc', type: 'doc', action: () => { openApp('notes'); selectNote('performance'); } },
    { name: 'E-commerce_Web_Dev.doc', type: 'doc', action: () => { openApp('notes'); selectNote('development'); } },
    { name: 'SEO_&_AI_Catalogues.doc', type: 'doc', action: () => { openApp('notes'); selectNote('seo'); } },
    { name: 'Graphic_&_Video_Editing.doc', type: 'doc', action: () => { openApp('notes'); selectNote('creative'); } }
  ],
  Projects: [
    { name: 'Active_Shopify_Storefront', type: 'image', action: () => { openApp('photos'); } },
    { name: 'Creative_Ads_Design', type: 'image', action: () => { openApp('photos'); } },
    { name: 'Custom_WordPress_Platform', type: 'image', action: () => { openApp('photos'); } },
    { name: 'AI_Catalogues_Dashboard', type: 'image', action: () => { openApp('photos'); } }
  ]
};

function navigateFinder(pathId) {
  STATE.finderPath = [pathId];
  const items = finderVirtualFS[pathId] || [];
  const grid = document.getElementById('finder-grid');
  if (!grid) return;
  
  // Highlight active side-bar row
  const sidebarItems = document.querySelectorAll('.sidebar-item');
  sidebarItems.forEach(item => {
    const label = item.querySelector('span').textContent.toLowerCase();
    if (label.includes(pathId.toLowerCase()) || (pathId === 'Root' && label.includes('studio'))) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Render grid items
  grid.innerHTML = items.map(item => {
    let iconUrl = 'https://img.icons8.com/color/96/000000/notepad.png'; // Document default
    if (item.type === 'folder') {
      iconUrl = 'https://img.icons8.com/color/96/000000/folder-invoices.png';
    } else if (item.type === 'image') {
      iconUrl = 'https://img.icons8.com/color/96/000000/image.png';
    }
    
    // Add double-click binder action
    let onClickStr = '';
    if (item.type === 'folder') {
      onClickStr = `navigateFinder('${item.target}')`;
    } else if (item.action) {
      onClickStr = `triggerFileAction('${item.name}')`;
    }
    
    return `
      <div class="finder-file" onclick="${onClickStr}">
        <img class="finder-file-icon" src="${iconUrl}" alt="Finder File">
        <span class="finder-file-label">${item.name}</span>
      </div>
    `;
  }).join('');
}

// Handler file actions from dynamic HTML
window.navigateFinder = navigateFinder;
window.triggerFileAction = function(fileName) {
  // Find item and trigger
  const allItems = [...finderVirtualFS.Root, ...finderVirtualFS.Skills, ...finderVirtualFS.Projects];
  const item = allItems.find(i => i.name === fileName);
  if (item && item.action) item.action();
};

// 2. Notes Content Selections
const notesDatabase = {
  welcome: {
    title: 'Welcome Note',
    date: 'May 26, 2026',
    html: `
      <p><strong>Hi, I'm Abhijeet Sharma!</strong></p>
      <p>I am a versatile <strong>Digital Marketing Specialist</strong> and web developer with a strong foundation in visual content generation. I bridge the gap between creative visual media and analytical, high-conversion growth systems.</p>
      <p>Explore this notes app to see details regarding my key skills:</p>
      <ul>
        <li><strong>Performance Marketing:</strong> High-ROI Paid Campaigns (Meta, Google Ads).</li>
        <li><strong>E-Commerce Dev:</strong> Shopify and customized WordPress development.</li>
        <li><strong>Creative Production:</strong> Graphic design, aesthetics and video editing.</li>
        <li><strong>Search Engine Engine:</strong> Technical & content-level SEO optimization.</li>
        <li><strong>AI Catalogues:</strong> Interactive, automated digital shelf cataloguing.</li>
      </ul>
      <p>Feel free to open the <strong>Mail</strong> app to write me a letter, launch the <strong>Terminal</strong> for retro stats, or click <strong>Spotify</strong> to listen to lo-fi beats while exploring!</p>
    `
  },
  performance: {
    title: 'Performance Marketing Flow',
    date: 'May 25, 2026',
    html: `
      <p>My performance marketing strategy is centered around <strong>data-driven decisions</strong> and constant split testing.</p>
      <div class="skills-pill-box">
        <span class="skill-pill">Meta Ads Manager</span>
        <span class="skill-pill">Google Adwords</span>
        <span class="skill-pill">ROI & ROAS Optimization</span>
        <span class="skill-pill">A/B Testing</span>
        <span class="skill-pill">Retargeting Funnels</span>
      </div>
      <p><strong>Key Accomplishments:</strong></p>
      <ul>
        <li>Scaled multiple e-commerce ad budgets from zero to consistent high double-digit ROAS averages.</li>
        <li>Custom pixel tracking and conversion API setups on headless frameworks.</li>
        <li>Creative analysis loops, matching ad copies directly with targeted demographic pain points.</li>
      </ul>
    `
  },
  development: {
    title: 'WordPress & Shopify Store Development',
    date: 'May 24, 2026',
    html: `
      <p>I design and code fully customized, secure, and fast-loading web experiences targeting immediate customer checkout triggers.</p>
      <div class="skills-pill-box">
        <span class="skill-pill">Shopify Liquid</span>
        <span class="skill-pill">WordPress PHP</span>
        <span class="skill-pill">WooCommerce</span>
        <span class="skill-pill">Elementor & Custom Builders</span>
        <span class="skill-pill">Page Speed Optimization</span>
      </div>
      <p><strong>Highlights of my dev work:</strong></p>
      <ul>
        <li>Developed high-conversion customized dropshipping and enterprise Shopify storefronts.</li>
        <li>Built robust business and service portals using WordPress with bespoke theme styling.</li>
        <li>Optimized web speed, consistently raising Google PageSpeed scores from average ranges up to 90+.</li>
      </ul>
    `
  },
  seo: {
    title: 'SEO & AI Cataloguing systems',
    date: 'May 23, 2026',
    html: `
      <p>Scaling organic growth and streamlining product presentation on modern digital shelves.</p>
      <div class="skills-pill-box">
        <span class="skill-pill">Technical SEO</span>
        <span class="skill-pill">On-Page Keyword Mapping</span>
        <span class="skill-pill">AI Automation Tooling</span>
        <span class="skill-pill">Product Sheet Scraping</span>
        <span class="skill-pill">XML & Schema Markup</span>
      </div>
      <p><strong>My Approach:</strong></p>
      <ul>
        <li><strong>AI Cataloguing:</strong> Deploying generative AI pipelines to automatically generate rich SEO product titles, descriptions, and feature attributes, reducing catalog indexing times by over 80%.</li>
        <li><strong>Search Rankings:</strong> Strategic backlinking, core web vitals optimization, and user intent keyword architectures to drive high-intent organic leads.</li>
      </ul>
    `
  },
  creative: {
    title: 'Graphic Designs & Video Editing',
    date: 'May 22, 2026',
    html: `
      <p>Eye-catching visual designs and retention-focused video editing that stop the scroll.</p>
      <div class="skills-pill-box">
        <span class="skill-pill">Adobe Photoshop</span>
        <span class="skill-pill">Premiere Pro & CapCut</span>
        <span class="skill-pill">Typography & Color Theory</span>
        <span class="skill-pill">Ad Creatives Design</span>
        <span class="skill-pill">Cinematic Sound Editing</span>
      </div>
      <p><strong>Creative Core values:</strong></p>
      <ul>
        <li>Crafting beautiful, clean visual assets that communicate complex brand messages in a single glance.</li>
        <li>Editing fast-paced, highly engaging video clips tailored specifically for TikTok, Reels, and YouTube Shorts.</li>
      </ul>
    `
  }
};

function selectNote(noteId) {
  STATE.activeNoteId = noteId;
  const note = notesDatabase[noteId];
  if (!note) return;
  
  // Highlight note list row
  const noteRows = document.querySelectorAll('.note-item');
  noteRows.forEach(row => {
    if (row.id === `note-${noteId}`) row.classList.add('active');
    else row.classList.remove('active');
  });
  
  const bodyContent = document.getElementById('note-body-content');
  if (bodyContent) {
    bodyContent.innerHTML = `
      <span class="note-date-stamp">${note.date}</span>
      <h2 class="note-content-title">${note.title}</h2>
      <div class="note-rich-text">${note.html}</div>
    `;
  }
  playClickSound();
}

window.selectNote = selectNote;

function filterNotes(query) {
  const q = query.toLowerCase();
  const notes = document.querySelectorAll('.note-item');
  notes.forEach(note => {
    const title = note.querySelector('.note-item-title').textContent.toLowerCase();
    const snippet = note.querySelector('.note-item-snippet').textContent.toLowerCase();
    if (title.includes(q) || snippet.includes(q)) {
      note.style.display = 'flex';
    } else {
      note.style.display = 'none';
    }
  });
}
window.filterNotes = filterNotes;

// 3. Mail Application submits
function sendMail(e) {
  e.preventDefault();
  playSwooshSound();
  
  const form = document.getElementById('mail-form');
  const sender = document.getElementById('mail-sender').value;
  
  form.innerHTML = `
    <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 2rem; gap: 1rem; background: var(--bg-primary);">
      <div style="font-size: 54px;">✉️</div>
      <h3 style="font-size: 20px; font-weight: 700;">Email Transmitted Successfully!</h3>
      <p style="color: var(--text-secondary); max-width: 320px; font-size: 13.5px; line-height: 1.5;">
        Thank you, <strong>${sender}</strong>! Your message has been sent to Abhijeet. He will get back to you shortly.
      </p>
      <button onclick="closeApp('mail')" class="glass-btn" style="margin-top: 1rem;">Close Mail</button>
    </div>
  `;
}
window.sendMail = sendMail;

// 4. Music playlist controls
function prevTrack() {
  let idx = STATE.musicTrackIndex - 1;
  if (idx < 0) idx = lofiTracks.length - 1;
  selectMusicTrack(idx);
}
window.prevTrack = prevTrack;

function nextTrack() {
  let idx = STATE.musicTrackIndex + 1;
  if (idx >= lofiTracks.length) idx = 0;
  selectMusicTrack(idx);
}
window.nextTrack = nextTrack;

// 5. Terminal CLI Handler
function focusTerminalInput() {
  const input = document.getElementById('terminal-cli-input');
  if (input) input.focus();
}
window.focusTerminalInput = focusTerminalInput;

function handleTerminalSubmit(e) {
  if (e.key === 'Enter') {
    const input = document.getElementById('terminal-cli-input');
    const val = input.value.trim();
    input.value = '';
    
    if (val) {
      executeTerminalCommand(val);
    }
  }
}
window.handleTerminalSubmit = handleTerminalSubmit;

function executeTerminalCommand(cmd) {
  const history = document.getElementById('terminal-history');
  if (!history) return;
  
  // Print entered command
  const enteredLine = document.createElement('div');
  enteredLine.className = 'terminal-line';
  enteredLine.innerHTML = `<span class="terminal-prompt">abhijeet@macbook:~$</span> ${cmd}`;
  history.appendChild(enteredLine);
  
  const responseLine = document.createElement('div');
  responseLine.className = 'terminal-line';
  
  const c = cmd.toLowerCase().trim();
  
  if (c === 'help') {
    responseLine.innerHTML = `
Available Commands:
  <span style="color: #fbc2eb; font-weight: 600;">about</span>      - Quick introduction about Abhijeet
  <span style="color: #fbc2eb; font-weight: 600;">skills</span>     - View list of technical specialties
  <span style="color: #fbc2eb; font-weight: 600;">contact</span>    - Quick display of contact channels
  <span style="color: #fbc2eb; font-weight: 600;">neofetch</span>   - Showcase beautiful system profile card
  <span style="color: #fbc2eb; font-weight: 600;">clear</span>      - Clear the console history
  <span style="color: #fbc2eb; font-weight: 600;">sudo rm -rf /</span>- Triggers an easter egg
    `;
  }
  
  else if (c === 'about') {
    responseLine.innerHTML = `
Abhijeet Sharma is a dynamic Digital Marketing Specialist bridging custom WordPress/Shopify development with high-ROI Paid Ads campaigns.
Currently building premium digital storefronts and optimizing conversion rates for business entities worldwide.
    `;
  }
  
  else if (c === 'skills') {
    responseLine.innerHTML = `
Technical & Creative Skills:
  * Performance Marketing (ROAS, Retargeting)
  * E-commerce Full-Stack (Shopify Liquid, WordPress Theme Dev)
  * Search Engine Optimization (Technical XML, On-page Architectures)
  * AI Automation Catalogues
  * Professional Visual Creatives (Photoshop, Premiere editing)
    `;
  }
  
  else if (c === 'contact') {
    responseLine.innerHTML = `
Collaborate with Abhijeet:
  * Email: <span style="color: #a18cd1;">abhijeet@sharmadigital.com</span>
  * Website: <span style="color: #a18cd1;">www.sharmadigital.com</span>
  * Location: India
    `;
  }
  
  else if (c === 'neofetch') {
    responseLine.innerHTML = `
<pre class="terminal-ascii">
     ..-:::::::-.
   .::::::::::::::.
 .::::::::::::::::::.
 ::::::::::::::::::::     <span style="color: #fbc2eb; font-weight: 700;">abhijeet@macbook</span>
:::::::::::::::::::-.     ----------------
::::::::::::::::::.       <span style="color: #a18cd1; font-weight: 600;">OS:</span> macOS Sequoia v15.0
.::::::::::::::::::       <span style="color: #a18cd1; font-weight: 600;">Host:</span> Abhijeet Sharma Portfolio
 .:::::::::::::::::       <span style="color: #a18cd1; font-weight: 600;">Kernel:</span> WebKit Engine
   .::::::::::::::        <span style="color: #a18cd1; font-weight: 600;">Shell:</span> zsh (Mac Emulator)
     ..-:::::::-.         <span style="color: #a18cd1; font-weight: 600;">Uptime:</span> Live session
                          <span style="color: #a18cd1; font-weight: 600;">Processor:</span> Performance Marketing Chip
                          <span style="color: #a18cd1; font-weight: 600;">Graphics:</span> Creative Visual Engine v3.5
                          <span style="color: #a18cd1; font-weight: 600;">Theme:</span> Custom Obsidian Glass
</pre>
    `;
  }
  
  else if (c === 'clear') {
    history.innerHTML = '';
    return; // Don't append empty lines
  }
  
  else if (c === 'sudo rm -rf /') {
    playCrinkleSound();
    responseLine.innerHTML = `
<span style="color: #ff5f56; font-weight: bold;">[WARNING] CRITICAL CRASH INITIATING</span>
Removing directory root / ...
Deleting performance marketing logs...
Clearing WordPress database cache...
Shopify API connection interrupted...

<span style="color: #ffbd2e;">Just kidding! 😉 Your system is safe. Abhijeet's code is robust and secure!</span>
    `;
  }
  
  else {
    responseLine.innerHTML = `zsh: command not found: ${cmd}. Type <span style="color: #4df8a9;">help</span> for instructions.`;
  }
  
  history.appendChild(responseLine);
  
  // Auto scroll terminal window to bottom
  const container = history.closest('.window-content');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

// 6. Trash Bin Render & Actions
function renderTrash(container) {
  if (STATE.trashItems.length === 0) {
    // Change trash dock icon to empty
    const trashIcon = document.getElementById('trash-dock-icon');
    if (trashIcon) trashIcon.src = 'https://img.icons8.com/color/96/000000/empty-trash.png';
    
    container.innerHTML = `
      <div class="trash-container">
        <div class="trash-toolbar">
          <button class="trash-empty-btn" disabled>Empty Trash</button>
        </div>
        <div class="trash-main" style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 1rem; width: 100%; height: calc(100% - 40px);">
          <div style="font-size: 40px;">🗑️</div>
          <span style="color: var(--text-muted); font-size: 13px;">Trash is Empty</span>
        </div>
      </div>
    `;
  } else {
    // Change trash dock icon to full
    const trashIcon = document.getElementById('trash-dock-icon');
    if (trashIcon) trashIcon.src = 'https://img.icons8.com/color/96/000000/trash.png';
    
    container.innerHTML = `
      <div class="trash-container">
        <div class="trash-toolbar">
          <button class="trash-empty-btn" onclick="emptyTrash('${container.id}')">Empty Trash</button>
        </div>
        <div class="trash-main">
          ${STATE.trashItems.map(item => `
            <div class="finder-file">
              <img class="finder-file-icon" src="https://img.icons8.com/color/96/000000/notepad.png" alt="Trash File">
              <span class="finder-file-label" style="text-decoration: line-through; opacity: 0.65;">${item.name}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}

function emptyTrash(contentId) {
  playCrinkleSound();
  STATE.trashItems = [];
  const container = document.getElementById(contentId);
  if (container) {
    renderTrash(container);
  }
}
window.emptyTrash = emptyTrash;

// Bind to window to allow dynamic HTML triggers
window.openApp = openApp;
window.closeApp = closeApp;
window.minimizeApp = minimizeApp;
window.toggleMaximizeApp = toggleMaximizeApp;
window.toggleLaunchpad = toggleLaunchpad;
window.closeLaunchpad = closeLaunchpad;
window.filterLaunchpadApps = filterLaunchpadApps;
window.toggleWiFi = toggleWiFi;
window.toggleBluetooth = toggleBluetooth;
window.toggleDarkMode = toggleDarkMode;
window.toggleSystemSounds = toggleSystemSounds;
window.changeBrightness = changeBrightness;
window.changeVolume = changeVolume;
window.togglePlayPauseMusic = togglePlayPauseMusic;
window.selectMusicTrack = selectMusicTrack;
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.triggerRestart = triggerRestart;
window.triggerShutDown = triggerShutDown;

// --- SPOTIFY CUSTOM PLAYLIST HELPER LOGICS ---
function renderSpotifyApp(container) {
  if (!container) return;
  const activeMedia = STATE.activeSpotifyMedia;
  const embedUrl = `https://open.spotify.com/embed/${activeMedia.type}/${activeMedia.id}?utm_source=generator&theme=0`;
  
  container.innerHTML = `
    <div class="spotify-container">
      <!-- Left panel: Web Player Widget -->
      <div class="spotify-player-panel">
        <iframe class="spotify-iframe" 
                src="${embedUrl}" 
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                loading="lazy">
        </iframe>
      </div>
      
      <!-- Right panel: Interactive Tracks Manager -->
      <div class="spotify-playlist-panel">
        <div class="spotify-list-header">
          <span>My Studio Playlist</span>
          <span style="font-size: 11px; opacity: 0.8;">${STATE.spotifyTracks.length} Items</span>
        </div>
        
        <div class="spotify-track-list" id="spotify-list-container">
          ${STATE.spotifyTracks.map(track => {
            const isActive = STATE.activeSpotifyMedia.id === track.id;
            return `
              <div class="spotify-track-row ${isActive ? 'active' : ''}" onclick="selectSpotifyMedia('${track.type}', '${track.id}')">
                <div class="spotify-track-info">
                  <span class="spotify-track-name">${track.name}</span>
                  <span class="spotify-track-artist">${track.artist}</span>
                </div>
                <div class="spotify-track-meta">
                  <span class="spotify-track-type">${track.type}</span>
                  <button class="spotify-track-delete-btn" onclick="event.stopPropagation(); deleteSpotifyTrack('${track.id}', 'content-spotify')" aria-label="Delete">✕</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        <!-- Add New Song/Playlist Form -->
        <form class="spotify-add-form" onsubmit="addSpotifyTrack(event, 'content-spotify')">
          <span class="spotify-form-title">Add Custom Song / Playlist</span>
          <input type="text" id="spotify-add-name" class="spotify-form-input" placeholder="Track Name (e.g. Porsche Chills)" required>
          <input type="text" id="spotify-add-artist" class="spotify-form-input" placeholder="Artist Name (e.g. Lofi Girl)" required>
          <input type="url" id="spotify-add-url" class="spotify-form-input" placeholder="Spotify Song / Playlist Link" required>
          <button type="submit" class="spotify-form-btn">Add to Playlist</button>
        </form>
      </div>
    </div>
  `;
}

function selectSpotifyMedia(type, id) {
  STATE.activeSpotifyMedia = { type, id };
  playClickSound();
  
  // Re-render Spotify app window content
  const container = document.getElementById('content-spotify');
  if (container) {
    renderSpotifyApp(container);
  }
}

function addSpotifyTrack(e, containerId) {
  e.preventDefault();
  playClickSound();
  
  const nameEl = document.getElementById('spotify-add-name');
  const artistEl = document.getElementById('spotify-add-artist');
  const urlEl = document.getElementById('spotify-add-url');
  
  const name = nameEl.value.trim();
  const artist = artistEl.value.trim();
  const url = urlEl.value.trim();
  
  // Parse Spotify URL
  let parsed = null;
  const trackMatch = url.match(/track\/([a-zA-Z0-9]+)/);
  if (trackMatch) {
    parsed = { type: 'track', id: trackMatch[1] };
  } else {
    const playlistMatch = url.match(/playlist\/([a-zA-Z0-9]+)/);
    if (playlistMatch) {
      parsed = { type: 'playlist', id: playlistMatch[1] };
    }
  }
  
  if (!parsed) {
    alert("Invalid Spotify URL. Please enter a valid Spotify Song or Playlist link (e.g., https://open.spotify.com/track/...).");
    return;
  }
  
  // Append new track
  const newTrack = {
    id: parsed.id,
    name: name,
    artist: artist,
    type: parsed.type
  };
  
  STATE.spotifyTracks.push(newTrack);
  STATE.activeSpotifyMedia = { type: parsed.type, id: parsed.id };
  
  // Persist to localStorage
  localStorage.setItem('abhijeet_spotify_tracks', JSON.stringify(STATE.spotifyTracks));
  
  // Re-render
  const container = document.getElementById(containerId);
  if (container) {
    renderSpotifyApp(container);
  }
}

function deleteSpotifyTrack(id, containerId) {
  playClickSound();
  
  // Do not delete default playlist if it's the only one
  if (STATE.spotifyTracks.length <= 1) {
    alert("You must keep at least one song in your studio playlist!");
    return;
  }
  
  // Filter out track
  STATE.spotifyTracks = STATE.spotifyTracks.filter(t => t.id !== id);
  
  // If we deleted the active track, switch active back to the first available track
  if (STATE.activeSpotifyMedia.id === id) {
    const first = STATE.spotifyTracks[0];
    STATE.activeSpotifyMedia = { type: first.type, id: first.id };
  }
  
  // Persist to localStorage
  localStorage.setItem('abhijeet_spotify_tracks', JSON.stringify(STATE.spotifyTracks));
  
  // Re-render
  const container = document.getElementById(containerId);
  if (container) {
    renderSpotifyApp(container);
  }
}

window.renderSpotifyApp = renderSpotifyApp;
window.selectSpotifyMedia = selectSpotifyMedia;
window.addSpotifyTrack = addSpotifyTrack;
window.deleteSpotifyTrack = deleteSpotifyTrack;
