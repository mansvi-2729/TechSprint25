// Spatial AI Engine v2.0
const canvas = document.getElementById('lensCanvas');
const ctx = canvas.getContext('2d');
const input = document.getElementById('nodeInput');
const bin = document.getElementById('aiBin');
const countDisplay = document.getElementById('activeCount');

// API KEY HARDCODED FOR SIMPLICITY
const GEMINI_API_KEY = "AIzaSyCBQIHT2vVSUYjtSQJ63571YWq6IbiUUWw";

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let nodes = [];
let mouse = { x: -1000, y: -1000 };
let draggedNode = null;

const shinyColors = ['#00f2ff', '#39ff14', '#bc13fe', '#ff00ff', '#ccff00', '#7df9ff', '#ff3131'];

class Node {
    constructor(text) {
        this.text = text;
        this.x = Math.random() * (canvas.width - 100) + 50;
        this.y = Math.random() * (canvas.height - 100) + 50;
        this.vx = (Math.random() - 0.5) * 3;
        this.vy = (Math.random() - 0.5) * 3;
        this.radius = 35 + (text.length * 1.5);
        this.color = shinyColors[Math.floor(Math.random() * shinyColors.length)];
        this.friction = 0.985;
    }

    draw() {
        const speed = Math.sqrt(this.vx**2 + this.vy**2);
        ctx.save();
        ctx.shadowBlur = 15 + speed;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 8, 15, 0.85)";
        ctx.fill();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = 'bold 15px Inter';
        ctx.fillText(this.text, this.x, this.y + 6);
        ctx.restore();
    }

    update() {
        if (draggedNode === this) return;

        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 400) {
            const force = (400 - dist) / 400;
            this.vx += (dx / dist) * force * 0.9;
            this.vy += (dy / dist) * force * 0.9;
        }

        nodes.forEach(other => {
            if (other === this) return;
            const odx = other.x - this.x;
            const ody = other.y - this.y;
            const oDist = Math.hypot(odx, ody);
            if (oDist < this.radius + other.radius) {
                const angle = Math.atan2(ody, odx);
                const overlap = (this.radius + other.radius) - oDist;
                this.vx -= Math.cos(angle) * (overlap * 0.05);
                this.vy -= Math.sin(angle) * (overlap * 0.05);
            }
        });

        this.vx *= this.friction;
        this.vy *= this.friction;
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < this.radius || this.x > canvas.width - this.radius) this.vx *= -1;
        if (this.y < this.radius || this.y > canvas.height - this.radius) this.vy *= -1;
    }
}

async function startGeminiForge(keywords) {
    const modal = document.getElementById('resultModal');
    const textArea = document.getElementById('refinedPromptText');
    modal.style.display = 'block';
    textArea.value = "Consulting Gemini...";

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Create a professional prompt from: ${keywords}` }] }]
            })
        });
        const data = await response.json();
        textArea.value = data.candidates[0].content.parts[0].text;
    } catch (err) {
        textArea.value = "Forge Error. Check API Key.";
    }
}

// Event Listeners
input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
        nodes.push(new Node(input.value));
        input.value = "";
        countDisplay.innerText = nodes.length;
    }
});

window.addEventListener('mousedown', (e) => {
    let hitNode = false;
    nodes.forEach(n => {
        if (Math.hypot(n.x - e.clientX, n.y - e.clientY) < n.radius) {
            draggedNode = n;
            hitNode = true;
        }
    });
    if (!hitNode) {
        nodes.forEach(n => {
            const dx = n.x - e.clientX;
            const dy = n.y - e.clientY;
            const dist = Math.hypot(dx, dy);
            n.vx += (dx / dist) * 15;
            n.vy += (dy / dist) * 15;
        });
    }
});

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    if (draggedNode) {
        draggedNode.x = e.clientX; draggedNode.y = e.clientY;
        const binRect = bin.getBoundingClientRect();
        if (e.clientY > binRect.top && e.clientX > binRect.left && e.clientX < binRect.right) bin.classList.add('drag-over');
        else bin.classList.remove('drag-over');
    }
});

window.addEventListener('mouseup', (e) => {
    if (draggedNode) {
        const binRect = bin.getBoundingClientRect();
        if (e.clientY > binRect.top && e.clientX > binRect.left && e.clientX < binRect.right) {
            startGeminiForge(nodes.map(n => n.text).join(", "));
        }
    }
    draggedNode = null;
    bin.classList.remove('drag-over');
});

function copyAndClose() {
    navigator.clipboard.writeText(document.getElementById('refinedPromptText').value);
    nodes = []; countDisplay.innerText = "0";
    document.getElementById('resultModal').style.display = 'none';
}

function closeModalOnly() { document.getElementById('resultModal').style.display = 'none'; }

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    nodes.forEach((n, i) => {
        for (let j = i + 1; j < nodes.length; j++) {
            const dist = Math.hypot(n.x - nodes[j].x, n.y - nodes[j].y);
            if (dist < 200) {
                ctx.strokeStyle = `rgba(0, 242, 255, ${0.15 - dist/1500})`;
                ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
            }
        }
    });
    nodes.forEach(n => { n.update(); n.draw(); });
    requestAnimationFrame(animate);
}

window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
animate();
