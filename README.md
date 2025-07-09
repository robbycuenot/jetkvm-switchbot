# jetkvm-switchbot
Proof of concept Tampermonkey script to add SwitchBot Bot controls to the JetKVM interface.

## Demo

https://github.com/user-attachments/assets/d6cb38f2-fe77-4a9a-847a-3972a3fb9446

## Hardware Requirements

- SwitchBot Bot - $25
- SwitchBot Hub Mini - $35

## Software Requirements

- Tampermonkey browser extension
- SwitchBot App for iOS or Android

## Setup

1. Install and log in to the SwitchBot App on your mobile device.
1. Set up the SwitchBot Hub Mini.
1. Set up the SwitchBot Bot and link it to the Hub Mini.
    1. Verify that this connection works with Bluetooth off, as we'll be using the Hub Mini for remote control over the internet.
    1. Set the Bot mode to "Custom Mode" and specify actions for "ON" and "OFF" states.
    1. Under the Bot settings, click "Device Info" and note the "BLE MAC" (e.g., `EE:2E:XX:XX:XX:XX`).
        1. This value, without colons, will be used as the `deviceId` later on (e.g., `EE2EXXXXXXX`).
1. In the SwitchBot App, enable Developer Options
    1. Go to "Profile" > "Preferences" > "About" > tap "App Version" 15 times
1. In Developer Options, generate a new API token
    1. Save the Token and Secret Key somewhere safe
1. Install the Tampermonkey browser extension
1. Create a new script in Tampermonkey and paste the code from `jetkvm-switchbot.js`
1. Replace the URL from this line with the URL of your JetKVM instance:
    ```javascript
    // @match        https://yourjetkvm.lan/*
    ```
1. Navigate to your JetKVM instance in your browser.
1. You should be prompted to enter your SwitchBot API Token, Secret Key, and the deviceId of your SwitchBot Bot.
    1. Open the Tampermonkey extension, click on the script, and enter the required information in the prompt.
1. Refresh the JetKVM page, and you should see the SwitchBot Bot controls appear in the interface.
1. Click the `⏻ SwitchBot Power On (1s)` and `⏼ SwitchBot Power Off (6s)` buttons to control your SwitchBot Bot!
