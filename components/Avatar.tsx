import { AvatarState } from '../types';

// Helper to draw rounded rects on Canvas
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export const drawAvatar = (
  ctx: CanvasRenderingContext2D, 
  w: number, 
  h: number, 
  state: AvatarState, 
  transform: { x: number, y: number, scale: number },
  mousePos: { x: number, y: number }
) => {
  const { mouthOpen, eyeX, eyeY, blink, keyPressLeft, keyPressRight, mouseDown } = state;
  
  // Base scaling to fit canvas roughly before user zoom
  const baseScale = Math.min(w, h) / 800; 
  const s = baseScale * transform.scale;

  ctx.save();
  // Move to center + user offset
  ctx.translate((w / 2) + transform.x, (h / 2) + transform.y);
  ctx.scale(s, s);

  // Define Shoulder Anchors (Global coordinates relative to center)
  // Body translate is (0, 80). Shoulders at y=40 inside body -> y=120 global.
  // Width approx 140 -> x = -70, 70.
  const shoulderLeft = { x: -60, y: 130 };
  const shoulderRight = { x: 60, y: 130 };

  // --- 1. FOX BODY (BEHIND DESK) ---
  ctx.save();
  ctx.translate(0, 80); // Position body relative to center

  // Shirt
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  // Shoulders
  ctx.moveTo(-70, 40); 
  ctx.quadraticCurveTo(0, 20, 70, 40); 
  // Torso going down
  ctx.lineTo(75, 250);
  ctx.lineTo(-75, 250);
  ctx.lineTo(-70, 40);
  ctx.fill();
  
  // Suspenders (Dark Grey)
  ctx.fillStyle = '#37474F';
  ctx.fillRect(-45, 40, 12, 210);
  ctx.fillRect(33, 40, 12, 210);
  
  // Buttons on suspenders
  ctx.fillStyle = '#FFD700'; // Gold
  ctx.beginPath(); ctx.arc(-39, 180, 3, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(39, 180, 3, 0, Math.PI*2); ctx.fill();

  ctx.restore();

  // --- 2. FOX HEAD ---
  ctx.save();
  ctx.translate(0, 80); // Neck position

  // Ears
  ctx.fillStyle = '#E65100'; // Deep Orange
  ctx.beginPath(); ctx.moveTo(-60, -80); ctx.lineTo(-90, -160); ctx.lineTo(-20, -100); ctx.fill(); // Left
  ctx.beginPath(); ctx.moveTo(60, -80); ctx.lineTo(90, -160); ctx.lineTo(20, -100); ctx.fill(); // Right
  // Inner Ear
  ctx.fillStyle = '#FFE0B2';
  ctx.beginPath(); ctx.moveTo(-60, -80); ctx.lineTo(-80, -140); ctx.lineTo(-35, -95); ctx.fill();
  ctx.beginPath(); ctx.moveTo(60, -80); ctx.lineTo(80, -140); ctx.lineTo(35, -95); ctx.fill();

  // Main Head Shape
  ctx.fillStyle = '#FB8C00'; // Orange
  ctx.beginPath();
  ctx.ellipse(0, -20, 90, 85, 0, 0, Math.PI*2);
  ctx.fill();

  // Cheeks / Muzzle (White)
  ctx.fillStyle = '#FFF3E0';
  ctx.beginPath();
  ctx.moveTo(-90, 0);
  ctx.quadraticCurveTo(-50, 60, 0, 65);
  ctx.quadraticCurveTo(50, 60, 90, 0);
  ctx.quadraticCurveTo(90, -40, 0, -40);
  ctx.quadraticCurveTo(-90, -40, -90, 0);
  ctx.fill();

  // Nose
  ctx.fillStyle = '#3E2723';
  ctx.beginPath();
  ctx.arc(0, 30, 12, 0, Math.PI*2);
  ctx.fill();

  // Glasses
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(-35, -15, 28, 0, Math.PI*2); ctx.stroke(); // Left rim
  ctx.beginPath(); ctx.arc(35, -15, 28, 0, Math.PI*2); ctx.stroke(); // Right rim
  ctx.beginPath(); ctx.moveTo(-7, -15); ctx.lineTo(7, -15); ctx.stroke(); // Bridge

  // Eyes
  const pupilX = eyeX * 10;
  const pupilY = eyeY * 8;

  if (blink) {
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-50, -15); ctx.lineTo(-20, -15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(20, -15); ctx.lineTo(50, -15); ctx.stroke();
  } else {
    // Whites
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(-35, -15, 26, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(35, -15, 26, 0, Math.PI*2); ctx.fill();
    
    // Pupils
    ctx.fillStyle = '#212121';
    ctx.beginPath(); ctx.arc(-35 + pupilX, -15 + pupilY, 8, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(35 + pupilX, -15 + pupilY, 8, 0, Math.PI*2); ctx.fill();
    
    // Reflections
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(-38 + pupilX, -18 + pupilY, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(32 + pupilX, -18 + pupilY, 3, 0, Math.PI*2); ctx.fill();
  }

  // Mouth (Lip Sync)
  const mH = Math.max(2, mouthOpen * 30);
  ctx.fillStyle = '#3E2723';
  ctx.beginPath();
  ctx.ellipse(0, 50, 10, mH, 0, 0, Math.PI*2);
  ctx.fill();
  // Tongue
  if (mH > 5) {
      ctx.fillStyle = '#FF8A80';
      ctx.beginPath();
      ctx.arc(0, 50 + mH - 5, 6, 0, Math.PI, true);
      ctx.fill();
  }

  ctx.restore(); // End Head

  // --- 3. WOODEN DESK (FOREGROUND) ---
  // This hides the bottom part of the body
  ctx.fillStyle = '#8D6E63'; // Wood
  ctx.strokeStyle = '#5D4037';
  ctx.lineWidth = 4;
  // Draw a large desk surface
  roundRect(ctx, -350, 220, 700, 300, 10);
  ctx.fill();
  ctx.stroke();

  // Desk Edge Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath();
  ctx.moveTo(-340, 225);
  ctx.lineTo(340, 225);
  ctx.lineTo(340, 240);
  ctx.lineTo(-340, 240);
  ctx.fill();

  // --- 4. DESK ITEMS (COMPUTER & PERIPHERALS) ---
  
  // Monitor (Left side)
  ctx.save();
  ctx.translate(-200, 180);
  // Monitor Stand
  ctx.fillStyle = '#D7CCC8';
  ctx.fillRect(-40, 40, 80, 60); // Neck
  ctx.strokeRect(-40, 40, 80, 60);
  ctx.fillStyle = '#BCAAA4'; // Base
  ctx.fillRect(-60, 90, 120, 20);
  ctx.strokeRect(-60, 90, 120, 20);
  
  // Monitor Case
  ctx.fillStyle = '#E0D8C8'; // Beige
  ctx.strokeStyle = '#9E9E9E';
  roundRect(ctx, -90, -70, 180, 130, 8); 
  ctx.fill(); ctx.stroke();
  // Screen
  ctx.fillStyle = '#2D4F38'; // Dark Green Screen
  roundRect(ctx, -80, -60, 160, 100, 4);
  ctx.fill();
  
  ctx.restore();

  // --- CALCULATE INTERACTION POSITIONS ---
  
  // Calculate Virtual Mouse Position (clamped to desk area)
  // eyeX is -1 to 1. We map it to a desk range.
  const mouseRangeX = 80; 
  const mouseRangeY = 40;
  const deskCenterX = 180; // Right side of desk
  const deskCenterY = 320;
  
  const virtualMouseX = deskCenterX + (eyeX * mouseRangeX);
  const virtualMouseY = deskCenterY + (eyeY * mouseRangeY);

  // Keyboard Position
  const keyboardX = 0;
  const keyboardY = 320;

  // --- DRAW PERIPHERALS ---

  // Mousepad
  ctx.fillStyle = '#455A64';
  ctx.beginPath(); 
  ctx.ellipse(deskCenterX, deskCenterY, 60, 50, 0, 0, Math.PI*2); 
  ctx.fill();

  // Mouse Cable
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(virtualMouseX, virtualMouseY - 15);
  ctx.quadraticCurveTo(deskCenterX, deskCenterY - 60, deskCenterX - 50, deskCenterY - 80); // To back of desk
  ctx.stroke();

  // Mouse Body
  ctx.fillStyle = '#EEE';
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(virtualMouseX, virtualMouseY, 18, 25, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.stroke();
  // Mouse Buttons
  ctx.beginPath(); ctx.moveTo(virtualMouseX - 18, virtualMouseY - 5); ctx.lineTo(virtualMouseX + 18, virtualMouseY - 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(virtualMouseX, virtualMouseY - 5); ctx.lineTo(virtualMouseX, virtualMouseY - 25); ctx.stroke();
  // Click Effect
  if (mouseDown) {
     ctx.fillStyle = 'rgba(76, 175, 80, 0.5)';
     ctx.beginPath(); ctx.ellipse(virtualMouseX, virtualMouseY - 10, 15, 12, 0, Math.PI, Math.PI*2); ctx.fill();
  }

  // Keyboard
  ctx.fillStyle = '#EEE'; // Base
  ctx.strokeStyle = '#999';
  // Tilted perspective trapazoid for keyboard
  ctx.beginPath();
  ctx.moveTo(keyboardX - 90, keyboardY - 30);
  ctx.lineTo(keyboardX + 90, keyboardY - 30);
  ctx.lineTo(keyboardX + 100, keyboardY + 30);
  ctx.lineTo(keyboardX - 100, keyboardY + 30);
  ctx.fill();
  ctx.stroke();

  // Keys
  ctx.fillStyle = '#333';
  const rows = 3;
  const cols = 8;
  const startKX = keyboardX - 80;
  const startKY = keyboardY - 20;
  const keyW = 18;
  const keyH = 12;
  
  // Simulate typing visualization
  const isTyping = keyPressLeft || keyPressRight;
  
  for(let r=0; r<rows; r++) {
      for(let c=0; c<cols; c++) {
          // Randomly highlight keys if typing
          let active = false;
          if (isTyping && Math.random() > 0.7) active = true;
          
          ctx.fillStyle = active ? '#81C784' : '#FFF';
          // Skew x slightly for perspective
          const skew = (r * 2); 
          ctx.fillRect(startKX + (c * (keyW+2)) - skew, startKY + (r * (keyH+2)), keyW, keyH);
      }
  }

  // --- 5. ARMS & PAWS (INTERACTING) ---
  // Drawn last to appear over desk
  
  // Right Arm (Connecting Body to Mouse)
  ctx.save();
  ctx.translate(virtualMouseX, virtualMouseY);
  
  // Draw Sleeve (White)
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 26;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0); // Wrist at Mouse
  
  // Calculate vector to Right Shoulder
  const relShoulderRX = shoulderRight.x - virtualMouseX;
  const relShoulderRY = shoulderRight.y - virtualMouseY;
  
  // Control Point for Elbow (slightly out to the right)
  const cpRX = relShoulderRX * 0.5 + 60; 
  const cpRY = relShoulderRY * 0.5 + 20;

  ctx.quadraticCurveTo(cpRX, cpRY, relShoulderRX, relShoulderRY);
  ctx.stroke();

  // Right Paw (Hand)
  ctx.rotate(-0.2);
  ctx.fillStyle = '#FB8C00'; // Orange
  ctx.beginPath(); ctx.ellipse(5, -5, 22, 18, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#FFF3E0'; // Tips
  ctx.beginPath(); ctx.ellipse(5, -2, 15, 10, 0, 0, Math.PI*2); ctx.fill();
  
  ctx.restore();


  // Left Arm (Connecting Body to Keyboard)
  ctx.save();
  const leftPawX = keyboardX - 40;
  const leftPawY = keyboardY;
  const typeOffset = isTyping ? Math.sin(Date.now() / 50) * 5 : 0;
  
  ctx.translate(leftPawX, leftPawY + typeOffset);
  
  // Draw Sleeve (White)
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 26;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0); // Wrist at Keyboard

  // Calculate vector to Left Shoulder
  const relShoulderLX = shoulderLeft.x - leftPawX;
  const relShoulderLY = shoulderLeft.y - (leftPawY + typeOffset);
  
  // Control Point for Elbow (slightly out to the left)
  const cpLX = relShoulderLX * 0.5 - 60; 
  const cpLY = relShoulderLY * 0.5 + 20;

  ctx.quadraticCurveTo(cpLX, cpLY, relShoulderLX, relShoulderLY);
  ctx.stroke();

  // Left Paw (Hand)
  ctx.rotate(0.3);
  ctx.fillStyle = '#FB8C00';
  ctx.beginPath(); ctx.ellipse(0, 0, 22, 18, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#FFF3E0';
  ctx.beginPath(); ctx.ellipse(0, 3, 15, 10, 0, 0, Math.PI*2); ctx.fill();

  ctx.restore();

  ctx.restore();
};