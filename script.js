document.querySelectorAll("img").forEach((img) => {
    img.draggable = false;
});
document.addEventListener("dragstart", (e) => {
    if (e.target instanceof HTMLImageElement) e.preventDefault();
});

document.getElementById("page-title")?.addEventListener("click", () => {
    location.reload();
});

const copyButton = document.getElementById("copy-ip");
const copyText = copyButton.querySelector(".copy-ip-text");
const serverIp = copyButton.dataset.ip;
let copyTimeout;

async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
}

copyButton.addEventListener("click", async () => {
    try {
        await copyToClipboard(serverIp);
    } catch {
        return;
    }
    copyButton.classList.add("copied");
    copyText.textContent = "copied";
    clearTimeout(copyTimeout);
    copyTimeout = setTimeout(() => {
        copyButton.classList.remove("copied");
        copyText.textContent = serverIp;
    }, 2000);
});

const playerCount = document.getElementById("player-count");
const playerCountText = playerCount.querySelector(".player-count-text");

function setPlayerCount(state, text) {
    playerCount.className = `player-count ${state}`.trim();
    playerCountText.textContent = text;
    try {
        sessionStorage.setItem("playerCount", JSON.stringify({ state, text }));
    } catch {}
}

try {
    const cached = JSON.parse(sessionStorage.getItem("playerCount"));
    if (cached) {
        playerCount.className = `player-count ${cached.state}`.trim();
        playerCountText.textContent = cached.text;
    }
} catch {}

async function updatePlayerCount() {
    try {
        const res = await fetch(`https://api.mcsrvstat.us/3/${serverIp}`);
        const data = await res.json();
        if (data.online) {
            const { online = 0, max = 0 } = data.players || {};
            setPlayerCount("online", `${online} / ${max} online`);
        } else {
            setPlayerCount("offline", "Offline");
        }
    } catch {
        setPlayerCount("", "Status unavailable");
    }
}

updatePlayerCount();
setInterval(updatePlayerCount, 60000);

document.querySelectorAll('.nav-link[aria-current="page"]').forEach((link) => {
    link.addEventListener("click", (e) => e.preventDefault());
});
