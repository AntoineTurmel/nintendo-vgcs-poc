// ==UserScript==
// @name         Nintendo VGCS Share Link
// @namespace    nintendo-vgcs-poc@galaksio.tech
// @version      1.6
// @description  Add a share link on Nintendo VGCS page
// @match        https://accounts.nintendo.com/portal/vgcs*
// @require      https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js
// @grant        none
// @run-at       document-start
// @grant          GM_setValue
// @grant          GM_getValue
// ==/UserScript==

(function () {
    'use strict';

  function compressJsonToUrlParam(jsonObj) {
    // Step 1: Convert JSON to string
    const jsonString = JSON.stringify(jsonObj);

    // Step 2: Compress using pako (gzip)
    const compressed = pako.gzip(jsonString);

    // Step 3: Convert compressed binary to Base64
    const base64 = btoa(String.fromCharCode(...compressed));

    // Step 4: URL-encode the Base64 string
    const urlSafeParam = encodeURIComponent(base64);

    return urlSafeParam;
  }

    // === Interception XHR getVgcs ===
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
        this._method = method;
        this._url = url;
        return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
        const url = this._url;
        const method = this._method;
        const requestBody = typeof body === "string" ? body : "";

        this.addEventListener("load", function () {
            if (
                method === "POST" &&
                url.includes("savanna.srv.nintendo.net/graphql") &&
                requestBody.includes("getVgcs")
            ) {
                try {
                    const json = JSON.parse(this.responseText);

                    json.data.account.vgc.vgcViews.views.forEach(view => {
                      delete view.id;
                      delete view.ownerNaId;
                      delete view.userNaId;
                      delete view.insertedNsDeviceId;
                    });

                  const param = compressJsonToUrlParam(json);
                  GM_setValue('nso_vgcs_json', param);

                    const views = json?.data?.account?.vgc?.vgcViews?.views;
                    if (Array.isArray(views)) {
                        const titles = views.map(v => v.applicationName);
                        console.log("🎮 Titres détectés :", titles);
                    }

                } catch (e) {
                    console.warn("Error parsing JSON :", e);
                }
            }
        });

        return originalSend.apply(this, arguments);
    };

    // === Ajout d'un bouton flottant en bas à droite ===
    const addFloatingButton = () => {
        if (document.getElementById('customFloatingBtn')) return;

        const btn = document.createElement('button');
        btn.id = 'customFloatingBtn';
        btn.textContent = 'Share';
        Object.assign(btn.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 9999,
            padding: '10px 16px',
            backgroundColor: '#4285F4',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
        });

        btn.addEventListener('click', () => {
            window.open('https://antoineturmel.github.io/nintendo-vgcs-poc/?data='+GM_getValue('nso_vgcs_json'), '_blank');
        });

        document.body.appendChild(btn);
    };

    // On s'assure que le DOM est prêt
    const readyInterval = setInterval(() => {
        if (document.body) {
            clearInterval(readyInterval);
            addFloatingButton();
        }
    }, 50);
})();
