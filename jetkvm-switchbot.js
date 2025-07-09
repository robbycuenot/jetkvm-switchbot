// ==UserScript==
// @name         SwitchBot On/Off Buttons for JetKVM
// @namespace    http://tampermonkey.net/
// @version      3.3
// @description  Adds SwitchBot On/Off buttons to JetKVM after "Virtual Keyboard" with ⏻ and ⏼ icons, robust error checking, and clickable toast notifications that expand to show full message when tapped/clicked.
// @author       Robby Cuenot
// @match        https://yourjetkvm.lan/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @connect      api.switch-bot.com
// ==/UserScript==

(async function() {
  'use strict';

  // ======================================================
  // ✅ Tampermonkey Config Menu
  // ======================================================

  let token = await GM_getValue('switchbot_token', '');
  let secret = await GM_getValue('switchbot_secret', '');
  let deviceId = await GM_getValue('switchbot_deviceId', '');

  function setupMenu() {
    GM_registerMenuCommand("Set SwitchBot Token", async () => {
      const input = prompt("Enter your SwitchBot Token:", token || '');
      if (input !== null) {
        token = input.trim();
        await GM_setValue('switchbot_token', token);
        alert('✅ Token saved!');
      }
    });

    GM_registerMenuCommand("Set SwitchBot Secret", async () => {
      const input = prompt("Enter your SwitchBot Secret:", secret || '');
      if (input !== null) {
        secret = input.trim();
        await GM_setValue('switchbot_secret', secret);
        alert('✅ Secret saved!');
      }
    });

    GM_registerMenuCommand("Set SwitchBot Device ID", async () => {
      const input = prompt("Enter your SwitchBot Device ID:", deviceId || '');
      if (input !== null) {
        deviceId = input.trim();
        await GM_setValue('switchbot_deviceId', deviceId);
        alert('✅ Device ID saved!');
      }
    });
  }

  setupMenu();

  if (!token || !secret || !deviceId) {
    console.warn('⚠️ SwitchBot config not set. Use Tampermonkey menu.');
    alert('⚠️ SwitchBot not configured! Use Tampermonkey menu to set Token, Secret, and Device ID.');
    return;
  }

  // ======================================================
  // ✅ Toast Notification with Expandable View
  // ======================================================

  function ensureToastStyles() {
    if (document.getElementById('switchbot-toast-style')) return;
    const style = document.createElement('style');
    style.id = 'switchbot-toast-style';
    style.textContent = `
      #switchbot-toast-container {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }
      .switchbot-toast {
        padding: 12px 24px;
        border-radius: 8px;
        color: white;
        font-size: 16px;
        font-weight: 500;
        min-width: 300px;
        max-width: 90%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: center;
        cursor: pointer;
        box-shadow: 0 6px 14px rgba(0,0,0,0.3);
        opacity: 0;
        transition: opacity 0.5s ease;
      }
      .switchbot-toast-expanded {
        white-space: pre-wrap;
        overflow: auto;
        text-align: left;
      }
      .switchbot-toast-success {
        background-color: rgba(34,197,94,0.95);
      }
      .switchbot-toast-error {
        background-color: rgba(239,68,68,0.95);
      }
    `;
    document.head.appendChild(style);
  }

  function showToast(message, type = 'success') {
    ensureToastStyles();

    let container = document.getElementById('switchbot-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'switchbot-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.textContent = message;
    toast.className = `switchbot-toast switchbot-toast-${type}`;
    container.appendChild(toast);

    // Click to expand/collapse
    toast.addEventListener('click', () => {
      toast.classList.toggle('switchbot-toast-expanded');
    });

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.addEventListener('transitionend', () => toast.remove());
    }, 5000);
  }

  // ======================================================
  // ✅ Signature Generation
  // ======================================================

  async function generateSignature(token, secret, t, nonce) {
    const data = token + t + nonce;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureArrayBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    return btoa(String.fromCharCode(...new Uint8Array(signatureArrayBuffer)));
  }

  // ======================================================
  // ✅ Send SwitchBot Command
  // ======================================================

  async function sendSwitchBotCommand(command) {
    const nonce = Math.random().toString(36).substring(2);
    const t = Date.now().toString();
    const sign = await generateSignature(token, secret, t, nonce);

    const commandBody = JSON.stringify({
      command: command,
      parameter: "default",
      commandType: "command"
    });

    GM_xmlhttpRequest({
      method: "POST",
      url: `https://api.switch-bot.com/v1.1/devices/${deviceId}/commands`,
      headers: {
        "Authorization": token,
        "sign": sign,
        "nonce": nonce,
        "t": t,
        "Content-Type": "application/json"
      },
      data: commandBody,
      onload: function(response) {
        console.log(`✅ [${command}] Raw Response:`, response.responseText);
        try {
          const json = JSON.parse(response.responseText);
          console.log(`✅ [${command}] Parsed Response:`, json);

          if (json.statusCode !== 100) {
            showToast(`❌ [${command}] Error:\n${JSON.stringify(json, null, 2)}`, 'error');
            return;
          }

          const isDefaultSuccess =
            json.message === "success" &&
            json.body &&
            Object.keys(json.body).length === 0;

          if (isDefaultSuccess) {
            showToast(`✅ [${command}] Success!`, 'success');
          } else {
            showToast(`✅ [${command}] Success:\n${JSON.stringify(json, null, 2)}`, 'success');
          }

        } catch (e) {
          console.error(`❌ [${command}] Failed to parse JSON:`, e);
          showToast(`❌ [${command}] Invalid JSON response:\n${response.responseText}`, 'error');
        }
      },
      onerror: function(error) {
        console.error(`❌ Error sending [${command}]:`, error);
        let detail = error?.responseText || JSON.stringify(error, null, 2);
        showToast(`❌ Error sending [${command}]:\n${detail}`, 'error');
      }
    });
  }

  // ======================================================
  // ✅ Create Button with Unicode Icon
  // ======================================================

  function createButtonFromReference(reference, id, label, iconSymbol, command, needsConfirmation = false) {
    const btn = reference.cloneNode(true);
    btn.id = id;

    const span = btn.querySelector('span');
    if (span) span.textContent = label;

    const oldSvg = btn.querySelector('svg');
    if (oldSvg && oldSvg.parentNode) {
      oldSvg.parentNode.removeChild(oldSvg);
    }

    const iconSpan = document.createElement('span');
    iconSpan.textContent = iconSymbol;
    iconSpan.style.fontSize = '16px';
    iconSpan.style.fontWeight = 'bold';
    iconSpan.style.display = 'inline-block';
    iconSpan.classList.add('shrink-0', 'justify-start', 'text-black', 'dark:text-white');

    const flexContainer = btn.querySelector('div.flex');
    if (flexContainer) {
      flexContainer.insertBefore(iconSpan, flexContainer.firstChild);
    }

    const newBtn = btn.cloneNode(true);
    newBtn.addEventListener('click', () => {
      if (needsConfirmation) {
        if (confirm(`Are you sure you want to send the "${label}" command? This is a 6-second press.`)) {
          sendSwitchBotCommand(command);
        }
      } else {
        sendSwitchBotCommand(command);
      }
    });

    return newBtn;
  }

  // ======================================================
  // ✅ Inject Buttons After "Virtual Keyboard"
  // ======================================================

  function injectButtons() {
    const allButtons = document.querySelectorAll('button');
    const keyboardButton = Array.from(allButtons).find(btn => btn.textContent.trim() === 'Virtual Keyboard');

    if (!keyboardButton) {
      console.log('SwitchBot Injector: Virtual Keyboard button not found yet.');
      return;
    }

    if (document.getElementById('switchbot-power-on-button') || document.getElementById('switchbot-power-off-button')) {
      return;
    }

    const onIcon = '⏻';
    const offIcon = '⏼';

    const onButton = createButtonFromReference(
      keyboardButton,
      'switchbot-power-on-button',
      'SwitchBot Power On (1s)',
      onIcon,
      'turnOn',
      false
    );

    const offButton = createButtonFromReference(
      keyboardButton,
      'switchbot-power-off-button',
      'SwitchBot Power Off (6s)',
      offIcon,
      'turnOff',
      true
    );

    const refWrapper = keyboardButton.parentNode;

    const onWrapper = refWrapper.cloneNode(false);
    for (const attr of refWrapper.attributes) {
      onWrapper.setAttribute(attr.name, attr.value);
    }
    onWrapper.appendChild(onButton);

    const offWrapper = refWrapper.cloneNode(false);
    for (const attr of refWrapper.attributes) {
      offWrapper.setAttribute(attr.name, attr.value);
    }
    offWrapper.appendChild(offButton);

    refWrapper.parentNode.insertBefore(onWrapper, refWrapper.nextSibling);
    refWrapper.parentNode.insertBefore(offWrapper, onWrapper.nextSibling);

    console.log('SwitchBot Injector: Unicode buttons injected after Virtual Keyboard.');
  }

  // ======================================================
  // ✅ Observe Dynamic Loads
  // ======================================================

  const observer = new MutationObserver(() => {
    injectButtons();
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
