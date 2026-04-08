const params = new URLSearchParams(window.location.search);
const name = params.get('name') || 'Contato';
const telefone = params.get('telefone') || null;
const idcontato = params.get('idcontato') || null;
const idatendimento = params.get('idatendimento') || null;
const cardid = params.get('cardid') || null;
const iddousuario = params.get('iddousuario') || null;

// nome e avatar (se possível) do contatoi
document.getElementById('user-name').textContent = name;

const img = document.getElementById('user-avatar');
const fallback = document.getElementById('avatar-fallback');
img.style.display = 'none';
fallback.style.display = 'block';

let tick = null;

// status da chamada
function setStatus(status) {
    const tag = document.querySelector('.status-tag');
    const dot = document.querySelector('.status-dot');
    const text = tag.querySelector('span:last-child') || tag.childNodes[1];

    if (status === 'chamando') {
        if(tick) clearInterval(tick);
        dot.style.background = '#febc2e';
        dot.style.boxShadow = '0 0 6px #febc2e';
        tag.style.borderColor = 'rgba(254, 188, 46, 0.3)';
        tag.style.background = 'rgba(254, 188, 46, 0.08)';
        tag.style.color = '#febc2e';
        tag.lastChild.textContent = ' Chamando...';
    } else if (status === 'conectado') {
        // inicia o timer quando atender
        let seconds = 0;
        const timerEl = document.getElementById('timer');
        tick = setInterval(() => {
            seconds++;
            const m = String(Math.floor(seconds / 60)).padStart(2, '0');
            const s = String(seconds % 60).padStart(2, '0');
            timerEl.textContent = `${m}:${s}`;
        }, 1000);

        dot.style.background = 'var(--green)';
        dot.style.boxShadow = '0 0 6px var(--green)';
        tag.style.borderColor = 'rgba(0, 230, 118, 0.18)';
        tag.style.background = 'var(--green-dim)';
        tag.style.color = 'var(--green)';
        tag.lastChild.textContent = ' Conectado';
    }
}

// Dispara webhook e tenta pegar o callId
let callId = null;

async function iniciarChamada() {
    setStatus('chamando');
    try {
        const url = `https://hook.us1.make.com/na25fpfhaue8meixfybbfaqm8h0y1bzf?telefone=${telefone}&idcontato=${idcontato}&cardid=${cardid}&idatendimento=${idatendimento}&iddousuario=${iddousuario}`;

        const res = await fetch(url);
        const data = await res.json().catch(() => null);

        if (data?.callId || data?.id) {
            callId = data?.callId || data?.id;
            setStatus('conectado');
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
        const res = await fetch('/api/calls');
        const data = await res.json();
        const calls = data?.calls || data || [];
        const ativa = calls.find((c) => !c.hangup_cause);

        if (ativa?.id) {
            callId = ativa.id;
            setStatus('conectado');
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
const micBtn = document.getElementById('micBtn');
const iconMicOn = document.getElementById('icon-mic-on');
const iconMicOff = document.getElementById('icon-mic-off');
let micOn = true;

micBtn.addEventListener('click', () => {
    micOn = !micOn;
    micBtn.classList.toggle('muted', !micOn);
    iconMicOn.style.display = micOn ? 'block' : 'none';
    iconMicOff.style.display = micOn ? 'none' : 'block';
    micBtn.setAttribute('data-tip', micOn ? 'Microfone' : 'Mudo');
});

// encerra chamada
document.getElementById('endBtn').addEventListener('click', async () => {
    clearInterval(tick);

    if (callId) {
        try {
            await fetch(`/api/hangup?callId=${callId}`, { method: 'POST' });
        } catch (err) {
            console.error('Erro ao encerrar:', err);
        }
    }

    const win = document.querySelector('.window');
    win.style.transition = 'opacity 0.3s, transform 0.3s';
    win.style.opacity = '0';
    win.style.transform = 'scale(0.96)';

    setTimeout(() => {
        window.close();
        // fallback se o browser bloquear o window.close()
        setTimeout(() => {
            document.body.innerHTML =
                '<div class="end-screen">Chamada encerrada</div>';
        }, 300);
    }, 320);
});
