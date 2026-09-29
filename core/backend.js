export async function backendHealth() {
    return fetch("https://wingmanbackend.onrender.com/health").then(r => r.json());
}

export async function backendReady() {
    return fetch("https://wingmanbackend.onrender.com/ready").then(r => r.json());
}

export async function backendStartOnboarding() {
    return fetch("https://wingmanbackend.onrender.com/api/ai/invite", {
        method: "POST"
    }).then(r => r.json());
}
