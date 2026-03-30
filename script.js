const params        = new URLSearchParams(window.location.search);
const name          = params.get('name')          || 'Contato';
const telefone      = params.get('telefone')      || null;
const idcontato     = params.get('idcontato')     || null;
const idatendimento = params.get('idatendimento') || null;
const iddousuario   = params.get('iddousuario')   || null;

// nome e avatar (se possível) do contatoi
document.getElementById('user-name').textContent = name;

const img      = document.getElementById('user-avatar');
const fallback = document.getElementById('avatar-fallback');
img.style.display      = 'none';
fallback.style.display = 'block';

// timer da chamada
let seconds = 0;
const timerEl = document.getElementById('timer');
const tick = setInterval(() => {
    seconds++;
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    timerEl.textContent = `${m}:${s}`;
}, 1000);

// Dispara webhook e tenta pegar o callId
let callId = null;

async function iniciarChamada() {
    try {
        const url = `https://hook.us1.make.com/5q2kbak4tcxx123gm1o6fl5j8tmnqxw9?telefone=${telefone}&idcontato=${idcontato}&idatendimento=${idatendimento}&iddousuario=${iddousuario}`;

        const res  = await fetch(url);
        const data = await res.json().catch(() => null);

        if (data?.callId || data?.id) {
            callId = data?.callId || data?.id;
            console.log('callId via Make:', callId);
            return;
        }
    } catch (err) {
        console.warn('Make não retornou callId, buscando via API4Com...');
    }

    await buscarCallIdAtivo();
}

async function buscarCallIdAtivo() {
    try {
        // chama o backend do Vercel, token fica seguro lá
        const res   = await fetch('/api/calls');
        const data  = await res.json();
        const calls = data?.calls || data || [];
        const ativa = calls.find((c) => !c.hangup_cause);

        if (ativa?.id) {
            callId = ativa.id;
            console.log('callId via API4Com:', callId);
        } else {
            console.warn('Nenhuma chamada ativa encontrada');
        }
    } catch (err) {
        console.error('Erro ao buscar callId:', err);
    }
}

iniciarChamada();

// ativa/desativa mic
const micBtn     = document.getElementById('micBtn');
const iconMicOn  = document.getElementById('icon-mic-on');
const iconMicOff = document.getElementById('icon-mic-off');
let micOn = true;

micBtn.addEventListener('click', () => {
    micOn = !micOn;
    micBtn.classList.toggle('muted', !micOn);
    iconMicOn.style.display  = micOn ? 'block' : 'none';
    iconMicOff.style.display = micOn ? 'none'  : 'block';
    micBtn.setAttribute('data-tip', micOn ? 'Microfone' : 'Mudo');
});

// encerra chamada
document.getElementById('endBtn').addEventListener('click', async () => {
    clearInterval(tick);

    if (callId) {
        try {
            // chama o backend do Vercel, token fica seguro lá
            await fetch(`/api/hangup?callId=${callId}`, { method: 'POST' });
        } catch (err) {
            console.error('Erro ao encerrar:', err);
        }
    }

    const win = document.querySelector('.window');
    win.style.transition = 'opacity 0.3s, transform 0.3s';
    win.style.opacity    = '0';
    win.style.transform  = 'scale(0.96)';

    setTimeout(() => window.close(), 320);
});
