document.querySelectorAll("img").forEach((img) => {
    img.draggable = false;
});
document.addEventListener("dragstart", (e) => {
    if (e.target instanceof HTMLImageElement) e.preventDefault();
});

document.getElementById("page-title").addEventListener("click", () => {
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

async function updatePlayerCount() {
    try {
        const res = await fetch(`https://api.mcsrvstat.us/3/${serverIp}`);
        const data = await res.json();
        if (data.online) {
            const { online = 0, max = 0 } = data.players || {};
            playerCount.className = "player-count online";
            playerCountText.textContent = `${online} / ${max} online`;
        } else {
            playerCount.className = "player-count offline";
            playerCountText.textContent = "Offline";
        }
    } catch {
        playerCount.className = "player-count";
        playerCountText.textContent = "Status unavailable";
    }
}

updatePlayerCount();
setInterval(updatePlayerCount, 60000);
